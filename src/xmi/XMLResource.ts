/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { BasicResource } from '../runtime/BasicResource.js';
import { URI } from '../URI.js';
import { EObject } from '../EObject.js';
import { XMLLoad, XMILoad } from './XMLLoad.js';
import { MissingPackage } from './XMLHandler.js';
import { EPackage } from '../EPackage.js';
import { ResourceSet } from '../ResourceSet.js';
import { isEPackage } from '../util/TypeGuards.js';
import { XMLSave, XMISave } from './XMLSave.js';
import { XMLHelperImpl } from './XMLHelper.js';

/**
 * Resource load options
 */
export const OPTION_DEFER_ATTACHMENT = 'DEFER_ATTACHMENT';
export const OPTION_DEFER_IDREF_RESOLUTION = 'DEFER_IDREF_RESOLUTION';
export const OPTION_USE_DEPRECATED_METHODS = 'USE_DEPRECATED_METHODS';
export const OPTION_RECORD_UNKNOWN_FEATURE = 'RECORD_UNKNOWN_FEATURE';

export { OPTION_FEATURE_NAME_MAP, OPTION_EXTENDED_META_DATA } from './XMLHelper.js';
export { OPTION_KEEP_DEFAULT_CONTENT } from './XMLSave.js';

/**
 * XMLResource - A resource that loads/saves in XML format
 */
export class XMLResource extends BasicResource {
  protected idToEObjectMap: Map<string, EObject> = new Map();
  protected eObjectToIDMap: Map<EObject, string> = new Map();
  protected xmlHelper: XMLHelperImpl;
  protected missingPackages: MissingPackage[] = [];

  constructor(uri?: URI) {
    super(uri);
    this.xmlHelper = this.createXMLHelper();
  }

  protected createXMLHelper(): XMLHelperImpl {
    return new XMLHelperImpl(this);
  }

  /**
   * Get EObject by ID
   */
  getEObject(uriFragment: string): EObject | null {
    // First check ID map
    const byId = this.idToEObjectMap.get(uriFragment);
    if (byId) {
      return byId;
    }

    // Fall back to path-based lookup
    return super.getEObject(uriFragment);
  }

  /**
   * Get URI fragment for an object
   */
  getURIFragment(eObject: EObject): string {
    // First check if we have an ID
    const id = this.eObjectToIDMap.get(eObject);
    if (id) {
      return id;
    }

    // Fall back to path-based fragment
    return super.getURIFragment(eObject);
  }

  /**
   * Set ID for an object
   */
  setID(eObject: EObject, id: string): void {
    if (id) {
      this.idToEObjectMap.set(id, eObject);
      this.eObjectToIDMap.set(eObject, id);
    }
  }

  /**
   * Get ID for an object
   */
  getID(eObject: EObject): string | null {
    return this.eObjectToIDMap.get(eObject) ?? null;
  }

  /**
   * Clear ID maps
   */
  protected clearIdMaps(): void {
    this.idToEObjectMap.clear();
    this.eObjectToIDMap.clear();
  }

  /**
   * Load resource using URIConverter if available, otherwise no-op.
   * For direct string loading, use loadFromString().
   */
  async load(options?: Map<string, any>): Promise<void> {
    const rs = this.getResourceSet();
    const converter = rs?.getURIConverter();
    const uri = this.getURI();
    if (converter && uri) {
      try {
        const stream = await converter.createInputStream(uri);
        const content = await streamToString(stream);
        await this.loadFromStringAsync(content, options);
      } catch (err) {
        // If createInputStream fails (e.g. not implemented), just mark as loaded
        (this as any).loaded = true;
      }
    } else {
      (this as any).loaded = true;
    }
  }

  /**
   * Load from XML string
   */
  loadFromString(xmlString: string, options?: Map<string, any>): void {
    this.clearIdMaps();
    const opts = options || new Map();
    const loader = this.createXMLLoad();
    this.missingPackages = loader.load(this, xmlString, opts);
    (this as any).loaded = true;
  }

  /**
   * Load from XML string, fetching packages the document needs and the
   * registry does not have (#88).
   *
   * Java EMF loads them while parsing, inside getPackageForURI(), which
   * blocking IO allows. Here the URI converter is asynchronous, so the parse
   * records what it could not resolve, those packages are loaded through the
   * resource set, and the document is parsed once more. Without a resource
   * set, or where nothing could be loaded, this behaves like loadFromString().
   */
  async loadFromStringAsync(xmlString: string, options?: Map<string, any>): Promise<void> {
    this.loadFromString(xmlString, options);

    if (this.missingPackages.length === 0) {
      return;
    }

    if (await this.resolveMissingPackages()) {
      this.unload();
      this.loadFromString(xmlString, options);
    }
  }

  /**
   * The namespace URIs the last parse could not resolve.
   */
  getMissingPackages(): MissingPackage[] {
    return [...this.missingPackages];
  }

  /**
   * Load the packages the last parse was missing and register them.
   * Returns whether anything was gained, i.e. whether parsing again is worth it.
   */
  protected async resolveMissingPackages(): Promise<boolean> {
    const resourceSet = this.getResourceSet();
    if (!resourceSet) {
      return false;
    }

    const registry = resourceSet.getPackageRegistry();
    let resolvedAny = false;

    for (const missing of this.missingPackages) {
      if (registry.getEPackage(missing.nsURI)) {
        // Someone else registered it in the meantime.
        resolvedAny = true;
        continue;
      }

      const ePackage = await this.loadPackage(resourceSet, missing);
      if (ePackage) {
        registry.set(ePackage.getNsURI() || missing.nsURI, ePackage);
        resolvedAny = true;
      }
    }

    return resolvedAny;
  }

  /**
   * Fetch one package through the resource set, from where xsi:schemaLocation
   * says it is or from the namespace URI itself - which is what Java EMF
   * treats a nsURI as: an ordinary resource URI the URI converter can answer.
   */
  protected async loadPackage(
    resourceSet: ResourceSet,
    missing: MissingPackage
  ): Promise<EPackage | null> {
    const uri = URI.createURI(missing.location);
    const fragment = uri.fragment();
    const trimmed = fragment ? uri.trimFragment() : uri;

    const wasKnown = resourceSet.getResource(trimmed, false) !== null;
    let resource;
    try {
      resource =
        typeof (resourceSet as any).getResourceAsync === 'function'
          ? await (resourceSet as any).getResourceAsync(trimmed, true)
          : resourceSet.getResource(trimmed, true);
    } catch {
      // A URI converter that cannot answer this URI is the normal case for a
      // namespace URI that is not a location at all.
      return null;
    }

    if (!resource) {
      return null;
    }

    const content = fragment ? resource.getEObject(fragment) : firstPackageOf(resource.getContents());
    if (isEPackage(content)) {
      return content;
    }

    if (!wasKnown) {
      // Nothing came of it - leave no empty resource behind, or every later
      // attempt would find that instead of loading again.
      resourceSet.getResources().remove(resource);
    }
    return null;
  }

  /**
   * Create the XML loader
   */
  protected createXMLLoad(): XMLLoad {
    return new XMLLoad(this.xmlHelper);
  }

  /**
   * Create the XML saver
   */
  protected createXMLSave(): XMLSave {
    return new XMLSave(this.xmlHelper);
  }

  /**
   * Save to XML string
   */
  saveToString(options?: Map<string, any>): string {
    const opts = options || new Map();
    const saver = this.createXMLSave();
    return saver.save(this, opts);
  }

  /**
   * Save a subset of objects to XML string.
   * Uses this resource's context (IDs, reference resolution) but only
   * serializes the given objects as root elements.
   */
  saveContents(objects: EObject[], options?: Map<string, any>): string {
    const opts = options || new Map();
    const saver = this.createXMLSave();
    return saver.saveObjects(this, objects, opts);
  }

  /**
   * Unload resource
   */
  unload(): void {
    super.unload();
    this.clearIdMaps();
  }
}

/**
 * XMIResource - A resource that loads/saves in XMI format
 */
export class XMIResource extends XMLResource {
  protected createXMLLoad(): XMLLoad {
    return new XMILoad(this.xmlHelper);
  }

  protected override createXMLSave(): XMLSave {
    return new XMISave(this.xmlHelper);
  }
}

/**
 * Convert a ReadableStream to a string
 */
/** The first EPackage among a resource's roots. */
function firstPackageOf(contents: Iterable<EObject>): EPackage | null {
  for (const content of contents) {
    if (isEPackage(content)) {
      return content;
    }
  }
  return null;
}

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // flush
  return result;
}

import { Resource } from '../Resource.js';

/**
 * XMLResource.Factory - Factory for creating XML resources
 */
export class XMLResourceFactory implements Resource.Factory {
  createResource(uri: URI): XMLResource {
    return new XMLResource(uri);
  }
}

/**
 * XMIResource.Factory - Factory for creating XMI resources
 */
export class XMIResourceFactory implements Resource.Factory {
  createResource(uri: URI): XMIResource {
    return new XMIResource(uri);
  }
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { BasicResource } from '../runtime/BasicResource';
import { URI } from '../URI';
import { EObject } from '../EObject';
import { XMLLoad, XMILoad } from './XMLLoad';
import { XMLSave, XMISave } from './XMLSave';
import { XMLHelperImpl } from './XMLHelper';

/**
 * Resource load options
 */
export const OPTION_DEFER_ATTACHMENT = 'DEFER_ATTACHMENT';
export const OPTION_DEFER_IDREF_RESOLUTION = 'DEFER_IDREF_RESOLUTION';
export const OPTION_USE_DEPRECATED_METHODS = 'USE_DEPRECATED_METHODS';
export const OPTION_RECORD_UNKNOWN_FEATURE = 'RECORD_UNKNOWN_FEATURE';
export const OPTION_EXTENDED_META_DATA = 'EXTENDED_META_DATA';

/**
 * XMLResource - A resource that loads/saves in XML format
 */
export class XMLResource extends BasicResource {
  protected idToEObjectMap: Map<string, EObject> = new Map();
  protected eObjectToIDMap: Map<EObject, string> = new Map();
  protected xmlHelper: XMLHelperImpl;

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
   * Load from XML string
   */
  loadFromString(xmlString: string, options?: Map<string, any>): void {
    this.clearIdMaps();
    const opts = options || new Map();
    const loader = this.createXMLLoad();
    loader.load(this, xmlString, opts);
    (this as any).loaded = true;
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

import { Resource } from '../Resource';

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

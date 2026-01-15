/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClass } from '../EClass';
import { EClassifier } from '../EClassifier';
import { EDataType } from '../EDataType';
import { EFactory } from '../EFactory';
import { EObject } from '../EObject';
import { EPackage, EPackageRegistry } from '../EPackage';
import { EReference } from '../EReference';
import { EStructuralFeature } from '../EStructuralFeature';
import { Resource } from '../Resource';
import { URI } from '../URI';
import { InternalEObject, isInternalEObject } from '../InternalEObject';
import { EProxyImpl } from '../runtime/EProxyImpl';
import {
  XMLHelper,
  XMLHelperImpl,
  DATATYPE_SINGLE,
  DATATYPE_IS_MANY,
  IS_MANY_ADD,
  IS_MANY_MOVE,
  OTHER
} from './XMLHelper';

/**
 * Stack types for tracking parse state
 */
export const ERROR_TYPE = 'error';
export const OBJECT_TYPE = 'object';
export const UNKNOWN_FEATURE_TYPE = 'unknownFeature';
export const REFERENCE_TYPE = 'reference';

/**
 * SAX Attributes interface
 */
export interface Attributes {
  getLength(): number;
  getQName(index: number): string;
  getValue(index: number): string;
  getLocalName(index: number): string;
  getURI(index: number): string;
  getValueByQName(qName: string): string | null;
  getValueByName(uri: string, localName: string): string | null;
}

/**
 * Simple Attributes implementation
 */
export class AttributesImpl implements Attributes {
  private attrs: { qName: string; localName: string; uri: string; value: string }[] = [];

  add(qName: string, localName: string, uri: string, value: string): void {
    this.attrs.push({ qName, localName, uri, value });
  }

  clear(): void {
    this.attrs = [];
  }

  getLength(): number {
    return this.attrs.length;
  }

  getQName(index: number): string {
    return this.attrs[index]?.qName || '';
  }

  getValue(index: number): string {
    return this.attrs[index]?.value || '';
  }

  getLocalName(index: number): string {
    return this.attrs[index]?.localName || '';
  }

  getURI(index: number): string {
    return this.attrs[index]?.uri || '';
  }

  getValueByQName(qName: string): string | null {
    const attr = this.attrs.find(a => a.qName === qName);
    return attr?.value ?? null;
  }

  getValueByName(uri: string, localName: string): string | null {
    const attr = this.attrs.find(a => a.uri === uri && a.localName === localName);
    return attr?.value ?? null;
  }
}

/**
 * Forward reference for deferred resolution
 */
interface SingleReference {
  object: EObject;
  feature: EStructuralFeature;
  value: string;
  position: number;
  lineNumber: number;
  columnNumber: number;
}

/**
 * Constants for XML namespaces
 */
export const XSI_URI = 'http://www.w3.org/2001/XMLSchema-instance';
export const XMI_URI = 'http://www.omg.org/XMI';
export const XML_NS = 'xmlns';
export const XSI_NS = 'xsi';
export const XMI_NS = 'xmi';
export const TYPE_ATTRIB = 'type';
export const NIL_ATTRIB = 'nil';
export const SCHEMA_LOCATION_ATTRIB = 'schemaLocation';
export const NO_NAMESPACE_SCHEMA_LOCATION_ATTRIB = 'noNamespaceSchemaLocation';
export const HREF_ATTRIB = 'href';
export const ID_ATTRIB = 'id';

/**
 * XMLHandler - base class for XML loading
 * Handles SAX events and creates EObjects
 */
export class XMLHandler {
  protected resource: Resource;
  protected helper: XMLHelper;

  // Stacks for tracking parse state
  protected elements: string[] = [];
  protected objects: (EObject | null)[] = [];
  protected types: (string | EStructuralFeature)[] = [];

  // Namespace handling
  protected prefixesToFactories: Map<string, EFactory> = new Map();
  protected urisToLocations: Map<string, URI> = new Map();

  // Reference handling
  protected forwardSingleReferences: SingleReference[] = [];
  protected sameDocumentProxies: EObject[] = [];

  // Parse state
  protected attribs: Attributes | null = null;
  protected text: string | null = null;
  protected isRoot: boolean = true;
  protected isNamespaceAware: boolean = false;
  protected needsPushContext: boolean = false;

  // Resource extent
  protected extent: EObject[] = [];
  protected deferredExtent: EObject[] | null = null;

  // Options
  protected resolve: boolean = true;
  protected useNewMethods: boolean = true;
  protected packageRegistry: EPackageRegistry;

  // Error handling
  protected errors: Error[] = [];

  // Line tracking
  protected lineNumber: number = 0;
  protected columnNumber: number = 0;

  constructor(resource: Resource, helper: XMLHelper, options: Map<string, any>) {
    this.resource = resource;
    this.helper = helper;
    this.packageRegistry = resource.getResourceSet()?.getPackageRegistry() || EPackageRegistry.INSTANCE;
    this.extent = resource.getContents();

    if (options) {
      this.processOptions(options);
    }
  }

  protected processOptions(options: Map<string, any>): void {
    this.helper.setOptions(options);
  }

  /**
   * Set attributes for current element
   */
  setAttributes(attribs: Attributes): void {
    this.attribs = attribs;
  }

  /**
   * Handle start of element
   */
  startElement(uri: string, localName: string, qName: string, attributes: Attributes): void {
    this.setAttributes(attributes);
    this.startElementInternal(uri, localName, qName);
  }

  protected startElementInternal(uri: string, localName: string, qName: string): void {
    if (this.needsPushContext) {
      this.helper.pushContext();
    }
    this.needsPushContext = true;

    this.elements.push(qName);
    let prefix = '';

    if (this.useNewMethods) {
      if (this.isRoot) {
        this.handleSchemaLocation();
      }
      prefix = this.helper.getPrefix(uri.length === 0 ? null : uri) || '';
    } else {
      this.handleNamespaceAttribs();
      const index = qName.indexOf(':');
      if (index !== -1) {
        prefix = qName.substring(0, index);
        localName = qName.substring(index + 1);
      }
    }

    this.processElement(qName, prefix, localName);
  }

  protected processElement(name: string, prefix: string, localName: string): void {
    if (this.isRoot) {
      this.isRoot = false;
      this.recordHeaderInformation();
    }

    if (this.objects.length === 0) {
      this.createTopObject(prefix, localName);
    } else {
      this.handleFeature(prefix, localName);
    }
  }

  /**
   * Handle end of element
   */
  endElement(uri: string, localName: string, qName: string): void {
    this.elements.pop();
    const type = this.types.pop();

    if (type === OBJECT_TYPE) {
      const object = this.objects.pop();
      if (this.text !== null && this.text.length > 0 && object) {
        // Handle proxy
        this.handleProxy(object, this.text.trim());
      }
      this.text = null;
    } else if (type === ERROR_TYPE) {
      // Pop the null that was pushed to keep stacks in sync
      this.objects.pop();
      this.text = null;
    } else if (type === REFERENCE_TYPE) {
      // Reference element with href - just pop the null, reference was already handled
      this.objects.pop();
      this.text = null;
    } else if (type !== undefined) {
      // It's a feature
      const eObject = this.objects.pop() || this.objects[this.objects.length - 1];
      if (eObject && type) {
        this.setFeatureValue(eObject, type as EStructuralFeature, this.text);
      }
      this.text = null;
    }

    this.helper.popContextWithFactories(this.prefixesToFactories);
  }

  /**
   * Handle character data
   */
  characters(ch: string): void {
    if (this.text === null) {
      this.text = ch;
    } else {
      this.text += ch;
    }
  }

  /**
   * Handle start of prefix mapping
   */
  startPrefixMapping(prefix: string, uri: string): void {
    this.isNamespaceAware = true;

    if (this.needsPushContext) {
      this.helper.pushContext();
      this.needsPushContext = false;
    }

    this.helper.addPrefix(prefix, uri);
    this.prefixesToFactories.delete(prefix);
  }

  /**
   * Handle end of document
   */
  endDocument(): void {
    if (this.deferredExtent !== null) {
      this.extent.push(...this.deferredExtent);
    }

    this.helper.recordPrefixToURIMapping();
    this.helper.popContext();
    this.handleForwardReferences();
  }

  /**
   * Handle namespace attributes
   */
  protected handleNamespaceAttribs(): void {
    if (this.attribs) {
      for (let i = 0; i < this.attribs.getLength(); i++) {
        const qName = this.attribs.getQName(i);
        if (qName.startsWith(XML_NS)) {
          const prefix = qName.length > 5 ? qName.substring(6) : '';
          const value = this.attribs.getValue(i);
          this.startPrefixMapping(prefix, value);
        }
      }
    }
  }

  /**
   * Handle schema location
   */
  protected handleSchemaLocation(): void {
    if (!this.attribs) return;

    const schemaLocation = this.attribs.getValueByName(XSI_URI, SCHEMA_LOCATION_ATTRIB);
    if (schemaLocation) {
      this.handleXSISchemaLocation(schemaLocation);
    }
  }

  protected handleXSISchemaLocation(schemaLocation: string): void {
    const tokens = schemaLocation.trim().split(/\s+/);
    for (let i = 0; i + 1 < tokens.length; i += 2) {
      const nsURI = tokens[i];
      const location = tokens[i + 1];
      this.urisToLocations.set(nsURI, URI.createURI(location));
    }
  }

  /**
   * Record header information
   */
  protected recordHeaderInformation(): void {
    // Subclasses can override
  }

  /**
   * Create top-level object
   */
  protected createTopObject(prefix: string, localName: string): void {
    const eFactory = this.getFactoryForPrefix(prefix);

    if (!eFactory) {
      this.error(`Package not found for prefix '${prefix}'`);
      this.processObject(null); // Push null to keep stack in sync
      return;
    }

    const eType = this.getXSIType();
    let eObject: EObject | null = null;

    if (eType) {
      eObject = this.createObjectByType(prefix, eType, true);
    } else {
      const type = this.helper.getType(eFactory, localName);
      if (type) {
        eObject = this.helper.createObject(eFactory, type);
      }
    }

    if (eObject) {
      this.processTopObject(eObject);
      this.handleObjectAttribs(eObject);
    } else {
      this.error(`Cannot create object for '${localName}'`);
      this.processObject(null); // Push null to keep stack in sync
    }
  }

  /**
   * Get xsi:type attribute value
   */
  protected getXSIType(): string | null {
    if (!this.attribs) return null;
    return this.attribs.getValueByName(XSI_URI, TYPE_ATTRIB);
  }

  /**
   * Create object based on xsi:type
   */
  protected createObjectByType(prefix: string, typeName: string, isTopObject: boolean): EObject | null {
    // Parse type name (prefix:localName)
    let typePrefix = prefix;
    let localType = typeName;
    const colonIndex = typeName.indexOf(':');
    if (colonIndex !== -1) {
      typePrefix = typeName.substring(0, colonIndex);
      localType = typeName.substring(colonIndex + 1);
    }

    const eFactory = this.getFactoryForPrefix(typePrefix);
    if (!eFactory) {
      this.error(`Factory not found for type '${typeName}'`);
      return null;
    }

    const type = this.helper.getType(eFactory, localType);
    if (!type) {
      this.error(`Type '${localType}' not found`);
      return null;
    }

    return this.helper.createObject(eFactory, type);
  }

  /**
   * Process top-level object
   */
  protected processTopObject(object: EObject): void {
    if (object) {
      if (this.deferredExtent !== null) {
        this.deferredExtent.push(object);
      } else {
        this.extent.push(object);
      }
    }
    this.processObject(object);
  }

  /**
   * Push object onto stack
   */
  protected processObject(object: EObject | null): void {
    this.objects.push(object);
    this.types.push(object ? OBJECT_TYPE : ERROR_TYPE);
  }

  /**
   * Handle object attributes
   */
  protected handleObjectAttribs(obj: EObject): void {
    if (!this.attribs) return;

    for (let i = 0; i < this.attribs.getLength(); i++) {
      const qName = this.attribs.getQName(i);
      const value = this.attribs.getValue(i);
      const uri = this.attribs.getURI(i);
      const localName = this.attribs.getLocalName(i);

      // Skip namespace declarations
      if (qName.startsWith(XML_NS)) continue;

      // Skip xsi attributes
      if (uri === XSI_URI) continue;

      // Skip xmi attributes
      if (uri === XMI_URI) {
        if (localName === ID_ATTRIB) {
          // Handle ID
          this.handleId(obj, value);
        }
        continue;
      }

      // Set attribute value
      this.setAttribValue(obj, localName || qName, value);
    }
  }

  /**
   * Handle ID attribute
   */
  protected handleId(obj: EObject, id: string): void {
    // Can be overridden to store IDs
  }

  /**
   * Set attribute value on object
   */
  protected setAttribValue(obj: EObject, name: string, value: string): void {
    const eClass = obj.eClass();
    const feature = this.helper.getFeature(eClass, null, name);

    if (feature) {
      this.setFeatureValue(obj, feature, value, -2);
    }
  }

  /**
   * Handle feature (nested element)
   */
  protected handleFeature(prefix: string, localName: string): void {
    const peekObject = this.objects[this.objects.length - 1];

    if (!peekObject) {
      this.objects.push(null); // Push null to keep stack in sync with types
      this.types.push(ERROR_TYPE);
      this.error(`Feature '${localName}' has no parent object`);
      return;
    }

    const eClass = peekObject.eClass();
    const feature = this.helper.getFeatureWithElement(eClass, null, localName, true);

    if (feature) {
      const kind = this.helper.getFeatureKind(feature);

      if (kind === DATATYPE_SINGLE || kind === DATATYPE_IS_MANY) {
        // Data type value - text content
        this.objects.push(null);
        this.types.push(feature);
        if (!this.isNull()) {
          this.text = '';
        }
      } else {
        // Reference - create child object
        this.createObject(peekObject, feature);
      }
    } else {
      this.handleUnknownFeature(prefix, localName, peekObject);
    }
  }

  /**
   * Check if xsi:nil="true"
   */
  protected isNull(): boolean {
    if (!this.attribs) return false;
    const nil = this.attribs.getValueByName(XSI_URI, NIL_ATTRIB);
    return nil === 'true';
  }

  /**
   * Create child object for reference
   */
  protected createObject(parent: EObject, feature: EStructuralFeature): void {
    // Check for href attribute - indicates a reference, not containment
    const href = this.attribs?.getValueByQName(HREF_ATTRIB) || this.attribs?.getValueByName('', HREF_ATTRIB);
    if (href) {
      // This is a reference element with href - handle as reference
      this.setValueFromId(parent, feature as EReference, href, -1);
      // Push reference type to track this element (no object created)
      this.objects.push(null);
      this.types.push(REFERENCE_TYPE);
      return;
    }

    const xsiType = this.getXSIType();
    let eObject: EObject | null = null;

    if (xsiType) {
      eObject = this.createObjectByType('', xsiType, false);
    } else {
      // Use feature type
      const eType = feature.getEType();
      if (eType && 'getESuperTypes' in eType) {
        const eClass = eType as EClass;
        if (!eClass.isAbstract()) {
          const eFactory = eClass.getEPackage()?.getEFactoryInstance();
          if (eFactory) {
            eObject = eFactory.create(eClass);
          }
        }
      }
    }

    if (eObject) {
      // Set value on parent
      this.helper.setValue(parent, feature, eObject, -1);
      this.handleObjectAttribs(eObject);
    }

    this.processObject(eObject);
  }

  /**
   * Handle unknown feature
   */
  protected handleUnknownFeature(prefix: string, name: string, parent: EObject): void {
    this.objects.push(null); // Push null to keep stack in sync with types
    this.types.push(ERROR_TYPE);
    this.error(`Unknown feature '${name}' for type '${parent.eClass().getName()}'`);
  }

  /**
   * Set feature value
   */
  protected setFeatureValue(eObject: EObject, feature: EStructuralFeature, value: string | null, position: number = -1): void {
    if (value === null || value === undefined) return;

    const eType = feature.getEType();

    if (eType && !('getESuperTypes' in eType)) {
      // It's a data type
      const dataType = eType as EDataType;
      // Handle both static and dynamic EDataType objects
      let eFactory: import('../EFactory').EFactory | null = null;
      if (typeof dataType.getEPackage === 'function') {
        eFactory = dataType.getEPackage()?.getEFactoryInstance() ?? null;
      } else if (typeof (dataType as any).eGet === 'function' && typeof (dataType as any).eClass === 'function') {
        // For dynamic objects, get package via eGet
        const dtClass = (dataType as any).eClass();
        if (dtClass) {
          const pkgFeature = dtClass.getEStructuralFeature?.('ePackage');
          if (pkgFeature) {
            const pkg = (dataType as any).eGet(pkgFeature);
            if (pkg?.getEFactoryInstance) {
              eFactory = pkg.getEFactoryInstance();
            }
          }
        }
      }
      if (eFactory) {
        const convertedValue = eFactory.createFromString(dataType, value);
        this.helper.setValue(eObject, feature, convertedValue, position);
      } else {
        // Fallback: just use the string value directly for basic types
        this.helper.setValue(eObject, feature, value, position);
      }
    } else {
      // It's a reference - handle as ID
      this.setValueFromId(eObject, feature as EReference, value, position);
    }
  }

  /**
   * Set reference value from ID
   */
  protected setValueFromId(eObject: EObject, feature: EReference, idValue: string, position: number = -1): void {
    // Handle as forward reference
    this.forwardSingleReferences.push({
      object: eObject,
      feature,
      value: idValue,
      position,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber
    });
  }

  /**
   * Handle forward references
   */
  protected handleForwardReferences(): void {
    for (const ref of this.forwardSingleReferences) {
      const resolved = this.resolveReference(ref.value);
      if (resolved) {
        this.helper.setValue(ref.object, ref.feature, resolved, ref.position);
      } else {
        // Create a proxy for unresolved reference
        const proxy = this.createProxy(ref.feature as EReference, ref.value);
        if (proxy) {
          this.helper.setValue(ref.object, ref.feature, proxy, ref.position);
        } else {
          this.error(`Unresolved reference '${ref.value}'`);
        }
      }
    }
    this.forwardSingleReferences = [];
  }

  /**
   * Creates a proxy for an unresolved reference.
   * The proxy will be resolved when accessed.
   */
  protected createProxy(feature: EReference, uriValue: string): EObject | null {
    // Determine the proxy URI
    let proxyURI: URI;

    // Handle EMF typed reference format: "prefix:TypeName URI#fragment"
    const spaceIndex = uriValue.indexOf(' ');
    if (spaceIndex > 0) {
      uriValue = uriValue.substring(spaceIndex + 1);
    }

    const hashIndex = uriValue.indexOf('#');
    if (hashIndex > 0) {
      // External URI with fragment
      proxyURI = URI.createURI(uriValue);
    } else if (hashIndex === 0) {
      // Same-resource fragment reference
      const resourceURI = this.resource.getURI();
      if (resourceURI) {
        proxyURI = URI.createURI(resourceURI.toString() + uriValue);
      } else {
        proxyURI = URI.createURI(uriValue);
      }
    } else if (uriValue.startsWith('/')) {
      // Path reference - make it a fragment
      const resourceURI = this.resource.getURI();
      if (resourceURI) {
        proxyURI = URI.createURI(resourceURI.toString() + '#' + uriValue);
      } else {
        proxyURI = URI.createURI('#' + uriValue);
      }
    } else {
      // Simple ID reference
      const resourceURI = this.resource.getURI();
      if (resourceURI) {
        proxyURI = URI.createURI(resourceURI.toString() + '#' + uriValue);
      } else {
        proxyURI = URI.createURI('#' + uriValue);
      }
    }

    // Get the expected type from the reference
    const eType = feature.getEType();
    const eClass = eType && 'getESuperTypes' in eType ? eType as EClass : null;

    // Create the proxy
    const proxy = new EProxyImpl(proxyURI, eClass || undefined);
    proxy.eSetResource(this.resource);

    return proxy;
  }

  /**
   * Resolve a reference string.
   * Supports:
   * - Fragment references: #//EString or //EString
   * - External URIs: http://www.eclipse.org/emf/2002/Ecore#//EString
   * - Typed references: ecore:EClass audiogram.ecore#//HIMSAAudiometricStandardType
   * - Local IDs: someId
   */
  protected resolveReference(ref: string): EObject | null {
    // Handle EMF typed reference format: "prefix:TypeName URI#fragment"
    // Example: "ecore:EClass audiogram.ecore#//HIMSAAudiometricStandardType"
    // The space separates the type indicator from the actual URI
    const spaceIndex = ref.indexOf(' ');
    if (spaceIndex > 0) {
      // Extract the actual URI after the type prefix
      ref = ref.substring(spaceIndex + 1);
    }

    // Check for external URI (contains :// or starts with a scheme like http:, platform:, etc.)
    const hashIndex = ref.indexOf('#');
    if (hashIndex > 0) {
      // External URI with fragment (e.g., http://www.eclipse.org/emf/2002/Ecore#//EString)
      const baseURI = ref.substring(0, hashIndex);
      const fragment = ref.substring(hashIndex + 1);

      // Check if this is a same-resource reference
      const currentURI = this.resource.getURI();
      if (currentURI && currentURI.toString() === baseURI) {
        // Same resource - resolve directly
        return this.resource.getEObject(fragment);
      }

      // FIRST: try package registry directly (for registered packages like Ecore, XMLType)
      const ePackage = this.packageRegistry.getEPackage(baseURI);
      if (ePackage) {
        return this.resolveFragmentInPackage(ePackage, fragment);
      }

      // FALLBACK: Try to resolve via ResourceSet (for file-based resources)
      const resourceSet = this.resource.getResourceSet();
      if (resourceSet) {
        const uri = URI.createURI(baseURI);
        const externalResource = resourceSet.getResource(uri, true);
        if (externalResource) {
          return externalResource.getEObject(fragment);
        }
      }

      return null;
    }

    // Fragment reference starting with #
    if (ref.startsWith('#')) {
      return this.resource.getEObject(ref.substring(1));
    }

    // Path reference starting with /
    if (ref.startsWith('/')) {
      return this.resource.getEObject(ref);
    }

    // Simple ID reference - try to find in current resource
    return this.resource.getEObject(ref);
  }

  /**
   * Resolve a fragment path within an EPackage.
   * Handles paths like //EString, //EClass, etc.
   */
  protected resolveFragmentInPackage(ePackage: EPackage, fragment: string): EObject | null {
    // Remove leading slashes
    let path = fragment;
    while (path.startsWith('/')) {
      path = path.substring(1);
    }

    if (!path) {
      return ePackage as unknown as EObject;
    }

    // Split by / for nested paths
    const segments = path.split('/');

    // First segment is the classifier name
    const classifierName = segments[0];
    const classifier = ePackage.getEClassifier(classifierName);

    if (!classifier) {
      return null;
    }

    // If there are more segments, we need to navigate deeper
    // For now, just return the classifier
    if (segments.length === 1) {
      return classifier as unknown as EObject;
    }

    // Handle nested navigation (e.g., //EClass/eStructuralFeatures/name)
    // This would require more complex navigation logic
    return classifier as unknown as EObject;
  }

  /**
   * Handle proxy reference
   */
  protected handleProxy(object: EObject, text: string): void {
    // Default implementation - can be overridden
  }

  /**
   * Get factory for prefix
   */
  protected getFactoryForPrefix(prefix: string): EFactory | null {
    let factory = this.prefixesToFactories.get(prefix);
    if (factory) {
      return factory;
    }

    const nsURI = this.helper.getURI(prefix);
    if (nsURI) {
      const ePackage = this.packageRegistry.getEPackage(nsURI);
      if (ePackage) {
        factory = ePackage.getEFactoryInstance();
        if (factory) {
          this.prefixesToFactories.set(prefix, factory);
          return factory;
        }
      }
    }

    return null;
  }

  /**
   * Report error
   */
  protected error(message: string): void {
    const error = new Error(`[Line ${this.lineNumber}, Col ${this.columnNumber}] ${message}`);
    this.errors.push(error);
    console.error(error.message);
  }

  /**
   * Get errors
   */
  getErrors(): Error[] {
    return this.errors;
  }
}

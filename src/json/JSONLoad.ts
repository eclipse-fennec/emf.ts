/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EClassifier } from '../EClassifier.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EReference } from '../EReference.js';
import { EAttribute } from '../EAttribute.js';
import { EDataType } from '../EDataType.js';
import { EFactory } from '../EFactory.js';
import { EPackage, EPackageRegistry } from '../EPackage.js';
import { Resource } from '../Resource.js';
import { URI } from '../URI.js';
import { isEList } from '../EList.js';
import { EProxyImpl } from '../runtime/EProxyImpl.js';
import { resolveClassifierInPackage } from '../runtime/resolveClassifierInPackage.js';

/**
 * Forward reference to be resolved after loading.
 */
interface ForwardReference {
  object: EObject;
  feature: EStructuralFeature;
  value: string;
}

/**
 * JSONLoad - Deserializes emfjson-compatible JSON to EObject trees.
 *
 * Expected format:
 * - `eClass`: type URI (nsURI#//ClassName)
 * - Attributes: JSON primitives
 * - Containment references: nested objects / arrays
 * - Cross-references: `{ "$ref": "uri#fragment" }` objects
 */
export class JSONLoad {
  protected resource!: Resource;
  protected packageRegistry!: EPackageRegistry;
  protected forwardReferences: ForwardReference[] = [];
  protected errors: Error[] = [];

  /**
   * Load a JSON string into the resource.
   */
  load(resource: Resource, jsonString: string, options?: Map<string, any>): void {
    this.resource = resource;
    this.packageRegistry = resource.getResourceSet()?.getPackageRegistry() || EPackageRegistry.INSTANCE;
    this.forwardReferences = [];
    this.errors = [];

    let json: any;
    try {
      json = JSON.parse(jsonString);
    } catch (e) {
      this.error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    if (Array.isArray(json)) {
      // Multiple root objects
      for (const item of json) {
        const obj = this.loadObject(item);
        if (obj) {
          resource.getContents().push(obj);
        }
      }
    } else if (json && typeof json === 'object') {
      // Single root object
      const obj = this.loadObject(json);
      if (obj) {
        resource.getContents().push(obj);
      }
    }

    // Resolve forward references
    this.handleForwardReferences();
  }

  /**
   * Load a single JSON object into an EObject.
   */
  protected loadObject(json: Record<string, any>, expectedType?: EClass): EObject | null {
    // Resolve the EClass
    const eClass = this.resolveEClass(json, expectedType);
    if (!eClass) {
      this.error(`Cannot determine type for object: ${JSON.stringify(json).substring(0, 100)}`);
      return null;
    }

    // Create the object via its factory
    const pkg = eClass.getEPackage();
    if (!pkg) {
      this.error(`No package for class '${eClass.getName()}'`);
      return null;
    }

    const factory = pkg.getEFactoryInstance();
    const obj = factory.create(eClass);

    // Process all properties
    for (const [key, value] of Object.entries(json)) {
      if (key === 'eClass') continue; // Already processed
      if (value === null || value === undefined) continue;

      const feature = eClass.getEStructuralFeature(key);
      if (!feature) {
        this.error(`Unknown feature '${key}' for type '${eClass.getName()}'`);
        continue;
      }

      if (this.isAttribute(feature)) {
        this.loadAttribute(obj, feature as EAttribute, value);
      } else {
        const ref = feature as EReference;
        if (ref.isContainment()) {
          this.loadContainment(obj, ref, value);
        } else {
          this.loadCrossReference(obj, ref, value);
        }
      }
    }

    return obj;
  }

  /**
   * Resolve the EClass for a JSON object.
   * Uses `eClass` property if present, otherwise falls back to expectedType.
   */
  protected resolveEClass(json: Record<string, any>, expectedType?: EClass): EClass | null {
    const eClassURI = json['eClass'] as string | undefined;
    if (eClassURI) {
      return this.resolveType(eClassURI);
    }
    return expectedType || null;
  }

  /**
   * Resolve an eClass type URI (`nsURI#//ClassName`) to an EClass.
   */
  protected resolveType(eClassURI: string): EClass | null {
    const hashIndex = eClassURI.indexOf('#');
    if (hashIndex < 0) {
      this.error(`Invalid eClass URI (no '#'): ${eClassURI}`);
      return null;
    }

    const nsURI = eClassURI.substring(0, hashIndex);
    let fragment = eClassURI.substring(hashIndex + 1);

    // Remove leading slashes from fragment (e.g., //ClassName -> ClassName)
    while (fragment.startsWith('/')) {
      fragment = fragment.substring(1);
    }

    const pkg = this.packageRegistry.getEPackage(nsURI);
    if (!pkg) {
      this.error(`Package not found for nsURI: ${nsURI}`);
      return null;
    }

    const classifier = pkg.getEClassifier(fragment);
    if (!classifier) {
      this.error(`Classifier '${fragment}' not found in package '${nsURI}'`);
      return null;
    }

    if (!('getESuperTypes' in classifier)) {
      this.error(`'${fragment}' is not an EClass`);
      return null;
    }

    return classifier as EClass;
  }

  /**
   * Load an attribute value.
   */
  protected loadAttribute(obj: EObject, attr: EAttribute, value: any): void {
    if (attr.isMany()) {
      const items = Array.isArray(value) ? value : [value];
      const list = obj.eGet(attr);
      if (list && (Array.isArray(list) || isEList(list))) {
        for (const item of items) {
          list.push(this.convertAttributeValue(attr, item));
        }
      } else {
        obj.eSet(attr, items.map(v => this.convertAttributeValue(attr, v)));
      }
    } else {
      obj.eSet(attr, this.convertAttributeValue(attr, value));
    }
  }

  /**
   * Convert a JSON value to the appropriate attribute type using EFactory.createFromString.
   */
  protected convertAttributeValue(attr: EAttribute, value: any): any {
    if (value === null || value === undefined) return null;

    // If already a primitive matching expected type, use directly
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Try EFactory conversion for string values
      if (typeof value === 'string') {
        const eType = attr.getEType();
        if (eType && 'getEPackage' in eType) {
          const pkg = (eType as EDataType).getEPackage();
          if (pkg) {
            const factory = pkg.getEFactoryInstance();
            if (factory) {
              try {
                return factory.createFromString(eType as EDataType, value);
              } catch {
                // Fallback to raw value
              }
            }
          }
        }
      }
      return value;
    }

    return value;
  }

  /**
   * Load a containment reference value (nested objects).
   */
  protected loadContainment(obj: EObject, ref: EReference, value: any): void {
    const expectedType = ref.getEType() && 'getESuperTypes' in ref.getEType()!
      ? ref.getEType() as EClass
      : undefined;

    if (ref.isMany()) {
      const items = Array.isArray(value) ? value : [value];
      const list = obj.eGet(ref);
      for (const item of items) {
        if (item && typeof item === 'object') {
          const child = this.loadObject(item, expectedType);
          if (child) {
            if (list && (Array.isArray(list) || isEList(list))) {
              list.push(child);
            }
          }
        }
      }
    } else {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const child = this.loadObject(value, expectedType);
        if (child) {
          obj.eSet(ref, child);
        }
      }
    }
  }

  /**
   * Load a cross-reference value (`{ "$ref": "uri#fragment" }`).
   */
  protected loadCrossReference(obj: EObject, ref: EReference, value: any): void {
    if (ref.isMany()) {
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (item && typeof item === 'object' && '$ref' in item) {
          this.forwardReferences.push({
            object: obj,
            feature: ref,
            value: item['$ref'] as string
          });
        }
      }
    } else {
      if (value && typeof value === 'object' && '$ref' in value) {
        this.forwardReferences.push({
          object: obj,
          feature: ref,
          value: value['$ref'] as string
        });
      }
    }
  }

  /**
   * Resolve all forward references collected during loading.
   */
  protected handleForwardReferences(): void {
    for (const fwdRef of this.forwardReferences) {
      const resolved = this.resolveReference(fwdRef.value);
      if (resolved) {
        this.setReferenceValue(fwdRef.object, fwdRef.feature, resolved);
      } else {
        // Create proxy for unresolved reference
        const proxy = this.createProxy(fwdRef.feature as EReference, fwdRef.value);
        if (proxy) {
          this.setReferenceValue(fwdRef.object, fwdRef.feature, proxy);
        } else {
          this.error(`Unresolved reference: ${fwdRef.value}`);
        }
      }
    }
    this.forwardReferences = [];
  }

  /**
   * Set a reference value on an object (handles single and multi-valued).
   */
  protected setReferenceValue(obj: EObject, feature: EStructuralFeature, value: EObject): void {
    if (feature.isMany()) {
      const list = obj.eGet(feature);
      if (list && (Array.isArray(list) || isEList(list))) {
        list.push(value);
      }
    } else {
      obj.eSet(feature, value);
    }
  }

  /**
   * Resolve a $ref URI to an EObject.
   */
  protected resolveReference(ref: string): EObject | null {
    const hashIndex = ref.indexOf('#');

    if (hashIndex > 0) {
      // External URI with fragment
      const baseURI = ref.substring(0, hashIndex);
      const fragment = ref.substring(hashIndex + 1);

      // Same-resource reference?
      const currentURI = this.resource.getURI();
      if (currentURI && currentURI.toString() === baseURI) {
        return this.resource.getEObject(fragment);
      }

      // Try package registry
      const ePackage = this.packageRegistry.getEPackage(baseURI);
      if (ePackage) {
        return this.resolveFragmentInPackage(ePackage, fragment);
      }

      // Try ResourceSet
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

    // Path reference
    if (ref.startsWith('/')) {
      return this.resource.getEObject(ref);
    }

    // Simple ID
    return this.resource.getEObject(ref);
  }

  /**
   * Resolve a fragment path within an EPackage.
   */
  protected resolveFragmentInPackage(ePackage: EPackage, fragment: string): EObject | null {
    let path = fragment;
    while (path.startsWith('/')) {
      path = path.substring(1);
    }

    if (!path) {
      return ePackage as unknown as EObject;
    }

    const segments = path.split('/');

    // Try resolving as subpackage path first
    const classifier = resolveClassifierInPackage(ePackage, path);
    if (classifier) {
      return classifier as unknown as EObject;
    }

    // If that failed and we have 2+ segments, try ClassName/featureName pattern:
    // Navigate subpackages for all but last 2 segments, then resolve classifier + feature
    if (segments.length >= 2) {
      let currentPkg: EPackage = ePackage;

      // Navigate subpackages (all segments except last two)
      for (let i = 0; i < segments.length - 2; i++) {
        const subPackages = currentPkg.getESubpackages();
        let found: EPackage | null = null;
        for (let j = 0; j < subPackages.length; j++) {
          if (subPackages.get(j).getName() === segments[i]) {
            found = subPackages.get(j);
            break;
          }
        }
        if (!found) return null;
        currentPkg = found;
      }

      // Second-to-last segment: classifier
      const classifierName = segments[segments.length - 2];
      const eClassifier = currentPkg.getEClassifier(classifierName);
      if (eClassifier && 'getEStructuralFeature' in eClassifier) {
        const feature = (eClassifier as EClass).getEStructuralFeature(segments[segments.length - 1]);
        if (feature) {
          return feature as unknown as EObject;
        }
      }
    }

    return null;
  }

  /**
   * Create a proxy for an unresolved reference.
   */
  protected createProxy(feature: EReference, uriValue: string): EObject | null {
    let proxyURI: URI;

    const hashIndex = uriValue.indexOf('#');
    if (hashIndex > 0) {
      proxyURI = URI.createURI(uriValue);
    } else if (hashIndex === 0) {
      const resourceURI = this.resource.getURI();
      if (resourceURI) {
        proxyURI = URI.createURI(resourceURI.toString() + uriValue);
      } else {
        proxyURI = URI.createURI(uriValue);
      }
    } else {
      const resourceURI = this.resource.getURI();
      if (resourceURI) {
        proxyURI = URI.createURI(resourceURI.toString() + '#' + uriValue);
      } else {
        proxyURI = URI.createURI('#' + uriValue);
      }
    }

    const eType = feature.getEType();
    const eClass = eType && 'getESuperTypes' in eType ? eType as EClass : null;

    const proxy = new EProxyImpl(proxyURI, eClass || undefined);
    proxy.eSetResource(this.resource);

    return proxy;
  }

  /**
   * Check if a feature is an EAttribute (not an EReference).
   */
  protected isAttribute(feature: EStructuralFeature): boolean {
    return !('isContainment' in feature);
  }

  /**
   * Report an error.
   */
  protected error(message: string): void {
    this.errors.push(new Error(message));
  }

  /**
   * Get accumulated errors.
   */
  getErrors(): Error[] {
    return this.errors;
  }
}

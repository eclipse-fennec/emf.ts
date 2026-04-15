/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EReference } from '../EReference.js';
import { EAttribute } from '../EAttribute.js';
import { EDataType } from '../EDataType.js';
import { Resource } from '../Resource.js';
import { isEList } from '../EList.js';
import { InternalEObject, isInternalEObject } from '../InternalEObject.js';

/**
 * Options for JSON serialization
 */
export const OPTION_SERIALIZE_TYPE = 'SERIALIZE_TYPE';
export const OPTION_INDENT = 'INDENT';

/** Always write eClass property */
export const SERIALIZE_TYPE_ALWAYS = 'always';
/** Only write eClass when type differs from declared feature type (default) */
export const SERIALIZE_TYPE_POLYMORPHIC = 'polymorphic';

/**
 * JSONSave - Serializes EObjects to emfjson-compatible JSON format.
 *
 * Format:
 * - `eClass`: type URI (nsURI#//ClassName), at root and for polymorphic types
 * - Attributes: JSON primitives
 * - Containment references: nested objects / arrays
 * - Cross-references: `{ "$ref": "uri#fragment" }` objects
 * - Multi-valued attributes: JSON arrays
 * - Enums: string literal name
 */
export class JSONSave {
  protected resource!: Resource;
  protected serializeType: string = SERIALIZE_TYPE_POLYMORPHIC;
  protected indent: number = 2;

  /**
   * Serialize resource contents to JSON string.
   */
  save(resource: Resource, options?: Map<string, any>): string {
    this.resource = resource;

    if (options) {
      if (options.has(OPTION_SERIALIZE_TYPE)) {
        this.serializeType = options.get(OPTION_SERIALIZE_TYPE);
      }
      if (options.has(OPTION_INDENT)) {
        this.indent = options.get(OPTION_INDENT);
      }
    }

    const contents = resource.getContents();
    if (contents.size() === 0) {
      return '{}';
    }

    if (contents.size() === 1) {
      const obj = this.saveObject(contents.get(0), undefined, true);
      return JSON.stringify(obj, null, this.indent);
    }

    // Multiple root objects
    const arr = [];
    for (const root of contents) {
      arr.push(this.saveObject(root, undefined, true));
    }
    return JSON.stringify(arr, null, this.indent);
  }

  /**
   * Convert an EObject to a plain JS object for JSON serialization.
   */
  saveObject(obj: EObject, feature?: EStructuralFeature, isRoot: boolean = false): Record<string, any> {
    const result: Record<string, any> = {};
    const eClass = obj.eClass();

    // Write eClass if needed
    if (this.shouldSaveType(obj, feature, isRoot)) {
      result['eClass'] = this.getEClassURI(eClass);
    }

    // Serialize all structural features
    for (const feat of eClass.getEAllStructuralFeatures()) {
      if (feat.isTransient() || feat.isDerived()) continue;

      const value = obj.eGet(feat);
      if (value === null || value === undefined) continue;

      if (this.isAttribute(feat)) {
        this.saveAttribute(result, obj, feat as EAttribute, value);
      } else {
        const ref = feat as EReference;
        if (ref.isContainment()) {
          this.saveContainment(result, obj, ref, value);
        } else {
          this.saveCrossReference(result, obj, ref, value);
        }
      }
    }

    return result;
  }

  /**
   * Serialize an attribute value.
   */
  protected saveAttribute(result: Record<string, any>, obj: EObject, attr: EAttribute, value: any): void {
    // Check default value - skip if value equals default
    try {
      const defaultValue = attr.getDefaultValue();
      if (value === defaultValue) return;
    } catch {
      // Ignore - no default
    }

    const name = attr.getName()!;

    if (attr.isMany()) {
      const items = Array.isArray(value) || isEList(value) ? [...value] : [value];
      if (items.length === 0) return;
      result[name] = items.map(v => this.convertAttributeValue(attr, v));
    } else {
      result[name] = this.convertAttributeValue(attr, value);
    }
  }

  /**
   * Convert a single attribute value to a JSON-compatible value.
   */
  protected convertAttributeValue(attr: EAttribute, value: any): any {
    if (value === null || value === undefined) return null;

    // Primitives pass through directly
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Use EFactory.convertToString for complex types
    const eType = attr.getEType();
    if (eType && 'getEPackage' in eType) {
      const pkg = (eType as EDataType).getEPackage();
      if (pkg) {
        const factory = pkg.getEFactoryInstance();
        if (factory) {
          return factory.convertToString(eType as EDataType, value);
        }
      }
    }

    return String(value);
  }

  /**
   * Serialize a containment reference.
   * Proxies inside containment are serialized as `{ "$ref": "uri" }` (emfjson-jackson convention).
   */
  protected saveContainment(result: Record<string, any>, obj: EObject, ref: EReference, value: any): void {
    const name = ref.getName()!;

    if (ref.isMany()) {
      const items = Array.isArray(value) || isEList(value) ? [...value] : [value];
      if (items.length === 0) return;
      result[name] = items.map((child: EObject) => this.saveContainedChild(child, ref));
    } else {
      result[name] = this.saveContainedChild(value as EObject, ref);
    }
  }

  /**
   * Serialize a single contained child. Proxies become `{ "$ref": "..." }`.
   */
  protected saveContainedChild(child: EObject, ref: EReference): Record<string, any> {
    if (isInternalEObject(child) && child.eIsProxy()) {
      const href = child.eProxyURI()?.toString();
      if (href) {
        return { '$ref': href };
      }
    }
    return this.saveObject(child, ref);
  }

  /**
   * Serialize a cross-reference (non-containment) as `{ "$ref": "uri#fragment" }`.
   */
  protected saveCrossReference(result: Record<string, any>, obj: EObject, ref: EReference, value: any): void {
    const name = ref.getName()!;

    if (ref.isMany()) {
      const items = Array.isArray(value) || isEList(value) ? [...value] : [value];
      if (items.length === 0) return;
      const refs = [];
      for (const item of items) {
        const href = this.getHref(item as EObject);
        if (href) {
          refs.push({ '$ref': href });
        }
      }
      if (refs.length > 0) {
        result[name] = refs;
      }
    } else {
      const href = this.getHref(value as EObject);
      if (href) {
        result[name] = { '$ref': href };
      }
    }
  }

  /**
   * Determine whether the eClass type URI should be written.
   */
  protected shouldSaveType(obj: EObject, feature?: EStructuralFeature, isRoot: boolean = false): boolean {
    if (this.serializeType === SERIALIZE_TYPE_ALWAYS) {
      return true;
    }

    // Always write on root objects
    if (isRoot) {
      return true;
    }

    // For polymorphic mode: write only if actual type differs from declared type
    if (feature && 'isContainment' in feature) {
      const ref = feature as EReference;
      const declaredType = ref.getEType();
      const actualType = obj.eClass();
      if (declaredType && actualType && declaredType !== actualType) {
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Get the emfjson-style type URI for an EClass: `nsURI#//ClassName`
   */
  protected getEClassURI(eClass: EClass): string {
    const pkg = eClass.getEPackage();
    const nsURI = pkg?.getNsURI();
    const name = eClass.getName();
    if (nsURI && name) {
      return `${nsURI}#//${name}`;
    }
    return name || 'Unknown';
  }

  /**
   * Get href for a cross-referenced object.
   * Reuses the pattern from XMLSave.getHref().
   */
  protected getHref(obj: EObject): string | null {
    // Handle proxies
    if (isInternalEObject(obj) && obj.eIsProxy()) {
      const proxyURI = obj.eProxyURI();
      return proxyURI?.toString() || null;
    }

    const resource = obj.eResource?.();

    if (resource) {
      const fragment = resource.getURIFragment(obj);
      const uri = resource.getURI();
      if (uri && fragment) {
        return `${uri.toString()}#${fragment}`;
      }
      if (fragment) {
        return `#${fragment}`;
      }
    }

    // Handle EStructuralFeature
    if ('getEContainingClass' in obj && typeof (obj as any).getEContainingClass === 'function') {
      const containingClass = (obj as any).getEContainingClass();
      if (containingClass) {
        const pkg = containingClass.getEPackage?.();
        const className = containingClass.getName?.();
        const featureName = (obj as any).getName?.();
        if (pkg && className && featureName) {
          const nsURI = pkg.getNsURI?.();
          if (nsURI) {
            return `${nsURI}#//${className}/${featureName}`;
          }
        }
      }
    }

    // Handle EClassifier
    if ('getEPackage' in obj && typeof (obj as any).getEPackage === 'function') {
      const pkg = (obj as any).getEPackage();
      if (pkg) {
        const nsURI = pkg.getNsURI?.();
        const name = (obj as any).getName?.();
        if (nsURI && name) {
          return `${nsURI}#//${name}`;
        }
      }
    }

    // Fallback
    if ('getName' in obj) {
      const name = (obj as any).getName?.();
      if (name) {
        return `//${name}`;
      }
    }

    return null;
  }

  /**
   * Check if a feature is an EAttribute (not an EReference).
   */
  protected isAttribute(feature: EStructuralFeature): boolean {
    return !('isContainment' in feature);
  }
}

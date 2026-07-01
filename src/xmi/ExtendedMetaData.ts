/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClass } from '../EClass.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EModelElement } from '../EModelElement.js';

/**
 * Annotation source for ExtendedMetaData
 */
export const ANNOTATION_URI = 'http:///org/eclipse/emf/ecore/util/ExtendedMetaData';

/**
 * Content kind constants (class-level)
 */
export const UNSPECIFIED_CONTENT = 0;
export const EMPTY_CONTENT = 1;
export const SIMPLE_CONTENT = 2;
export const MIXED_CONTENT = 3;
export const ELEMENT_ONLY_CONTENT = 4;

/**
 * Feature kind constants
 */
export const UNSPECIFIED_FEATURE = 0;
export const SIMPLE_FEATURE = 1;
export const ELEMENT_FEATURE = 2;
export const ATTRIBUTE_FEATURE = 3;
export const ELEMENT_WILDCARD_FEATURE = 4;
export const ATTRIBUTE_WILDCARD_FEATURE = 5;
export const GROUP_FEATURE = 6;

/**
 * ExtendedMetaData - Utility for reading EMF ExtendedMetaData annotations
 * from Ecore model elements.
 *
 * These annotations control how XML elements and attributes map to
 * EStructuralFeatures, supporting XSD-derived models.
 */
export class ExtendedMetaData {
  // Cache for performance
  private contentKindCache = new Map<EClass, number>();
  private featureKindCache = new Map<EStructuralFeature, number>();
  private nameCache = new Map<EStructuralFeature, string | null>();
  private namespaceCache = new Map<EStructuralFeature, string | null>();
  private simpleContentFeatureCache = new Map<EClass, EStructuralFeature | null>();

  /**
   * Get the content kind for a class (class-level annotation).
   */
  getContentKind(eClass: EClass): number {
    let kind = this.contentKindCache.get(eClass);
    if (kind !== undefined) return kind;

    kind = UNSPECIFIED_CONTENT;
    const kindStr = this.getAnnotationDetail(eClass as unknown as EModelElement, 'kind');
    if (kindStr) {
      switch (kindStr) {
        case 'simple': kind = SIMPLE_CONTENT; break;
        case 'mixed': kind = MIXED_CONTENT; break;
        case 'empty': kind = EMPTY_CONTENT; break;
        case 'elementOnly': kind = ELEMENT_ONLY_CONTENT; break;
      }
    }

    this.contentKindCache.set(eClass, kind);
    return kind;
  }

  /**
   * Get the feature kind (element, attribute, simple, etc.)
   */
  getFeatureKind(feature: EStructuralFeature): number {
    let kind = this.featureKindCache.get(feature);
    if (kind !== undefined) return kind;

    kind = UNSPECIFIED_FEATURE;
    const kindStr = this.getAnnotationDetail(feature as unknown as EModelElement, 'kind');
    if (kindStr) {
      switch (kindStr) {
        case 'simple': kind = SIMPLE_FEATURE; break;
        case 'element': kind = ELEMENT_FEATURE; break;
        case 'attribute': kind = ATTRIBUTE_FEATURE; break;
        case 'elementWildcard': kind = ELEMENT_WILDCARD_FEATURE; break;
        case 'attributeWildcard': kind = ATTRIBUTE_WILDCARD_FEATURE; break;
        case 'group': kind = GROUP_FEATURE; break;
      }
    }

    this.featureKindCache.set(feature, kind);
    return kind;
  }

  /**
   * Get the XML name for a feature from its EMD annotation.
   * Returns null if no annotation is present.
   */
  getName(feature: EStructuralFeature): string | null {
    if (this.nameCache.has(feature)) return this.nameCache.get(feature)!;
    const name = this.getAnnotationDetail(feature as unknown as EModelElement, 'name') ?? null;
    this.nameCache.set(feature, name);
    return name;
  }

  /**
   * Get the namespace URI for a feature from its EMD annotation.
   * Resolves special values:
   * - `##targetNamespace` → owning EPackage's nsURI
   * - `##local` → null (no namespace)
   */
  getNamespace(feature: EStructuralFeature): string | null {
    if (this.namespaceCache.has(feature)) return this.namespaceCache.get(feature)!;
    const rawNs = this.getAnnotationDetail(feature as unknown as EModelElement, 'namespace') ?? null;
    let ns = rawNs;

    if (ns === '##targetNamespace') {
      const eClass = (feature as any).getEContainingClass?.();
      const pkg = eClass?.getEPackage?.();
      ns = pkg?.getNsURI?.() ?? null;
      // Don't cache if resolution failed (getEContainingClass may not be set yet)
      if (ns === null) return null;
    } else if (ns === '##local') {
      ns = null;
    }

    this.namespaceCache.set(feature, ns);
    return ns;
  }

  /**
   * Find the feature that represents simple text content (name=":0", kind="simple").
   */
  getSimpleContentFeature(eClass: EClass): EStructuralFeature | null {
    if (this.simpleContentFeatureCache.has(eClass)) {
      return this.simpleContentFeatureCache.get(eClass)!;
    }

    let result: EStructuralFeature | null = null;
    for (const feature of eClass.getEAllStructuralFeatures()) {
      const name = this.getName(feature);
      if (name === ':0') {
        result = feature;
        break;
      }
    }

    this.simpleContentFeatureCache.set(eClass, result);
    return result;
  }

  /**
   * Find a feature by its EMD namespace and name, where the feature kind is "element".
   */
  getElementFeature(eClass: EClass, namespace: string | null, name: string): EStructuralFeature | null {
    for (const feature of eClass.getEAllStructuralFeatures()) {
      const fKind = this.getFeatureKind(feature);
      if (fKind !== ELEMENT_FEATURE) continue;

      const fName = this.getName(feature) ?? feature.getName();
      if (fName !== name) continue;

      const fNs = this.getNamespace(feature);
      if (namespace && fNs && fNs === namespace) return feature;
      if (!namespace && !fNs) return feature;
      // If feature has no namespace annotation, match by name only
      if (!fNs && fName === name) return feature;
    }
    return null;
  }

  /**
   * Find a feature by its EMD namespace and name, where the feature kind is "attribute".
   */
  getAttributeFeature(eClass: EClass, namespace: string | null, name: string): EStructuralFeature | null {
    for (const feature of eClass.getEAllStructuralFeatures()) {
      const fKind = this.getFeatureKind(feature);
      if (fKind !== ATTRIBUTE_FEATURE) continue;

      const fName = this.getName(feature) ?? feature.getName();
      if (fName !== name) continue;

      const fNs = this.getNamespace(feature);
      if (namespace && fNs && fNs === namespace) return feature;
      if (!namespace && !fNs) return feature;
      if (!fNs && fName === name) return feature;
    }
    return null;
  }

  /**
   * Find any feature by EMD namespace and name (element or attribute).
   */
  getFeature(eClass: EClass, namespace: string | null, name: string, isElement: boolean): EStructuralFeature | null {
    if (isElement) {
      return this.getElementFeature(eClass, namespace, name);
    }
    return this.getAttributeFeature(eClass, namespace, name);
  }

  /**
   * Read a detail value from the ExtendedMetaData annotation on a model element.
   */
  private getAnnotationDetail(element: EModelElement, key: string): string | undefined {
    if (!element || typeof element.getEAnnotation !== 'function') return undefined;

    const annotation = element.getEAnnotation(ANNOTATION_URI);
    if (!annotation) return undefined;

    const details = annotation.getDetails();
    if (!details || typeof details.getByKey !== 'function') return undefined;

    return details.getByKey(key);
  }

  /**
   * Read the ExtendedMetaData annotation details as a Map.
   */
  private getAnnotation(element: EModelElement): Map<string, string> | null {
    if (!element || typeof element.getEAnnotation !== 'function') return null;

    const annotation = element.getEAnnotation(ANNOTATION_URI);
    if (!annotation) return null;

    const details = annotation.getDetails();
    if (!details) return null;

    if (typeof details.getByKey === 'function') {
      return details.toMap();
    }

    return null;
  }
}

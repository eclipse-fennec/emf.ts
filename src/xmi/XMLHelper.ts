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
import { EStructuralFeature } from '../EStructuralFeature';
import { EReference } from '../EReference';
import { Resource } from '../Resource';
import { URI } from '../URI';

/**
 * Feature kind constants for loading
 */
export const DATATYPE_SINGLE = 1;
export const DATATYPE_IS_MANY = 2;
export const IS_MANY_ADD = 3;
export const IS_MANY_MOVE = 4;
export const OTHER = 5;

/**
 * Interface for forward reference handling
 */
export interface ManyReference {
  getObject(): EObject;
  getFeature(): EStructuralFeature;
  getValues(): any[];
  getPositions(): number[];
  getLineNumber(): number;
  getColumnNumber(): number;
}

/**
 * XMLHelper interface - configuration class for XML loading/saving
 */
export interface XMLHelper {
  setOptions(options: Map<string, any>): void;
  setNoNamespacePackage(pkg: EPackage | null): void;
  getNoNamespacePackage(): EPackage | null;
  getResource(): Resource | null;

  // Name handling
  getName(element: { getName(): string | null }): string;
  getQName(classifier: EClassifier): string;

  // Prefix/namespace handling
  getPrefix(namespaceURI: string | null): string | null;
  getPrefixForPackage(ePackage: EPackage): string | null;
  getNamespaceURI(prefix: string): string | null;
  getURI(prefix: string): string | null;
  addPrefix(prefix: string, uri: string): void;
  pushContext(): void;
  popContext(): void;
  popContextWithFactories(prefixesToFactories: Map<string, EFactory>): void;
  recordPrefixToURIMapping(): void;
  getPrefixToNamespaceMap(): Map<string, string>;

  // Object creation
  createObject(eFactory: EFactory, type: EClassifier | null): EObject | null;
  getType(eFactory: EFactory, typeName: string): EClassifier | null;

  // Feature handling
  getFeature(eClass: EClass, namespaceURI: string | null, name: string): EStructuralFeature | null;
  getFeatureWithElement(eClass: EClass, namespaceURI: string | null, name: string, isElement: boolean): EStructuralFeature | null;
  getFeatureKind(feature: EStructuralFeature): number;
  setValue(eObject: EObject, feature: EStructuralFeature, value: any, position: number): void;

  // Reference handling
  setManyReference(reference: ManyReference, location: string): Error[];

  // URI handling
  deresolve(uri: URI): URI;
  resolve(relative: URI, base: URI): URI;

  // Conversion
  convertToString(factory: EFactory, dataType: EDataType, data: any): string;
}

/**
 * Namespace support - manages namespace context stack
 */
class NamespaceSupport {
  private contexts: Map<string, string>[] = [];
  private currentContext: Map<string, string> = new Map();

  pushContext(): void {
    this.contexts.push(new Map(this.currentContext));
  }

  popContext(): Map<string, string> {
    const previous = this.contexts.pop();
    const popped = new Map<string, string>();

    if (previous) {
      // Find what was added in this context
      for (const [prefix, uri] of this.currentContext) {
        if (!previous.has(prefix) || previous.get(prefix) !== uri) {
          popped.set(prefix, uri);
        }
      }
      this.currentContext = previous;
    }

    return popped;
  }

  declarePrefix(prefix: string, uri: string): void {
    this.currentContext.set(prefix, uri);
  }

  getURI(prefix: string): string | null {
    return this.currentContext.get(prefix) ?? null;
  }

  getPrefix(uri: string): string | null {
    for (const [prefix, nsUri] of this.currentContext) {
      if (nsUri === uri) {
        return prefix;
      }
    }
    return null;
  }
}

/**
 * XMLHelper implementation
 */
export class XMLHelperImpl implements XMLHelper {
  protected noNamespacePackage: EPackage | null = null;
  protected resource: Resource | null = null;
  protected resourceURI: URI | null = null;
  protected packageRegistry: EPackageRegistry = EPackageRegistry.INSTANCE;

  protected packages: Map<EPackage, string> = new Map();
  protected featuresToKinds: Map<EStructuralFeature, number> = new Map();
  protected prefixesToURIs: Map<string, string> = new Map();
  protected urisToPrefixes: Map<string, string[]> = new Map();

  protected namespaceSupport: NamespaceSupport = new NamespaceSupport();
  protected allPrefixToURI: string[] = [];

  constructor(resource?: Resource) {
    if (resource) {
      this.setResource(resource);
    }
  }

  setResource(resource: Resource): void {
    this.resource = resource;
    if (resource) {
      this.resourceURI = resource.getURI();
      const resourceSet = resource.getResourceSet();
      if (resourceSet) {
        this.packageRegistry = resourceSet.getPackageRegistry();
      } else {
        this.packageRegistry = EPackageRegistry.INSTANCE;
      }
    }
  }

  setOptions(options: Map<string, any>): void {
    // Process options if needed
  }

  setNoNamespacePackage(pkg: EPackage | null): void {
    this.noNamespacePackage = pkg;
  }

  getNoNamespacePackage(): EPackage | null {
    return this.noNamespacePackage;
  }

  getResource(): Resource | null {
    return this.resource;
  }

  getName(element: { getName(): string | null }): string {
    return element.getName() || '';
  }

  getQName(classifier: EClassifier): string {
    const ePackage = classifier.getEPackage();
    if (ePackage) {
      const prefix = this.getPrefixForPackage(ePackage);
      if (prefix && prefix.length > 0) {
        return prefix + ':' + classifier.getName();
      }
    }
    return classifier.getName() || '';
  }

  getPrefix(namespaceURI: string | null): string | null {
    if (namespaceURI === null) {
      return null;
    }
    const prefixes = this.urisToPrefixes.get(namespaceURI);
    return prefixes && prefixes.length > 0 ? prefixes[0] : null;
  }

  getPrefixForPackage(ePackage: EPackage): string | null {
    let prefix: string | undefined = this.packages.get(ePackage);
    if (prefix === undefined) {
      const nsURI = ePackage.getNsURI();
      if (nsURI) {
        const foundPrefix = this.getPrefix(nsURI);
        prefix = foundPrefix !== null ? foundPrefix : (ePackage.getNsPrefix() || '');
      } else {
        prefix = ePackage.getNsPrefix() || '';
      }
      this.packages.set(ePackage, prefix || '');
    }
    return prefix || null;
  }

  getNamespaceURI(prefix: string): string | null {
    return this.prefixesToURIs.get(prefix) ?? null;
  }

  getURI(prefix: string): string | null {
    return this.namespaceSupport.getURI(prefix);
  }

  addPrefix(prefix: string, uri: string): void {
    this.namespaceSupport.declarePrefix(prefix, uri);
    this.prefixesToURIs.set(prefix, uri);

    let prefixes = this.urisToPrefixes.get(uri);
    if (!prefixes) {
      prefixes = [];
      this.urisToPrefixes.set(uri, prefixes);
    }
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
    }

    this.allPrefixToURI.push(prefix, uri);
  }

  pushContext(): void {
    this.namespaceSupport.pushContext();
  }

  popContext(): void {
    this.namespaceSupport.popContext();
  }

  popContextWithFactories(prefixesToFactories: Map<string, EFactory>): void {
    const popped = this.namespaceSupport.popContext();
    for (const [prefix] of popped) {
      prefixesToFactories.delete(prefix);
    }
  }

  recordPrefixToURIMapping(): void {
    // Record all prefix mappings seen during load
  }

  getPrefixToNamespaceMap(): Map<string, string> {
    return new Map(this.prefixesToURIs);
  }

  createObject(eFactory: EFactory, type: EClassifier | null): EObject | null {
    if (type && 'getESuperTypes' in type) {
      // It's an EClass
      return eFactory.create(type as EClass);
    }
    return null;
  }

  getType(eFactory: EFactory, typeName: string): EClassifier | null {
    const ePackage = eFactory.getEPackage();
    if (ePackage) {
      return ePackage.getEClassifier(typeName);
    }
    return null;
  }

  getFeature(eClass: EClass, namespaceURI: string | null, name: string): EStructuralFeature | null {
    const feature = eClass.getEStructuralFeature(name);
    if (feature) {
      this.computeFeatureKind(feature);
    }
    return feature;
  }

  getFeatureWithElement(eClass: EClass, namespaceURI: string | null, name: string, isElement: boolean): EStructuralFeature | null {
    return this.getFeature(eClass, namespaceURI, name);
  }

  getFeatureKind(feature: EStructuralFeature): number {
    let kind = this.featuresToKinds.get(feature);
    if (kind === undefined) {
      this.computeFeatureKind(feature);
      kind = this.featuresToKinds.get(feature);
    }
    return kind ?? OTHER;
  }

  protected computeFeatureKind(feature: EStructuralFeature): void {
    const eClassifier = feature.getEType();

    if (eClassifier && !('getESuperTypes' in eClassifier)) {
      // It's a data type
      if (feature.isMany()) {
        this.featuresToKinds.set(feature, DATATYPE_IS_MANY);
      } else {
        this.featuresToKinds.set(feature, DATATYPE_SINGLE);
      }
    } else {
      // It's a reference type - but check if feature is actually an EReference
      if (feature.isMany()) {
        // Check if feature has getEOpposite method (i.e., is actually an EReference)
        if ('getEOpposite' in feature && typeof (feature as any).getEOpposite === 'function') {
          const reference = feature as EReference;
          const opposite = reference.getEOpposite();

          if (!opposite || opposite.isTransient() || !opposite.isMany()) {
            this.featuresToKinds.set(feature, IS_MANY_ADD);
          } else {
            this.featuresToKinds.set(feature, IS_MANY_MOVE);
          }
        } else {
          // Feature is many but not a proper EReference
          this.featuresToKinds.set(feature, IS_MANY_ADD);
        }
      } else {
        this.featuresToKinds.set(feature, OTHER);
      }
    }
  }

  setValue(eObject: EObject, feature: EStructuralFeature, value: any, position: number): void {
    if (feature.isMany()) {
      let list = eObject.eGet(feature) as any[];
      if (!list) {
        // Initialize the list if it doesn't exist
        list = [];
        eObject.eSet(feature, list);
      }
      if (position === -1) {
        list.push(value);
      } else if (position === -2) {
        // Insert at beginning
        list.unshift(value);
      } else {
        list.splice(position, 0, value);
      }
    } else {
      eObject.eSet(feature, value);
    }

    // Handle containment: set back-reference for contained objects
    // This is necessary because direct array push bypasses eSet callbacks
    if (value && typeof value === 'object') {
      const featureName = feature.getName();
      // For EPackage.eClassifiers containment, set the ePackage reference
      if (featureName === 'eClassifiers' && 'setEPackage' in value) {
        (value as any).setEPackage(eObject);
      }
      // For EClass.eStructuralFeatures containment, set the eContainingClass reference
      if (featureName === 'eStructuralFeatures' && 'setEContainingClass' in value) {
        (value as any).setEContainingClass(eObject);
      }
      // For EClass.eOperations containment, set the eContainingClass reference
      if (featureName === 'eOperations' && 'setEContainingClass' in value) {
        (value as any).setEContainingClass(eObject);
      }
    }
  }

  setManyReference(reference: ManyReference, location: string): Error[] {
    const errors: Error[] = [];
    const eObject = reference.getObject();
    const feature = reference.getFeature();
    const values = reference.getValues();
    const positions = reference.getPositions();

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const position = positions[i];
      try {
        this.setValue(eObject, feature, value, position);
      } catch (e) {
        errors.push(e instanceof Error ? e : new Error(String(e)));
      }
    }

    return errors;
  }

  deresolve(uri: URI): URI {
    if (this.resourceURI && !uri.isRelative()) {
      return uri.deresolve(this.resourceURI);
    }
    return uri;
  }

  resolve(relative: URI, base: URI): URI {
    return relative.resolve(base);
  }

  convertToString(factory: EFactory, dataType: EDataType, data: any): string {
    return factory.convertToString(dataType, data);
  }
}

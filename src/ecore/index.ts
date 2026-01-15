/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

// Re-export core types
export * from '../EObject';
export * from '../EClass';
export * from '../EClassifier';
export * from '../EDataType';
export * from '../EAttribute';
export * from '../EReference';
export * from '../EStructuralFeature';
export * from '../EPackage';
export * from '../EFactory';
export * from '../EOperation';
export * from '../EParameter';
export * from '../EAnnotation';
export * from '../Resource';
export * from '../ResourceSet';
export * from '../URI';

// Re-export runtime implementations
export * from '../runtime/BasicEObject';
export * from '../runtime/BasicEClass';
export * from '../runtime/BasicEPackage';
export * from '../runtime/BasicEFactory';
export * from '../runtime/BasicEAttribute';
export * from '../runtime/BasicEReference';
export * from '../runtime/BasicEDataType';
export * from '../runtime/BasicResource';
export * from '../runtime/BasicResourceSet';

// Re-export XMI
export * from '../xmi';

// Re-export type guards
export * from '../util/TypeGuards';

// Export EcorePackage
export * from './EcorePackage';

// Compatibility aliases for @masagroup/ecore
import { BasicResourceSet } from '../runtime/BasicResourceSet';
import { XMIResource, XMIResourceFactory } from '../xmi/XMLResource';
import { URI } from '../URI';
import { EPackage, EPackageRegistry } from '../EPackage';
import { Resource } from '../Resource';
import { getEcorePackage, ECORE_NS_URI } from './EcorePackage';

// Auto-initialize Ecore package on import
// This ensures the Ecore package is registered in the global registry
getEcorePackage();

/**
 * EResourceSetImpl - Alias for BasicResourceSet with additional compatibility methods
 */
export class EResourceSetImpl extends BasicResourceSet {
  constructor() {
    super();
    // Register XMI factory for .ecore files
    this.getResourceFactoryRegistry().getExtensionToFactoryMap().set('ecore', new XMIResourceFactory());
    this.getResourceFactoryRegistry().getExtensionToFactoryMap().set('xmi', new XMIResourceFactory());

    // Register Ecore package
    this.getPackageRegistry().set(ECORE_NS_URI, getEcorePackage());
  }

  /**
   * Create resource and return with loadFromString support
   */
  override createResource(uri: URI): Resource {
    const resource = super.createResource(uri);
    return resource;
  }
}

/**
 * Extended package registry with registerPackage method
 */
export function createPackageRegistry(): EPackageRegistry & { registerPackage(pkg: EPackage): void } {
  const map = new Map<string, any>();

  const registry = {
    getEPackage(nsURI: string) {
      const value = map.get(nsURI);
      if (!value) return null;
      if ('getEPackage' in value) return value.getEPackage();
      return value;
    },

    getEFactory(nsURI: string) {
      const pkg = this.getEPackage(nsURI);
      return pkg ? pkg.getEFactoryInstance() : null;
    },

    get(nsURI: string) {
      return map.get(nsURI) || null;
    },

    set(nsURI: string, value: any) {
      map.set(nsURI, value);
    },

    delete(nsURI: string) {
      return map.delete(nsURI);
    },

    has(nsURI: string) {
      return map.has(nsURI);
    },

    keys() {
      return map.keys();
    },

    values() {
      return map.values();
    },

    /**
     * Register a package by its nsURI
     */
    registerPackage(pkg: EPackage) {
      const nsURI = pkg.getNsURI();
      if (nsURI) {
        map.set(nsURI, pkg);
      }
    }
  };

  return registry;
}

/**
 * Global package registry with registerPackage
 */
export function getPackageRegistry(): EPackageRegistry & { registerPackage(pkg: EPackage): void } {
  // We extend the global registry
  const baseRegistry = EPackageRegistry.INSTANCE;

  return {
    ...baseRegistry,
    registerPackage(pkg: EPackage) {
      const nsURI = pkg.getNsURI();
      if (nsURI) {
        baseRegistry.set(nsURI, pkg);
      }
    }
  };
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

// Re-export core types
export * from '../EObject.js';
export * from '../EClass.js';
export * from '../EClassifier.js';
export * from '../EDataType.js';
export * from '../EAttribute.js';
export * from '../EReference.js';
export * from '../EStructuralFeature.js';
export * from '../EPackage.js';
export * from '../EFactory.js';
export * from '../EOperation.js';
export * from '../EParameter.js';
export * from '../EAnnotation.js';
export * from '../Resource.js';
export * from '../ResourceSet.js';
export * from '../URI.js';

// Re-export runtime implementations
export * from '../runtime/BasicEObject.js';
export * from '../runtime/BasicEClass.js';
export * from '../runtime/BasicEPackage.js';
export * from '../runtime/BasicEFactory.js';
export * from '../runtime/BasicEAttribute.js';
export * from '../runtime/BasicEReference.js';
export * from '../runtime/BasicEDataType.js';
export * from '../runtime/BasicResource.js';
export * from '../runtime/BasicResourceSet.js';

// Re-export XMI
export * from '../xmi/index.js';

// Re-export type guards
export * from '../util/TypeGuards.js';

// Export EcorePackage
export * from './EcorePackage.js';

// Compatibility aliases for @masagroup/ecore
import { BasicResourceSet } from '../runtime/BasicResourceSet.js';
import { XMIResource, XMIResourceFactory } from '../xmi/XMLResource.js';
import { URI } from '../URI.js';
import { EPackage, EPackageRegistry } from '../EPackage.js';
import { Resource } from '../Resource.js';
import { getEcorePackage, ECORE_NS_URI } from './EcorePackage.js';

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

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EClassifier } from './EClassifier';
import { EFactory } from './EFactory';
import type { EList } from './EList';

/**
 * A representation of the model object 'EPackage'.
 * A package is a container for classifiers.
 */
export interface EPackage extends ENamedElement {
  /**
   * Returns the namespace URI.
   * A universally unique identification of a particular package,
   * much like an XML Schema target namespace.
   */
  getNsURI(): string | null;

  /**
   * Sets the namespace URI.
   */
  setNsURI(value: string | null): void;

  /**
   * Returns the namespace prefix.
   * The preferred prefix to be used for this package's namespace URI.
   */
  getNsPrefix(): string | null;

  /**
   * Sets the namespace prefix.
   */
  setNsPrefix(value: string | null): void;

  /**
   * Returns this package's factory for creating modeled object instances.
   */
  getEFactoryInstance(): EFactory;

  /**
   * Sets the factory instance.
   */
  setEFactoryInstance(value: EFactory): void;

  /**
   * Returns the list of classifiers (classes and data types) defined in this package.
   * This is a containment EList that manages the bidirectional eClassifiers <-> ePackage relationship.
   */
  getEClassifiers(): EList<EClassifier>;

  /**
   * Returns the list of nested packages contained by this package.
   * This is a containment EList that manages the bidirectional eSubpackages <-> eSuperPackage relationship.
   */
  getESubpackages(): EList<EPackage>;

  /**
   * Returns the containing package of this package.
   */
  getESuperPackage(): EPackage | null;

  /**
   * Returns the classifier with the given name.
   */
  getEClassifier(name: string): EClassifier | null;
}

/**
 * An EPackage wrapper that is used by the EPackage.Registry.
 */
export interface EPackageDescriptor {
  /**
   * Returns the package.
   */
  getEPackage(): EPackage;

  /**
   * Returns the factory.
   */
  getEFactory(): EFactory;
}

/**
 * A map from namespace URI to EPackage.
 */
export interface EPackageRegistry {
  /**
   * Looks up the value in the map, converting EPackage.Descriptor objects to EPackage objects on demand.
   */
  getEPackage(nsURI: string): EPackage | null;

  /**
   * Looks up the value in the map, converting EPackage.Descriptor objects to EFactory objects on demand.
   */
  getEFactory(nsURI: string): EFactory | null;

  /**
   * Standard Map operations
   */
  get(nsURI: string): EPackage | EPackageDescriptor | null;
  set(nsURI: string, value: EPackage | EPackageDescriptor): void;
  delete(nsURI: string): boolean;
  has(nsURI: string): boolean;
  keys(): IterableIterator<string>;
  values(): IterableIterator<EPackage | EPackageDescriptor>;
}

/**
 * The global package registry instance.
 */
export namespace EPackageRegistry {
  export const INSTANCE: EPackageRegistry = createGlobalRegistry();
}

/**
 * Recursively registers all subpackages of the given package.
 * This ensures that nested packages with their own nsURI can be resolved
 * by the registry when loading XMI files.
 *
 * NOTE: This is an intentional enhancement over Java EMF behavior.
 * In Java EMF, subpackages must be registered separately (either via
 * generated code or explicit registration). This implementation
 * automatically registers subpackages to better support dynamically
 * loaded packages (e.g., loading .ecore files at runtime).
 */
function registerSubpackages(
  map: Map<string, EPackage | EPackageDescriptor>,
  pkg: EPackage
): void {
  for (const subPkg of pkg.getESubpackages()) {
    const subNsURI = subPkg.getNsURI();
    if (subNsURI) {
      map.set(subNsURI, subPkg);
    }
    // Recursively register nested subpackages
    registerSubpackages(map, subPkg);
  }
}

function createGlobalRegistry(): EPackageRegistry {
  const map = new Map<string, EPackage | EPackageDescriptor>();

  return {
    getEPackage(nsURI: string): EPackage | null {
      const value = map.get(nsURI);
      if (!value) return null;
      if ('getEPackage' in value) {
        return (value as EPackageDescriptor).getEPackage();
      }
      return value as EPackage;
    },

    getEFactory(nsURI: string): EFactory | null {
      const value = map.get(nsURI);
      if (!value) return null;
      if ('getEFactory' in value) {
        return (value as EPackageDescriptor).getEFactory();
      }
      return (value as EPackage).getEFactoryInstance();
    },

    get(nsURI: string) {
      return map.get(nsURI) || null;
    },

    set(nsURI: string, value: EPackage | EPackageDescriptor) {
      map.set(nsURI, value);
      // If it's an EPackage (not a descriptor), also register its subpackages
      if (!('getEPackage' in value)) {
        registerSubpackages(map, value as EPackage);
      }
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
    }
  };
}

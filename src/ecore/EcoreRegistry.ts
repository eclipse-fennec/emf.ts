/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import type { EClass } from '../EClass';

/**
 * Registry for Ecore package classes
 */
class EcoreClassRegistry {
  private _getEcorePackage: (() => any) | null = null;

  /**
   * Register the getEcorePackage function
   */
  register(getEcorePackage: () => any): void {
    this._getEcorePackage = getEcorePackage;
  }

  /**
   * Get the EClass for EObject
   */
  getEObjectClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEObjectClass();
  }

  /**
   * Get the EClass for EClass
   */
  getEClassClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEClassClass();
  }

  /**
   * Get the EClass for EPackage
   */
  getEPackageClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEPackageClass();
  }

  /**
   * Get the EClass for EFactory
   */
  getEFactoryClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEFactoryClass();
  }

  /**
   * Get the EClass for EAttribute
   */
  getEAttributeClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEAttributeClass();
  }

  /**
   * Get the EClass for EReference
   */
  getEReferenceClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEReferenceClass();
  }

  /**
   * Get the EClass for EStructuralFeature
   */
  getEStructuralFeatureClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEStructuralFeatureClass();
  }

  /**
   * Get the EClass for EDataType
   */
  getEDataTypeClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEDataTypeClass();
  }

  /**
   * Get the EClass for EOperation
   */
  getEOperationClass(): EClass {
    if (!this._getEcorePackage) {
      throw new Error('EcorePackage not registered. Import EcorePackage first.');
    }
    return this._getEcorePackage().getEOperationClass();
  }

  /**
   * Check if registry is initialized
   */
  isRegistered(): boolean {
    return this._getEcorePackage !== null;
  }
}

/**
 * Global Ecore class registry instance
 */
export const ecoreRegistry = new EcoreClassRegistry();

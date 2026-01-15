/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EPackage } from '../EPackage';
import { EClassifier } from '../EClassifier';
import { EFactory } from '../EFactory';
import { EClass } from '../EClass';
import { BasicEObject } from './BasicEObject';
import { EAnnotation } from '../EAnnotation';
import { BasicEFactory } from './BasicEFactory';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EPackage implementation
 * Similar to org.eclipse.emf.ecore.impl.EPackageImpl
 */
export class BasicEPackage extends BasicEObject implements EPackage {
  private name: string | null = null;
  private nsURI: string | null = null;
  private nsPrefix: string | null = null;
  private eFactoryInstance: EFactory | null = null;
  private eClassifiers: EClassifier[] = [];
  private eSubpackages: EPackage[] = [];
  private eSuperPackage: EPackage | null = null;

  /**
   * Constructor
   */
  constructor(nsURI?: string, eFactoryInstance?: EFactory) {
    super();
    if (nsURI) this.nsURI = nsURI;
    if (eFactoryInstance) this.eFactoryInstance = eFactoryInstance;
  }

  getName(): string | null {
    return this.name;
  }

  setName(value: string | null): void {
    this.name = value;
  }

  getNsURI(): string | null {
    return this.nsURI;
  }

  setNsURI(value: string | null): void {
    this.nsURI = value;
  }

  getNsPrefix(): string | null {
    return this.nsPrefix;
  }

  setNsPrefix(value: string | null): void {
    this.nsPrefix = value;
  }

  getEFactoryInstance(): EFactory {
    if (!this.eFactoryInstance) {
      // Auto-create default factory (like EMF does)
      const factory = new BasicEFactory();
      factory.setEPackage(this);
      this.eFactoryInstance = factory;
    }
    return this.eFactoryInstance!;
  }

  setEFactoryInstance(value: EFactory): void {
    this.eFactoryInstance = value;
  }

  getEClassifiers(): EClassifier[] {
    return this.eClassifiers;
  }

  getESubpackages(): EPackage[] {
    return this.eSubpackages;
  }

  getESuperPackage(): EPackage | null {
    return this.eSuperPackage;
  }

  getEClassifier(name: string): EClassifier | null {
    return this.eClassifiers.find(c => {
      // Handle both static and dynamic EObjects
      if (typeof c.getName === 'function') {
        return c.getName() === name;
      }
      // For dynamic objects, use eGet
      if (typeof (c as any).eGet === 'function' && typeof (c as any).eClass === 'function') {
        const eClass = (c as any).eClass();
        if (eClass) {
          const nameFeature = eClass.getEStructuralFeature?.('name');
          if (nameFeature) {
            return (c as any).eGet(nameFeature) === name;
          }
        }
      }
      return false;
    }) || null;
  }

  /**
   * Add classifier to this package
   */
  protected addClassifier(classifier: EClassifier): void {
    this.eClassifiers.push(classifier);
    // Set back-reference to this package
    if ('setEPackage' in classifier && typeof (classifier as any).setEPackage === 'function') {
      (classifier as any).setEPackage(this);
    }
  }

  /**
   * Add subpackage
   */
  protected addSubpackage(pkg: EPackage): void {
    this.eSubpackages.push(pkg);
    if (pkg instanceof BasicEPackage) {
      (pkg as any).eSuperPackage = this;
    }
  }

  // EObject methods
  getEAnnotations(): EAnnotation[] {
    return [];
  }

  getEAnnotation(source: string): EAnnotation | null {
    return null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEPackageClass();
  }

  /**
   * Override eGet to handle package-specific features
   */
  override eGet(feature: import('../EStructuralFeature').EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this.name;
      case 'nsURI':
        return this.nsURI;
      case 'nsPrefix':
        return this.nsPrefix;
      case 'eClassifiers':
        return this.eClassifiers;
      case 'eSubpackages':
        return this.eSubpackages;
      case 'eSuperPackage':
        return this.eSuperPackage;
      case 'eFactoryInstance':
        return this.eFactoryInstance;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle package-specific features
   */
  override eSet(feature: import('../EStructuralFeature').EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this.name = newValue;
        break;
      case 'nsURI':
        this.nsURI = newValue;
        break;
      case 'nsPrefix':
        this.nsPrefix = newValue;
        break;
      case 'eClassifiers':
        // Handle both setting entire array and individual items
        if (Array.isArray(newValue)) {
          this.eClassifiers = newValue;
          // Set back-reference to this package for all classifiers
          for (const classifier of newValue) {
            if ('setEPackage' in classifier && typeof (classifier as any).setEPackage === 'function') {
              (classifier as any).setEPackage(this);
            }
          }
        }
        break;
      case 'eSubpackages':
        if (Array.isArray(newValue)) {
          this.eSubpackages = newValue;
        }
        break;
      case 'eSuperPackage':
        this.eSuperPackage = newValue;
        break;
      case 'eFactoryInstance':
        this.eFactoryInstance = newValue;
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Simple package implementation for testing
 */
export class SimpleEPackage extends BasicEPackage {
  static create(config: {
    name: string;
    nsURI: string;
    nsPrefix: string;
    factory: EFactory;
  }): SimpleEPackage {
    const pkg = new SimpleEPackage(config.nsURI, config.factory);
    pkg.setName(config.name);
    pkg.setNsPrefix(config.nsPrefix);
    return pkg;
  }

  /**
   * Builder-style API for adding classifiers
   */
  withClassifier(classifier: EClassifier): this {
    this.addClassifier(classifier);
    return this;
  }
}

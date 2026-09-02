/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EPackage } from '../EPackage.js';
import { EClassifier } from '../EClassifier.js';
import { EFactory } from '../EFactory.js';
import { EClass } from '../EClass.js';
import { BasicEObject } from './BasicEObject.js';
import { EAnnotation } from '../EAnnotation.js';
import { BasicEFactory } from './BasicEFactory.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EObject } from '../EObject.js';
import { EReference } from '../EReference.js';
import {
  BasicEList,
  EList,
  EObjectContainmentWithInverseEListLazy,
  createIndexedProxy,
  createMetamodelEList,
} from '../EList.js';

/**
 * Containment EList for EPackage.eClassifiers.
 *
 * Extends the containment variant so that adding a classifier sets its
 * eContainer, not only the ePackage back-reference (#80). Without this any walk
 * up the tree - EcoreUtil.getRootContainer(), isAncestor(), getURI() - stopped
 * at the classifier.
 *
 * The feature is resolved lazily: package instances exist before the Ecore
 * package describing them has finished bootstrapping.
 */
class EClassifiersEList extends EObjectContainmentWithInverseEListLazy<EClassifier> {
  constructor(pkg: BasicEPackage) {
    super(
      pkg,
      () => {
        if (!ecoreRegistry.isRegistered()) {
          return null;
        }
        return ecoreRegistry.getEPackageClass().getEStructuralFeature('eClassifiers') as EReference;
      },
      (element: EClassifier, owner: EObject | null) => {
        // Inverse reference: classifier.ePackage = owner
        if ('setEPackage' in element && typeof (element as any).setEPackage === 'function') {
          (element as any).setEPackage(owner as EPackage | null);
        }
      }
    );
  }
}

/**
 * Containment EList for EPackage.eSubpackages.
 *
 * Same reasoning as EClassifiersEList: a subpackage has to know its container,
 * not only its eSuperPackage (#80).
 */
class ESubpackagesEList extends EObjectContainmentWithInverseEListLazy<EPackage> {
  constructor(pkg: BasicEPackage) {
    super(
      pkg,
      () => {
        if (!ecoreRegistry.isRegistered()) {
          return null;
        }
        return ecoreRegistry.getEPackageClass().getEStructuralFeature('eSubpackages') as EReference;
      },
      (element: EPackage, owner: EObject | null) => {
        // Inverse reference: subpackage.eSuperPackage = owner
        if (element instanceof BasicEPackage) {
          (element as any).eSuperPackage = owner;
        }
      }
    );
  }
}

export class BasicEPackage extends BasicEObject implements EPackage {
  private name: string | null = null;
  private nsURI: string | null = null;
  private nsPrefix: string | null = null;
  private eFactoryInstance: EFactory | null = null;
  private _eClassifiers: EList<EClassifier> | null = null;
  private _eSubpackages: EList<EPackage> | null = null;
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

  getEClassifiers(): EList<EClassifier> {
    if (!this._eClassifiers) {
      this._eClassifiers = createIndexedProxy(new EClassifiersEList(this));
    }
    return this._eClassifiers;
  }

  getESubpackages(): EList<EPackage> {
    if (!this._eSubpackages) {
      this._eSubpackages = createIndexedProxy(new ESubpackagesEList(this));
    }
    return this._eSubpackages;
  }

  getESuperPackage(): EPackage | null {
    return this.eSuperPackage;
  }

  getEClassifier(name: string): EClassifier | null {
    const classifiers = this.getEClassifiers();
    for (const c of classifiers) {
      // Handle both static and dynamic EObjects
      if (typeof c.getName === 'function') {
        if (c.getName() === name) return c;
      }
      // For dynamic objects, use eGet
      else if (typeof (c as any).eGet === 'function' && typeof (c as any).eClass === 'function') {
        const eClass = (c as any).eClass();
        if (eClass) {
          const nameFeature = eClass.getEStructuralFeature?.('name');
          if (nameFeature && (c as any).eGet(nameFeature) === name) {
            return c;
          }
        }
      }
    }
    return null;
  }

  /**
   * Add classifier to this package
   */
  protected addClassifier(classifier: EClassifier): void {
    this.getEClassifiers().add(classifier);
  }

  /**
   * Add subpackage
   */
  protected addSubpackage(pkg: EPackage): void {
    this.getESubpackages().add(pkg);
  }

  // EObject methods
  private eAnnotations: EList<EAnnotation> = createMetamodelEList<EAnnotation>(this);

  getEAnnotations(): EList<EAnnotation> {
    return this.eAnnotations;
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
  override eGet(feature: import('../EStructuralFeature.js').EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this.name;
      case 'nsURI':
        return this.nsURI;
      case 'nsPrefix':
        return this.nsPrefix;
      case 'eClassifiers':
        return this.getEClassifiers();
      case 'eSubpackages':
        return this.getESubpackages();
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
  override eSet(feature: import('../EStructuralFeature.js').EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this.name = newValue;
        // Fire notification via super
        super.eSet(feature, newValue);
        break;
      case 'nsURI':
        this.nsURI = newValue;
        super.eSet(feature, newValue);
        break;
      case 'nsPrefix':
        this.nsPrefix = newValue;
        super.eSet(feature, newValue);
        break;
      case 'eClassifiers':
        // Clear and add all - EList handles back-references automatically
        if (Array.isArray(newValue) || (newValue && typeof newValue[Symbol.iterator] === 'function')) {
          const list = this.getEClassifiers();
          list.clear();
          for (const item of newValue) {
            list.add(item);
          }
        }
        break;
      case 'eSubpackages':
        if (Array.isArray(newValue) || (newValue && typeof newValue[Symbol.iterator] === 'function')) {
          const list = this.getESubpackages();
          list.clear();
          for (const item of newValue) {
            list.add(item);
          }
        }
        break;
      case 'eSuperPackage':
        this.eSuperPackage = newValue;
        super.eSet(feature, newValue);
        break;
      case 'eFactoryInstance':
        this.eFactoryInstance = newValue;
        super.eSet(feature, newValue);
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

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
import { BasicEList, createIndexedProxy } from '../EList';
import type { EList } from '../EList';

/**
 * Containment EList for EPackage.eClassifiers
 * Manages the bidirectional ePackage <-> eClassifiers relationship
 * and sends notifications on modifications.
 */
class EClassifiersEList extends BasicEList<EClassifier> {
  private pkg: BasicEPackage;

  constructor(pkg: BasicEPackage) {
    super(pkg, null); // feature will be resolved lazily
    this.pkg = pkg;
  }

  /**
   * Lazily resolve the eClassifiers feature from EcorePackage.
   * This avoids circular dependency issues during initialization.
   */
  override getFeature() {
    if (!this.feature) {
      const isReg = ecoreRegistry.isRegistered();
      console.log('[EClassifiersEList] getFeature - isRegistered:', isReg);
      if (isReg) {
        const ePackageClass = ecoreRegistry.getEPackageClass();
        this.feature = ePackageClass.getEStructuralFeature('eClassifiers');
        console.log('[EClassifiersEList] Resolved feature:', this.feature?.getName());
      }
    }
    return this.feature;
  }

  protected override didAdd(index: number, element: EClassifier): void {
    // Set back-reference: classifier.ePackage = this package
    if ('setEPackage' in element && typeof (element as any).setEPackage === 'function') {
      (element as any).setEPackage(this.pkg);
    }
    super.didAdd(index, element);
  }

  protected override didAddMany(index: number, elements: EClassifier[]): void {
    for (const element of elements) {
      if ('setEPackage' in element && typeof (element as any).setEPackage === 'function') {
        (element as any).setEPackage(this.pkg);
      }
    }
    super.didAddMany(index, elements);
  }

  protected override didRemove(index: number, element: EClassifier): void {
    // Clear back-reference: classifier.ePackage = null
    if ('setEPackage' in element && typeof (element as any).setEPackage === 'function') {
      (element as any).setEPackage(null);
    }
    super.didRemove(index, element);
  }

  protected override didClear(oldData: EClassifier[]): void {
    for (const element of oldData) {
      if ('setEPackage' in element && typeof (element as any).setEPackage === 'function') {
        (element as any).setEPackage(null);
      }
    }
    super.didClear(oldData);
  }

  protected override didSet(index: number, newElement: EClassifier, oldElement: EClassifier): void {
    if ('setEPackage' in oldElement && typeof (oldElement as any).setEPackage === 'function') {
      (oldElement as any).setEPackage(null);
    }
    if ('setEPackage' in newElement && typeof (newElement as any).setEPackage === 'function') {
      (newElement as any).setEPackage(this.pkg);
    }
    super.didSet(index, newElement, oldElement);
  }
}

/**
 * Containment EList for EPackage.eSubpackages
 * Manages the bidirectional eSuperPackage <-> eSubpackages relationship
 * and sends notifications on modifications.
 */
class ESubpackagesEList extends BasicEList<EPackage> {
  private pkg: BasicEPackage;

  constructor(pkg: BasicEPackage) {
    super(pkg, null); // feature will be resolved lazily
    this.pkg = pkg;
  }

  /**
   * Lazily resolve the eSubpackages feature from EcorePackage.
   * This avoids circular dependency issues during initialization.
   */
  override getFeature() {
    if (!this.feature && ecoreRegistry.isRegistered()) {
      const ePackageClass = ecoreRegistry.getEPackageClass();
      this.feature = ePackageClass.getEStructuralFeature('eSubpackages');
    }
    return this.feature;
  }

  protected override didAdd(index: number, element: EPackage): void {
    if (element instanceof BasicEPackage) {
      (element as any).eSuperPackage = this.pkg;
    }
    super.didAdd(index, element);
  }

  protected override didAddMany(index: number, elements: EPackage[]): void {
    for (const element of elements) {
      if (element instanceof BasicEPackage) {
        (element as any).eSuperPackage = this.pkg;
      }
    }
    super.didAddMany(index, elements);
  }

  protected override didRemove(index: number, element: EPackage): void {
    if (element instanceof BasicEPackage) {
      (element as any).eSuperPackage = null;
    }
    super.didRemove(index, element);
  }

  protected override didClear(oldData: EPackage[]): void {
    for (const element of oldData) {
      if (element instanceof BasicEPackage) {
        (element as any).eSuperPackage = null;
      }
    }
    super.didClear(oldData);
  }

  protected override didSet(index: number, newElement: EPackage, oldElement: EPackage): void {
    if (oldElement instanceof BasicEPackage) {
      (oldElement as any).eSuperPackage = null;
    }
    if (newElement instanceof BasicEPackage) {
      (newElement as any).eSuperPackage = this.pkg;
    }
    super.didSet(index, newElement, oldElement);
  }
}

/**
 * Basic EPackage implementation
 * Similar to org.eclipse.emf.ecore.impl.EPackageImpl
 */
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
  override eSet(feature: import('../EStructuralFeature').EStructuralFeature, newValue: any): void {
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

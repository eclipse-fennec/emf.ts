/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClass } from '../EClass';
import { EAttribute } from '../EAttribute';
import { EReference } from '../EReference';
import { EOperation } from '../EOperation';
import { EStructuralFeature } from '../EStructuralFeature';
import { EPackage } from '../EPackage';
import { BasicEObject } from './BasicEObject';
import { EAnnotation } from '../EAnnotation';
import { ecoreRegistry } from '../ecore/EcoreRegistry';
import { EList, EObjectContainmentWithInverseEListLazy, createIndexedProxy } from '../EList';
import { EObject } from '../EObject';

/**
 * Basic EClass implementation
 */
export class BasicEClass extends BasicEObject implements EClass {
  private _name: string | null = null;
  private abstract_: boolean = false;
  private interface_: boolean = false;
  private eSuperTypes: EClass[] = [];
  private _eStructuralFeatures: EList<EStructuralFeature> | null = null;
  private eOperations: EOperation[] = [];
  private ePackage: EPackage | null = null;
  private instanceClassName: string | null = null;
  private instanceClass: Function | null = null;
  private featureID: number = 0;
  private eAnnotations: EAnnotation[] = [];

  // Public getter for PrimeVue compatibility (optionLabel="name")
  get name(): string | null {
    return this._name;
  }

  getName(): string | null {
    return this._name;
  }

  setName(value: string | null): void {
    this._name = value;
  }

  isAbstract(): boolean {
    return this.abstract_;
  }

  setAbstract(value: boolean): void {
    this.abstract_ = value;
  }

  isInterface(): boolean {
    return this.interface_;
  }

  setInterface(value: boolean): void {
    this.interface_ = value;
  }

  getESuperTypes(): EClass[] {
    return this.eSuperTypes;
  }

  getEAllSuperTypes(): EClass[] {
    const all: EClass[] = [];
    const visited = new Set<EClass>();

    const collect = (eClass: EClass) => {
      for (const superType of eClass.getESuperTypes()) {
        if (!visited.has(superType)) {
          visited.add(superType);
          all.push(superType);
          collect(superType);
        }
      }
    };

    collect(this);
    return all;
  }

  getEIDAttribute(): EAttribute | null {
    for (const attr of this.getEAllAttributes()) {
      if (attr.isID()) {
        return attr;
      }
    }
    return null;
  }

  getEStructuralFeatures(): EList<EStructuralFeature> {
    if (this._eStructuralFeatures === null) {
      // Create containment EList with inverse setter for eContainingClass.
      // We use a lazy feature resolution to avoid circular dependency during EcorePackage bootstrap.
      // The feature is only needed for notifications, not for containment management.
      const self = this;
      const list = new EObjectContainmentWithInverseEListLazy<EStructuralFeature>(
        this,
        () => {
          if (ecoreRegistry.isRegistered()) {
            try {
              const eClassClass = ecoreRegistry.getEClassClass();
              // Avoid recursion by checking if we're the EClass being asked about
              if (eClassClass !== self && eClassClass instanceof BasicEClass && eClassClass._eStructuralFeatures !== null) {
                return eClassClass.getEStructuralFeature('eStructuralFeatures') as EReference;
              }
            } catch {
              // Ignore during bootstrap
            }
          }
          return null;
        },
        (element: EStructuralFeature, owner: EObject | null) => {
          // Set the inverse reference: feature.eContainingClass = owner (EClass)
          if ('setEContainingClass' in element) {
            (element as any).setEContainingClass(owner as EClass | null);
          }
          // Also set featureID when adding
          if (owner && 'setFeatureID' in element) {
            (element as any).setFeatureID(this.featureID++);
          }
        }
      );

      this._eStructuralFeatures = createIndexedProxy(list);
    }
    return this._eStructuralFeatures!;
  }

  getEAllStructuralFeatures(): EStructuralFeature[] {
    const all: EStructuralFeature[] = [...this.getEStructuralFeatures()];

    for (const superType of this.getEAllSuperTypes()) {
      all.push(...superType.getEStructuralFeatures());
    }

    return all;
  }

  getEAttributes(): EAttribute[] {
    return this.getEStructuralFeatures().filter(f => this.isAttribute(f)) as EAttribute[];
  }

  getEAllAttributes(): EAttribute[] {
    return this.getEAllStructuralFeatures().filter(f => this.isAttribute(f)) as EAttribute[];
  }

  getEReferences(): EReference[] {
    return this.getEStructuralFeatures().filter(f => this.isReference(f)) as EReference[];
  }

  getEAllReferences(): EReference[] {
    return this.getEAllStructuralFeatures().filter(f => this.isReference(f)) as EReference[];
  }

  getEAllContainments(): EReference[] {
    return this.getEAllReferences().filter(ref => ref.isContainment());
  }

  getEOperations(): EOperation[] {
    return this.eOperations;
  }

  getEAllOperations(): EOperation[] {
    const all: EOperation[] = [...this.eOperations];

    for (const superType of this.getEAllSuperTypes()) {
      all.push(...superType.getEOperations());
    }

    return all;
  }

  getEStructuralFeature(featureNameOrID: string | number): EStructuralFeature | null {
    if (typeof featureNameOrID === 'string') {
      return this.getEAllStructuralFeatures().find(f => f.getName() === featureNameOrID) || null;
    } else {
      return this.getEAllStructuralFeatures()[featureNameOrID] || null;
    }
  }

  isSuperTypeOf(someClass: EClass): boolean {
    return someClass.getEAllSuperTypes().includes(this);
  }

  getFeatureCount(): number {
    return this.getEAllStructuralFeatures().length;
  }

  getFeatureID(feature: EStructuralFeature): number {
    const features = this.getEAllStructuralFeatures();
    return features.indexOf(feature);
  }

  getEOperation(operationID: number): EOperation | null {
    return this.getEAllOperations()[operationID] || null;
  }

  getOperationCount(): number {
    return this.getEAllOperations().length;
  }

  getOperationID(operation: EOperation): number {
    return this.getEAllOperations().indexOf(operation);
  }

  // EClassifier methods
  getInstanceClassName(): string | null {
    return this.instanceClassName;
  }

  setInstanceClassName(value: string | null): void {
    this.instanceClassName = value;
  }

  getInstanceClass(): Function | null {
    return this.instanceClass;
  }

  setInstanceClass(value: Function | null): void {
    this.instanceClass = value;
  }

  getDefaultValue(): any {
    return null;
  }

  getInstanceTypeName(): string | null {
    return this.instanceClassName;
  }

  setInstanceTypeName(value: string | null): void {
    this.instanceClassName = value;
  }

  getEPackage(): EPackage | null {
    return this.ePackage;
  }

  setEPackage(pkg: EPackage): void {
    this.ePackage = pkg;
  }

  getETypeParameters(): any[] {
    return [];
  }

  isInstance(object: any): boolean {
    if (!object || typeof object !== 'object') return false;
    if (!('eClass' in object)) return false;

    const objectClass = (object as any).eClass();
    return objectClass === this || this.isSuperTypeOf(objectClass);
  }

  getClassifierID(): number {
    if (!this.ePackage) return -1;
    return this.ePackage.getEClassifiers().indexOf(this);
  }

  // Helpers
  private isAttribute(feature: EStructuralFeature): boolean {
    return 'getEAttributeType' in feature;
  }

  private isReference(feature: EStructuralFeature): boolean {
    return 'getEReferenceType' in feature;
  }

  /**
   * Add feature to this class.
   * Uses the EList's add() method which automatically:
   * - Sets the container (eSetContainer)
   * - Sets the inverse reference (eContainingClass)
   * - Fires notifications for adapters
   * - Assigns a featureID
   */
  addFeature(feature: EStructuralFeature): void {
    this.getEStructuralFeatures().add(feature);
  }

  /**
   * Add operation to this class
   */
  addOperation(operation: EOperation): void {
    this.eOperations.push(operation);
  }

  /**
   * Add super type
   */
  addSuperType(superType: EClass): void {
    this.eSuperTypes.push(superType);
  }

  // EObject methods
  getEAnnotations(): EAnnotation[] {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEClassClass();
  }

  /**
   * Override eGet to handle class-specific features
   */
  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this.name;
      case 'abstract':
        return this.abstract_;
      case 'interface':
        return this.interface_;
      case 'eSuperTypes':
        return this.eSuperTypes;
      case 'eStructuralFeatures':
        return this.getEStructuralFeatures();
      case 'eOperations':
        return this.eOperations;
      case 'eAnnotations':
        return this.eAnnotations;
      case 'instanceClassName':
        return this.instanceClassName;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle class-specific features
   */
  override eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this._name = newValue;
        super.eSet(feature, newValue);
        break;
      case 'abstract':
        this.abstract_ = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'interface':
        this.interface_ = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'eSuperTypes':
        if (Array.isArray(newValue)) {
          this.eSuperTypes = newValue;
        }
        super.eSet(feature, newValue);
        break;
      case 'eStructuralFeatures':
        // Clear and re-add all features through the EList
        // EList handles its own notifications, so don't call super.eSet
        const featureList = this.getEStructuralFeatures();
        featureList.clear();
        if (Array.isArray(newValue)) {
          featureList.addAll(newValue);
        } else if (newValue && typeof newValue[Symbol.iterator] === 'function') {
          featureList.addAll([...newValue]);
        }
        break;
      case 'eOperations':
        if (Array.isArray(newValue)) {
          this.eOperations = newValue;
        }
        super.eSet(feature, newValue);
        break;
      case 'eAnnotations':
        if (Array.isArray(newValue)) {
          this.eAnnotations = newValue;
        }
        super.eSet(feature, newValue);
        break;
      case 'instanceClassName':
        this.instanceClassName = newValue;
        super.eSet(feature, newValue);
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Builder for creating EClass instances
 */
export class EClassBuilder {
  private eClass: BasicEClass;

  constructor(name: string) {
    this.eClass = new BasicEClass();
    this.eClass.setName(name);
  }

  abstract(value: boolean = true): this {
    this.eClass.setAbstract(value);
    return this;
  }

  interface(value: boolean = true): this {
    this.eClass.setInterface(value);
    return this;
  }

  superType(superType: EClass): this {
    this.eClass.addSuperType(superType);
    return this;
  }

  feature(feature: EStructuralFeature): this {
    this.eClass.addFeature(feature);
    return this;
  }

  operation(operation: EOperation): this {
    this.eClass.addOperation(operation);
    return this;
  }

  build(): EClass {
    return this.eClass;
  }
}

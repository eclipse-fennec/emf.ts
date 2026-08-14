/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClass } from '../EClass.js';
import { EAttribute } from '../EAttribute.js';
import { EReference } from '../EReference.js';
import { EOperation } from '../EOperation.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EPackage } from '../EPackage.js';
import { BasicEObject } from './BasicEObject.js';
import { EAnnotation } from '../EAnnotation.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { ETypeParameter } from '../ETypeParameter.js';
import { EGenericType } from '../EGenericType.js';
import { EObject } from '../EObject.js';
import { DerivedListCache, EList, EObjectContainmentWithInverseEListLazy, cachedDerivedList, createIndexedProxy, createMetamodelEList, replaceListContents } from '../EList.js';

/**
 * Basic EClass implementation
 */
export class BasicEClass extends BasicEObject implements EClass {
  private _name: string | null = null;
  private abstract_: boolean = false;
  private interface_: boolean = false;
  private _eSuperTypes: EList<EClass> | null = null;
  private _eStructuralFeatures: EList<EStructuralFeature> | null = null;
  private _eOperations: EList<EOperation> | null = null;
  private ePackage: EPackage | null = null;
  private instanceClassName: string | null = null;
  private instanceClass: Function | null = null;
  private featureID: number = 0;
  private eTypeParameters: EList<ETypeParameter> = createMetamodelEList<ETypeParameter>(this);
  private eGenericSuperTypes: EList<EGenericType> = createMetamodelEList<EGenericType>(this);
  private eAnnotations: EList<EAnnotation> = createMetamodelEList<EAnnotation>(this);
  private xmlNameToFeature: Map<string, EStructuralFeature> = new Map();

  /**
   * Caches for the derived lists, each invalidated by the global metamodel
   * revision. See cachedDerivedList().
   */
  private allSuperTypesCache: { value: DerivedListCache<EClass> | null } = { value: null };
  private allFeaturesCache: { value: DerivedListCache<EStructuralFeature> | null } = { value: null };
  private attributesCache: { value: DerivedListCache<EAttribute> | null } = { value: null };
  private allAttributesCache: { value: DerivedListCache<EAttribute> | null } = { value: null };
  private referencesCache: { value: DerivedListCache<EReference> | null } = { value: null };
  private allReferencesCache: { value: DerivedListCache<EReference> | null } = { value: null };
  private allContainmentsCache: { value: DerivedListCache<EReference> | null } = { value: null };
  private allOperationsCache: { value: DerivedListCache<EOperation> | null } = { value: null };

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

  getESuperTypes(): EList<EClass> {
    if (this._eSuperTypes === null) {
      this._eSuperTypes = createMetamodelEList<EClass>(this, () => this.resolveOwnFeature('eSuperTypes'));
    }
    return this._eSuperTypes;
  }

  getEAllSuperTypes(): EList<EClass> {
    return cachedDerivedList(this.allSuperTypesCache, 'getEAllSuperTypes', () => {
      const all: EClass[] = [];
      const visited = new Set<EClass>();

      const collect = (eClass: EClass) => {
        for (const superType of eClass.getESuperTypes()) {
          if (!visited.has(superType)) {
            visited.add(superType);
            collect(superType);
            all.push(superType);
          }
        }
      };

      collect(this);
      return all;
    });
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

  getEAllStructuralFeatures(): EList<EStructuralFeature> {
    return cachedDerivedList(this.allFeaturesCache, 'getEAllStructuralFeatures', () => {
      const all: EStructuralFeature[] = [];

      // Inherited features first (EMF standard ordering)
      for (const superType of this.getEAllSuperTypes()) {
        all.push(...superType.getEStructuralFeatures());
      }

      // Then own features
      all.push(...this.getEStructuralFeatures());

      return all;
    });
  }

  getEAttributes(): EList<EAttribute> {
    return cachedDerivedList(this.attributesCache, 'getEAttributes', () =>
      this.getEStructuralFeatures().filter(f => this.isAttribute(f)) as EAttribute[]
    );
  }

  getEAllAttributes(): EList<EAttribute> {
    return cachedDerivedList(this.allAttributesCache, 'getEAllAttributes', () =>
      this.getEAllStructuralFeatures().filter(f => this.isAttribute(f)) as EAttribute[]
    );
  }

  getEReferences(): EList<EReference> {
    return cachedDerivedList(this.referencesCache, 'getEReferences', () =>
      this.getEStructuralFeatures().filter(f => this.isReference(f)) as EReference[]
    );
  }

  getEAllReferences(): EList<EReference> {
    return cachedDerivedList(this.allReferencesCache, 'getEAllReferences', () =>
      this.getEAllStructuralFeatures().filter(f => this.isReference(f)) as EReference[]
    );
  }

  getEAllContainments(): EList<EReference> {
    return cachedDerivedList(this.allContainmentsCache, 'getEAllContainments', () =>
      this.getEAllReferences().filter(ref => ref.isContainment())
    );
  }

  getEOperations(): EList<EOperation> {
    if (this._eOperations === null) {
      this._eOperations = createMetamodelEList<EOperation>(this, () => this.resolveOwnFeature('eOperations'));
    }
    return this._eOperations;
  }

  getEAllOperations(): EList<EOperation> {
    return cachedDerivedList(this.allOperationsCache, 'getEAllOperations', () => {
      const all: EOperation[] = [...this.getEOperations()];

      for (const superType of this.getEAllSuperTypes()) {
        all.push(...superType.getEOperations());
      }

      return all;
    });
  }

  /**
   * Resolves one of this class's own metamodel features (eSuperTypes,
   * eOperations, ...) on the Ecore EClass descriptor, for notifications.
   *
   * Returns null while the Ecore package is still bootstrapping, which is why
   * the lists resolve their feature lazily rather than in the constructor.
   */
  private resolveOwnFeature(name: string): EStructuralFeature | null {
    if (!ecoreRegistry.isRegistered()) {
      return null;
    }
    try {
      const eClassClass = ecoreRegistry.getEClassClass();
      if (eClassClass !== this && eClassClass instanceof BasicEClass && eClassClass._eStructuralFeatures !== null) {
        return eClassClass.getEStructuralFeature(name);
      }
    } catch {
      // Ignore during bootstrap
    }
    return null;
  }

  getEStructuralFeature(featureNameOrID: string | number): EStructuralFeature | null {
    if (typeof featureNameOrID === 'string') {
      // First try exact match by feature name
      const byName = this.getEAllStructuralFeatures().find(f => f.getName() === featureNameOrID);
      if (byName) return byName;
      // Then try XML name mapping (ExtendedMetaData)
      const byXmlName = this.xmlNameToFeature.get(featureNameOrID);
      if (byXmlName) return byXmlName;
      // Also check supertype XML name mappings
      for (const superType of this.getEAllSuperTypes()) {
        if (superType instanceof BasicEClass) {
          const fromSuper = superType.xmlNameToFeature.get(featureNameOrID);
          if (fromSuper) return fromSuper;
        }
      }
      return null;
    } else {
      return this.getEAllStructuralFeatures()[featureNameOrID] || null;
    }
  }

  /**
   * Register an XML serialization name for a feature (from ExtendedMetaData annotations)
   */
  registerXmlName(xmlName: string, feature: EStructuralFeature): void {
    this.xmlNameToFeature.set(xmlName, feature);
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

  getETypeParameters(): EList<ETypeParameter> {
    return this.eTypeParameters;
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
    this.getEOperations().add(operation);
  }

  /**
   * Add super type
   */
  addSuperType(superType: EClass): void {
    this.getESuperTypes().add(superType);
  }

  // EObject methods
  getEAnnotations(): EList<EAnnotation> {
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
        return this.getESuperTypes();
      case 'eStructuralFeatures':
        return this.getEStructuralFeatures();
      case 'eOperations':
        return this.getEOperations();
      case 'eTypeParameters':
        return this.eTypeParameters;
      case 'eGenericSuperTypes':
        return this.eGenericSuperTypes;
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
        replaceListContents(this.getESuperTypes(), newValue);
        break;
      case 'eStructuralFeatures':
        // The EList sends its own notifications, so super.eSet is not called.
        replaceListContents(this.getEStructuralFeatures(), newValue);
        break;
      case 'eOperations':
        replaceListContents(this.getEOperations(), newValue);
        break;
      case 'eTypeParameters':
        replaceListContents(this.eTypeParameters, newValue);
        break;
      case 'eGenericSuperTypes':
        replaceListContents(this.eGenericSuperTypes, newValue);
        break;
      case 'eAnnotations':
        replaceListContents(this.eAnnotations, newValue);
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

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EPackage, EPackageRegistry } from '../EPackage';
import { EClass } from '../EClass';
import { EAttribute } from '../EAttribute';
import { EReference } from '../EReference';
import { EDataType } from '../EDataType';
import { EFactory } from '../EFactory';
import { EClassifier } from '../EClassifier';
import { EObject } from '../EObject';
import { BasicEPackage } from '../runtime/BasicEPackage';
import { BasicEClass } from '../runtime/BasicEClass';
import { BasicEAttribute } from '../runtime/BasicEAttribute';
import { BasicEReference } from '../runtime/BasicEReference';
import { BasicEDataType } from '../runtime/BasicEDataType';
import { BasicEFactory } from '../runtime/BasicEFactory';
import { ecoreRegistry } from './EcoreRegistry';

/**
 * Ecore namespace URI
 */
export const ECORE_NS_URI = 'http://www.eclipse.org/emf/2002/Ecore';
export const ECORE_NS_PREFIX = 'ecore';

/**
 * XML Type namespace URI (for primitive types)
 */
export const XML_TYPE_NS_URI = 'http://www.eclipse.org/emf/2003/XMLType';

/**
 * Singleton EcorePackage instance
 */
let ecorePackageInstance: EcorePackageImpl | null = null;

/**
 * Get the Ecore package singleton
 */
export function getEcorePackage(): EcorePackageImpl {
  if (!ecorePackageInstance) {
    ecorePackageInstance = new EcorePackageImpl();
    ecorePackageInstance.initialize();
    // Register in global package registry
    registerEcorePackage();
    // Register with ecoreRegistry for circular dependency resolution
    ecoreRegistry.register(getEcorePackage);
  }
  return ecorePackageInstance;
}

/**
 * Register the Ecore package in the global registry.
 * Called automatically when getEcorePackage() is first called.
 */
export function registerEcorePackage(): void {
  if (ecorePackageInstance) {
    EPackageRegistry.INSTANCE.set(ECORE_NS_URI, ecorePackageInstance);
    // Note: XMLType should be registered separately with its own package
  }
}

/**
 * EcorePackage implementation
 */
export class EcorePackageImpl extends BasicEPackage {
  // EClasses for the metamodel
  private _eObjectClass!: BasicEClass;
  private _eModelElementClass!: BasicEClass;
  private _eNamedElementClass!: BasicEClass;
  private _eClassifierClass!: BasicEClass;
  private _eClassClass!: BasicEClass;
  private _eDataTypeClass!: BasicEClass;
  private _eEnumClass!: BasicEClass;
  private _eEnumLiteralClass!: BasicEClass;
  private _ePackageClass!: BasicEClass;
  private _eFactoryClass!: BasicEClass;
  private _eTypedElementClass!: BasicEClass;
  private _eStructuralFeatureClass!: BasicEClass;
  private _eAttributeClass!: BasicEClass;
  private _eReferenceClass!: BasicEClass;
  private _eOperationClass!: BasicEClass;
  private _eParameterClass!: BasicEClass;
  private _eAnnotationClass!: BasicEClass;
  private _eTypeParameterClass!: BasicEClass;
  private _eGenericTypeClass!: BasicEClass;
  private _eStringToStringMapEntryClass!: BasicEClass;

  // EDataTypes
  private _eBooleanDataType!: BasicEDataType;
  private _eIntDataType!: BasicEDataType;
  private _eStringDataType!: BasicEDataType;
  private _eDoubleDataType!: BasicEDataType;
  private _eFloatDataType!: BasicEDataType;
  private _eLongDataType!: BasicEDataType;
  private _eShortDataType!: BasicEDataType;
  private _eByteDataType!: BasicEDataType;
  private _eCharDataType!: BasicEDataType;
  private _eDateDataType!: BasicEDataType;
  private _eBigIntegerDataType!: BasicEDataType;
  private _eBigDecimalDataType!: BasicEDataType;
  private _eFeatureMapEntryDataType!: BasicEDataType;
  private _eJavaObjectDataType!: BasicEDataType;
  private _eJavaClassDataType!: BasicEDataType;

  private _initialized: boolean = false;

  constructor() {
    super();
    this.setName('ecore');
    this.setNsURI(ECORE_NS_URI);
    this.setNsPrefix(ECORE_NS_PREFIX);
  }

  /**
   * Initialize the package (called once)
   */
  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;

    // Create EDataTypes first
    this.createDataTypes();

    // Create EClasses
    this.createClasses();

    // Create attributes and references
    this.createAttributes();
    this.createReferences();

    // Set ePackage on all classifiers
    this.initializeClassifierPackages();

    // Set up factory
    const factory = new EcoreFactory(this);
    this.setEFactoryInstance(factory);
  }

  /**
   * Set the ePackage reference on all classifiers
   */
  private initializeClassifierPackages(): void {
    for (const classifier of this.getEClassifiers()) {
      if ('setEPackage' in classifier) {
        (classifier as any).setEPackage(this);
      }
    }
  }

  private createDataTypes(): void {
    this._eBooleanDataType = new BasicEDataType();
    this._eBooleanDataType.setName('EBoolean');
    this._eBooleanDataType.setInstanceClassName('boolean');
    this.getEClassifiers().push(this._eBooleanDataType);

    this._eIntDataType = new BasicEDataType();
    this._eIntDataType.setName('EInt');
    this._eIntDataType.setInstanceClassName('int');
    this.getEClassifiers().push(this._eIntDataType);

    this._eStringDataType = new BasicEDataType();
    this._eStringDataType.setName('EString');
    this._eStringDataType.setInstanceClassName('java.lang.String');
    this.getEClassifiers().push(this._eStringDataType);

    this._eDoubleDataType = new BasicEDataType();
    this._eDoubleDataType.setName('EDouble');
    this._eDoubleDataType.setInstanceClassName('double');
    this.getEClassifiers().push(this._eDoubleDataType);

    this._eFloatDataType = new BasicEDataType();
    this._eFloatDataType.setName('EFloat');
    this._eFloatDataType.setInstanceClassName('float');
    this.getEClassifiers().push(this._eFloatDataType);

    this._eLongDataType = new BasicEDataType();
    this._eLongDataType.setName('ELong');
    this._eLongDataType.setInstanceClassName('long');
    this.getEClassifiers().push(this._eLongDataType);

    this._eShortDataType = new BasicEDataType();
    this._eShortDataType.setName('EShort');
    this._eShortDataType.setInstanceClassName('short');
    this.getEClassifiers().push(this._eShortDataType);

    this._eByteDataType = new BasicEDataType();
    this._eByteDataType.setName('EByte');
    this._eByteDataType.setInstanceClassName('byte');
    this.getEClassifiers().push(this._eByteDataType);

    this._eCharDataType = new BasicEDataType();
    this._eCharDataType.setName('EChar');
    this._eCharDataType.setInstanceClassName('char');
    this.getEClassifiers().push(this._eCharDataType);

    this._eDateDataType = new BasicEDataType();
    this._eDateDataType.setName('EDate');
    this._eDateDataType.setInstanceClassName('java.util.Date');
    this.getEClassifiers().push(this._eDateDataType);

    this._eBigIntegerDataType = new BasicEDataType();
    this._eBigIntegerDataType.setName('EBigInteger');
    this._eBigIntegerDataType.setInstanceClassName('java.math.BigInteger');
    this.getEClassifiers().push(this._eBigIntegerDataType);

    this._eBigDecimalDataType = new BasicEDataType();
    this._eBigDecimalDataType.setName('EBigDecimal');
    this._eBigDecimalDataType.setInstanceClassName('java.math.BigDecimal');
    this.getEClassifiers().push(this._eBigDecimalDataType);

    this._eFeatureMapEntryDataType = new BasicEDataType();
    this._eFeatureMapEntryDataType.setName('EFeatureMapEntry');
    this._eFeatureMapEntryDataType.setInstanceClassName('org.eclipse.emf.ecore.util.FeatureMap.Entry');
    this.getEClassifiers().push(this._eFeatureMapEntryDataType);

    this._eJavaObjectDataType = new BasicEDataType();
    this._eJavaObjectDataType.setName('EJavaObject');
    this._eJavaObjectDataType.setInstanceClassName('java.lang.Object');
    this.getEClassifiers().push(this._eJavaObjectDataType);

    this._eJavaClassDataType = new BasicEDataType();
    this._eJavaClassDataType.setName('EJavaClass');
    this._eJavaClassDataType.setInstanceClassName('java.lang.Class');
    this.getEClassifiers().push(this._eJavaClassDataType);
  }

  private createClasses(): void {
    // EObject
    this._eObjectClass = new BasicEClass();
    this._eObjectClass.setName('EObject');
    this.getEClassifiers().push(this._eObjectClass);

    // EModelElement extends EObject
    this._eModelElementClass = new BasicEClass();
    this._eModelElementClass.setName('EModelElement');
    this._eModelElementClass.setAbstract(true);
    this._eModelElementClass.getESuperTypes().push(this._eObjectClass);
    this.getEClassifiers().push(this._eModelElementClass);

    // ENamedElement extends EModelElement
    this._eNamedElementClass = new BasicEClass();
    this._eNamedElementClass.setName('ENamedElement');
    this._eNamedElementClass.setAbstract(true);
    this._eNamedElementClass.getESuperTypes().push(this._eModelElementClass);
    this.getEClassifiers().push(this._eNamedElementClass);

    // ETypedElement extends ENamedElement
    this._eTypedElementClass = new BasicEClass();
    this._eTypedElementClass.setName('ETypedElement');
    this._eTypedElementClass.setAbstract(true);
    this._eTypedElementClass.getESuperTypes().push(this._eNamedElementClass);
    this.getEClassifiers().push(this._eTypedElementClass);

    // EClassifier extends ENamedElement
    this._eClassifierClass = new BasicEClass();
    this._eClassifierClass.setName('EClassifier');
    this._eClassifierClass.setAbstract(true);
    this._eClassifierClass.getESuperTypes().push(this._eNamedElementClass);
    this.getEClassifiers().push(this._eClassifierClass);

    // EClass extends EClassifier
    this._eClassClass = new BasicEClass();
    this._eClassClass.setName('EClass');
    this._eClassClass.getESuperTypes().push(this._eClassifierClass);
    this.getEClassifiers().push(this._eClassClass);

    // EDataType extends EClassifier
    this._eDataTypeClass = new BasicEClass();
    this._eDataTypeClass.setName('EDataType');
    this._eDataTypeClass.getESuperTypes().push(this._eClassifierClass);
    this.getEClassifiers().push(this._eDataTypeClass);

    // EEnum extends EDataType
    this._eEnumClass = new BasicEClass();
    this._eEnumClass.setName('EEnum');
    this._eEnumClass.getESuperTypes().push(this._eDataTypeClass);
    this.getEClassifiers().push(this._eEnumClass);

    // EEnumLiteral extends ENamedElement
    this._eEnumLiteralClass = new BasicEClass();
    this._eEnumLiteralClass.setName('EEnumLiteral');
    this._eEnumLiteralClass.getESuperTypes().push(this._eNamedElementClass);
    this.getEClassifiers().push(this._eEnumLiteralClass);

    // EPackage extends ENamedElement
    this._ePackageClass = new BasicEClass();
    this._ePackageClass.setName('EPackage');
    this._ePackageClass.getESuperTypes().push(this._eNamedElementClass);
    this.getEClassifiers().push(this._ePackageClass);

    // EFactory extends EModelElement
    this._eFactoryClass = new BasicEClass();
    this._eFactoryClass.setName('EFactory');
    this._eFactoryClass.getESuperTypes().push(this._eModelElementClass);
    this.getEClassifiers().push(this._eFactoryClass);

    // EStructuralFeature extends ETypedElement
    this._eStructuralFeatureClass = new BasicEClass();
    this._eStructuralFeatureClass.setName('EStructuralFeature');
    this._eStructuralFeatureClass.setAbstract(true);
    this._eStructuralFeatureClass.getESuperTypes().push(this._eTypedElementClass);
    this.getEClassifiers().push(this._eStructuralFeatureClass);

    // EAttribute extends EStructuralFeature
    this._eAttributeClass = new BasicEClass();
    this._eAttributeClass.setName('EAttribute');
    this._eAttributeClass.getESuperTypes().push(this._eStructuralFeatureClass);
    this.getEClassifiers().push(this._eAttributeClass);

    // EReference extends EStructuralFeature
    this._eReferenceClass = new BasicEClass();
    this._eReferenceClass.setName('EReference');
    this._eReferenceClass.getESuperTypes().push(this._eStructuralFeatureClass);
    this.getEClassifiers().push(this._eReferenceClass);

    // EOperation extends ETypedElement
    this._eOperationClass = new BasicEClass();
    this._eOperationClass.setName('EOperation');
    this._eOperationClass.getESuperTypes().push(this._eTypedElementClass);
    this.getEClassifiers().push(this._eOperationClass);

    // EParameter extends ETypedElement
    this._eParameterClass = new BasicEClass();
    this._eParameterClass.setName('EParameter');
    this._eParameterClass.getESuperTypes().push(this._eTypedElementClass);
    this.getEClassifiers().push(this._eParameterClass);

    // EAnnotation extends EModelElement
    this._eAnnotationClass = new BasicEClass();
    this._eAnnotationClass.setName('EAnnotation');
    this._eAnnotationClass.getESuperTypes().push(this._eModelElementClass);
    this.getEClassifiers().push(this._eAnnotationClass);

    // ETypeParameter extends ENamedElement
    this._eTypeParameterClass = new BasicEClass();
    this._eTypeParameterClass.setName('ETypeParameter');
    this._eTypeParameterClass.getESuperTypes().push(this._eNamedElementClass);
    this.getEClassifiers().push(this._eTypeParameterClass);

    // EGenericType extends EObject
    this._eGenericTypeClass = new BasicEClass();
    this._eGenericTypeClass.setName('EGenericType');
    this._eGenericTypeClass.getESuperTypes().push(this._eObjectClass);
    this.getEClassifiers().push(this._eGenericTypeClass);

    // EStringToStringMapEntry
    this._eStringToStringMapEntryClass = new BasicEClass();
    this._eStringToStringMapEntryClass.setName('EStringToStringMapEntry');
    this._eStringToStringMapEntryClass.getESuperTypes().push(this._eObjectClass);
    this.getEClassifiers().push(this._eStringToStringMapEntryClass);
  }

  private createAttributes(): void {
    // ENamedElement.name
    const nameAttr = new BasicEAttribute();
    nameAttr.setName('name');
    nameAttr.setEType(this._eStringDataType);
    this._eNamedElementClass.getEStructuralFeatures().push(nameAttr);

    // ETypedElement attributes
    const orderedAttr = new BasicEAttribute();
    orderedAttr.setName('ordered');
    orderedAttr.setEType(this._eBooleanDataType);
    orderedAttr.setDefaultValueLiteral('true');
    this._eTypedElementClass.getEStructuralFeatures().push(orderedAttr);

    const uniqueAttr = new BasicEAttribute();
    uniqueAttr.setName('unique');
    uniqueAttr.setEType(this._eBooleanDataType);
    uniqueAttr.setDefaultValueLiteral('true');
    this._eTypedElementClass.getEStructuralFeatures().push(uniqueAttr);

    const lowerBoundAttr = new BasicEAttribute();
    lowerBoundAttr.setName('lowerBound');
    lowerBoundAttr.setEType(this._eIntDataType);
    lowerBoundAttr.setDefaultValueLiteral('0');
    this._eTypedElementClass.getEStructuralFeatures().push(lowerBoundAttr);

    const upperBoundAttr = new BasicEAttribute();
    upperBoundAttr.setName('upperBound');
    upperBoundAttr.setEType(this._eIntDataType);
    upperBoundAttr.setDefaultValueLiteral('1');
    this._eTypedElementClass.getEStructuralFeatures().push(upperBoundAttr);

    // EClassifier.instanceClassName
    const instanceClassNameAttr = new BasicEAttribute();
    instanceClassNameAttr.setName('instanceClassName');
    instanceClassNameAttr.setEType(this._eStringDataType);
    this._eClassifierClass.getEStructuralFeatures().push(instanceClassNameAttr);

    // EClass attributes
    const abstractAttr = new BasicEAttribute();
    abstractAttr.setName('abstract');
    abstractAttr.setEType(this._eBooleanDataType);
    abstractAttr.setDefaultValueLiteral('false');
    this._eClassClass.getEStructuralFeatures().push(abstractAttr);

    const interfaceAttr = new BasicEAttribute();
    interfaceAttr.setName('interface');
    interfaceAttr.setEType(this._eBooleanDataType);
    interfaceAttr.setDefaultValueLiteral('false');
    this._eClassClass.getEStructuralFeatures().push(interfaceAttr);

    // EPackage attributes
    const nsURIAttr = new BasicEAttribute();
    nsURIAttr.setName('nsURI');
    nsURIAttr.setEType(this._eStringDataType);
    this._ePackageClass.getEStructuralFeatures().push(nsURIAttr);

    const nsPrefixAttr = new BasicEAttribute();
    nsPrefixAttr.setName('nsPrefix');
    nsPrefixAttr.setEType(this._eStringDataType);
    this._ePackageClass.getEStructuralFeatures().push(nsPrefixAttr);

    // EStructuralFeature attributes
    const changeableAttr = new BasicEAttribute();
    changeableAttr.setName('changeable');
    changeableAttr.setEType(this._eBooleanDataType);
    changeableAttr.setDefaultValueLiteral('true');
    this._eStructuralFeatureClass.getEStructuralFeatures().push(changeableAttr);

    const volatileAttr = new BasicEAttribute();
    volatileAttr.setName('volatile');
    volatileAttr.setEType(this._eBooleanDataType);
    volatileAttr.setDefaultValueLiteral('false');
    this._eStructuralFeatureClass.getEStructuralFeatures().push(volatileAttr);

    const transientAttr = new BasicEAttribute();
    transientAttr.setName('transient');
    transientAttr.setEType(this._eBooleanDataType);
    transientAttr.setDefaultValueLiteral('false');
    this._eStructuralFeatureClass.getEStructuralFeatures().push(transientAttr);

    const defaultValueLiteralAttr = new BasicEAttribute();
    defaultValueLiteralAttr.setName('defaultValueLiteral');
    defaultValueLiteralAttr.setEType(this._eStringDataType);
    this._eStructuralFeatureClass.getEStructuralFeatures().push(defaultValueLiteralAttr);

    const unsettableAttr = new BasicEAttribute();
    unsettableAttr.setName('unsettable');
    unsettableAttr.setEType(this._eBooleanDataType);
    unsettableAttr.setDefaultValueLiteral('false');
    this._eStructuralFeatureClass.getEStructuralFeatures().push(unsettableAttr);

    const derivedAttr = new BasicEAttribute();
    derivedAttr.setName('derived');
    derivedAttr.setEType(this._eBooleanDataType);
    derivedAttr.setDefaultValueLiteral('false');
    this._eStructuralFeatureClass.getEStructuralFeatures().push(derivedAttr);

    // EAttribute.iD
    const idAttr = new BasicEAttribute();
    idAttr.setName('iD');
    idAttr.setEType(this._eBooleanDataType);
    idAttr.setDefaultValueLiteral('false');
    this._eAttributeClass.getEStructuralFeatures().push(idAttr);

    // EReference attributes
    const containmentAttr = new BasicEAttribute();
    containmentAttr.setName('containment');
    containmentAttr.setEType(this._eBooleanDataType);
    containmentAttr.setDefaultValueLiteral('false');
    this._eReferenceClass.getEStructuralFeatures().push(containmentAttr);

    const resolveProxiesAttr = new BasicEAttribute();
    resolveProxiesAttr.setName('resolveProxies');
    resolveProxiesAttr.setEType(this._eBooleanDataType);
    resolveProxiesAttr.setDefaultValueLiteral('true');
    this._eReferenceClass.getEStructuralFeatures().push(resolveProxiesAttr);

    // EEnumLiteral attributes
    const valueAttr = new BasicEAttribute();
    valueAttr.setName('value');
    valueAttr.setEType(this._eIntDataType);
    valueAttr.setDefaultValueLiteral('0');
    this._eEnumLiteralClass.getEStructuralFeatures().push(valueAttr);

    const literalAttr = new BasicEAttribute();
    literalAttr.setName('literal');
    literalAttr.setEType(this._eStringDataType);
    this._eEnumLiteralClass.getEStructuralFeatures().push(literalAttr);

    // EAnnotation.source
    const sourceAttr = new BasicEAttribute();
    sourceAttr.setName('source');
    sourceAttr.setEType(this._eStringDataType);
    this._eAnnotationClass.getEStructuralFeatures().push(sourceAttr);

    // EStringToStringMapEntry
    const keyAttr = new BasicEAttribute();
    keyAttr.setName('key');
    keyAttr.setEType(this._eStringDataType);
    this._eStringToStringMapEntryClass.getEStructuralFeatures().push(keyAttr);

    const mapValueAttr = new BasicEAttribute();
    mapValueAttr.setName('value');
    mapValueAttr.setEType(this._eStringDataType);
    this._eStringToStringMapEntryClass.getEStructuralFeatures().push(mapValueAttr);

    // EDataType.serializable
    const serializableAttr = new BasicEAttribute();
    serializableAttr.setName('serializable');
    serializableAttr.setEType(this._eBooleanDataType);
    serializableAttr.setDefaultValueLiteral('true');
    this._eDataTypeClass.getEStructuralFeatures().push(serializableAttr);
  }

  private createReferences(): void {
    // EModelElement.eAnnotations
    const eAnnotationsRef = new BasicEReference();
    eAnnotationsRef.setName('eAnnotations');
    eAnnotationsRef.setEType(this._eAnnotationClass);
    eAnnotationsRef.setContainment(true);
    eAnnotationsRef.setUpperBound(-1);
    this._eModelElementClass.getEStructuralFeatures().push(eAnnotationsRef);

    // ETypedElement.eType
    const eTypeRef = new BasicEReference();
    eTypeRef.setName('eType');
    eTypeRef.setEType(this._eClassifierClass);
    this._eTypedElementClass.getEStructuralFeatures().push(eTypeRef);

    // EClass.eSuperTypes
    const eSuperTypesRef = new BasicEReference();
    eSuperTypesRef.setName('eSuperTypes');
    eSuperTypesRef.setEType(this._eClassClass);
    eSuperTypesRef.setUpperBound(-1);
    this._eClassClass.getEStructuralFeatures().push(eSuperTypesRef);

    // EClass.eStructuralFeatures
    const eStructuralFeaturesRef = new BasicEReference();
    eStructuralFeaturesRef.setName('eStructuralFeatures');
    eStructuralFeaturesRef.setEType(this._eStructuralFeatureClass);
    eStructuralFeaturesRef.setContainment(true);
    eStructuralFeaturesRef.setUpperBound(-1);
    this._eClassClass.getEStructuralFeatures().push(eStructuralFeaturesRef);

    // EClass.eOperations
    const eOperationsRef = new BasicEReference();
    eOperationsRef.setName('eOperations');
    eOperationsRef.setEType(this._eOperationClass);
    eOperationsRef.setContainment(true);
    eOperationsRef.setUpperBound(-1);
    this._eClassClass.getEStructuralFeatures().push(eOperationsRef);

    // EPackage.eClassifiers
    const eClassifiersRef = new BasicEReference();
    eClassifiersRef.setName('eClassifiers');
    eClassifiersRef.setEType(this._eClassifierClass);
    eClassifiersRef.setContainment(true);
    eClassifiersRef.setUpperBound(-1);
    this._ePackageClass.getEStructuralFeatures().push(eClassifiersRef);

    // EPackage.eSubpackages
    const eSubpackagesRef = new BasicEReference();
    eSubpackagesRef.setName('eSubpackages');
    eSubpackagesRef.setEType(this._ePackageClass);
    eSubpackagesRef.setContainment(true);
    eSubpackagesRef.setUpperBound(-1);
    this._ePackageClass.getEStructuralFeatures().push(eSubpackagesRef);

    // EPackage.eFactoryInstance
    const eFactoryInstanceRef = new BasicEReference();
    eFactoryInstanceRef.setName('eFactoryInstance');
    eFactoryInstanceRef.setEType(this._eFactoryClass);
    this._ePackageClass.getEStructuralFeatures().push(eFactoryInstanceRef);

    // EEnum.eLiterals
    const eLiteralsRef = new BasicEReference();
    eLiteralsRef.setName('eLiterals');
    eLiteralsRef.setEType(this._eEnumLiteralClass);
    eLiteralsRef.setContainment(true);
    eLiteralsRef.setUpperBound(-1);
    this._eEnumClass.getEStructuralFeatures().push(eLiteralsRef);

    // EReference.eOpposite
    const eOppositeRef = new BasicEReference();
    eOppositeRef.setName('eOpposite');
    eOppositeRef.setEType(this._eReferenceClass);
    this._eReferenceClass.getEStructuralFeatures().push(eOppositeRef);

    // EOperation.eParameters
    const eParametersRef = new BasicEReference();
    eParametersRef.setName('eParameters');
    eParametersRef.setEType(this._eParameterClass);
    eParametersRef.setContainment(true);
    eParametersRef.setUpperBound(-1);
    this._eOperationClass.getEStructuralFeatures().push(eParametersRef);

    // EAnnotation.details
    const detailsRef = new BasicEReference();
    detailsRef.setName('details');
    detailsRef.setEType(this._eStringToStringMapEntryClass);
    detailsRef.setContainment(true);
    detailsRef.setUpperBound(-1);
    this._eAnnotationClass.getEStructuralFeatures().push(detailsRef);
  }

  // Getters for EClasses
  getEObjectClass(): EClass { return this._eObjectClass; }
  getEModelElementClass(): EClass { return this._eModelElementClass; }
  getENamedElementClass(): EClass { return this._eNamedElementClass; }
  getEClassifierClass(): EClass { return this._eClassifierClass; }
  getEClassClass(): EClass { return this._eClassClass; }
  getEDataTypeClass(): EClass { return this._eDataTypeClass; }
  getEEnumClass(): EClass { return this._eEnumClass; }
  getEEnumLiteralClass(): EClass { return this._eEnumLiteralClass; }
  getEPackageClass(): EClass { return this._ePackageClass; }
  getEFactoryClass(): EClass { return this._eFactoryClass; }
  getEStructuralFeatureClass(): EClass { return this._eStructuralFeatureClass; }
  getEAttributeClass(): EClass { return this._eAttributeClass; }
  getEReferenceClass(): EClass { return this._eReferenceClass; }
  getEOperationClass(): EClass { return this._eOperationClass; }
  getEParameterClass(): EClass { return this._eParameterClass; }
  getEAnnotationClass(): EClass { return this._eAnnotationClass; }

  // Getters for EDataTypes
  getEBoolean(): EDataType { return this._eBooleanDataType; }
  getEInt(): EDataType { return this._eIntDataType; }
  getEString(): EDataType { return this._eStringDataType; }
  getEDouble(): EDataType { return this._eDoubleDataType; }
  getEFloat(): EDataType { return this._eFloatDataType; }
  getELong(): EDataType { return this._eLongDataType; }
  getEDate(): EDataType { return this._eDateDataType; }
}

/**
 * EcoreFactory - Factory for creating Ecore model elements
 */
export class EcoreFactory extends BasicEFactory {
  private _ePackage: EcorePackageImpl;

  constructor(ePackage: EcorePackageImpl) {
    super();
    this._ePackage = ePackage;
  }

  override getEPackage(): EPackage {
    return this._ePackage;
  }

  override create(eClass: EClass): EObject {
    const className = eClass.getName();

    switch (className) {
      case 'EClass':
        return new BasicEClass();
      case 'EAttribute':
        return new BasicEAttribute();
      case 'EReference':
        return new BasicEReference();
      case 'EDataType':
        return new BasicEDataType();
      case 'EPackage':
        return new BasicEPackage();
      // Add more cases as needed
      default:
        return super.create(eClass);
    }
  }
}

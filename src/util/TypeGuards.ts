/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject';
import { EClass } from '../EClass';
import { EClassifier } from '../EClassifier';
import { EDataType } from '../EDataType';
import { EEnum } from '../EEnum';
import { EAttribute } from '../EAttribute';
import { EReference } from '../EReference';
import { EStructuralFeature } from '../EStructuralFeature';
import { EPackage } from '../EPackage';
import { EFactory } from '../EFactory';
import { EOperation } from '../EOperation';
import { EParameter } from '../EParameter';
import { EAnnotation } from '../EAnnotation';

/**
 * Check if an object is an EObject
 */
export function isEObject(obj: any): obj is EObject {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.eClass === 'function' &&
         typeof obj.eGet === 'function' &&
         typeof obj.eSet === 'function';
}

/**
 * Check if a classifier is an EClass
 */
export function isEClass(classifier: EClassifier | null | undefined): classifier is EClass {
  return classifier !== null &&
         classifier !== undefined &&
         typeof (classifier as any).getESuperTypes === 'function' &&
         typeof (classifier as any).getEAllStructuralFeatures === 'function';
}

/**
 * Check if a classifier is an EDataType
 */
export function isEDataType(classifier: EClassifier | null | undefined): classifier is EDataType {
  return classifier !== null &&
         classifier !== undefined &&
         !isEClass(classifier) &&
         typeof (classifier as any).isSerializable === 'function';
}

/**
 * Check if a classifier is an EEnum
 */
export function isEEnum(classifier: EClassifier | null | undefined): classifier is EEnum {
  return classifier !== null &&
         classifier !== undefined &&
         typeof (classifier as any).getELiterals === 'function' &&
         typeof (classifier as any).getEEnumLiteral === 'function';
}

/**
 * Check if a feature is an EAttribute
 */
export function isEAttribute(feature: EStructuralFeature | null | undefined): feature is EAttribute {
  return feature !== null &&
         feature !== undefined &&
         typeof (feature as any).isID === 'function' &&
         typeof (feature as any).getEAttributeType === 'function';
}

/**
 * Check if a feature is an EReference
 */
export function isEReference(feature: EStructuralFeature | null | undefined): feature is EReference {
  return feature !== null &&
         feature !== undefined &&
         typeof (feature as any).isContainment === 'function' &&
         typeof (feature as any).getEOpposite === 'function';
}

/**
 * Check if an object is an EPackage
 */
export function isEPackage(obj: any): obj is EPackage {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.getNsURI === 'function' &&
         typeof obj.getNsPrefix === 'function' &&
         typeof obj.getEClassifiers === 'function';
}

/**
 * Check if an object is an EFactory
 */
export function isEFactory(obj: any): obj is EFactory {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.create === 'function' &&
         typeof obj.createFromString === 'function' &&
         typeof obj.convertToString === 'function';
}

/**
 * Check if an object is an EOperation
 */
export function isEOperation(obj: any): obj is EOperation {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.getEContainingClass === 'function' &&
         typeof obj.getEParameters === 'function';
}

/**
 * Check if an object is an EParameter
 */
export function isEParameter(obj: any): obj is EParameter {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.getEOperation === 'function';
}

/**
 * Check if an object is an EAnnotation
 */
export function isEAnnotation(obj: any): obj is EAnnotation {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.getSource === 'function' &&
         typeof obj.getDetails === 'function';
}

/**
 * Check if an object is an EStructuralFeature
 */
export function isEStructuralFeature(obj: any): obj is EStructuralFeature {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.getEContainingClass === 'function' &&
         typeof obj.isTransient === 'function' &&
         typeof obj.isVolatile === 'function';
}

/**
 * Check if an object is an EClassifier (EClass or EDataType)
 */
export function isEClassifier(obj: any): obj is EClassifier {
  return obj !== null &&
         typeof obj === 'object' &&
         typeof obj.getEPackage === 'function' &&
         typeof obj.getInstanceClass === 'function';
}

/**
 * Check if an EObject is an instance of the given EClass
 */
export function isInstanceOf(eObject: EObject | null | undefined, eClass: EClass): boolean {
  if (!eObject) return false;

  const objectClass = eObject.eClass();
  if (objectClass === eClass) return true;

  // Check supertypes
  const allSuperTypes = objectClass.getEAllSuperTypes();
  return allSuperTypes.includes(eClass);
}

/**
 * Cast an EObject to a specific type if it's an instance
 */
export function asInstanceOf<T extends EObject>(eObject: EObject | null | undefined, eClass: EClass): T | null {
  if (isInstanceOf(eObject, eClass)) {
    return eObject as T;
  }
  return null;
}

/**
 * Get all instances of an EClass in a collection
 */
export function filterByType<T extends EObject>(objects: Iterable<EObject>, eClass: EClass): T[] {
  const result: T[] = [];
  for (const obj of objects) {
    if (isInstanceOf(obj, eClass)) {
      result.push(obj as T);
    }
  }
  return result;
}

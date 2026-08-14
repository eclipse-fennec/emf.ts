/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EOperation } from '../EOperation.js';
import { EClass } from '../EClass.js';
import { EClassifier } from '../EClassifier.js';
import { EParameter } from '../EParameter.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EGenericType } from '../EGenericType.js';
import { ETypeParameter } from '../ETypeParameter.js';
import { BasicEObject } from './BasicEObject.js';
import { EAnnotation } from '../EAnnotation.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EList, createMetamodelEList, replaceListContents } from '../EList.js';

/**
 * Basic EOperation implementation
 */
export class BasicEOperation extends BasicEObject implements EOperation {
  private name: string | null = null;
  private eContainingClass: EClass | null = null;
  private eType: EClassifier | null = null;
  private eParameters: EList<EParameter> = createMetamodelEList<EParameter>(this);
  private eExceptions: EList<EClassifier> = createMetamodelEList<EClassifier>(this);
  private eAnnotations: EList<EAnnotation> = createMetamodelEList<EAnnotation>(this);
  private eGenericType: EGenericType | null = null;
  private eTypeParameters: EList<ETypeParameter> = createMetamodelEList<ETypeParameter>(this);
  private ordered: boolean = true;
  private unique: boolean = true;
  private lowerBound: number = 0;
  private upperBound: number = 1;

  getName(): string | null {
    return this.name;
  }

  setName(value: string | null): void {
    this.name = value;
  }

  getEContainingClass(): EClass | null {
    return this.eContainingClass;
  }

  setEContainingClass(value: EClass | null): void {
    this.eContainingClass = value;
  }

  getEType(): EClassifier | null {
    // A generically typed operation carries no eType attribute (#65).
    if (!this.eType && this.eGenericType) {
      return this.eGenericType.getERawType();
    }
    return this.eType;
  }

  getEGenericType(): EGenericType | null {
    return this.eGenericType;
  }

  setEGenericType(value: EGenericType | null): void {
    this.eGenericType = value;
  }

  getETypeParameters(): EList<ETypeParameter> {
    return this.eTypeParameters;
  }

  setEType(value: EClassifier | null): void {
    this.eType = value;
  }

  getEParameters(): EList<EParameter> {
    return this.eParameters;
  }

  addParameter(parameter: EParameter): void {
    this.eParameters.add(parameter);
  }

  getEExceptions(): EList<EClassifier> {
    return this.eExceptions;
  }

  addException(exception: EClassifier): void {
    this.eExceptions.add(exception);
  }

  isMany(): boolean {
    return this.upperBound < 0 || this.upperBound > 1;
  }

  isRequired(): boolean {
    return this.lowerBound >= 1;
  }

  getLowerBound(): number {
    return this.lowerBound;
  }

  setLowerBound(value: number): void {
    this.lowerBound = value;
  }

  getUpperBound(): number {
    return this.upperBound;
  }

  setUpperBound(value: number): void {
    this.upperBound = value;
  }

  getOperationID(): number {
    if (!this.eContainingClass) return -1;
    return this.eContainingClass.getOperationID(this);
  }

  isOverrideOf(someOperation: EOperation): boolean {
    if (this.name !== someOperation.getName()) {
      return false;
    }

    // Check parameter count
    const myParams = this.eParameters;
    const otherParams = someOperation.getEParameters();
    if (myParams.length !== otherParams.length) {
      return false;
    }

    // Check parameter types
    for (let i = 0; i < myParams.length; i++) {
      const myParamType = myParams[i].getEType();
      const otherParamType = otherParams[i].getEType();
      if (myParamType !== otherParamType) {
        return false;
      }
    }

    // Check if containing class is subtype
    if (!this.eContainingClass || !someOperation.getEContainingClass()) {
      return false;
    }

    return this.eContainingClass.getEAllSuperTypes().includes(someOperation.getEContainingClass()!);
  }

  isOrdered(): boolean {
    return this.ordered;
  }

  setOrdered(value: boolean): void {
    this.ordered = value;
  }

  isUnique(): boolean {
    return this.unique;
  }

  setUnique(value: boolean): void {
    this.unique = value;
  }

  // EObject methods
  getEAnnotations(): EList<EAnnotation> {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEOperationClass();
  }

  /**
   * Reflective get - binds the declared fields to the reflective API, so the
   * XMI loader and typed accessors see the same state.
   */
  override eGet(feature: EStructuralFeature): any {
    switch (feature.getName()) {
      case 'name':
        return this.name;
      case 'eType':
        return this.eType;
      case 'eGenericType':
        return this.eGenericType;
      case 'eTypeParameters':
        return this.eTypeParameters;
      case 'eParameters':
        return this.eParameters;
      case 'eExceptions':
        return this.eExceptions;
      case 'eAnnotations':
        return this.eAnnotations;
      case 'ordered':
        return this.ordered;
      case 'unique':
        return this.unique;
      case 'lowerBound':
        return this.lowerBound;
      case 'upperBound':
        return this.upperBound;
      default:
        return super.eGet(feature);
    }
  }

  override eSet(feature: EStructuralFeature, newValue: any): void {
    switch (feature.getName()) {
      case 'name':
        this.name = newValue;
        break;
      case 'eType':
        this.eType = newValue;
        break;
      case 'eGenericType':
        this.eGenericType = newValue;
        break;
      case 'eTypeParameters':
        replaceListContents(this.eTypeParameters, newValue);
        break;
      case 'eParameters':
        replaceListContents(this.eParameters, newValue);
        break;
      case 'eExceptions':
        replaceListContents(this.eExceptions, newValue);
        break;
      case 'eAnnotations':
        replaceListContents(this.eAnnotations, newValue);
        break;
      case 'ordered':
        this.ordered = newValue === true || newValue === 'true';
        break;
      case 'unique':
        this.unique = newValue === true || newValue === 'true';
        break;
      case 'lowerBound':
        this.lowerBound = Number(newValue);
        break;
      case 'upperBound':
        this.upperBound = Number(newValue);
        break;
    }
    super.eSet(feature, newValue);
  }
}

/**
 * Builder for creating EOperation instances
 */
export class EOperationBuilder {
  private op: BasicEOperation;

  constructor(name: string, returnType?: EClassifier) {
    this.op = new BasicEOperation();
    this.op.setName(name);
    if (returnType) {
      this.op.setEType(returnType);
    }
  }

  parameter(param: EParameter): this {
    this.op.addParameter(param);
    return this;
  }

  exception(exception: EClassifier): this {
    this.op.addException(exception);
    return this;
  }

  required(value: boolean = true): this {
    this.op.setLowerBound(value ? 1 : 0);
    return this;
  }

  many(value: boolean = true): this {
    this.op.setUpperBound(value ? -1 : 1);
    return this;
  }

  build(): EOperation {
    return this.op;
  }
}

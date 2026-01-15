/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EOperation } from '../EOperation';
import { EClass } from '../EClass';
import { EClassifier } from '../EClassifier';
import { EParameter } from '../EParameter';
import { BasicEObject } from './BasicEObject';
import { EAnnotation } from '../EAnnotation';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EOperation implementation
 */
export class BasicEOperation extends BasicEObject implements EOperation {
  private name: string | null = null;
  private eContainingClass: EClass | null = null;
  private eType: EClassifier | null = null;
  private eParameters: EParameter[] = [];
  private eExceptions: EClassifier[] = [];
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
    return this.eType;
  }

  setEType(value: EClassifier | null): void {
    this.eType = value;
  }

  getEParameters(): EParameter[] {
    return this.eParameters;
  }

  addParameter(parameter: EParameter): void {
    this.eParameters.push(parameter);
  }

  getEExceptions(): EClassifier[] {
    return this.eExceptions;
  }

  addException(exception: EClassifier): void {
    this.eExceptions.push(exception);
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

  // EObject methods
  getEAnnotations(): EAnnotation[] {
    return [];
  }

  getEAnnotation(source: string): EAnnotation | null {
    return null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEOperationClass();
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

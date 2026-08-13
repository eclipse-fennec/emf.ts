/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EParameter } from '../EParameter.js';
import { EClass } from '../EClass.js';
import { EClassifier } from '../EClassifier.js';
import { EOperation } from '../EOperation.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { BasicEObject } from './BasicEObject.js';
import { EAnnotation } from '../EAnnotation.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';

/**
 * Basic EParameter implementation.
 *
 * Used by EcoreFactory when loading .ecore files, so nested parameters arrive as
 * typed objects rather than DynamicEObject (#66).
 */
export class BasicEParameter extends BasicEObject implements EParameter {
  private name: string | null = null;
  private eType: EClassifier | null = null;
  private eOperation: EOperation | null = null;
  private eAnnotations: EAnnotation[] = [];
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

  getEType(): EClassifier | null {
    return this.eType;
  }

  setEType(value: EClassifier | null): void {
    this.eType = value;
  }

  getEOperation(): EOperation | null {
    return this.eOperation;
  }

  setEOperation(value: EOperation | null): void {
    this.eOperation = value;
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

  getEAnnotations(): EAnnotation[] {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEParameterClass();
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
      case 'eAnnotations':
        if (Array.isArray(newValue)) {
          this.eAnnotations = newValue;
        }
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

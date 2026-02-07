/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EStructuralFeature } from '../EStructuralFeature';
import { EClassifier } from '../EClassifier';
import { EClass } from '../EClass';
import { BasicEObject } from './BasicEObject';
import { EAnnotation } from '../EAnnotation';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Abstract base class for EAttribute and EReference
 */
export abstract class BasicEStructuralFeature extends BasicEObject implements EStructuralFeature {
  private name: string | null = null;
  private changeable: boolean = true;
  private volatile: boolean = false;
  private transient: boolean = false;
  private defaultValueLiteral: string | null = null;
  private unsettable: boolean = false;
  private derived: boolean = false;
  private eType: EClassifier | null = null;
  private eContainingClass: EClass | null = null;
  private lowerBound: number = 0;
  private upperBound: number = 1;
  private featureID: number = -1;
  protected eAnnotations: EAnnotation[] = [];

  getName(): string | null {
    return this.name;
  }

  setName(value: string | null): void {
    this.name = value;
  }

  isChangeable(): boolean {
    return this.changeable;
  }

  setChangeable(value: boolean): void {
    this.changeable = value;
  }

  isVolatile(): boolean {
    return this.volatile;
  }

  setVolatile(value: boolean): void {
    this.volatile = value;
  }

  isTransient(): boolean {
    return this.transient;
  }

  setTransient(value: boolean): void {
    this.transient = value;
  }

  getDefaultValueLiteral(): string | null {
    return this.defaultValueLiteral;
  }

  setDefaultValueLiteral(value: string | null): void {
    this.defaultValueLiteral = value;
  }

  abstract getDefaultValue(): any;

  isUnsettable(): boolean {
    return this.unsettable;
  }

  setUnsettable(value: boolean): void {
    this.unsettable = value;
  }

  isDerived(): boolean {
    return this.derived;
  }

  setDerived(value: boolean): void {
    this.derived = value;
  }

  getEType(): EClassifier | null {
    return this.eType;
  }

  setEType(value: EClassifier | null): void {
    this.eType = value;
  }

  getEContainingClass(): EClass | null {
    return this.eContainingClass;
  }

  setEContainingClass(value: EClass | null): void {
    this.eContainingClass = value;
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

  getFeatureID(): number {
    return this.featureID;
  }

  setFeatureID(value: number): void {
    this.featureID = value;
  }

  // EObject methods
  getEAnnotations(): EAnnotation[] {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEStructuralFeatureClass();
  }

  /**
   * Override eGet to handle feature-specific properties
   */
  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this.name;
      case 'changeable':
        return this.changeable;
      case 'volatile':
        return this.volatile;
      case 'transient':
        return this.transient;
      case 'defaultValueLiteral':
        return this.defaultValueLiteral;
      case 'unsettable':
        return this.unsettable;
      case 'derived':
        return this.derived;
      case 'eType':
        return this.eType;
      case 'lowerBound':
        return this.lowerBound;
      case 'upperBound':
        return this.upperBound;
      case 'eAnnotations':
        return this.eAnnotations;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle feature-specific properties
   */
  override eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this.name = newValue;
        super.eSet(feature, newValue);
        break;
      case 'changeable':
        this.changeable = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'volatile':
        this.volatile = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'transient':
        this.transient = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'defaultValueLiteral':
        this.defaultValueLiteral = newValue;
        super.eSet(feature, newValue);
        break;
      case 'unsettable':
        this.unsettable = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'derived':
        this.derived = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'eType':
        this.eType = newValue;
        super.eSet(feature, newValue);
        break;
      case 'lowerBound':
        this.lowerBound = typeof newValue === 'number' ? newValue : parseInt(newValue, 10);
        super.eSet(feature, newValue);
        break;
      case 'upperBound':
        this.upperBound = typeof newValue === 'number' ? newValue : parseInt(newValue, 10);
        super.eSet(feature, newValue);
        break;
      case 'eAnnotations':
        if (Array.isArray(newValue)) {
          this.eAnnotations = newValue;
        }
        super.eSet(feature, newValue);
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EEnumLiteral } from '../EEnumLiteral';
import { EEnum } from '../EEnum';
import { EAnnotation } from '../EAnnotation';
import { EClass } from '../EClass';
import { EStructuralFeature } from '../EStructuralFeature';
import { BasicEObject } from './BasicEObject';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EEnumLiteral implementation
 */
export class BasicEEnumLiteral extends BasicEObject implements EEnumLiteral {
  private _name: string | null = null;
  private _value: number = 0;
  private instance: any = null;
  private literal: string | null = null;
  private eEnum: EEnum | null = null;
  private eAnnotations: EAnnotation[] = [];

  getName(): string | null {
    return this._name;
  }

  setName(value: string | null): void {
    this._name = value;
  }

  getValue(): number {
    return this._value;
  }

  setValue(value: number): void {
    this._value = value;
  }

  getInstance(): any {
    return this.instance;
  }

  setInstance(value: any): void {
    this.instance = value;
  }

  getLiteral(): string | null {
    return this.literal;
  }

  setLiteral(value: string | null): void {
    this.literal = value;
  }

  getEEnum(): EEnum | null {
    return this.eEnum;
  }

  setEEnum(value: EEnum | null): void {
    this.eEnum = value;
  }

  // EModelElement methods
  getEAnnotations(): EAnnotation[] {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEEnumLiteralClass();
  }

  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this._name;
      case 'value':
        return this._value;
      case 'instance':
        return this.instance;
      case 'literal':
        return this.literal;
      case 'eEnum':
        return this.eEnum;
      case 'eAnnotations':
        return this.eAnnotations;
      default:
        return super.eGet(feature);
    }
  }

  override eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this._name = newValue;
        super.eSet(feature, newValue);
        break;
      case 'value':
        this._value = typeof newValue === 'number' ? newValue : parseInt(newValue, 10);
        super.eSet(feature, newValue);
        break;
      case 'instance':
        this.instance = newValue;
        super.eSet(feature, newValue);
        break;
      case 'literal':
        this.literal = newValue;
        super.eSet(feature, newValue);
        break;
      case 'eEnum':
        this.eEnum = newValue;
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

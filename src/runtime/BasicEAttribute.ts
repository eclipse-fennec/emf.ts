/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EAttribute } from '../EAttribute';
import { EDataType } from '../EDataType';
import { EClass } from '../EClass';
import { BasicEStructuralFeature } from './BasicEStructuralFeature';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EAttribute implementation
 */
export class BasicEAttribute extends BasicEStructuralFeature implements EAttribute {
  private id: boolean = false;

  isID(): boolean {
    return this.id;
  }

  setID(value: boolean): void {
    this.id = value;
  }

  getEAttributeType(): EDataType | null {
    const type = this.getEType();
    if (!type) {
      return null;
    }
    // Check if it's an EDataType (has isSerializable method)
    if (!('isSerializable' in type)) {
      return null;
    }
    return type as EDataType;
  }

  getDefaultValue(): any {
    const literal = this.getDefaultValueLiteral();
    const dataType = this.getEAttributeType();

    if (!dataType) {
      // Type not resolved or not a data type - return null as default
      return null;
    }

    if (literal === null) {
      // No explicit default: return data type's default value
      return dataType.getDefaultValue();
    }

    const factory = dataType.getEPackage()?.getEFactoryInstance();
    if (!factory) {
      return literal;
    }

    return factory.createFromString(dataType, literal);
  }

  override eClass(): EClass {
    return ecoreRegistry.getEAttributeClass();
  }

  /**
   * Override eGet to handle attribute-specific features
   */
  override eGet(feature: import('../EStructuralFeature').EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'iD':
        return this.id;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle attribute-specific features
   */
  override eSet(feature: import('../EStructuralFeature').EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'iD':
        this.id = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Builder for creating EAttribute instances
 */
export class EAttributeBuilder {
  private attr: BasicEAttribute;

  constructor(name: string, type: EDataType) {
    this.attr = new BasicEAttribute();
    this.attr.setName(name);
    this.attr.setEType(type);
  }

  id(value: boolean = true): this {
    this.attr.setID(value);
    return this;
  }

  required(value: boolean = true): this {
    this.attr.setLowerBound(value ? 1 : 0);
    return this;
  }

  many(value: boolean = true): this {
    this.attr.setUpperBound(value ? -1 : 1);
    return this;
  }

  changeable(value: boolean = true): this {
    this.attr.setChangeable(value);
    return this;
  }

  transient(value: boolean = true): this {
    this.attr.setTransient(value);
    return this;
  }

  derived(value: boolean = true): this {
    this.attr.setDerived(value);
    return this;
  }

  defaultValue(literal: string): this {
    this.attr.setDefaultValueLiteral(literal);
    return this;
  }

  build(): EAttribute {
    return this.attr;
  }
}

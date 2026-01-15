/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EDataType } from '../EDataType';
import { EPackage } from '../EPackage';
import { EClass } from '../EClass';
import { BasicEObject } from './BasicEObject';
import { EAnnotation } from '../EAnnotation';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EDataType implementation
 */
export class BasicEDataType extends BasicEObject implements EDataType {
  private name: string | null = null;
  private instanceClassName: string | null = null;
  private instanceClass: Function | null = null;
  private ePackage: EPackage | null = null;
  private serializable: boolean = true;
  private eAnnotations: EAnnotation[] = [];

  getName(): string | null {
    return this.name;
  }

  setName(value: string | null): void {
    this.name = value;
  }

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
    // Default values for common types
    switch (this.instanceClassName) {
      case 'boolean':
      case 'java.lang.Boolean':
        return false;
      case 'int':
      case 'java.lang.Integer':
      case 'long':
      case 'java.lang.Long':
      case 'short':
      case 'java.lang.Short':
      case 'byte':
      case 'java.lang.Byte':
        return 0;
      case 'float':
      case 'java.lang.Float':
      case 'double':
      case 'java.lang.Double':
        return 0.0;
      case 'java.lang.String':
        return null;
      default:
        return null;
    }
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
    // Simple type checking based on instance class name
    const type = typeof object;
    switch (this.instanceClassName) {
      case 'boolean':
      case 'java.lang.Boolean':
        return type === 'boolean';
      case 'int':
      case 'java.lang.Integer':
      case 'long':
      case 'java.lang.Long':
      case 'short':
      case 'java.lang.Short':
      case 'byte':
      case 'java.lang.Byte':
      case 'float':
      case 'java.lang.Float':
      case 'double':
      case 'java.lang.Double':
        return type === 'number';
      case 'java.lang.String':
        return type === 'string';
      default:
        return false;
    }
  }

  getClassifierID(): number {
    if (!this.ePackage) return -1;
    return this.ePackage.getEClassifiers().indexOf(this);
  }

  isSerializable(): boolean {
    return this.serializable;
  }

  setSerializable(value: boolean): void {
    this.serializable = value;
  }

  // EObject methods
  getEAnnotations(): EAnnotation[] {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEDataTypeClass();
  }

  /**
   * Override eGet to handle datatype-specific features
   */
  override eGet(feature: import('../EStructuralFeature').EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this.name;
      case 'instanceClassName':
        return this.instanceClassName;
      case 'serializable':
        return this.serializable;
      case 'eAnnotations':
        return this.eAnnotations;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle datatype-specific features
   */
  override eSet(feature: import('../EStructuralFeature').EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this.name = newValue;
        break;
      case 'instanceClassName':
        this.instanceClassName = newValue;
        break;
      case 'serializable':
        this.serializable = newValue === true || newValue === 'true';
        break;
      case 'eAnnotations':
        if (Array.isArray(newValue)) {
          this.eAnnotations = newValue;
        }
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Predefined common data types
 */
export class EcoreDataTypes {
  static readonly EString: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('EString');
    dt.setInstanceClassName('java.lang.String');
    return dt;
  })();

  static readonly EInt: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('EInt');
    dt.setInstanceClassName('int');
    return dt;
  })();

  static readonly EBoolean: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('EBoolean');
    dt.setInstanceClassName('boolean');
    return dt;
  })();

  static readonly EFloat: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('EFloat');
    dt.setInstanceClassName('float');
    return dt;
  })();

  static readonly EDouble: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('EDouble');
    dt.setInstanceClassName('double');
    return dt;
  })();

  static readonly ELong: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('ELong');
    dt.setInstanceClassName('long');
    return dt;
  })();

  static readonly EDate: EDataType = (() => {
    const dt = new BasicEDataType();
    dt.setName('EDate');
    dt.setInstanceClassName('java.util.Date');
    return dt;
  })();
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EReference } from '../EReference';
import { EClass } from '../EClass';
import { EAttribute } from '../EAttribute';
import { BasicEStructuralFeature } from './BasicEStructuralFeature';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EReference implementation
 */
export class BasicEReference extends BasicEStructuralFeature implements EReference {
  private containment: boolean = false;
  private resolveProxies: boolean = true;
  private eOpposite: EReference | null = null;
  private eKeys: EAttribute[] = [];

  isContainment(): boolean {
    return this.containment;
  }

  setContainment(value: boolean): void {
    this.containment = value;
  }

  isContainer(): boolean {
    if (this.eOpposite) {
      return this.eOpposite.isContainment();
    }
    return false;
  }

  isResolveProxies(): boolean {
    return this.resolveProxies;
  }

  setResolveProxies(value: boolean): void {
    this.resolveProxies = value;
  }

  getEOpposite(): EReference | null {
    return this.eOpposite;
  }

  setEOpposite(value: EReference | null): void {
    if (this.eOpposite === value) {
      return;
    }

    // Remove old opposite
    if (this.eOpposite && this.eOpposite.getEOpposite() === this) {
      (this.eOpposite as any).eOpposite = null;
    }

    this.eOpposite = value;

    // Set new opposite
    if (value && value.getEOpposite() !== this) {
      value.setEOpposite(this);
    }
  }

  getEReferenceType(): EClass {
    const type = this.getEType();
    if (!type) {
      throw new Error('Reference type not set');
    }
    if (!('getEStructuralFeatures' in type)) {
      throw new Error('Reference type must be EClass');
    }
    return type as EClass;
  }

  getEKeys(): EAttribute[] {
    return this.eKeys;
  }

  addEKey(key: EAttribute): void {
    this.eKeys.push(key);
  }

  getDefaultValue(): any {
    return null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEReferenceClass();
  }

  /**
   * Override eGet to handle reference-specific features
   */
  override eGet(feature: import('../EStructuralFeature').EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'containment':
        return this.containment;
      case 'resolveProxies':
        return this.resolveProxies;
      case 'eOpposite':
        return this.eOpposite;
      case 'eKeys':
        return this.eKeys;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle reference-specific features
   */
  override eSet(feature: import('../EStructuralFeature').EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'containment':
        this.containment = newValue === true || newValue === 'true';
        break;
      case 'resolveProxies':
        this.resolveProxies = newValue === true || newValue === 'true';
        break;
      case 'eOpposite':
        this.eOpposite = newValue;
        break;
      case 'eKeys':
        if (Array.isArray(newValue)) {
          this.eKeys = newValue;
        }
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Builder for creating EReference instances
 */
export class EReferenceBuilder {
  private ref: BasicEReference;

  constructor(name: string, type: EClass) {
    this.ref = new BasicEReference();
    this.ref.setName(name);
    this.ref.setEType(type);
  }

  containment(value: boolean = true): this {
    this.ref.setContainment(value);
    return this;
  }

  required(value: boolean = true): this {
    this.ref.setLowerBound(value ? 1 : 0);
    return this;
  }

  many(value: boolean = true): this {
    this.ref.setUpperBound(value ? -1 : 1);
    return this;
  }

  changeable(value: boolean = true): this {
    this.ref.setChangeable(value);
    return this;
  }

  resolveProxies(value: boolean = true): this {
    this.ref.setResolveProxies(value);
    return this;
  }

  opposite(opposite: EReference): this {
    this.ref.setEOpposite(opposite);
    return this;
  }

  key(key: EAttribute): this {
    this.ref.addEKey(key);
    return this;
  }

  build(): EReference {
    return this.ref;
  }
}

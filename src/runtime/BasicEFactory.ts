/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EFactory } from '../EFactory';
import { EPackage } from '../EPackage';
import { EClass } from '../EClass';
import { EObject } from '../EObject';
import { EDataType } from '../EDataType';
import { DynamicEObject } from './BasicEObject';
import { ecoreRegistry } from '../ecore/EcoreRegistry';
import { dataTypeRegistry } from './DataTypeRegistry';

/**
 * Basic EFactory implementation
 */
export class BasicEFactory implements EFactory {
  private ePackage: EPackage | null = null;

  /**
   * Creator functions map
   * Maps EClass to a function that creates instances
   */
  private creators = new Map<EClass, () => EObject>();

  getEPackage(): EPackage {
    if (!this.ePackage) {
      throw new Error('EPackage not set on factory');
    }
    return this.ePackage;
  }

  setEPackage(value: EPackage): void {
    this.ePackage = value;
  }

  create(eClass: EClass): EObject {
    // Check for registered creator
    const creator = this.creators.get(eClass);
    if (creator) {
      return creator();
    }

    // Default: create dynamic object
    return this.createDynamic(eClass);
  }

  /**
   * Create a dynamic EObject instance
   */
  protected createDynamic(eClass: EClass): EObject {
    if (eClass.isAbstract()) {
      throw new Error(`Cannot instantiate abstract class: ${eClass.getName()}`);
    }

    if (eClass.isInterface()) {
      throw new Error(`Cannot instantiate interface: ${eClass.getName()}`);
    }

    return new DynamicEObject(eClass);
  }

  createFromString(eDataType: EDataType, literalValue: string): any {
    // Use the DataType registry for conversion
    return dataTypeRegistry.createFromString(eDataType, literalValue);
  }

  convertToString(eDataType: EDataType, instanceValue: any): string {
    // Use the DataType registry for conversion
    return dataTypeRegistry.convertToString(eDataType, instanceValue);
  }

  /**
   * Register a creator function for a specific EClass
   */
  registerCreator(eClass: EClass, creator: () => EObject): void {
    this.creators.set(eClass, creator);
  }

  // EModelElement methods
  getEAnnotations(): any[] {
    return [];
  }

  getEAnnotation(source: string): any {
    return null;
  }

  // EObject methods
  eClass(): EClass {
    return ecoreRegistry.getEFactoryClass();
  }

  eResource(): any {
    return null;
  }

  eContainer(): any {
    return null;
  }

  eContainingFeature(): any {
    return null;
  }

  eContainmentFeature(): any {
    return null;
  }

  eContents(): any[] {
    return [];
  }

  eAllContents(): IterableIterator<EObject> {
    return [][Symbol.iterator]();
  }

  eIsProxy(): boolean {
    return false;
  }

  eCrossReferences(): any[] {
    return [];
  }

  eGet(feature: any): any {
    return null;
  }

  eSet(feature: any, newValue: any): void {}

  eIsSet(feature: any): boolean {
    return false;
  }

  eUnset(feature: any): void {}

  eInvoke(operation: any, arguments_: any[]): any {
    return null;
  }
}

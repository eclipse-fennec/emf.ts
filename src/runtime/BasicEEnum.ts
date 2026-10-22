/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EEnum } from '../EEnum.js';
import { EEnumLiteral } from '../EEnumLiteral.js';
import { EClass } from '../EClass.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { BasicEDataType } from './BasicEDataType.js';
import { BasicEEnumLiteral } from './BasicEEnumLiteral.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EList, createMetamodelEList,
  createMetamodelContainmentEList, replaceListContents } from '../EList.js';

/**
 * Basic EEnum implementation
 */
export class BasicEEnum extends BasicEDataType implements EEnum {
  private eLiterals: EList<BasicEEnumLiteral> = createMetamodelContainmentEList<BasicEEnumLiteral>(
    this,
    undefined,
    (literal, owner) => (literal as any).setEEnum(owner)
  );

  getELiterals(): EList<EEnumLiteral> {
    return this.eLiterals;
  }

  /**
   * The instance of the first literal, as EEnumImpl.getDefaultValue() returns.
   *
   * Without this an enum attribute reported no default at all, since
   * BasicEDataType switches on instanceClassName and finds nothing for an enum
   * (#123). Generated code initializes such a field to the first literal, so
   * the two agreed on nothing.
   */
  override getDefaultValue(): any {
    const literals = this.getELiterals();
    if (literals.size() === 0) {
      return null;
    }

    const first: any = literals.get(0);
    const instance = first?.getInstance?.();
    return instance !== undefined && instance !== null ? instance : (first ?? null);
  }

  /**
   * Returns the literal with the given name or ordinal value.
   */
  getEEnumLiteral(nameOrValue: string | number): EEnumLiteral | null {
    if (typeof nameOrValue === 'string') {
      return this.eLiterals.find(l => l.getName() === nameOrValue) || null;
    } else {
      return this.eLiterals.find(l => l.getValue() === nameOrValue) || null;
    }
  }

  /**
   * Returns the literal with the given literal string.
   */
  getEEnumLiteralByLiteral(literal: string): EEnumLiteral | null {
    return this.eLiterals.find(l => l.getLiteral() === literal) || null;
  }

  /**
   * Add a literal to this enum.
   */
  addLiteral(literal: BasicEEnumLiteral): void {
    literal.setEEnum(this);
    this.eLiterals.push(literal);
  }

  override eClass(): EClass {
    return ecoreRegistry.getEEnumClass();
  }

  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'eLiterals':
        return this.eLiterals;
      default:
        return super.eGet(feature);
    }
  }

  override eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'eLiterals':
        if (replaceListContents(this.eLiterals, newValue)) {
          for (const lit of this.eLiterals) {
            if (lit instanceof BasicEEnumLiteral) {
              lit.setEEnum(this);
            }
          }
        }
        super.eSet(feature, newValue);
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EEnum } from '../EEnum';
import { EEnumLiteral } from '../EEnumLiteral';
import { EClass } from '../EClass';
import { EStructuralFeature } from '../EStructuralFeature';
import { BasicEDataType } from './BasicEDataType';
import { BasicEEnumLiteral } from './BasicEEnumLiteral';
import { ecoreRegistry } from '../ecore/EcoreRegistry';

/**
 * Basic EEnum implementation
 */
export class BasicEEnum extends BasicEDataType implements EEnum {
  private eLiterals: BasicEEnumLiteral[] = [];

  getELiterals(): EEnumLiteral[] {
    return this.eLiterals;
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
        if (Array.isArray(newValue)) {
          this.eLiterals = newValue;
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

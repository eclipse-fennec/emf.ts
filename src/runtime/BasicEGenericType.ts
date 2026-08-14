/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EGenericType } from '../EGenericType.js';
import { ETypeParameter } from '../ETypeParameter.js';
import { EClass } from '../EClass.js';
import { EClassifier } from '../EClassifier.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { BasicEObject } from './BasicEObject.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EList, createMetamodelEList, replaceListContents } from '../EList.js';

/**
 * Basic EGenericType implementation (#65).
 *
 * A generic type either refers to a classifier (`Box<EString>` - eClassifier is
 * Box) or to a type parameter (`T` - eTypeParameter is T). The raw type is the
 * classifier, which is what a feature's eType resolves to.
 */
export class BasicEGenericType extends BasicEObject implements EGenericType {
  private eClassifier: EClassifier | null = null;
  private eTypeParameter: ETypeParameter | null = null;
  private eTypeArguments: EList<EGenericType> = createMetamodelEList<EGenericType>(this);
  private eUpperBound: EGenericType | null = null;
  private eLowerBound: EGenericType | null = null;

  getEClassifier(): EClassifier | null {
    return this.eClassifier;
  }

  setEClassifier(value: EClassifier | null): void {
    this.eClassifier = value;
  }

  getETypeParameter(): ETypeParameter | null {
    return this.eTypeParameter;
  }

  setETypeParameter(value: ETypeParameter | null): void {
    this.eTypeParameter = value;
  }

  getETypeArguments(): EList<EGenericType> {
    return this.eTypeArguments;
  }

  getEUpperBound(): EGenericType | null {
    return this.eUpperBound;
  }

  setEUpperBound(value: EGenericType | null): void {
    this.eUpperBound = value;
  }

  getELowerBound(): EGenericType | null {
    return this.eLowerBound;
  }

  setELowerBound(value: EGenericType | null): void {
    this.eLowerBound = value;
  }

  /**
   * The erasure of this generic type. For a classifier reference that is the
   * classifier itself; for a type parameter it is the erasure of its first
   * bound, mirroring Java EMF's EGenericTypeImpl.getERawType().
   */
  getERawType(): EClassifier {
    if (this.eClassifier) {
      return this.eClassifier;
    }
    if (this.eTypeParameter) {
      const bounds = this.eTypeParameter.getEBounds();
      if (bounds.length > 0) {
        return bounds[0].getERawType();
      }
    }
    if (this.eUpperBound) {
      return this.eUpperBound.getERawType();
    }
    return ecoreRegistry.getEObjectClass();
  }

  override eClass(): EClass {
    return ecoreRegistry.getEGenericTypeClass();
  }

  override eGet(feature: EStructuralFeature): any {
    switch (feature.getName()) {
      case 'eClassifier':
        return this.eClassifier;
      case 'eTypeParameter':
        return this.eTypeParameter;
      case 'eTypeArguments':
        return this.eTypeArguments;
      case 'eUpperBound':
        return this.eUpperBound;
      case 'eLowerBound':
        return this.eLowerBound;
      default:
        return super.eGet(feature);
    }
  }

  override eSet(feature: EStructuralFeature, newValue: any): void {
    switch (feature.getName()) {
      case 'eClassifier':
        this.eClassifier = newValue;
        break;
      case 'eTypeParameter':
        this.eTypeParameter = newValue;
        break;
      case 'eTypeArguments':
        replaceListContents(this.eTypeArguments, newValue);
        break;
      case 'eUpperBound':
        this.eUpperBound = newValue;
        break;
      case 'eLowerBound':
        this.eLowerBound = newValue;
        break;
    }
    super.eSet(feature, newValue);
  }
}

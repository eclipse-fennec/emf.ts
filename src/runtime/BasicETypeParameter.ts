/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ETypeParameter } from '../ETypeParameter.js';
import { EGenericType } from '../EGenericType.js';
import { EClass } from '../EClass.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { BasicEObject } from './BasicEObject.js';
import { EAnnotation } from '../EAnnotation.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EList, createMetamodelEList, replaceListContents } from '../EList.js';

/**
 * Basic ETypeParameter implementation (#65).
 *
 * Declares a type variable such as the `T` in `class Box<T>`.
 */
export class BasicETypeParameter extends BasicEObject implements ETypeParameter {
  private name: string | null = null;
  private eBounds: EList<EGenericType> = createMetamodelEList<EGenericType>(this);
  private eAnnotations: EList<EAnnotation> = createMetamodelEList<EAnnotation>(this);

  getName(): string | null {
    return this.name;
  }

  setName(value: string | null): void {
    this.name = value;
  }

  getEBounds(): EList<EGenericType> {
    return this.eBounds;
  }

  getEAnnotations(): EList<EAnnotation> {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getETypeParameterClass();
  }

  override eGet(feature: EStructuralFeature): any {
    switch (feature.getName()) {
      case 'name':
        return this.name;
      case 'eBounds':
        return this.eBounds;
      case 'eAnnotations':
        return this.eAnnotations;
      default:
        return super.eGet(feature);
    }
  }

  override eSet(feature: EStructuralFeature, newValue: any): void {
    switch (feature.getName()) {
      case 'name':
        this.name = newValue;
        break;
      case 'eBounds':
        replaceListContents(this.eBounds, newValue);
        break;
      case 'eAnnotations':
        replaceListContents(this.eAnnotations, newValue);
        break;
    }
    super.eSet(feature, newValue);
  }
}

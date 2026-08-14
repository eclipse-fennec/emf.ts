/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EAnnotation } from '../EAnnotation.js';
import { EModelElement } from '../EModelElement.js';
import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EReference } from '../EReference.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { BasicEObject } from './BasicEObject.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EMap, createEMap } from '../EMap.js';
import { EList, createMetamodelEList, replaceListContents } from '../EList.js';

/**
 * Basic EAnnotation implementation
 */
export class BasicEAnnotation extends BasicEObject implements EAnnotation {
  private source: string | null = null;
  private _detailsMap: EMap<string, string> | null = null;
  private eModelElement: EModelElement | null = null;
  private contents: EList<EObject> = createMetamodelEList<EObject>(this);
  private references: EList<EObject> = createMetamodelEList<EObject>(this);

  private getOrCreateDetailsMap(): EMap<string, string> {
    if (!this._detailsMap) {
      const eAnnotationClass = ecoreRegistry.getEAnnotationClass();
      const detailsFeature = eAnnotationClass.getEStructuralFeature('details') as EReference;
      const entryEClass = ecoreRegistry.getEStringToStringMapEntryClass();
      this._detailsMap = createEMap<string, string>(this, detailsFeature, entryEClass);
    }
    return this._detailsMap;
  }

  getSource(): string | null {
    return this.source;
  }

  setSource(value: string | null): void {
    this.source = value;
  }

  getDetails(): EMap<string, string> {
    return this.getOrCreateDetailsMap();
  }

  getEModelElement(): EModelElement | null {
    return this.eModelElement;
  }

  setEModelElement(value: EModelElement | null): void {
    this.eModelElement = value;
  }

  getContents(): EList<EObject> {
    return this.contents;
  }

  getReferences(): EList<EObject> {
    return this.references;
  }

  // EModelElement methods
  private eAnnotations: EList<EAnnotation> = createMetamodelEList<EAnnotation>(this);

  getEAnnotations(): EList<EAnnotation> {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEAnnotationClass();
  }

  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'source':
        return this.source;
      case 'details':
        return this.getOrCreateDetailsMap();
      case 'eModelElement':
        return this.eModelElement;
      case 'contents':
        return this.contents;
      case 'references':
        return this.references;
      default:
        return super.eGet(feature);
    }
  }

  override eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'source':
        this.source = newValue;
        super.eSet(feature, newValue);
        break;
      case 'details':
        if (newValue instanceof Map) {
          const map = this.getOrCreateDetailsMap();
          map.clear();
          for (const [k, v] of newValue as Map<string, string>) {
            map.putByKey(k, v);
          }
        }
        super.eSet(feature, newValue);
        break;
      case 'eModelElement':
        this.eModelElement = newValue;
        super.eSet(feature, newValue);
        break;
      case 'contents':
        replaceListContents(this.contents, newValue);
        break;
      case 'references':
        replaceListContents(this.references, newValue);
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

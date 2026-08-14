/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EStructuralFeature } from '../EStructuralFeature.js';
import { EClassifier } from '../EClassifier.js';
import { EGenericType } from '../EGenericType.js';
import { EClass } from '../EClass.js';
import { BasicEObject } from './BasicEObject.js';
import { EAnnotation } from '../EAnnotation.js';
import { ecoreRegistry } from '../ecore/EcoreRegistry.js';
import { EPackageRegistry } from '../EPackage.js';
import { isInternalEObject } from '../InternalEObject.js';
import { resolveClassifierInPackage } from './resolveClassifierInPackage.js';
import { EList, createMetamodelEList, replaceListContents } from '../EList.js';

/**
 * Abstract base class for EAttribute and EReference
 */
export abstract class BasicEStructuralFeature extends BasicEObject implements EStructuralFeature {
  private name: string | null = null;
  private changeable: boolean = true;
  private volatile: boolean = false;
  private transient: boolean = false;
  private defaultValueLiteral: string | null = null;
  private unsettable: boolean = false;
  private derived: boolean = false;
  private eType: EClassifier | null = null;
  private eGenericType: EGenericType | null = null;
  private eContainingClass: EClass | null = null;
  private lowerBound: number = 0;
  private upperBound: number = 1;
  private featureID: number = -1;
  protected eAnnotations: EList<EAnnotation> = createMetamodelEList<EAnnotation>(this);

  getName(): string | null {
    return this.name;
  }

  setName(value: string | null): void {
    this.name = value;
  }

  isChangeable(): boolean {
    return this.changeable;
  }

  setChangeable(value: boolean): void {
    this.changeable = value;
  }

  isVolatile(): boolean {
    return this.volatile;
  }

  setVolatile(value: boolean): void {
    this.volatile = value;
  }

  isTransient(): boolean {
    return this.transient;
  }

  setTransient(value: boolean): void {
    this.transient = value;
  }

  getDefaultValueLiteral(): string | null {
    return this.defaultValueLiteral;
  }

  setDefaultValueLiteral(value: string | null): void {
    this.defaultValueLiteral = value;
  }

  abstract getDefaultValue(): any;

  isUnsettable(): boolean {
    return this.unsettable;
  }

  setUnsettable(value: boolean): void {
    this.unsettable = value;
  }

  isDerived(): boolean {
    return this.derived;
  }

  setDerived(value: boolean): void {
    this.derived = value;
  }

  getEType(): EClassifier | null {
    if (this.eType && isInternalEObject(this.eType) && (this.eType as any).eIsProxy()) {
      const proxy = this.eType as any;
      const proxyURI = proxy.eProxyURI();
      if (proxyURI) {
        // Try to resolve through ResourceSet (via container chain)
        const resolved = this.eResolveProxy(proxy);
        if (resolved !== proxy) {
          this.eType = resolved as unknown as EClassifier;
          return this.eType;
        }

        // Fallback: resolve directly via package registry
        const uriStr = proxyURI.toString();
        const hashIndex = uriStr.indexOf('#');
        if (hashIndex > 0) {
          const baseURI = uriStr.substring(0, hashIndex);
          const fragment = uriStr.substring(hashIndex + 1);

          // Try to find ResourceSet: via eResource, or by walking up the
          // eContainer chain to find a package with a registered ResourceSet
          const registries = [EPackageRegistry.INSTANCE];
          let rs = this.eResource()?.getResourceSet();
          if (!rs) {
            // Walk up container chain to find a package → resource → resourceSet
            let container: any = this.eContainingClass;
            while (container) {
              if (typeof container.eResource === 'function') {
                const res = container.eResource();
                if (res) {
                  rs = res.getResourceSet();
                  break;
                }
              }
              // Try ePackage for EClass, eSuperPackage for EPackage
              container = container.getEPackage?.() ?? container.getESuperPackage?.() ?? container.eContainer?.();
            }
          }
          if (rs) registries.push(rs.getPackageRegistry());

          for (const registry of registries) {
            // Direct nsURI match
            const pkg = registry.getEPackage(baseURI);
            if (pkg) {
              const classifier = resolveClassifierInPackage(pkg, fragment);
              if (classifier) {
                this.eType = classifier;
                return this.eType;
              }
            }

            // Package name match: "foaf.ecore" → package named "foaf"
            let baseName = baseURI;
            const lastSlash = baseName.lastIndexOf('/');
            if (lastSlash >= 0) baseName = baseName.substring(lastSlash + 1);
            const dotIndex = baseName.indexOf('.');
            if (dotIndex > 0) baseName = baseName.substring(0, dotIndex);

            if (baseName) {
              for (const nsKey of registry.keys()) {
                const regPkg = registry.getEPackage(nsKey);
                if (regPkg && regPkg.getName() === baseName) {
                  const classifier = resolveClassifierInPackage(regPkg, fragment);
                  if (classifier) {
                    this.eType = classifier;
                    return this.eType;
                  }
                }
              }
            }
          }
        }
      }
    }
    // A feature typed via <eGenericType> carries no eType attribute; the type
    // is the raw type of the generic type (#65).
    if (!this.eType && this.eGenericType) {
      return this.eGenericType.getERawType();
    }
    return this.eType;
  }

  setEType(value: EClassifier | null): void {
    this.eType = value;
  }

  getEGenericType(): EGenericType | null {
    return this.eGenericType;
  }

  setEGenericType(value: EGenericType | null): void {
    this.eGenericType = value;
  }

  getEContainingClass(): EClass | null {
    return this.eContainingClass;
  }

  setEContainingClass(value: EClass | null): void {
    this.eContainingClass = value;
  }

  isMany(): boolean {
    return this.upperBound < 0 || this.upperBound > 1;
  }

  isRequired(): boolean {
    return this.lowerBound >= 1;
  }

  getLowerBound(): number {
    return this.lowerBound;
  }

  setLowerBound(value: number): void {
    this.lowerBound = value;
  }

  getUpperBound(): number {
    return this.upperBound;
  }

  setUpperBound(value: number): void {
    this.upperBound = value;
  }

  getFeatureID(): number {
    return this.featureID;
  }

  setFeatureID(value: number): void {
    this.featureID = value;
  }

  // EObject methods
  getEAnnotations(): EList<EAnnotation> {
    return this.eAnnotations;
  }

  getEAnnotation(source: string): EAnnotation | null {
    return this.eAnnotations.find(a => a.getSource() === source) || null;
  }

  override eClass(): EClass {
    return ecoreRegistry.getEStructuralFeatureClass();
  }

  /**
   * Override eGet to handle feature-specific properties
   */
  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        return this.name;
      case 'changeable':
        return this.changeable;
      case 'volatile':
        return this.volatile;
      case 'transient':
        return this.transient;
      case 'defaultValueLiteral':
        return this.defaultValueLiteral;
      case 'unsettable':
        return this.unsettable;
      case 'derived':
        return this.derived;
      case 'eType':
        return this.eType;
      case 'eGenericType':
        return this.eGenericType;
      case 'lowerBound':
        return this.lowerBound;
      case 'upperBound':
        return this.upperBound;
      case 'eAnnotations':
        return this.eAnnotations;
      default:
        return super.eGet(feature);
    }
  }

  /**
   * Override eSet to handle feature-specific properties
   */
  override eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName();
    switch (featureName) {
      case 'name':
        this.name = newValue;
        super.eSet(feature, newValue);
        break;
      case 'changeable':
        this.changeable = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'volatile':
        this.volatile = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'transient':
        this.transient = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'defaultValueLiteral':
        this.defaultValueLiteral = newValue;
        super.eSet(feature, newValue);
        break;
      case 'unsettable':
        this.unsettable = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'derived':
        this.derived = newValue === true || newValue === 'true';
        super.eSet(feature, newValue);
        break;
      case 'eType':
        this.eType = newValue;
        super.eSet(feature, newValue);
        break;
      case 'eGenericType':
        this.eGenericType = newValue;
        super.eSet(feature, newValue);
        break;
      case 'lowerBound':
        this.lowerBound = typeof newValue === 'number' ? newValue : parseInt(newValue, 10);
        super.eSet(feature, newValue);
        break;
      case 'upperBound':
        this.upperBound = typeof newValue === 'number' ? newValue : parseInt(newValue, 10);
        super.eSet(feature, newValue);
        break;
      case 'eAnnotations':
        replaceListContents(this.eAnnotations, newValue);
        break;
      default:
        super.eSet(feature, newValue);
    }
  }
}

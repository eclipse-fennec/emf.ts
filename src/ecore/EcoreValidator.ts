/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EPackage } from '../EPackage.js';
import { EReference } from '../EReference.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EValidator } from '../util/EValidator.js';
import { BasicDiagnostic, DiagnosticSeverity } from '../util/Diagnostic.js';

const SOURCE = 'org.eclipse.emf.ecore';

function error(diagnostic: BasicDiagnostic, message: string, data: EObject[]): void {
  diagnostic.add(new BasicDiagnostic(DiagnosticSeverity.ERROR, SOURCE, message, data));
}

function warning(diagnostic: BasicDiagnostic, message: string, data: EObject[]): void {
  diagnostic.add(new BasicDiagnostic(DiagnosticSeverity.WARNING, SOURCE, message, data));
}

export class EcoreValidator implements EValidator {
  validate(eObject: EObject, diagnostic: BasicDiagnostic): boolean {
    const eClass = eObject.eClass();
    if (!eClass) return true;

    const className = eClass.getName();

    switch (className) {
      case 'EClass':
        return this.validateEClass(eObject, diagnostic);
      case 'EPackage':
        return this.validateEPackage(eObject, diagnostic);
      case 'EReference':
        return this.validateEReference(eObject, diagnostic);
      case 'EAttribute':
        return this.validateEStructuralFeature(eObject, diagnostic);
      default:
        return true;
    }
  }

  private validateEClass(obj: EObject, diagnostic: BasicDiagnostic): boolean {
    const eClass = obj as unknown as EClass;
    let valid = true;

    // UniqueFeatureNames
    const featureNames = new Map<string, EStructuralFeature>();
    for (const feature of eClass.getEStructuralFeatures()) {
      const name = feature.getName?.();
      if (name) {
        const existing = featureNames.get(name);
        if (existing) {
          error(diagnostic,
            `The feature '${name}' is not unique in class '${eClass.getName()}'`,
            [obj]);
          valid = false;
        } else {
          featureNames.set(name, feature);
        }
      }
    }

    // NoCircularSuperTypes
    if (this.hasCircularSuperTypes(eClass)) {
      error(diagnostic,
        `The class '${eClass.getName()}' has a circular inheritance hierarchy`,
        [obj]);
      valid = false;
    }

    return valid;
  }

  private hasCircularSuperTypes(eClass: EClass): boolean {
    const visited = new Set<EClass>();
    const stack: EClass[] = [...eClass.getESuperTypes()];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === eClass) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...current.getESuperTypes());
    }
    return false;
  }

  private validateEPackage(obj: EObject, diagnostic: BasicDiagnostic): boolean {
    const pkg = obj as unknown as EPackage;
    let valid = true;

    // WellFormedNsURI
    const nsURI = pkg.getNsURI();
    if (!nsURI || nsURI.trim().length === 0) {
      error(diagnostic,
        `The nsURI of package '${pkg.getName()}' must not be empty`,
        [obj]);
      valid = false;
    }

    // WellFormedNsPrefix
    const nsPrefix = pkg.getNsPrefix();
    if (nsPrefix !== null && nsPrefix !== undefined) {
      if (nsPrefix.includes(':')) {
        error(diagnostic,
          `The nsPrefix '${nsPrefix}' of package '${pkg.getName()}' must not contain ':'`,
          [obj]);
        valid = false;
      }
    }

    // UniqueClassifierNames
    const classifierNames = new Set<string>();
    for (const classifier of pkg.getEClassifiers()) {
      const name = classifier.getName?.();
      if (name) {
        if (classifierNames.has(name)) {
          error(diagnostic,
            `The classifier name '${name}' is not unique in package '${pkg.getName()}'`,
            [obj]);
          valid = false;
        } else {
          classifierNames.add(name);
        }
      }
    }

    // UniqueSubpackageNames
    const subpkgNames = new Set<string>();
    for (const sub of pkg.getESubpackages()) {
      const name = sub.getName?.();
      if (name) {
        if (subpkgNames.has(name)) {
          error(diagnostic,
            `The subpackage name '${name}' is not unique in package '${pkg.getName()}'`,
            [obj]);
          valid = false;
        } else {
          subpkgNames.add(name);
        }
      }
    }

    return valid;
  }

  private validateEReference(obj: EObject, diagnostic: BasicDiagnostic): boolean {
    const ref = obj as unknown as EReference;
    let valid = this.validateEStructuralFeature(obj, diagnostic);

    const opposite = ref.getEOpposite?.();
    if (opposite) {
      // ConsistentOpposite: opposite of containment must not be containment
      if (ref.isContainment?.() && opposite.isContainment?.()) {
        error(diagnostic,
          `The opposite of a containment reference '${ref.getName()}' must not be a containment reference`,
          [obj]);
        valid = false;
      }

      // Opposite must point back
      const oppositeOpposite = opposite.getEOpposite?.();
      if (oppositeOpposite && oppositeOpposite !== ref) {
        error(diagnostic,
          `The opposite of reference '${ref.getName()}' does not point back to this reference`,
          [obj]);
        valid = false;
      }
    }

    return valid;
  }

  private validateEStructuralFeature(obj: EObject, diagnostic: BasicDiagnostic): boolean {
    const feature = obj as unknown as EStructuralFeature;
    let valid = true;

    // ConsistentBounds
    const lower = feature.getLowerBound();
    const upper = feature.getUpperBound();
    if (upper !== -1 && upper !== -2 && lower > upper) {
      error(diagnostic,
        `The lower bound ${lower} of feature '${feature.getName()}' must not exceed the upper bound ${upper}`,
        [obj]);
      valid = false;
    }

    if (lower < 0) {
      error(diagnostic,
        `The lower bound ${lower} of feature '${feature.getName()}' must not be negative`,
        [obj]);
      valid = false;
    }

    // Must have a type
    const eType = feature.getEType();
    if (!eType) {
      warning(diagnostic,
        `The feature '${feature.getName()}' has no type set`,
        [obj]);
    }

    return valid;
  }

  static readonly INSTANCE = new EcoreValidator();
}

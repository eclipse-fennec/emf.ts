/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EPackage } from '../EPackage.js';
import { Diagnostic, BasicDiagnostic, DiagnosticSeverity } from './Diagnostic.js';

export interface EValidator {
  validate(eObject: EObject, diagnostic: BasicDiagnostic): boolean;
}

export class EValidatorRegistry {
  private validators = new Map<string, EValidator>();

  getValidator(nsURI: string): EValidator | null {
    return this.validators.get(nsURI) ?? null;
  }

  setValidator(nsURI: string, validator: EValidator): void {
    this.validators.set(nsURI, validator);
  }

  static readonly INSTANCE = new EValidatorRegistry();
}

export class Diagnostician {
  private registry: EValidatorRegistry;

  constructor(registry?: EValidatorRegistry) {
    this.registry = registry ?? EValidatorRegistry.INSTANCE;
  }

  validate(eObject: EObject): Diagnostic {
    const diagnostic = new BasicDiagnostic(
      DiagnosticSeverity.OK,
      'org.eclipse.emf.ecore',
      `Diagnosis of ${this.getObjectLabel(eObject)}`,
      [eObject],
    );

    this.doValidate(eObject, diagnostic);
    this.validateContents(eObject, diagnostic);

    return diagnostic;
  }

  private doValidate(eObject: EObject, diagnostic: BasicDiagnostic): void {
    const eClass = eObject.eClass();
    const pkg = eClass?.getEPackage();
    if (!pkg) return;

    const nsURI = pkg.getNsURI();
    if (!nsURI) return;

    const validator = this.registry.getValidator(nsURI);
    if (validator) {
      validator.validate(eObject, diagnostic);
    }
  }

  private validateContents(eObject: EObject, diagnostic: BasicDiagnostic): void {
    for (const child of eObject.eContents()) {
      const childDiagnostic = this.validate(child);
      if (childDiagnostic.getSeverity() !== DiagnosticSeverity.OK) {
        diagnostic.add(childDiagnostic);
      }
    }
  }

  private getObjectLabel(eObject: EObject): string {
    const eClass = eObject.eClass?.();
    const name = eClass?.getName() ?? 'EObject';
    if ('getName' in eObject && typeof (eObject as any).getName === 'function') {
      const objName = (eObject as any).getName();
      if (objName) return `${name} '${objName}'`;
    }
    return name;
  }

  static readonly INSTANCE = new Diagnostician();
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';

export const enum DiagnosticSeverity {
  OK = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 4,
}

export interface Diagnostic {
  getSeverity(): DiagnosticSeverity;
  getMessage(): string;
  getSource(): string;
  getChildren(): Diagnostic[];
  getData(): EObject[];
}

export class BasicDiagnostic implements Diagnostic {
  private severity: DiagnosticSeverity;
  private message: string;
  private source: string;
  private children: Diagnostic[] = [];
  private data: EObject[];

  constructor(
    severity: DiagnosticSeverity,
    source: string,
    message: string,
    data: EObject[] = [],
  ) {
    this.severity = severity;
    this.source = source;
    this.message = message;
    this.data = data;
  }

  getSeverity(): DiagnosticSeverity {
    return this.severity;
  }

  getMessage(): string {
    return this.message;
  }

  getSource(): string {
    return this.source;
  }

  getChildren(): Diagnostic[] {
    return this.children;
  }

  getData(): EObject[] {
    return this.data;
  }

  add(child: Diagnostic): void {
    this.children.push(child);
    if (child.getSeverity() > this.severity) {
      this.severity = child.getSeverity();
    }
  }

  static OK_INSTANCE: Diagnostic = new BasicDiagnostic(
    DiagnosticSeverity.OK,
    '',
    'OK',
  );
}

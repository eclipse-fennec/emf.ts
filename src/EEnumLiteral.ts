/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EEnum } from './EEnum';

/**
 * A representation of the model object 'EEnum Literal'.
 * Represents a literal value of an enumeration.
 */
export interface EEnumLiteral extends ENamedElement {
  /**
   * Returns the integer value of this literal.
   */
  getValue(): number;

  /**
   * Sets the integer value of this literal.
   */
  setValue(value: number): void;

  /**
   * Returns the instance (runtime representation).
   */
  getInstance(): any;

  /**
   * Sets the instance.
   */
  setInstance(value: any): void;

  /**
   * Returns the literal string representation.
   */
  getLiteral(): string | null;

  /**
   * Sets the literal string.
   */
  setLiteral(value: string | null): void;

  /**
   * Returns the containing EEnum.
   */
  getEEnum(): EEnum | null;
}

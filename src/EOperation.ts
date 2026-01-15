/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EClass } from './EClass';
import { EClassifier } from './EClassifier';
import { EParameter } from './EParameter';

/**
 * A representation of the model object 'EOperation'.
 * Represents an operation of a class.
 */
export interface EOperation extends ENamedElement {
  /**
   * Returns the containing class.
   */
  getEContainingClass(): EClass | null;

  /**
   * Returns the return type, or null for void operations.
   */
  getEType(): EClassifier | null;

  /**
   * Sets the return type.
   */
  setEType(value: EClassifier | null): void;

  /**
   * Returns the list of parameters.
   */
  getEParameters(): EParameter[];

  /**
   * Returns the list of exceptions that this operation can throw.
   */
  getEExceptions(): EClassifier[];

  /**
   * Returns whether the operation is many-valued.
   */
  isMany(): boolean;

  /**
   * Returns whether the operation is required (lowerBound >= 1).
   */
  isRequired(): boolean;

  /**
   * Returns the lower bound.
   */
  getLowerBound(): number;

  /**
   * Sets the lower bound.
   */
  setLowerBound(value: number): void;

  /**
   * Returns the upper bound (-1 means unbounded).
   */
  getUpperBound(): number;

  /**
   * Sets the upper bound.
   */
  setUpperBound(value: number): void;

  /**
   * Returns the ID relative to the containing class.
   */
  getOperationID(): number;

  /**
   * Returns whether this operation overrides the given operation.
   */
  isOverrideOf(someOperation: EOperation): boolean;
}

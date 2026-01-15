/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EOperation } from './EOperation';
import { EClassifier } from './EClassifier';

/**
 * A representation of the model object 'EParameter'.
 * Represents a parameter of an operation.
 */
export interface EParameter extends ENamedElement {
  /**
   * Returns the containing operation.
   */
  getEOperation(): EOperation | null;

  /**
   * Returns the type of the parameter.
   */
  getEType(): EClassifier | null;

  /**
   * Sets the type of the parameter.
   */
  setEType(value: EClassifier | null): void;

  /**
   * Returns whether the parameter is many-valued.
   */
  isMany(): boolean;

  /**
   * Returns whether the parameter is required (lowerBound >= 1).
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
}

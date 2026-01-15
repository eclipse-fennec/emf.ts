/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EClassifier } from './EClassifier';
import { EClass } from './EClass';

/**
 * A representation of the model object 'EStructural Feature'.
 * Base class for EAttribute and EReference.
 */
export interface EStructuralFeature extends ENamedElement {
  /**
   * Returns whether the feature is changeable.
   */
  isChangeable(): boolean;

  /**
   * Sets whether the feature is changeable.
   */
  setChangeable(value: boolean): void;

  /**
   * Returns whether the feature is volatile.
   * Volatile features don't have storage; they are derived/computed.
   */
  isVolatile(): boolean;

  /**
   * Sets whether the feature is volatile.
   */
  setVolatile(value: boolean): void;

  /**
   * Returns whether the feature is transient.
   * Transient features are not serialized.
   */
  isTransient(): boolean;

  /**
   * Sets whether the feature is transient.
   */
  setTransient(value: boolean): void;

  /**
   * Returns the default value literal.
   */
  getDefaultValueLiteral(): string | null;

  /**
   * Sets the default value literal.
   */
  setDefaultValueLiteral(value: string | null): void;

  /**
   * Returns the default value.
   */
  getDefaultValue(): any;

  /**
   * Returns whether the feature is unsettable.
   */
  isUnsettable(): boolean;

  /**
   * Sets whether the feature is unsettable.
   */
  setUnsettable(value: boolean): void;

  /**
   * Returns whether the feature is derived.
   */
  isDerived(): boolean;

  /**
   * Sets whether the feature is derived.
   */
  setDerived(value: boolean): void;

  /**
   * Returns the type of the feature.
   */
  getEType(): EClassifier | null;

  /**
   * Sets the type of the feature.
   */
  setEType(value: EClassifier | null): void;

  /**
   * Returns the containing class.
   */
  getEContainingClass(): EClass | null;

  /**
   * Returns whether the feature is many-valued.
   */
  isMany(): boolean;

  /**
   * Returns whether the feature is required (lowerBound >= 1).
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
  getFeatureID(): number;
}

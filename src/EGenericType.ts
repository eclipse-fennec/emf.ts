/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject';
import { EClassifier } from './EClassifier';
import { ETypeParameter } from './ETypeParameter';

/**
 * A representation of the model object 'EGeneric Type'.
 * Represents a generic type with type arguments.
 */
export interface EGenericType extends EObject {
  /**
   * Returns the upper bound, or null.
   */
  getEUpperBound(): EGenericType | null;

  /**
   * Sets the upper bound.
   */
  setEUpperBound(value: EGenericType | null): void;

  /**
   * Returns the list of type arguments.
   */
  getETypeArguments(): EGenericType[];

  /**
   * Returns the raw type.
   */
  getERawType(): EClassifier;

  /**
   * Returns the lower bound, or null.
   */
  getELowerBound(): EGenericType | null;

  /**
   * Sets the lower bound.
   */
  setELowerBound(value: EGenericType | null): void;

  /**
   * Returns the type parameter, or null.
   */
  getETypeParameter(): ETypeParameter | null;

  /**
   * Sets the type parameter.
   */
  setETypeParameter(value: ETypeParameter | null): void;

  /**
   * Returns the classifier, or null.
   */
  getEClassifier(): EClassifier | null;

  /**
   * Sets the classifier.
   */
  setEClassifier(value: EClassifier | null): void;
}

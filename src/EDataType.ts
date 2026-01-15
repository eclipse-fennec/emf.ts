/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClassifier } from './EClassifier';

/**
 * A representation of the model object 'EData Type'.
 * Represents a data type (primitives, strings, etc.).
 */
export interface EDataType extends EClassifier {
  /**
   * Returns whether the data type is serializable.
   */
  isSerializable(): boolean;

  /**
   * Sets whether the data type is serializable.
   */
  setSerializable(value: boolean): void;
}

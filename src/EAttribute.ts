/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EStructuralFeature } from './EStructuralFeature';
import { EDataType } from './EDataType';

/**
 * A representation of the model object 'EAttribute'.
 * Represents an attribute of a class (primitive or data type valued feature).
 */
export interface EAttribute extends EStructuralFeature {
  /**
   * Returns whether the attribute is an ID.
   */
  isID(): boolean;

  /**
   * Sets whether the attribute is an ID.
   */
  setID(value: boolean): void;

  /**
   * Returns the data type of the attribute.
   * This is a specialization of getEType() that returns EDataType.
   * May return null if the type is not set or not a valid EDataType.
   */
  getEAttributeType(): EDataType | null;
}

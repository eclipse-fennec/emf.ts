/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EDataType } from './EDataType';
import { EEnumLiteral } from './EEnumLiteral';

/**
 * A representation of the model object 'EEnum'.
 * Represents an enumeration type.
 */
export interface EEnum extends EDataType {
  /**
   * Returns the list of literals for this enum.
   */
  getELiterals(): EEnumLiteral[];

  /**
   * Returns the literal with the given name.
   */
  getEEnumLiteral(name: string): EEnumLiteral | null;

  /**
   * Returns the literal with the given value.
   */
  getEEnumLiteralByLiteral(literal: string): EEnumLiteral | null;

  /**
   * Returns the literal with the given integer value.
   */
  getEEnumLiteral(value: number): EEnumLiteral | null;
}

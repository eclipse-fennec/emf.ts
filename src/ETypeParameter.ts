/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EGenericType } from './EGenericType';

/**
 * A representation of the model object 'EType Parameter'.
 * Represents a type parameter (generics).
 */
export interface ETypeParameter extends ENamedElement {
  /**
   * Returns the list of bounds for this type parameter.
   */
  getEBounds(): EGenericType[];
}

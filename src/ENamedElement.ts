/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EModelElement } from './EModelElement';

/**
 * A representation of the model object 'ENamed Element'.
 * Base class for all model elements that have a name.
 */
export interface ENamedElement extends EModelElement {
  /**
   * Returns the name of the element.
   */
  getName(): string | null;

  /**
   * Sets the name of the element.
   */
  setName(value: string | null): void;
}

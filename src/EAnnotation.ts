/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EModelElement } from './EModelElement';
import { EObject } from './EObject';

/**
 * A representation of the model object 'EAnnotation'.
 * Represents additional metadata attached to model elements.
 */
export interface EAnnotation extends EModelElement {
  /**
   * Returns the source URI identifying the kind of annotation.
   */
  getSource(): string | null;

  /**
   * Sets the source URI.
   */
  setSource(value: string | null): void;

  /**
   * Returns the map of key-value details.
   */
  getDetails(): Map<string, string>;

  /**
   * Returns the model element this annotation is attached to.
   */
  getEModelElement(): EModelElement | null;

  /**
   * Sets the model element.
   */
  setEModelElement(value: EModelElement | null): void;

  /**
   * Returns the list of contents (arbitrary EObjects).
   */
  getContents(): EObject[];

  /**
   * Returns the list of references (arbitrary EObjects).
   */
  getReferences(): EObject[];
}

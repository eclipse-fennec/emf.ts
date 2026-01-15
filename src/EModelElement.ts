/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject';
import { EAnnotation } from './EAnnotation';

/**
 * A representation of the model object 'EModel Element'.
 * Base class for all model elements that can have annotations.
 */
export interface EModelElement extends EObject {
  /**
   * Returns the list of annotations.
   * It represents additional associated information.
   */
  getEAnnotations(): EAnnotation[];

  /**
   * Return the annotation with a matching source attribute.
   */
  getEAnnotation(source: string): EAnnotation | null;
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EStructuralFeature } from './EStructuralFeature';
import { EClass } from './EClass';
import { EAttribute } from './EAttribute';

/**
 * A representation of the model object 'EReference'.
 * Represents a reference from one class to another.
 */
export interface EReference extends EStructuralFeature {
  /**
   * Returns whether the reference is a containment.
   * Containment references define parent-child relationships.
   */
  isContainment(): boolean;

  /**
   * Sets whether the reference is a containment.
   */
  setContainment(value: boolean): void;

  /**
   * Returns whether the reference is a container.
   * A container reference is the opposite of a containment reference.
   */
  isContainer(): boolean;

  /**
   * Returns whether the reference is a proxy-resolving reference.
   */
  isResolveProxies(): boolean;

  /**
   * Sets whether the reference is proxy-resolving.
   */
  setResolveProxies(value: boolean): void;

  /**
   * Returns the opposite reference, or null.
   * Bidirectional references have opposites.
   */
  getEOpposite(): EReference | null;

  /**
   * Sets the opposite reference.
   */
  setEOpposite(value: EReference | null): void;

  /**
   * Returns the type of the reference.
   * This is a specialization of getEType() that returns EClass.
   */
  getEReferenceType(): EClass;

  /**
   * Returns the keys for map-like references.
   */
  getEKeys(): EAttribute[];
}

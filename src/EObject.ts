/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClass } from './EClass';
import { EStructuralFeature } from './EStructuralFeature';
import { EReference } from './EReference';
import { EOperation } from './EOperation';
import { Resource } from './Resource';

/**
 * EObject is the root of all modeled objects.
 * All method names start with "e" to distinguish EMF methods from client methods.
 *
 * It provides support for the behaviors and features common to all modeled objects:
 * - Content (eResource, eContainer, eContents, eAllContents, eCrossReferences)
 * - Reflection (eClass, eGet, eSet, eIsSet, eUnset)
 * - Serialization (eIsProxy)
 */
export interface EObject {
  /**
   * Returns the meta class.
   * The meta class defines the features available for reflective access.
   */
  eClass(): EClass;

  /**
   * Returns the containing resource, or null.
   * An object is contained in a resource if it, or one of its containers,
   * appears in the contents of that resource.
   */
  eResource(): Resource | null;

  /**
   * Returns the containing object, or null.
   * An object is contained by another object if it appears in the contents of that object.
   */
  eContainer(): EObject | null;

  /**
   * Returns the particular feature of the container that actually holds the object, or null.
   */
  eContainingFeature(): EStructuralFeature | null;

  /**
   * Returns the containment feature that properly contains the object, or null.
   */
  eContainmentFeature(): EReference | null;

  /**
   * Returns a list view of the content objects; it is unmodifiable.
   * This will be the list of EObjects determined by the contents of the containment features.
   */
  eContents(): EObject[];

  /**
   * Returns an iterator that iterates over all the direct contents and indirect contents of this object.
   */
  eAllContents(): IterableIterator<EObject>;

  /**
   * Indicates whether this object is a proxy.
   * A proxy is an object that is defined in a Resource that has not been loaded.
   */
  eIsProxy(): boolean;

  /**
   * Returns a list view of the cross referenced objects; it is unmodifiable.
   */
  eCrossReferences(): EObject[];

  /**
   * Returns the value of the given feature of this object.
   * This returns the resolved value.
   */
  eGet(feature: EStructuralFeature): any;

  /**
   * Returns the value of the given feature of the object;
   * the value is optionally resolved before it is returned.
   */
  eGet(feature: EStructuralFeature, resolve: boolean): any;

  /**
   * Sets the value of the given feature of the object to the new value.
   */
  eSet(feature: EStructuralFeature, newValue: any): void;

  /**
   * Returns whether the feature of the object is considered to be set.
   */
  eIsSet(feature: EStructuralFeature): boolean;

  /**
   * Unsets the feature of the object.
   */
  eUnset(feature: EStructuralFeature): void;

  /**
   * Invokes the specified operation of the object.
   * If the operation has parameters, then corresponding arguments must be supplied.
   */
  eInvoke(operation: EOperation, arguments_: any[]): any;
}

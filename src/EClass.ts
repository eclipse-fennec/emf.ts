/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClassifier } from './EClassifier';
import { EAttribute } from './EAttribute';
import { EReference } from './EReference';
import { EOperation } from './EOperation';
import { EStructuralFeature } from './EStructuralFeature';
import { EList } from './EList';

/**
 * A representation of the model object 'EClass'.
 * Represents a modeled class.
 */
export interface EClass extends EClassifier {
  /**
   * Returns whether the class is abstract.
   */
  isAbstract(): boolean;

  /**
   * Sets whether the class is abstract.
   */
  setAbstract(value: boolean): void;

  /**
   * Returns whether the class is an interface.
   */
  isInterface(): boolean;

  /**
   * Sets whether the class is an interface.
   */
  setInterface(value: boolean): void;

  /**
   * Returns the list of super types.
   */
  getESuperTypes(): EClass[];

  /**
   * Returns the list of all super types (transitive closure).
   */
  getEAllSuperTypes(): EClass[];

  /**
   * Returns the ID attribute, or null.
   */
  getEIDAttribute(): EAttribute | null;

  /**
   * Returns the list of structural features (attributes and references) of this class only.
   * The returned EList is a containment list that automatically:
   * - Sets the container when features are added
   * - Sets the inverse reference (eContainingClass)
   * - Fires notifications for adapters (including EContentAdapter)
   */
  getEStructuralFeatures(): EList<EStructuralFeature>;

  /**
   * Returns the list of all structural features (including inherited).
   */
  getEAllStructuralFeatures(): EStructuralFeature[];

  /**
   * Returns the list of attributes of this class only.
   */
  getEAttributes(): EAttribute[];

  /**
   * Returns the list of all attributes (including inherited).
   */
  getEAllAttributes(): EAttribute[];

  /**
   * Returns the list of references of this class only.
   */
  getEReferences(): EReference[];

  /**
   * Returns the list of all references (including inherited).
   */
  getEAllReferences(): EReference[];

  /**
   * Returns the list of all containment references.
   */
  getEAllContainments(): EReference[];

  /**
   * Returns the list of operations of this class only.
   */
  getEOperations(): EOperation[];

  /**
   * Returns the list of all operations (including inherited).
   */
  getEAllOperations(): EOperation[];

  /**
   * Returns the structural feature with the given name, or null.
   */
  getEStructuralFeature(featureName: string): EStructuralFeature | null;

  /**
   * Returns the structural feature with the given ID.
   */
  getEStructuralFeature(featureID: number): EStructuralFeature | null;

  /**
   * Returns whether this class is a super type of the given class.
   */
  isSuperTypeOf(someClass: EClass): boolean;

  /**
   * Returns the feature count.
   */
  getFeatureCount(): number;

  /**
   * Returns the ID for the given structural feature.
   */
  getFeatureID(feature: EStructuralFeature): number;

  /**
   * Returns the operation with the given ID.
   */
  getEOperation(operationID: number): EOperation | null;

  /**
   * Returns the operation count.
   */
  getOperationCount(): number;

  /**
   * Returns the ID for the given operation.
   */
  getOperationID(operation: EOperation): number;
}

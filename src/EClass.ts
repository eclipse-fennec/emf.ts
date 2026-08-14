/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClassifier } from './EClassifier.js';
import { EAttribute } from './EAttribute.js';
import { EReference } from './EReference.js';
import { EOperation } from './EOperation.js';
import { EStructuralFeature } from './EStructuralFeature.js';
import { EList } from './EList.js';

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
  getESuperTypes(): EList<EClass>;

  /**
   * Returns all super types (transitive closure).
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getESuperTypes() instead.
   */
  getEAllSuperTypes(): EList<EClass>;

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
   * Returns all structural features, including inherited ones.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEStructuralFeatures() instead.
   */
  getEAllStructuralFeatures(): EList<EStructuralFeature>;

  /**
   * Returns the attributes of this class only.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEStructuralFeatures() instead.
   */
  getEAttributes(): EList<EAttribute>;

  /**
   * Returns all attributes, including inherited ones.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEStructuralFeatures() instead.
   */
  getEAllAttributes(): EList<EAttribute>;

  /**
   * Returns the references of this class only.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEStructuralFeatures() instead.
   */
  getEReferences(): EList<EReference>;

  /**
   * Returns all references, including inherited ones.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEStructuralFeatures() instead.
   */
  getEAllReferences(): EList<EReference>;

  /**
   * Returns all containment references.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEStructuralFeatures() instead.
   */
  getEAllContainments(): EList<EReference>;

  /**
   * Returns the list of operations of this class only.
   */
  getEOperations(): EList<EOperation>;

  /**
   * Returns all operations, including inherited ones.
   *
   * Derived: the list is assembled from this class and its supertypes, so it is
   * read-only - mutating methods throw. Modify getEOperations() instead.
   */
  getEAllOperations(): EList<EOperation>;

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

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ENamedElement } from './ENamedElement';
import { EPackage } from './EPackage';
import { ETypeParameter } from './ETypeParameter';

/**
 * A representation of the model object 'EClassifier'.
 * Base class for EClass and EDataType.
 */
export interface EClassifier extends ENamedElement {
  /**
   * Returns the name of the instance class that this meta object represents.
   * In TypeScript, this would be the constructor name.
   */
  getInstanceClassName(): string | null;

  /**
   * Sets the instance class name.
   */
  setInstanceClassName(value: string | null): void;

  /**
   * Returns the actual instance class that this meta object represents.
   * In TypeScript, this would be a constructor function.
   */
  getInstanceClass(): Function | null;

  /**
   * Sets the instance class.
   */
  setInstanceClass(value: Function | null): void;

  /**
   * Returns the default value for the type.
   * For primitive types, it will be the appropriate default.
   * For enums, it will be the first enumerator.
   * For all other types derived from Object, it will be null.
   */
  getDefaultValue(): any;

  /**
   * Returns the parameterized type name that this meta object represents.
   */
  getInstanceTypeName(): string | null;

  /**
   * Sets the instance type name.
   */
  setInstanceTypeName(value: string | null): void;

  /**
   * Returns the containing package.
   */
  getEPackage(): EPackage | null;

  /**
   * Returns the list of type parameters.
   */
  getETypeParameters(): ETypeParameter[];

  /**
   * Returns whether the object is an instance of this classifier.
   */
  isInstance(object: any): boolean;

  /**
   * Returns the ID relative to the containing package.
   */
  getClassifierID(): number;
}

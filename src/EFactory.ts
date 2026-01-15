/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EModelElement } from './EModelElement';
import { EPackage } from './EPackage';
import { EClass } from './EClass';
import { EObject } from './EObject';
import { EDataType } from './EDataType';

/**
 * A representation of the model object 'EFactory'.
 * A factory is responsible for creating class instances,
 * and for converting data type instances to and from string.
 */
export interface EFactory extends EModelElement {
  /**
   * Returns the package of this factory.
   */
  getEPackage(): EPackage;

  /**
   * Sets the package of this factory.
   */
  setEPackage(value: EPackage): void;

  /**
   * Creates a new instance of the class and returns it.
   */
  create(eClass: EClass): EObject;

  /**
   * Creates an instance of the data type from the literal value.
   */
  createFromString(eDataType: EDataType, literalValue: string): any;

  /**
   * Returns the literal value of the instance.
   */
  convertToString(eDataType: EDataType, instanceValue: any): string;
}

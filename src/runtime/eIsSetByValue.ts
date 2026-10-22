/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { isListValue, toArray } from '../EList.js';

/**
 * eIsSet() for a class that keeps its state in typed fields.
 *
 * The Ecore metaclasses do not route their values through the reflective
 * settings map - `setName()` writes `this._name` - so the presence check
 * `BasicEObject.eIsSet()` performs reports false for everything they hold.
 * That made the serializer compare values instead of asking eIsSet(), which in
 * turn wrote attributes on generated classes that were never set (#123).
 *
 * EMF answers the same question the same way: for a non-unsettable feature the
 * generated eIsSet() compares the field against the feature's default, e.g.
 * `ENamedElementImpl.eIsSet()`:
 *
 *   return NAME_EDEFAULT == null ? name != null : !NAME_EDEFAULT.equals(name);
 *
 * and for a list it reports whether the list holds anything. Since eGet() is
 * polymorphic, one implementation covers a subclass's own features too.
 */
export function eIsSetByValue(eObject: EObject, feature: EStructuralFeature): boolean {
  const value = eObject.eGet(feature);

  // Never touched, and not held in a typed field either.
  if (value === undefined) {
    return false;
  }

  // A list counts as set while it holds something, as in EMF's generated
  // eIsSet() for a many-valued feature.
  if (isListValue(value)) {
    return toArray(value).length > 0;
  }

  let defaultValue: unknown = null;
  try {
    defaultValue = (feature as { getDefaultValue?: () => unknown }).getDefaultValue?.() ?? null;
  } catch {
    // A feature whose type is not resolved yet - treat the default as absent.
  }

  return value !== defaultValue;
}

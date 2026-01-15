/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject';
import { EClass } from './EClass';
import { EStructuralFeature } from './EStructuralFeature';
import { Resource } from './Resource';
import { URI } from './URI';

/**
 * Internal interface that extends EObject with implementation details
 * Used for proxy support and internal resource management
 */
export interface InternalEObject extends EObject {
  /**
   * Returns the proxy URI if this object is a proxy.
   * Returns null if this object is not a proxy.
   */
  eProxyURI(): URI | null;

  /**
   * Sets the proxy URI.
   * Setting a non-null URI makes this object a proxy.
   * Setting null removes proxy status.
   */
  eSetProxyURI(uri: URI | null): void;

  /**
   * Resolves the given proxy to the actual object.
   * If the proxy cannot be resolved, returns the proxy itself.
   */
  eResolveProxy(proxy: InternalEObject): EObject;

  /**
   * Returns the internal resource (bypassing container navigation)
   */
  eInternalResource(): Resource | null;

  /**
   * Sets the internal resource
   */
  eSetResource(resource: Resource | null): void;

  /**
   * Returns the internal container
   */
  eInternalContainer(): EObject | null;

  /**
   * Sets the container without notification
   */
  eBasicSetContainer(container: EObject | null, containerFeatureID: number): void;
}

/**
 * Check if an object implements InternalEObject
 */
export function isInternalEObject(obj: any): obj is InternalEObject {
  return obj && typeof obj.eProxyURI === 'function' && typeof obj.eSetProxyURI === 'function';
}

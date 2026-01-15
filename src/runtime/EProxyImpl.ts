/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject';
import { EClass } from '../EClass';
import { EStructuralFeature } from '../EStructuralFeature';
import { EReference } from '../EReference';
import { EOperation } from '../EOperation';
import { Resource } from '../Resource';
import { URI } from '../URI';
import { InternalEObject } from '../InternalEObject';

/**
 * Proxy implementation for unresolved references.
 * This is a lightweight object that stores the URI to the actual object.
 */
export class EProxyImpl implements InternalEObject {
  private _proxyURI: URI | null = null;
  private _eClass: EClass | null = null;
  private _resource: Resource | null = null;

  constructor(proxyURI: URI, eClass?: EClass) {
    this._proxyURI = proxyURI;
    this._eClass = eClass || null;
  }

  // --- Proxy-specific methods ---

  eProxyURI(): URI | null {
    return this._proxyURI;
  }

  eSetProxyURI(uri: URI | null): void {
    this._proxyURI = uri;
  }

  eIsProxy(): boolean {
    return this._proxyURI !== null;
  }

  eResolveProxy(proxy: InternalEObject): EObject {
    // Delegate to resource set for resolution
    const resource = this._resource || this.eResource();
    if (resource) {
      const resourceSet = resource.getResourceSet();
      if (resourceSet && proxy.eProxyURI()) {
        const proxyURI = proxy.eProxyURI()!;

        // Parse URI to get resource URI and fragment
        const uriStr = proxyURI.toString();
        const hashIndex = uriStr.indexOf('#');

        if (hashIndex > 0) {
          const resourceURI = URI.createURI(uriStr.substring(0, hashIndex));
          const fragment = uriStr.substring(hashIndex + 1);

          // Get or load the resource
          const targetResource = resourceSet.getResource(resourceURI, true);
          if (targetResource) {
            const resolved = targetResource.getEObject(fragment);
            if (resolved) {
              return resolved;
            }
          }
        } else if (hashIndex === 0) {
          // Same-resource reference
          const fragment = uriStr.substring(1);
          const resolved = resource.getEObject(fragment);
          if (resolved) {
            return resolved;
          }
        }
      }
    }

    // Cannot resolve - return proxy itself
    return proxy;
  }

  // --- InternalEObject methods ---

  eInternalResource(): Resource | null {
    return this._resource;
  }

  eSetResource(resource: Resource | null): void {
    this._resource = resource;
  }

  eInternalContainer(): EObject | null {
    return null;
  }

  eBasicSetContainer(container: EObject | null, containerFeatureID: number): void {
    // Proxies don't track containers
  }

  // --- EObject interface (minimal implementation) ---

  eClass(): EClass {
    if (this._eClass) {
      return this._eClass;
    }
    throw new Error('Proxy has no EClass - must be resolved first');
  }

  eResource(): Resource | null {
    return this._resource;
  }

  eContainer(): EObject | null {
    return null;
  }

  eContainingFeature(): EStructuralFeature | null {
    return null;
  }

  eContainmentFeature(): EReference | null {
    return null;
  }

  eContents(): EObject[] {
    return [];
  }

  eAllContents(): IterableIterator<EObject> {
    return [][Symbol.iterator]();
  }

  eCrossReferences(): EObject[] {
    return [];
  }

  eGet(feature: EStructuralFeature): any {
    throw new Error(`Cannot get feature '${feature.getName()}' on unresolved proxy: ${this._proxyURI?.toString()}`);
  }

  eSet(feature: EStructuralFeature, newValue: any): void {
    throw new Error(`Cannot set feature '${feature.getName()}' on unresolved proxy: ${this._proxyURI?.toString()}`);
  }

  eIsSet(feature: EStructuralFeature): boolean {
    return false;
  }

  eUnset(feature: EStructuralFeature): void {
    throw new Error(`Cannot unset feature '${feature.getName()}' on unresolved proxy: ${this._proxyURI?.toString()}`);
  }

  eInvoke(operation: EOperation, arguments_: any[]): any {
    throw new Error(`Cannot invoke operation '${operation.getName()}' on unresolved proxy: ${this._proxyURI?.toString()}`);
  }

  toString(): string {
    return `EProxy(${this._proxyURI?.toString() || 'null'})`;
  }
}

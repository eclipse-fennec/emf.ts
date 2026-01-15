/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject';
import { EClass } from '../EClass';
import { EReference } from '../EReference';
import { EStructuralFeature } from '../EStructuralFeature';
import { Resource } from '../Resource';
import { ResourceSet } from '../ResourceSet';
import { URI } from '../URI';
import { InternalEObject, isInternalEObject } from '../InternalEObject';

/**
 * EcoreUtil provides utility methods for working with Ecore models.
 */
export class EcoreUtil {
  /**
   * Resolves the given proxy in the context of the given object.
   * If the proxy cannot be resolved, returns the proxy itself.
   *
   * @param proxy the proxy to resolve
   * @param context the context object (used to get resource set)
   * @returns the resolved object, or the proxy if it cannot be resolved
   */
  static resolve(proxy: EObject, context: EObject): EObject {
    if (!proxy || !isInternalEObject(proxy) || !proxy.eIsProxy()) {
      return proxy;
    }

    if (isInternalEObject(context)) {
      return context.eResolveProxy(proxy);
    }

    // Fallback: try to resolve using proxy's resource
    const proxyURI = (proxy as InternalEObject).eProxyURI();
    if (!proxyURI) {
      return proxy;
    }

    const resource = context.eResource?.();
    if (!resource) {
      return proxy;
    }

    return EcoreUtil.resolveWithResource(proxy, resource);
  }

  /**
   * Resolves the given proxy using the given resource.
   */
  static resolveWithResource(proxy: EObject, resource: Resource): EObject {
    if (!isInternalEObject(proxy) || !proxy.eIsProxy()) {
      return proxy;
    }

    const proxyURI = proxy.eProxyURI();
    if (!proxyURI) {
      return proxy;
    }

    const resourceSet = resource.getResourceSet();
    if (!resourceSet) {
      return proxy;
    }

    return EcoreUtil.resolveWithResourceSet(proxy, resourceSet, resource.getURI() ?? undefined);
  }

  /**
   * Resolves the given proxy using the given resource set.
   *
   * @param proxy the proxy to resolve
   * @param resourceSet the resource set to use for resolution
   * @param baseURI optional base URI for resolving relative references
   */
  static resolveWithResourceSet(proxy: EObject, resourceSet: ResourceSet, baseURI?: URI): EObject {
    if (!isInternalEObject(proxy) || !proxy.eIsProxy()) {
      return proxy;
    }

    const proxyURI = proxy.eProxyURI();
    if (!proxyURI) {
      return proxy;
    }

    const uriStr = proxyURI.toString();
    const hashIndex = uriStr.indexOf('#');

    if (hashIndex > 0) {
      // External resource reference
      const resourceURIStr = uriStr.substring(0, hashIndex);
      const fragment = uriStr.substring(hashIndex + 1);

      // Resolve relative URIs against base URI
      let resourceURI: URI;
      if (baseURI && !resourceURIStr.includes('://')) {
        resourceURI = baseURI.resolve(URI.createURI(resourceURIStr));
      } else {
        resourceURI = URI.createURI(resourceURIStr);
      }

      // Get or load the target resource
      const targetResource = resourceSet.getResource(resourceURI, true);
      if (targetResource) {
        const resolved = targetResource.getEObject(fragment);
        if (resolved) {
          return resolved;
        }
      }
    } else if (hashIndex === 0) {
      // Same-resource reference (starts with #)
      // This shouldn't happen for cross-resource proxies, but handle it anyway
      const fragment = uriStr.substring(1);
      for (const resource of resourceSet.getResources()) {
        const resolved = resource.getEObject(fragment);
        if (resolved) {
          return resolved;
        }
      }
    }

    return proxy;
  }

  /**
   * Resolves all proxies in the given resource.
   */
  static resolveAll(resource: Resource): void {
    const contents = resource.getContents();
    for (const root of contents) {
      EcoreUtil.resolveAllInObject(root);
    }
  }

  /**
   * Resolves all proxies in the given resource set.
   */
  static resolveAllInResourceSet(resourceSet: ResourceSet): void {
    for (const resource of resourceSet.getResources()) {
      EcoreUtil.resolveAll(resource);
    }
  }

  /**
   * Resolves all proxies in the given object and its contents.
   */
  static resolveAllInObject(object: EObject): void {
    const eClass = object.eClass();

    // Resolve all reference values
    for (const feature of eClass.getEAllReferences()) {
      const value = object.eGet(feature);
      if (value) {
        if (Array.isArray(value)) {
          // Many-valued - accessing elements triggers proxy resolution via the list
          for (let i = 0; i < value.length; i++) {
            // Just accessing triggers resolution if using proxy-resolving list
            const item = value[i];
            if (item && isInternalEObject(item) && item.eIsProxy()) {
              const resolved = EcoreUtil.resolve(item, object);
              if (resolved !== item) {
                value[i] = resolved;
              }
            }
          }
        } else if (isInternalEObject(value) && value.eIsProxy()) {
          // Single-valued - resolve if proxy
          const resolved = EcoreUtil.resolve(value, object);
          if (resolved !== value) {
            object.eSet(feature, resolved);
          }
        }
      }
    }

    // Recursively resolve contents
    for (const content of object.eContents()) {
      EcoreUtil.resolveAllInObject(content);
    }
  }

  /**
   * Creates a new instance of the given EClass.
   */
  static create(eClass: EClass): EObject {
    const ePackage = eClass.getEPackage();
    if (ePackage) {
      const factory = ePackage.getEFactoryInstance();
      if (factory) {
        return factory.create(eClass);
      }
    }
    throw new Error(`Cannot create instance of ${eClass.getName()} - no factory available`);
  }

  /**
   * Returns the URI for the given object.
   */
  static getURI(object: EObject): URI | null {
    const resource = object.eResource?.();
    if (!resource) {
      return null;
    }

    const resourceURI = resource.getURI();
    const fragment = resource.getURIFragment(object);

    if (resourceURI && fragment) {
      return URI.createURI(`${resourceURI.toString()}#${fragment}`);
    }

    return resourceURI;
  }

  /**
   * Returns the root container of the given object.
   */
  static getRootContainer(object: EObject): EObject {
    let current = object;
    let container = current.eContainer?.();

    while (container) {
      current = container;
      container = current.eContainer?.();
    }

    return current;
  }

  /**
   * Returns true if the given object is an ancestor of the other object.
   */
  static isAncestor(ancestor: EObject, object: EObject): boolean {
    let current = object.eContainer?.();

    while (current) {
      if (current === ancestor) {
        return true;
      }
      current = current.eContainer?.();
    }

    return false;
  }

  /**
   * Copies the given object.
   * Note: This is a shallow copy that only copies attribute values.
   */
  static copy(object: EObject): EObject {
    const eClass = object.eClass();
    const copy = EcoreUtil.create(eClass);

    // Copy attributes
    for (const attr of eClass.getEAllAttributes()) {
      if (!attr.isDerived() && !attr.isTransient()) {
        const value = object.eGet(attr);
        if (value !== null && value !== undefined) {
          copy.eSet(attr, value);
        }
      }
    }

    return copy;
  }

  /**
   * Returns all objects of the given type in the resource.
   */
  static getAllContents<T extends EObject>(resource: Resource, type: EClass): T[] {
    const result: T[] = [];

    for (const root of resource.getContents()) {
      if (EcoreUtil.isInstance(root, type)) {
        result.push(root as T);
      }

      for (const descendant of root.eAllContents()) {
        if (EcoreUtil.isInstance(descendant, type)) {
          result.push(descendant as T);
        }
      }
    }

    return result;
  }

  /**
   * Returns true if the object is an instance of the given type.
   */
  static isInstance(object: EObject, type: EClass): boolean {
    const objectClass = object.eClass();
    return objectClass === type || EcoreUtil.isSuperTypeOf(type, objectClass);
  }

  /**
   * Returns true if superType is a supertype of subType.
   */
  static isSuperTypeOf(superType: EClass, subType: EClass): boolean {
    const superTypes = subType.getESuperTypes();
    for (const st of superTypes) {
      if (st === superType || EcoreUtil.isSuperTypeOf(superType, st)) {
        return true;
      }
    }
    return false;
  }
}

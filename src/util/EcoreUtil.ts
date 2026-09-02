/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EReference } from '../EReference.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { Resource } from '../Resource.js';
import { ResourceSet } from '../ResourceSet.js';
import { URI } from '../URI.js';
import { InternalEObject, isInternalEObject } from '../InternalEObject.js';
import { EList, toArray, replaceListContents } from '../EList.js';

/**
 * Copies one attribute value from one object to another.
 *
 * A multi-valued attribute has to be filled through its list rather than by
 * assigning the value, since the list belongs to the target object.
 */
function copyAttributeValue(feature: EStructuralFeature, from: EObject, to: EObject): void {
  const value = from.eGet(feature);
  if (value === null || value === undefined) {
    return;
  }

  if (feature.isMany()) {
    const values = toArray(value as any);
    if (values.length > 0) {
      replaceListContents(to.eGet(feature) as EList<unknown>, values);
    }
    return;
  }

  to.eSet(feature, value);
}

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
   * Copies the given object deeply, including its containment tree.
   *
   * Cross-references whose target is inside the copied tree point at the copy;
   * references leaving the tree keep pointing at the original. This matches
   * EcoreUtil.copy() in Java EMF, which delegates to Copier the same way.
   */
  static copy<T extends EObject>(object: T): T {
    const copier = new Copier();
    const result = copier.copy(object);
    copier.copyReferences();
    return result as T;
  }

  /**
   * Copies all given objects in one pass, so cross-references between them are
   * redirected to the copies rather than left on the originals.
   *
   * Copying the objects one by one would not achieve that: each call would use
   * its own mapping and see the others as external.
   */
  static copyAll<T extends EObject>(objects: Iterable<T>): T[] {
    const copier = new Copier();
    const result = copier.copyAll(objects);
    copier.copyReferences();
    return result as T[];
  }

  /**
   * Copies the attribute values of the given object, nothing else.
   *
   * Containment children are not copied and references are not set, so the
   * result is a detached object carrying the same attribute values. This is
   * what copy() did before it was made deep (#79); it is kept under its own
   * name for callers that want exactly this.
   *
   * Java EMF has no equivalent - use copy() unless a values-only copy is
   * specifically what you need.
   */
  static copyShallow<T extends EObject>(object: T): T {
    const eClass = object.eClass();
    const copy = EcoreUtil.create(eClass);

    for (const attr of eClass.getEAllAttributes()) {
      if (!attr.isDerived() && !attr.isTransient()) {
        copyAttributeValue(attr, object, copy);
      }
    }

    return copy as T;
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

/**
 * Creates deep copies while remembering which copy belongs to which original.
 *
 * Copying happens in two passes, as in Java EMF: copy() builds the objects and
 * their containment trees, then copyReferences() wires up the non-containment
 * references. A single pass cannot work - a reference may point at an object
 * that has not been copied yet, and only once everything is copied is it
 * decidable whether a target is inside the copied tree or outside it.
 *
 * The mapping is public so callers can look up the copy of a given original,
 * which is what Java's Copier (a Map subclass) is used for.
 */
export class Copier {
  /** original -> copy, filled during the first pass. */
  readonly mapping = new Map<EObject, EObject>();

  /**
   * Copies the object and its containment tree. Non-containment references are
   * left alone until {@link copyReferences} runs.
   */
  copy(object: EObject): EObject {
    const existing = this.mapping.get(object);
    if (existing) {
      return existing;
    }

    const eClass = object.eClass();
    const copy = EcoreUtil.create(eClass);
    this.mapping.set(object, copy);

    for (const feature of eClass.getEAllStructuralFeatures()) {
      if (!this.shouldCopy(feature)) {
        continue;
      }
      if (this.isContainmentReference(feature)) {
        this.copyContainment(feature, object, copy);
      } else if (!this.isReference(feature)) {
        this.copyAttribute(feature, object, copy);
      }
      // Non-containment references: second pass.
    }

    return copy;
  }

  /**
   * Copies several objects using one shared mapping.
   */
  copyAll<T extends EObject>(objects: Iterable<T>): T[] {
    const copies: T[] = [];
    for (const object of objects) {
      copies.push(this.copy(object) as T);
    }
    return copies;
  }

  /**
   * Second pass: sets the non-containment references on all copies made so far.
   *
   * A target that was copied is replaced by its copy; a target outside the
   * copied tree stays as it is, so a type reference keeps pointing at the same
   * EDataType rather than at a copy of it.
   */
  copyReferences(): void {
    for (const [original, copy] of this.mapping) {
      for (const feature of original.eClass().getEAllStructuralFeatures()) {
        if (!this.shouldCopy(feature) || !this.isReference(feature) || this.isContainmentReference(feature)) {
          continue;
        }
        this.copyReference(feature, original, copy);
      }
    }
  }

  /**
   * Features that are derived or not changeable are computed or read-only, so
   * copying them would either fail or be redundant. Java EMF applies the same
   * two conditions in Copier.copy().
   */
  protected shouldCopy(feature: EStructuralFeature): boolean {
    return feature.isChangeable() && !feature.isDerived();
  }

  protected isReference(feature: EStructuralFeature): boolean {
    return 'isContainment' in feature && typeof (feature as any).isContainment === 'function';
  }

  protected isContainmentReference(feature: EStructuralFeature): boolean {
    return this.isReference(feature) && (feature as EReference).isContainment();
  }

  protected copyAttribute(feature: EStructuralFeature, original: EObject, copy: EObject): void {
    copyAttributeValue(feature, original, copy);
  }

  protected copyContainment(feature: EStructuralFeature, original: EObject, copy: EObject): void {
    const value = original.eGet(feature);
    if (value === null || value === undefined) {
      return;
    }

    if (feature.isMany()) {
      const children = toArray(value as any) as EObject[];
      const target = copy.eGet(feature) as EList<EObject>;
      for (const child of children) {
        if (child !== null && child !== undefined) {
          target.add(this.copy(child));
        }
      }
      return;
    }

    copy.eSet(feature, this.copy(value as EObject));
  }

  protected copyReference(feature: EStructuralFeature, original: EObject, copy: EObject): void {
    const value = original.eGet(feature);
    if (value === null || value === undefined) {
      return;
    }

    if (feature.isMany()) {
      const targets = toArray(value as any) as EObject[];
      if (targets.length === 0) {
        return;
      }
      const resolved = targets.map(target => this.mapping.get(target) ?? target);
      replaceListContents(copy.eGet(feature) as EList<unknown>, resolved);
      return;
    }

    const target = value as EObject;
    copy.eSet(feature, this.mapping.get(target) ?? target);
  }
}

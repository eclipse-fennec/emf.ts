/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EReference } from '../EReference.js';
import { EOperation } from '../EOperation.js';
import { Resource } from '../Resource.js';
import { URI } from '../URI.js';
import { InternalEObject, isInternalEObject } from '../InternalEObject.js';
import { Adapter, isAdapterInternal } from '../notify/Adapter.js';
import { Notification, NotificationImpl, NotificationType } from '../notify/Notification.js';
import { Notifier } from '../notify/Notifier.js';
import { EList, BasicEList, EObjectContainmentEList, EObjectEList, isEList, createContainmentEList, createEObjectEList, createBasicEList } from '../EList.js';

/**
 * Minimal EObject implementation
 * Similar to org.eclipse.emf.ecore.impl.MinimalEObjectImpl
 */
export abstract class BasicEObject implements InternalEObject, Notifier {
  private _eResource: Resource | null = null;
  private _eContainer: EObject | null = null;
  private _eContainerFeature: EReference | null = null;
  private _eProxyURI: URI | null = null;
  private _eAdapters: Adapter[] = [];
  private _eDeliver: boolean = true;

  /**
   * Storage for feature values
   * Map from feature name to value
   */
  protected eSettings: Map<string, any> = new Map();

  /**
   * Returns the meta class (must be implemented by subclasses)
   */
  abstract eClass(): EClass;

  /**
   * Returns the containing resource
   */
  eResource(): Resource | null {
    return this._eContainer ? this._eContainer.eResource() : this._eResource;
  }

  /**
   * Sets the resource (internal use)
   */
  eSetResource(resource: Resource | null): void {
    this._eResource = resource;
  }

  /**
   * Returns the containing object
   */
  eContainer(): EObject | null {
    return this._eContainer;
  }

  /**
   * Sets the container (internal use)
   */
  eSetContainer(container: EObject | null, feature: EReference | null): void {
    this._eContainer = container;
    this._eContainerFeature = feature;
  }

  /**
   * Returns the containing feature
   */
  eContainingFeature(): EStructuralFeature | null {
    return this._eContainerFeature;
  }

  /**
   * Returns the containment feature
   */
  eContainmentFeature(): EReference | null {
    return this._eContainerFeature;
  }

  /**
   * Returns all direct contents
   */
  eContents(): EObject[] {
    const contents: EObject[] = [];
    const eClass = this.eClass();
    const features = eClass.getEAllContainments();

    for (const feature of features) {
      const value = this.eGet(feature);
      if (value) {
        if (Array.isArray(value) || isEList(value)) {
          for (const item of value) {
            contents.push(item);
          }
        } else {
          contents.push(value);
        }
      }
    }

    return contents;
  }

  /**
   * Returns an iterator over all contents
   */
  eAllContents(): IterableIterator<EObject> {
    const contents = this.eContents();
    const allContents: EObject[] = [...contents];

    // Recursively add all descendants
    for (const content of contents) {
      const iterator = content.eAllContents();
      let result = iterator.next();
      while (!result.done) {
        allContents.push(result.value);
        result = iterator.next();
      }
    }

    return allContents[Symbol.iterator]();
  }

  /**
   * Returns whether this object is a proxy
   */
  eIsProxy(): boolean {
    return this._eProxyURI !== null;
  }

  /**
   * Returns the proxy URI if this object is a proxy
   */
  eProxyURI(): URI | null {
    return this._eProxyURI;
  }

  /**
   * Sets the proxy URI
   */
  eSetProxyURI(uri: URI | null): void {
    this._eProxyURI = uri;
  }

  /**
   * Resolves a proxy to the actual object
   */
  eResolveProxy(proxy: InternalEObject): EObject {
    const proxyURI = proxy.eProxyURI();
    if (!proxyURI) {
      return proxy;
    }

    // Get resource set for resolution
    const resource = this.eResource();
    if (!resource) {
      return proxy;
    }

    const resourceSet = resource.getResourceSet();
    if (!resourceSet) {
      return proxy;
    }

    // Parse the proxy URI
    const uriStr = proxyURI.toString();
    const hashIndex = uriStr.indexOf('#');

    if (hashIndex > 0) {
      // External resource reference
      const resourceURIStr = uriStr.substring(0, hashIndex);
      const fragment = uriStr.substring(hashIndex + 1);

      // Resolve relative URIs against current resource
      let resourceURI: URI;
      const currentURI = resource.getURI();
      if (currentURI && !resourceURIStr.includes('://')) {
        // Relative URI - resolve against current resource
        resourceURI = currentURI.resolve(URI.createURI(resourceURIStr));
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

      // Fallback: try package registry (nsURI-based lookup)
      // This handles cases where the package was registered but the resource is empty
      // (e.g., foaf.ecore#//Agent → find package with nsURI from foaf.ecore, resolve Agent there)
      const packageRegistry = resourceSet.getPackageRegistry();
      const resolved = this.resolveFragmentViaPackageRegistry(packageRegistry, resourceURIStr, fragment, resourceSet);
      if (resolved) {
        return resolved;
      }
    } else if (hashIndex === 0) {
      // Same-resource reference (starts with #)
      const fragment = uriStr.substring(1);
      const resolved = resource.getEObject(fragment);
      if (resolved) {
        return resolved;
      }
    } else {
      // Simple ID reference
      const resolved = resource.getEObject(uriStr);
      if (resolved) {
        return resolved;
      }
    }

    // Cannot resolve - return proxy
    return proxy;
  }

  /**
   * Resolve a fragment via the package registry.
   * When a proxy like foaf.ecore#//Agent can't be resolved through the resource
   * (e.g., because the resource is empty after package registration), try to
   * find the correct package in the registry.
   */
  private resolveFragmentViaPackageRegistry(
    packageRegistry: import('../EPackage.js').EPackageRegistry,
    resourceURIStr: string,
    fragment: string,
    resourceSet: import('../ResourceSet.js').ResourceSet
  ): EObject | null {
    // Try direct nsURI lookup (works when resourceURIStr is the actual nsURI)
    const directPkg = packageRegistry.getEPackage(resourceURIStr);
    if (directPkg) {
      const resolved = this.resolveFragmentInPackage(directPkg, fragment);
      if (resolved) return resolved;
    }

    // Extract package name from resource URI filename:
    // "foaf.ecore" → "foaf", "path/to/terms.ecore" → "terms"
    let baseName = resourceURIStr;
    const lastSlash = baseName.lastIndexOf('/');
    if (lastSlash >= 0) baseName = baseName.substring(lastSlash + 1);
    const dotIndex = baseName.indexOf('.');
    if (dotIndex > 0) baseName = baseName.substring(0, dotIndex);

    // Search registry for a package whose name matches the filename
    if (baseName) {
      for (const nsKey of packageRegistry.keys()) {
        const pkg = packageRegistry.getEPackage(nsKey);
        if (pkg && pkg.getName() === baseName) {
          const resolved = this.resolveFragmentInPackage(pkg, fragment);
          if (resolved) return resolved;
        }
      }
    }

    return null;
  }

  /**
   * Resolve a fragment path (e.g., //Agent or //sub/Agent) within an EPackage.
   */
  private resolveFragmentInPackage(pkg: import('../EPackage.js').EPackage, fragment: string): EObject | null {
    let path = fragment;
    while (path.startsWith('/')) path = path.substring(1);
    if (!path) return null;

    const segments = path.split('/');

    // Navigate subpackages for all but last segment
    let currentPkg = pkg;
    for (let i = 0; i < segments.length - 1; i++) {
      const subPackages = currentPkg.getESubpackages();
      let found: import('../EPackage.js').EPackage | null = null;
      for (let j = 0; j < subPackages.length; j++) {
        if (subPackages.get(j).getName() === segments[i]) {
          found = subPackages.get(j);
          break;
        }
      }
      if (!found) return null;
      currentPkg = found;
    }

    const classifierName = segments[segments.length - 1];
    const classifier = currentPkg.getEClassifier(classifierName);
    return classifier as unknown as EObject ?? null;
  }

  /**
   * Returns the internal resource (bypassing container navigation)
   */
  eInternalResource(): Resource | null {
    return this._eResource;
  }

  /**
   * Returns the internal container
   */
  eInternalContainer(): EObject | null {
    return this._eContainer;
  }

  /**
   * Sets the container without notification
   */
  eBasicSetContainer(container: EObject | null, containerFeatureID: number): void {
    this._eContainer = container;
  }

  // ===== Notifier interface implementation =====

  /**
   * Returns list of the adapters associated with this notifier.
   */
  eAdapters(): Adapter[] {
    return this._eAdapters;
  }

  /**
   * Returns whether this notifier will deliver notifications to the adapters.
   */
  eDeliver(): boolean {
    return this._eDeliver;
  }

  /**
   * Sets whether this notifier will deliver notifications to the adapters.
   */
  eSetDeliver(deliver: boolean): void {
    this._eDeliver = deliver;
  }

  /**
   * Notifies a change to a feature of this notifier as described by the notification.
   */
  eNotify(notification: Notification): void {
    if (this._eDeliver && this._eAdapters.length > 0) {
      for (const adapter of this._eAdapters) {
        adapter.notifyChanged(notification);
      }
    }
  }

  /**
   * Adds an adapter to this notifier.
   */
  eAdapterAdd(adapter: Adapter): void {
    this._eAdapters.push(adapter);
    adapter.setTarget(this);
  }

  /**
   * Removes an adapter from this notifier.
   */
  eAdapterRemove(adapter: Adapter): boolean {
    const index = this._eAdapters.indexOf(adapter);
    if (index !== -1) {
      // Notify adapter it's being removed
      if (this._eDeliver) {
        const notification = new NotificationImpl(
          this,
          NotificationType.REMOVING_ADAPTER,
          null,
          adapter,
          null
        );
        adapter.notifyChanged(notification);
      }

      this._eAdapters.splice(index, 1);

      // Unset target for internal adapters
      if (isAdapterInternal(adapter)) {
        adapter.unsetTarget(this);
      } else {
        adapter.setTarget(null);
      }

      return true;
    }
    return false;
  }

  // ===== End Notifier interface =====

  /**
   * Returns all cross references
   */
  eCrossReferences(): EObject[] {
    const refs: EObject[] = [];
    const eClass = this.eClass();
    const references = eClass.getEAllReferences();

    for (const ref of references) {
      if (!ref.isContainment()) {
        const value = this.eGet(ref);
        if (value) {
          if (Array.isArray(value) || isEList(value)) {
            for (const item of value) {
              refs.push(item);
            }
          } else {
            refs.push(value);
          }
        }
      }
    }

    return refs;
  }

  /**
   * Reflective get (default implementation)
   */
  eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName() || '';
    return this.eSettings.get(featureName);
  }

  /**
   * Reflective set (default implementation)
   */
  eSet(feature: EStructuralFeature, newValue: any): void {
    const featureName = feature.getName() || '';
    const oldValue = this.eSettings.get(featureName);

    this.eSettings.set(featureName, newValue);

    // Handle containment
    if (feature instanceof Object && 'isContainment' in feature) {
      const ref = feature as EReference;
      if (ref.isContainment()) {
        // Remove old container
        if (oldValue && typeof oldValue === 'object' && 'eSetContainer' in oldValue) {
          (oldValue as any).eSetContainer(null, null);
        }

        // Set new container
        if (newValue && typeof newValue === 'object' && 'eSetContainer' in newValue) {
          if (Array.isArray(newValue)) {
            for (const obj of newValue) {
              if (obj && 'eSetContainer' in obj) {
                (obj as any).eSetContainer(this, ref);
              }
            }
          } else {
            (newValue as any).eSetContainer(this, ref);
          }
        }
      }
    }

    // Send notification
    if (this._eDeliver && this._eAdapters.length > 0) {
      const notification = new NotificationImpl(
        this,
        NotificationType.SET,
        feature,
        oldValue,
        newValue
      );
      this.eNotify(notification);
    }
  }

  /**
   * Reflective isSet
   */
  eIsSet(feature: EStructuralFeature): boolean {
    const featureName = feature.getName() || '';
    return this.eSettings.has(featureName);
  }

  /**
   * Reflective unset
   */
  eUnset(feature: EStructuralFeature): void {
    const featureName = feature.getName() || '';
    const oldValue = this.eSettings.get(featureName);

    this.eSettings.delete(featureName);

    // Handle containment
    if (feature instanceof Object && 'isContainment' in feature) {
      const ref = feature as EReference;
      if (ref.isContainment() && oldValue) {
        if (Array.isArray(oldValue)) {
          for (const obj of oldValue) {
            if (obj && 'eSetContainer' in obj) {
              (obj as any).eSetContainer(null, null);
            }
          }
        } else if (typeof oldValue === 'object' && 'eSetContainer' in oldValue) {
          (oldValue as any).eSetContainer(null, null);
        }
      }
    }

    // Send notification
    if (this._eDeliver && this._eAdapters.length > 0) {
      const notification = new NotificationImpl(
        this,
        NotificationType.UNSET,
        feature,
        oldValue,
        feature.getDefaultValue()
      );
      this.eNotify(notification);
    }
  }

  /**
   * Invoke operation
   */
  eInvoke(operation: EOperation, arguments_: any[]): any {
    throw new Error(`Operation ${operation.getName()} not implemented`);
  }

  /**
   * Get direct class (for generated code)
   */
  protected eStaticClass(): EClass {
    return this.eClass();
  }

  /**
   * Get feature by ID
   */
  protected eFeature(featureID: number): EStructuralFeature | null {
    const eClass = this.eClass();
    return eClass.getEStructuralFeature(featureID);
  }

  /**
   * String representation
   */
  toString(): string {
    const eClass = this.eClass();
    const className = eClass?.getName() || 'UnknownClass';
    return `${className}@${this.hashCode()}`;
  }

  /**
   * Simple hash code
   */
  protected hashCode(): string {
    return Math.random().toString(36).substring(7);
  }
}

/**
 * Dynamic EObject Implementation
 * Used for objects without generated code
 */
export class DynamicEObject extends BasicEObject {
  constructor(private _eClass: EClass) {
    super();
  }

  eClass(): EClass {
    return this._eClass;
  }

  /**
   * Override eGet to handle dynamic features and proxy resolution.
   * Returns EList for multi-valued features.
   */
  override eGet(feature: EStructuralFeature): any {
    const featureName = feature.getName() || '';

    // Check if value already exists
    if (this.eSettings.has(featureName)) {
      let value = this.eSettings.get(featureName);

      // Resolve proxy for single-valued references
      if (!feature.isMany() && value && isInternalEObject(value) && value.eIsProxy()) {
        const resolved = this.eResolveProxy(value);
        if (resolved !== value) {
          this.eSettings.set(featureName, resolved);
          return resolved;
        }
      }

      return value;
    }

    // For many-valued features, create and store an EList with index access support
    if (feature.isMany()) {
      let list: any;

      // Check if this is a reference
      if ('isContainment' in feature) {
        const ref = feature as EReference;
        if (ref.isContainment()) {
          // Containment reference - manages container relationships
          list = createContainmentEList(this, ref);
        } else {
          // Non-containment reference - with proxy resolution
          list = createEObjectEList(this, ref);
        }
      } else {
        // Simple attribute list
        list = createBasicEList<any>(this, feature);
      }

      this.eSettings.set(featureName, list);
      return list;
    }

    // Return default value for single-valued features
    const defaultValue = feature.getDefaultValue();
    return defaultValue !== undefined ? defaultValue : null;
  }
}

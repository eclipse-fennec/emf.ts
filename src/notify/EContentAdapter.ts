/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Adapter, AdapterInternal, AdapterImpl } from './Adapter';
import { Notification, NotificationType } from './Notification';
import { Notifier } from './Notifier';
import { EObject } from '../EObject';
import { EReference } from '../EReference';
import { Resource } from '../Resource';
import { ResourceSet } from '../ResourceSet';

/**
 * An adapter that maintains itself as an adapter for all contained objects
 * as they come and go.
 * It can be installed for an EObject, a Resource, or a ResourceSet.
 */
export abstract class EContentAdapter extends AdapterImpl implements AdapterInternal {
  /**
   * Indicates whether the adapter is currently being attached iteratively.
   */
  protected iterating: boolean = false;

  /**
   * Returns whether the process of attaching this adapter should be done recursively or iteratively.
   * The default is to return true for recursion.
   */
  protected useRecursion(): boolean {
    return true;
  }

  /**
   * Returns whether proxies should be resolved during traversal.
   */
  protected resolve(): boolean {
    return true;
  }

  /**
   * Handles a notification by calling selfAdapt.
   */
  notifyChanged(notification: Notification): void {
    this.selfAdapt(notification);
  }

  /**
   * Handles a notification by calling handleContainment for any containment-based notification.
   */
  protected selfAdapt(notification: Notification): void {
    const notifier = notification.getNotifier();

    if (this.isResourceSet(notifier)) {
      // Handle ResourceSet.resources changes
      const feature = notification.getFeature();
      if (feature && (feature as any).getName?.() === 'resources') {
        this.handleContainment(notification);
      }
    } else if (this.isResource(notifier)) {
      // Handle Resource.contents changes
      const feature = notification.getFeature();
      if (feature && (feature as any).getName?.() === 'contents') {
        this.handleContainment(notification);
      }
    } else if (this.isEObject(notifier)) {
      const feature = notification.getFeature();
      if (feature && this.isEReference(feature)) {
        const eReference = feature as EReference;
        if (eReference.isContainment()) {
          this.handleContainment(notification);
        }
      }
    }
  }

  /**
   * Handles a containment change by adding and removing the adapter as appropriate.
   */
  protected handleContainment(notification: Notification): void {
    switch (notification.getEventType()) {
      case NotificationType.RESOLVE: {
        const oldValue = notification.getOldValue() as Notifier | null;
        if (oldValue && this.hasAdapter(oldValue)) {
          this.removeAdapter(oldValue);
          const newValue = notification.getNewValue() as Notifier | null;
          if (newValue) {
            this.addAdapter(newValue);
          }
        }
        break;
      }
      case NotificationType.UNSET: {
        const oldValue = notification.getOldValue();
        if (oldValue !== true && oldValue !== false) {
          if (oldValue != null) {
            this.removeAdapterWithChecks(oldValue as Notifier, false, true);
          }
          const newValue = notification.getNewValue() as Notifier | null;
          if (newValue != null) {
            this.addAdapter(newValue);
          }
        }
        break;
      }
      case NotificationType.SET: {
        const oldValue = notification.getOldValue() as Notifier | null;
        if (oldValue != null) {
          this.removeAdapterWithChecks(oldValue, false, true);
        }
        const newValue = notification.getNewValue() as Notifier | null;
        if (newValue != null) {
          this.addAdapter(newValue);
        }
        break;
      }
      case NotificationType.ADD: {
        const newValue = notification.getNewValue() as Notifier | null;
        if (newValue != null) {
          this.addAdapter(newValue);
        }
        break;
      }
      case NotificationType.ADD_MANY: {
        const newValues = notification.getNewValue() as Notifier[] | null;
        if (newValues) {
          for (const newValue of newValues) {
            this.addAdapter(newValue);
          }
        }
        break;
      }
      case NotificationType.REMOVE: {
        const oldValue = notification.getOldValue() as Notifier | null;
        if (oldValue != null) {
          const checkContainer = this.isResource(notification.getNotifier());
          const checkResource = notification.getFeature() != null;
          this.removeAdapterWithChecks(oldValue, checkContainer, checkResource);
        }
        break;
      }
      case NotificationType.REMOVE_MANY: {
        const checkContainer = this.isResource(notification.getNotifier());
        const checkResource = notification.getFeature() != null;
        const oldValues = notification.getOldValue() as Notifier[] | null;
        if (oldValues) {
          for (const oldValue of oldValues) {
            this.removeAdapterWithChecks(oldValue, checkContainer, checkResource);
          }
        }
        break;
      }
    }
  }

  /**
   * Handles installation of the adapter by adding the adapter to each of the directly contained objects.
   */
  setTarget(target: Notifier | null): void {
    if (target === null) {
      this.target = null;
      return;
    }

    if (this.isEObject(target)) {
      this.setTargetEObject(target as EObject);
    } else if (this.isResource(target)) {
      this.setTargetResource(target as Resource);
    } else if (this.isResourceSet(target)) {
      this.setTargetResourceSet(target as ResourceSet);
    } else {
      this.basicSetTarget(target);
    }
  }

  /**
   * Actually sets the target by calling super.
   */
  protected basicSetTarget(target: Notifier | null): void {
    this.target = target;
  }

  /**
   * Handles installation of the adapter on an EObject.
   */
  protected setTargetEObject(target: EObject): void {
    this.basicSetTarget(target as unknown as Notifier);
    if (this.useRecursion()) {
      const contents = target.eContents();
      for (const child of contents) {
        this.addAdapter(child as unknown as Notifier);
      }
    } else if (!this.iterating) {
      this.iterating = true;
      this.addAdapterToAllContents(target);
      this.iterating = false;
    }
  }

  /**
   * Handles installation of the adapter on a Resource.
   */
  protected setTargetResource(target: Resource): void {
    console.log('[EContentAdapter] setTargetResource called, contents:', target.getContents().length);
    this.basicSetTarget(target as unknown as Notifier);
    const contents = target.getContents();
    for (const child of contents) {
      console.log('[EContentAdapter] Adding adapter to child:', (child as any).getName?.() || child);
      this.addAdapter(child as unknown as Notifier);
    }
  }

  /**
   * Handles installation of the adapter on a ResourceSet.
   */
  protected setTargetResourceSet(target: ResourceSet): void {
    this.basicSetTarget(target as unknown as Notifier);
    const resources = target.getResources();
    for (const resource of resources) {
      this.addAdapter(resource as unknown as Notifier);
    }
  }

  /**
   * Handles undoing the installation of the adapter.
   */
  unsetTarget(target: Notifier): void {
    if (this.isEObject(target)) {
      this.unsetTargetEObject(target as unknown as EObject);
    } else if (this.isResource(target)) {
      this.unsetTargetResource(target as Resource);
    } else if (this.isResourceSet(target)) {
      this.unsetTargetResourceSet(target as ResourceSet);
    } else {
      this.basicUnsetTarget(target);
    }
  }

  /**
   * Actually unsets the target.
   */
  protected basicUnsetTarget(target: Notifier): void {
    if (this.target === target) {
      this.target = null;
    }
  }

  /**
   * Handles undoing the installation of the adapter from an EObject.
   */
  protected unsetTargetEObject(target: EObject): void {
    this.basicUnsetTarget(target as unknown as Notifier);
    if (this.useRecursion()) {
      const contents = target.eContents();
      for (const child of contents) {
        this.removeAdapterWithChecks(child as unknown as Notifier, false, true);
      }
    } else if (!this.iterating) {
      this.iterating = true;
      this.removeAdapterFromAllContents(target);
      this.iterating = false;
    }
  }

  /**
   * Handles undoing the installation of the adapter from a Resource.
   */
  protected unsetTargetResource(target: Resource): void {
    this.basicUnsetTarget(target as unknown as Notifier);
    const contents = target.getContents();
    for (const child of contents) {
      this.removeAdapterWithChecks(child as unknown as Notifier, true, false);
    }
  }

  /**
   * Handles undoing the installation of the adapter from a ResourceSet.
   */
  protected unsetTargetResourceSet(target: ResourceSet): void {
    this.basicUnsetTarget(target as unknown as Notifier);
    const resources = target.getResources();
    for (const resource of resources) {
      this.removeAdapterWithChecks(resource as unknown as Notifier, false, false);
    }
  }

  /**
   * Adds this adapter to the notifier if not already present.
   */
  protected addAdapter(notifier: Notifier): void {
    console.log('[EContentAdapter] addAdapter called, notifier has eAdapters:', typeof notifier.eAdapters === 'function');
    const eAdapters = notifier.eAdapters();
    console.log('[EContentAdapter] Current adapters count:', eAdapters.length, 'already has this:', eAdapters.includes(this));
    if (!eAdapters.includes(this)) {
      eAdapters.push(this);
      console.log('[EContentAdapter] Adapter added, new count:', eAdapters.length);
      // Call setTarget to trigger recursive addition for EObjects
      if (this.isEObject(notifier)) {
        console.log('[EContentAdapter] Notifier is EObject, calling setTargetEObject');
        this.setTargetEObject(notifier as unknown as EObject);
      }
    }
  }

  /**
   * Removes this adapter from the notifier with optional container/resource checks.
   */
  protected removeAdapterWithChecks(notifier: Notifier, checkContainer: boolean, checkResource: boolean): void {
    if (checkContainer || checkResource) {
      if (this.isEObject(notifier)) {
        const eObject = notifier as unknown as EObject;
        if (checkResource) {
          const resource = eObject.eResource();
          if (resource && this.hasAdapter(resource as unknown as Notifier)) {
            return;
          }
        }
        if (checkContainer) {
          const container = eObject.eContainer();
          if (container && this.hasAdapter(container as unknown as Notifier)) {
            return;
          }
        }
      }
    }
    this.removeAdapter(notifier);
  }

  /**
   * Removes this adapter from the notifier.
   */
  protected removeAdapter(notifier: Notifier): void {
    const eAdapters = notifier.eAdapters();
    const index = eAdapters.indexOf(this);
    if (index !== -1) {
      eAdapters.splice(index, 1);
    }
  }

  /**
   * Checks if this adapter is attached to the notifier.
   */
  protected hasAdapter(notifier: Notifier): boolean {
    return notifier.eAdapters().includes(this);
  }

  /**
   * Recursively adds this adapter to all contents of an EObject.
   */
  protected addAdapterToAllContents(target: EObject): void {
    const stack: EObject[] = [target];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const contents = current.eContents();
      for (const child of contents) {
        if (!this.hasAdapter(child as unknown as Notifier)) {
          this.addAdapter(child as unknown as Notifier);
          stack.push(child);
        }
      }
    }
  }

  /**
   * Recursively removes this adapter from all contents of an EObject.
   */
  protected removeAdapterFromAllContents(target: EObject): void {
    const stack: EObject[] = [target];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const contents = current.eContents();
      for (const child of contents) {
        this.removeAdapterWithChecks(child as unknown as Notifier, false, true);
        stack.push(child);
      }
    }
  }

  // Type guard helpers
  private isEObject(obj: any): obj is EObject {
    return obj && typeof obj.eClass === 'function' && typeof obj.eContents === 'function';
  }

  private isResource(obj: any): obj is Resource {
    return obj && typeof obj.getContents === 'function' && typeof obj.getURI === 'function';
  }

  private isResourceSet(obj: any): obj is ResourceSet {
    return obj && typeof obj.getResources === 'function' && typeof obj.createResource === 'function';
  }

  private isEReference(obj: any): obj is EReference {
    return obj && typeof obj.isContainment === 'function';
  }
}

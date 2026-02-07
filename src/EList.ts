/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject';
import { EStructuralFeature } from './EStructuralFeature';
import { EReference } from './EReference';
import { InternalEObject, isInternalEObject } from './InternalEObject';
import { Notification, NotificationImpl, NotificationType, NotificationEventType, NO_INDEX } from './notify/Notification';

/**
 * EList interface - A list that sends notifications on modifications.
 * This mirrors Java EMF's EList interface.
 */
export interface EList<T> extends Iterable<T> {
  /**
   * Returns the number of elements in the list.
   */
  size(): number;

  /**
   * Array-compatible length property.
   */
  readonly length: number;

  /**
   * Array-compatible push method.
   */
  push(...items: T[]): number;

  /**
   * Returns true if the list is empty.
   */
  isEmpty(): boolean;

  /**
   * Returns true if the list contains the specified element.
   */
  contains(element: T): boolean;

  /**
   * Returns the index of the first occurrence of the specified element, or -1.
   */
  indexOf(element: T): number;

  /**
   * Returns the element at the specified position.
   */
  get(index: number): T;

  /**
   * Replaces the element at the specified position.
   * Returns the element previously at that position.
   */
  set(index: number, element: T): T;

  /**
   * Adds the element to the end of the list.
   * Returns true if the list changed.
   */
  add(element: T): boolean;

  /**
   * Inserts the element at the specified position.
   */
  addAt(index: number, element: T): void;

  /**
   * Adds all elements to the end of the list.
   * Returns true if the list changed.
   */
  addAll(elements: T[]): boolean;

  /**
   * Inserts all elements at the specified position.
   * Returns true if the list changed.
   */
  addAllAt(index: number, elements: T[]): boolean;

  /**
   * Removes the first occurrence of the specified element.
   * Returns true if the element was found and removed.
   */
  remove(element: T): boolean;

  /**
   * Removes the element at the specified position.
   * Returns the removed element.
   */
  removeAt(index: number): T;

  /**
   * Removes all elements from the list.
   */
  clear(): void;

  /**
   * Moves the element at fromIndex to toIndex.
   * Returns the moved element.
   */
  move(toIndex: number, fromIndex: number): T;

  /**
   * Returns the list as an array (for compatibility).
   */
  toArray(): T[];

  /**
   * Iterator for for...of loops.
   */
  [Symbol.iterator](): Iterator<T>;

  // ===== Array-compatible methods =====

  /**
   * Array-compatible filter method.
   */
  filter(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[];

  /**
   * Array-compatible map method.
   */
  map<U>(callback: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];

  /**
   * Array-compatible forEach method.
   */
  forEach(callback: (value: T, index: number, array: T[]) => void, thisArg?: any): void;

  /**
   * Array-compatible find method.
   */
  find(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T | undefined;

  /**
   * Array-compatible findIndex method.
   */
  findIndex(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): number;

  /**
   * Array-compatible some method.
   */
  some(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;

  /**
   * Array-compatible every method.
   */
  every(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean;

  /**
   * Array-compatible includes method.
   */
  includes(element: T): boolean;

  /**
   * Array-compatible slice method.
   */
  slice(start?: number, end?: number): T[];
}

/**
 * Internal interface for EList implementations that can send notifications
 */
export interface NotifyingEList<T> extends EList<T> {
  /**
   * Returns the owner of this list.
   */
  getOwner(): EObject | null;

  /**
   * Returns the feature this list belongs to.
   */
  getFeature(): EStructuralFeature | null;
}

/**
 * Basic EList implementation that sends notifications on modifications.
 * Similar to org.eclipse.emf.ecore.util.EObjectEList in Java EMF.
 *
 * Also provides Array-compatible methods (push, pop, shift, splice, length)
 * for backwards compatibility with code that expects arrays.
 */
export class BasicEList<T> implements NotifyingEList<T> {
  protected data: T[] = [];
  protected owner: EObject | null;
  protected feature: EStructuralFeature | null;

  constructor(owner: EObject | null = null, feature: EStructuralFeature | null = null) {
    this.owner = owner;
    this.feature = feature;
  }

  // ===== Array-compatible properties and methods =====

  /**
   * Array-compatible length property.
   */
  get length(): number {
    return this.data.length;
  }

  /**
   * Array-compatible push method. Adds elements to the end of the list.
   * Sends ADD or ADD_MANY notification.
   */
  push(...items: T[]): number {
    if (items.length === 0) {
      return this.data.length;
    }
    if (items.length === 1) {
      this.add(items[0]);
    } else {
      this.addAll(items);
    }
    return this.data.length;
  }

  /**
   * Array-compatible pop method. Removes and returns the last element.
   * Sends REMOVE notification.
   */
  pop(): T | undefined {
    if (this.data.length === 0) {
      return undefined;
    }
    return this.removeAt(this.data.length - 1);
  }

  /**
   * Array-compatible shift method. Removes and returns the first element.
   * Sends REMOVE notification.
   */
  shift(): T | undefined {
    if (this.data.length === 0) {
      return undefined;
    }
    return this.removeAt(0);
  }

  /**
   * Array-compatible unshift method. Adds elements to the beginning of the list.
   * Sends ADD or ADD_MANY notification.
   */
  unshift(...items: T[]): number {
    if (items.length === 0) {
      return this.data.length;
    }
    if (items.length === 1) {
      this.addAt(0, items[0]);
    } else {
      this.addAllAt(0, items);
    }
    return this.data.length;
  }

  /**
   * Array-compatible splice method.
   * Removes elements and/or inserts new elements.
   * Sends appropriate notifications.
   */
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const actualStart = start < 0 ? Math.max(this.data.length + start, 0) : Math.min(start, this.data.length);
    const actualDeleteCount = deleteCount === undefined ? this.data.length - actualStart : Math.min(Math.max(deleteCount, 0), this.data.length - actualStart);

    const removed: T[] = [];

    // Remove elements
    for (let i = 0; i < actualDeleteCount; i++) {
      if (actualStart < this.data.length) {
        removed.push(this.removeAt(actualStart));
      }
    }

    // Add new elements
    for (let i = 0; i < items.length; i++) {
      this.addAt(actualStart + i, items[i]);
    }

    return removed;
  }

  /**
   * Array-compatible forEach method.
   */
  forEach(callback: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
    this.data.forEach((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible map method.
   */
  map<U>(callback: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
    return this.data.map((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible filter method.
   */
  filter(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] {
    return this.data.filter((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible find method.
   */
  find(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T | undefined {
    return this.data.find((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible findIndex method.
   */
  findIndex(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): number {
    return this.data.findIndex((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible some method.
   */
  some(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
    return this.data.some((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible every method.
   */
  every(callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
    return this.data.every((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Array-compatible reduce method.
   */
  reduce<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U {
    return this.data.reduce((prev, curr, idx) => callback(prev, curr, idx, this.data), initialValue);
  }

  /**
   * Array-compatible includes method.
   */
  includes(element: T): boolean {
    return this.contains(element);
  }

  /**
   * Array-compatible slice method. Returns a shallow copy.
   */
  slice(start?: number, end?: number): T[] {
    return this.data.slice(start, end);
  }

  // ===== End Array-compatible methods =====

  getOwner(): EObject | null {
    return this.owner;
  }

  getFeature(): EStructuralFeature | null {
    return this.feature;
  }

  size(): number {
    return this.data.length;
  }

  isEmpty(): boolean {
    return this.data.length === 0;
  }

  contains(element: T): boolean {
    return this.data.indexOf(element) !== -1;
  }

  indexOf(element: T): number {
    return this.data.indexOf(element);
  }

  get(index: number): T {
    if (index < 0 || index >= this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for list of size ${this.data.length}`);
    }
    return this.data[index];
  }

  set(index: number, element: T): T {
    if (index < 0 || index >= this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for list of size ${this.data.length}`);
    }

    const oldElement = this.data[index];
    if (oldElement === element) {
      return oldElement; // No change
    }

    this.data[index] = element;
    this.didSet(index, element, oldElement);
    return oldElement;
  }

  add(element: T): boolean {
    const index = this.data.length;
    this.data.push(element);
    this.didAdd(index, element);
    return true;
  }

  addAt(index: number, element: T): void {
    if (index < 0 || index > this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for list of size ${this.data.length}`);
    }
    this.data.splice(index, 0, element);
    this.didAdd(index, element);
  }

  addAll(elements: T[]): boolean {
    if (elements.length === 0) {
      return false;
    }
    const index = this.data.length;
    this.data.push(...elements);
    this.didAddMany(index, elements);
    return true;
  }

  addAllAt(index: number, elements: T[]): boolean {
    if (elements.length === 0) {
      return false;
    }
    if (index < 0 || index > this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for list of size ${this.data.length}`);
    }
    this.data.splice(index, 0, ...elements);
    this.didAddMany(index, elements);
    return true;
  }

  remove(element: T): boolean {
    const index = this.data.indexOf(element);
    if (index === -1) {
      return false;
    }
    this.removeAt(index);
    return true;
  }

  removeAt(index: number): T {
    if (index < 0 || index >= this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for list of size ${this.data.length}`);
    }
    const removed = this.data.splice(index, 1)[0];
    this.didRemove(index, removed);
    return removed;
  }

  clear(): void {
    if (this.data.length === 0) {
      return;
    }
    const oldData = [...this.data];
    this.data.length = 0;
    this.didClear(oldData);
  }

  move(toIndex: number, fromIndex: number): T {
    if (fromIndex < 0 || fromIndex >= this.data.length) {
      throw new RangeError(`fromIndex ${fromIndex} out of bounds for list of size ${this.data.length}`);
    }
    if (toIndex < 0 || toIndex >= this.data.length) {
      throw new RangeError(`toIndex ${toIndex} out of bounds for list of size ${this.data.length}`);
    }

    const element = this.data[fromIndex];
    if (fromIndex === toIndex) {
      return element; // No change
    }

    // Remove from old position
    this.data.splice(fromIndex, 1);
    // Insert at new position
    this.data.splice(toIndex, 0, element);

    this.didMove(toIndex, element, fromIndex);
    return element;
  }

  toArray(): T[] {
    return [...this.data];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }

  // ===== Notification hooks =====

  protected didAdd(index: number, element: T): void {
    this.dispatchNotification(NotificationType.ADD, null, element, index);
  }

  protected didAddMany(index: number, elements: T[]): void {
    this.dispatchNotification(NotificationType.ADD_MANY, null, elements, index);
  }

  protected didRemove(index: number, element: T): void {
    this.dispatchNotification(NotificationType.REMOVE, element, null, index);
  }

  protected didClear(oldData: T[]): void {
    if (oldData.length === 1) {
      this.dispatchNotification(NotificationType.REMOVE, oldData[0], null, 0);
    } else {
      this.dispatchNotification(NotificationType.REMOVE_MANY, oldData, null, NO_INDEX);
    }
  }

  protected didSet(index: number, newElement: T, oldElement: T): void {
    this.dispatchNotification(NotificationType.SET, oldElement, newElement, index);
  }

  protected didMove(toIndex: number, element: T, fromIndex: number): void {
    // For MOVE, oldValue is the old position (fromIndex)
    this.dispatchNotification(NotificationType.MOVE, fromIndex, element, toIndex);
  }

  protected dispatchNotification(
    eventType: NotificationEventType,
    oldValue: any,
    newValue: any,
    position: number
  ): void {
    // Use getFeature() to allow lazy resolution in subclasses
    const feature = this.getFeature();
    console.log('[BasicEList] dispatchNotification - owner:', !!this.owner, 'feature:', feature?.getName?.() || feature);
    if (!this.owner || !feature) {
      console.log('[BasicEList] No owner or feature, skipping notification');
      return;
    }

    // Check if owner delivers notifications
    if ('eDeliver' in this.owner && !(this.owner as any).eDeliver()) {
      console.log('[BasicEList] Owner does not deliver notifications');
      return;
    }

    // Check if owner has adapters
    if ('eAdapters' in this.owner) {
      const adapters = (this.owner as any).eAdapters();
      console.log('[BasicEList] Owner adapters count:', adapters?.length || 0);
      if (!adapters || adapters.length === 0) {
        console.log('[BasicEList] No adapters on owner, skipping notification');
        return;
      }
    } else {
      console.log('[BasicEList] Owner has no eAdapters method');
      return;
    }

    const notification = new NotificationImpl(
      this.owner,
      eventType,
      feature,
      oldValue,
      newValue,
      position
    );

    console.log('[BasicEList] Calling eNotify on owner');
    if ('eNotify' in this.owner) {
      (this.owner as any).eNotify(notification);
    }
  }
}

/**
 * EList implementation for containment references.
 * Manages container relationships when elements are added/removed.
 */
export class EObjectContainmentEList<T extends EObject = EObject> extends BasicEList<T> {
  constructor(owner: EObject, feature: EReference) {
    super(owner, feature);
  }

  protected override didAdd(index: number, element: T): void {
    this.setContainer(element);
    super.didAdd(index, element);
  }

  protected override didAddMany(index: number, elements: T[]): void {
    for (const element of elements) {
      this.setContainer(element);
    }
    super.didAddMany(index, elements);
  }

  protected override didRemove(index: number, element: T): void {
    this.unsetContainer(element);
    super.didRemove(index, element);
  }

  protected override didClear(oldData: T[]): void {
    for (const element of oldData) {
      this.unsetContainer(element);
    }
    super.didClear(oldData);
  }

  protected override didSet(index: number, newElement: T, oldElement: T): void {
    this.unsetContainer(oldElement);
    this.setContainer(newElement);
    super.didSet(index, newElement, oldElement);
  }

  override add(element: T): boolean {
    // Remove from old container first
    this.removeFromOldContainer(element);
    return super.add(element);
  }

  override addAt(index: number, element: T): void {
    this.removeFromOldContainer(element);
    super.addAt(index, element);
  }

  override addAll(elements: T[]): boolean {
    for (const element of elements) {
      this.removeFromOldContainer(element);
    }
    return super.addAll(elements);
  }

  override addAllAt(index: number, elements: T[]): boolean {
    for (const element of elements) {
      this.removeFromOldContainer(element);
    }
    return super.addAllAt(index, elements);
  }

  override set(index: number, element: T): T {
    this.removeFromOldContainer(element);
    return super.set(index, element);
  }

  private setContainer(element: T): void {
    const feature = this.getFeature();
    if (element && 'eSetContainer' in element && this.owner) {
      (element as any).eSetContainer(this.owner, feature as EReference);
    }
  }

  private unsetContainer(element: T): void {
    if (element && 'eSetContainer' in element) {
      (element as any).eSetContainer(null, null);
    }
  }

  private removeFromOldContainer(element: T): void {
    const oldContainer = element.eContainer();
    if (oldContainer && oldContainer !== this.owner) {
      const oldFeature = element.eContainmentFeature();
      if (oldFeature && oldFeature.isMany()) {
        const oldList = oldContainer.eGet(oldFeature);
        if (oldList && 'remove' in oldList) {
          (oldList as EList<EObject>).remove(element);
        } else if (Array.isArray(oldList)) {
          const idx = oldList.indexOf(element);
          if (idx >= 0) {
            oldList.splice(idx, 1);
          }
        }
      }
    }
  }
}

/**
 * Callback type for setting inverse reference.
 */
export type InverseSetter<T> = (element: T, owner: EObject | null) => void;

/**
 * EList implementation for containment references with inverse reference support.
 * When elements are added, both the container and the inverse reference are set.
 * This is similar to Java EMF's EObjectContainmentWithInverseEList.
 */
export class EObjectContainmentWithInverseEList<T extends EObject = EObject> extends EObjectContainmentEList<T> {
  private inverseSetter: InverseSetter<T>;

  constructor(owner: EObject, feature: EReference, inverseSetter: InverseSetter<T>) {
    super(owner, feature);
    this.inverseSetter = inverseSetter;
  }

  protected override didAdd(index: number, element: T): void {
    // Set inverse reference
    this.inverseSetter(element, this.owner);
    // Then call parent which sets container and fires notification
    super.didAdd(index, element);
  }

  protected override didAddMany(index: number, elements: T[]): void {
    // Set inverse references
    for (const element of elements) {
      this.inverseSetter(element, this.owner);
    }
    super.didAddMany(index, elements);
  }

  protected override didRemove(index: number, element: T): void {
    // Clear inverse reference
    this.inverseSetter(element, null);
    super.didRemove(index, element);
  }

  protected override didClear(oldData: T[]): void {
    // Clear inverse references
    for (const element of oldData) {
      this.inverseSetter(element, null);
    }
    super.didClear(oldData);
  }

  protected override didSet(index: number, newElement: T, oldElement: T): void {
    // Clear old inverse, set new inverse
    this.inverseSetter(oldElement, null);
    this.inverseSetter(newElement, this.owner);
    super.didSet(index, newElement, oldElement);
  }
}

/**
 * Factory function to create an EObjectContainmentWithInverseEList with index access support.
 */
export function createContainmentWithInverseEList<T extends EObject = EObject>(
  owner: EObject,
  feature: EReference,
  inverseSetter: InverseSetter<T>
): EObjectContainmentWithInverseEList<T> & { [index: number]: T } {
  return createIndexedProxy(new EObjectContainmentWithInverseEList<T>(owner, feature, inverseSetter));
}

/**
 * EList implementation for containment references with inverse reference support and lazy feature resolution.
 * The feature is resolved lazily to avoid circular dependencies during bootstrap.
 */
export class EObjectContainmentWithInverseEListLazy<T extends EObject = EObject> extends EObjectContainmentEList<T> {
  private featureResolver: () => EReference | null;
  private resolvedFeature: EReference | null | undefined = undefined;
  private inverseSetter: InverseSetter<T>;

  constructor(owner: EObject, featureResolver: () => EReference | null, inverseSetter: InverseSetter<T>) {
    super(owner, null as any); // Feature will be resolved lazily
    this.featureResolver = featureResolver;
    this.inverseSetter = inverseSetter;
  }

  override getFeature(): EStructuralFeature | null {
    if (this.resolvedFeature === undefined) {
      this.resolvedFeature = this.featureResolver();
    }
    return this.resolvedFeature;
  }

  protected override didAdd(index: number, element: T): void {
    // Set inverse reference
    this.inverseSetter(element, this.owner);
    // Then call parent which sets container and fires notification
    super.didAdd(index, element);
  }

  protected override didAddMany(index: number, elements: T[]): void {
    // Set inverse references
    for (const element of elements) {
      this.inverseSetter(element, this.owner);
    }
    super.didAddMany(index, elements);
  }

  protected override didRemove(index: number, element: T): void {
    // Clear inverse reference
    this.inverseSetter(element, null);
    super.didRemove(index, element);
  }

  protected override didClear(oldData: T[]): void {
    // Clear inverse references
    for (const element of oldData) {
      this.inverseSetter(element, null);
    }
    super.didClear(oldData);
  }

  protected override didSet(index: number, newElement: T, oldElement: T): void {
    // Clear old inverse, set new inverse
    this.inverseSetter(oldElement, null);
    this.inverseSetter(newElement, this.owner);
    super.didSet(index, newElement, oldElement);
  }
}

/**
 * EList implementation for non-containment references with proxy resolution.
 */
export class EObjectEList extends BasicEList<EObject> {
  constructor(owner: EObject, feature: EReference) {
    super(owner, feature);
  }

  override get(index: number): EObject {
    if (index < 0 || index >= this.data.length) {
      throw new RangeError(`Index ${index} out of bounds for list of size ${this.data.length}`);
    }

    let element = this.data[index];

    // Resolve proxy if needed
    if (element && isInternalEObject(element) && element.eIsProxy()) {
      if (this.owner && 'eResolveProxy' in this.owner) {
        const resolved = (this.owner as any).eResolveProxy(element);
        if (resolved !== element) {
          this.data[index] = resolved;
          element = resolved;
        }
      }
    }

    return element;
  }

  override [Symbol.iterator](): Iterator<EObject> {
    // Resolve all proxies during iteration
    const self = this;
    let index = 0;

    return {
      next(): IteratorResult<EObject> {
        if (index >= self.data.length) {
          return { done: true, value: undefined };
        }
        const value = self.get(index++);
        return { done: false, value };
      }
    };
  }
}

/**
 * Type guard to check if an object is an EList
 */
export function isEList<T>(obj: any): obj is EList<T> {
  return obj && typeof obj.add === 'function' && typeof obj.size === 'function' && typeof obj.get === 'function';
}

/**
 * Wraps an EList with a Proxy to enable array-like index access (list[0], list[1], etc.)
 */
export function createIndexedProxy<T, L extends BasicEList<T>>(list: L): L & { [index: number]: T } {
  return new Proxy(list, {
    get(target, prop, receiver) {
      // Handle numeric index access
      if (typeof prop === 'string') {
        const index = parseInt(prop, 10);
        if (!isNaN(index) && index >= 0) {
          if (index < target.size()) {
            return target.get(index);
          }
          return undefined;
        }
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      // Handle 'length' property for array compatibility
      if (prop === 'length') {
        const newLength = typeof value === 'number' ? value : parseInt(value, 10);
        if (newLength === 0) {
          target.clear();
          return true;
        }
        // Truncate list if needed
        while (target.size() > newLength) {
          target.removeAt(target.size() - 1);
        }
        return true;
      }
      // Handle numeric index assignment
      if (typeof prop === 'string') {
        const index = parseInt(prop, 10);
        if (!isNaN(index) && index >= 0) {
          if (index < target.size()) {
            target.set(index, value);
            return true;
          } else if (index === target.size()) {
            target.add(value);
            return true;
          }
          // Index out of bounds for assignment
          return false;
        }
      }
      return Reflect.set(target, prop, value, receiver);
    }
  }) as L & { [index: number]: T };
}

/**
 * Factory function to create an EObjectContainmentEList with index access support.
 */
export function createContainmentEList<T extends EObject = EObject>(owner: EObject, feature: EReference): EObjectContainmentEList<T> & { [index: number]: T } {
  return createIndexedProxy(new EObjectContainmentEList<T>(owner, feature));
}

/**
 * Factory function to create an EObjectEList with index access support.
 */
export function createEObjectEList(owner: EObject, feature: EReference): EObjectEList & { [index: number]: EObject } {
  return createIndexedProxy(new EObjectEList(owner, feature));
}

/**
 * Factory function to create a BasicEList with index access support.
 */
export function createBasicEList<T>(owner: EObject, feature: EStructuralFeature): BasicEList<T> & { [index: number]: T } {
  return createIndexedProxy(new BasicEList<T>(owner, feature));
}

/**
 * EList implementation for Resource contents.
 * Manages resource relationships when elements are added/removed.
 * Sends notifications to the Resource (which implements Notifier).
 */
export class ResourceContentsEList extends BasicEList<EObject> {
  private resource: any; // Resource type to avoid circular dependency

  constructor(resource: any) {
    super(null, null);
    this.resource = resource;
  }

  protected override didAdd(index: number, element: EObject): void {
    this.setResource(element);
    this.dispatchResourceNotification(NotificationType.ADD, null, element, index);
  }

  protected override didAddMany(index: number, elements: EObject[]): void {
    for (const element of elements) {
      this.setResource(element);
    }
    this.dispatchResourceNotification(NotificationType.ADD_MANY, null, elements, index);
  }

  protected override didRemove(index: number, element: EObject): void {
    this.unsetResource(element);
    this.dispatchResourceNotification(NotificationType.REMOVE, element, null, index);
  }

  protected override didClear(oldData: EObject[]): void {
    for (const element of oldData) {
      this.unsetResource(element);
    }
    if (oldData.length === 1) {
      this.dispatchResourceNotification(NotificationType.REMOVE, oldData[0], null, 0);
    } else if (oldData.length > 1) {
      this.dispatchResourceNotification(NotificationType.REMOVE_MANY, oldData, null, NO_INDEX);
    }
  }

  protected override didSet(index: number, newElement: EObject, oldElement: EObject): void {
    this.unsetResource(oldElement);
    this.setResource(newElement);
    this.dispatchResourceNotification(NotificationType.SET, oldElement, newElement, index);
  }

  private setResource(element: EObject): void {
    if (element && 'eSetResource' in element) {
      (element as any).eSetResource(this.resource);
    }
  }

  private unsetResource(element: EObject): void {
    if (element && 'eSetResource' in element) {
      (element as any).eSetResource(null);
    }
  }

  /**
   * Dispatch notification to the Resource (which is a Notifier).
   * Uses a synthetic 'contents' feature for the notification.
   */
  private dispatchResourceNotification(
    eventType: NotificationEventType,
    oldValue: any,
    newValue: any,
    position: number
  ): void {
    if (!this.resource) return;

    // Check if resource delivers notifications
    if ('eDeliver' in this.resource && !this.resource.eDeliver()) {
      return;
    }

    // Check if resource has adapters
    if ('eAdapters' in this.resource) {
      const adapters = this.resource.eAdapters();
      if (!adapters || adapters.length === 0) {
        return;
      }
    } else {
      return;
    }

    // Create a synthetic feature object for 'contents'
    const contentsFeature = { getName: () => 'contents' };

    const notification = new NotificationImpl(
      this.resource,
      eventType,
      contentsFeature as any,
      oldValue,
      newValue,
      position
    );

    if ('eNotify' in this.resource) {
      this.resource.eNotify(notification);
    }
  }
}

/**
 * Factory function to create a ResourceContentsEList with index access support.
 */
export function createResourceContentsEList(resource: any): ResourceContentsEList & { [index: number]: EObject } {
  return createIndexedProxy(new ResourceContentsEList(resource));
}
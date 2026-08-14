/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject.js';
import { EStructuralFeature } from './EStructuralFeature.js';
import { EReference } from './EReference.js';
import { InternalEObject, isInternalEObject } from './InternalEObject.js';
import { Notification, NotificationImpl, NotificationType, NotificationEventType, NO_INDEX } from './notify/Notification.js';

/**
 * EList interface - A list that sends notifications on modifications.
 * This mirrors Java EMF's EList interface.
 *
 * An EList is indexable and iterable, but it is deliberately **not** an Array:
 * `Array.isArray(eList)` returns `false`. The list guarantees that every
 * mutation emits a notification, which a real Array cannot do - inheriting from
 * Array would expose the `length` setter and raw index assignment, both of
 * which bypass every interceptor. This mirrors the position of `NodeList` and
 * `HTMLCollection` in the DOM. Use `Array.from(list)` when a real Array is
 * required.
 */
export interface EList<T> extends Iterable<T> {
  /**
   * Array-compatible index access. Reads return the element at the index,
   * writes are routed through {@link set} so notifications are still sent.
   */
  [index: number]: T;

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

  /**
   * Array-compatible concat method. Does not modify the list.
   */
  concat(...items: (T | T[] | EList<T>)[]): T[];

  /**
   * Array-compatible sort method. Sorts the list in place and returns it.
   * Emits a MOVE notification per relocated element, like ECollections.sort().
   */
  sort(compareFn?: (a: T, b: T) => number): this;

  /**
   * Array-compatible reverse method. Reverses the list in place and returns it.
   */
  reverse(): this;

  /**
   * Array-compatible join method.
   */
  join(separator?: string): string;

  /**
   * Array-compatible at method. Supports negative indices.
   */
  at(index: number): T | undefined;

  /**
   * Array-compatible lastIndexOf method.
   */
  lastIndexOf(element: T): number;

  /**
   * Array-compatible flatMap method.
   */
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[], thisArg?: any): U[];

  // NOTE: keys()/values()/entries() are deliberately absent. EMap extends
  // EList and defines keys() with Map semantics (returning the map keys), so an
  // Array-style keys() cannot coexist. Use Array.from(list).keys() if needed.

  /**
   * Serializes as a plain array, so `JSON.stringify(list)` yields `[...]`
   * instead of exposing the internal structure (and dragging the owner along).
   */
  toJSON(): T[];
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
 * Matches property keys that address a list position: "0", "1", "42".
 * Deliberately strict - "01", "1.5", "-1" and "" are not index keys.
 */
const INDEX_KEY = /^(?:0|[1-9]\d*)$/;

/**
 * Marks a list that is already wrapped for index access, so that
 * createIndexedProxy() does not stack a second Proxy on top.
 */
const IS_INDEXED = Symbol.for('emfts.indexedList');

/**
 * Proxy handler that maps numeric property keys onto list positions.
 * Shared by all instances; it is stateless.
 */
const INDEX_ACCESS_HANDLER: ProxyHandler<any> = {
  get(target, prop, receiver) {
    if (prop === IS_INDEXED) {
      return true;
    }
    if (typeof prop === 'string' && INDEX_KEY.test(prop)) {
      const index = Number(prop);
      // Fast path for implementations backed by a plain array.
      const data: any[] | undefined = target.data;
      if (data !== undefined) {
        return data[index];
      }
      // Generic path (e.g. BasicEMap, which delegates): get() throws when out
      // of bounds, but array semantics ask for undefined.
      return index < target.size() ? target.get(index) : undefined;
    }
    return Reflect.get(target, prop, receiver);
  },

  set(target, prop, value, receiver) {
    // Array-compatible truncation: list.length = 0 clears, a smaller length
    // drops the tail. Each removal goes through the list, so notifications are
    // still emitted - unlike the length setter of a real Array.
    if (prop === 'length') {
      const newLength = typeof value === 'number' ? value : parseInt(value, 10);
      if (isNaN(newLength) || newLength < 0) {
        throw new RangeError(`Invalid list length: ${String(value)}`);
      }
      if (newLength === 0) {
        target.clear();
      } else {
        while (target.size() > newLength) {
          target.removeAt(target.size() - 1);
        }
      }
      return true;
    }
    if (typeof prop === 'string' && INDEX_KEY.test(prop)) {
      const index = Number(prop);
      const size = target.size();
      if (index < size) {
        target.set(index, value);
      } else if (index === size) {
        // Appending via list[list.length] = x is a common array idiom.
        target.add(value);
      } else {
        throw new RangeError(
          `Index ${index} out of bounds for list of size ${size}. ` +
          `ELists do not support sparse assignment - use add() or push().`
        );
      }
      return true;
    }
    return Reflect.set(target, prop, value, receiver);
  },

  has(target, prop) {
    if (typeof prop === 'string' && INDEX_KEY.test(prop)) {
      return Number(prop) < target.size();
    }
    return Reflect.has(target, prop);
  },
};

/**
 * Basic EList implementation that sends notifications on modifications.
 * Similar to org.eclipse.emf.ecore.util.EObjectEList in Java EMF.
 *
 * Also provides Array-compatible methods (push, pop, shift, splice, length)
 * for backwards compatibility with code that expects arrays.
 */
export class BasicEList<T> implements NotifyingEList<T> {
  [index: number]: T;

  protected data: T[] = [];
  protected owner: EObject | null;
  protected feature: EStructuralFeature | null;

  constructor(owner: EObject | null = null, feature: EStructuralFeature | null = null) {
    this.owner = owner;
    this.feature = feature;

    // Numeric index access (list[0]) is provided through a Proxy rather than by
    // extending Array: writes are routed through set()/add() so notifications
    // are still emitted. Returning an object from a base constructor makes it
    // the `this` of every subclass, so all EList subclasses inherit this.
    return new Proxy(this, INDEX_ACCESS_HANDLER) as this;
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

  /**
   * Array-compatible concat method. Returns a new array, list is unchanged.
   * Accepts single values, arrays and other ELists as arguments.
   */
  concat(...items: (T | T[] | EList<T>)[]): T[] {
    const result = [...this.data];
    for (const item of items) {
      if (Array.isArray(item)) {
        result.push(...item);
      } else if (item instanceof BasicEList) {
        result.push(...(item as BasicEList<T>).data);
      } else {
        result.push(item as T);
      }
    }
    return result;
  }

  /**
   * Array-compatible sort method. Sorts in place and returns the list.
   *
   * The reordering is applied through move(), so each relocated element emits a
   * MOVE notification. This mirrors ECollections.sort() in Java EMF rather than
   * silently rewriting the backing array.
   */
  sort(compareFn?: (a: T, b: T) => number): this {
    this.reorderTo([...this.data].sort(compareFn));
    return this;
  }

  /**
   * Array-compatible reverse method. Reverses in place and returns the list.
   * Emits MOVE notifications, see {@link sort}.
   */
  reverse(): this {
    this.reorderTo([...this.data].reverse());
    return this;
  }

  /**
   * Rearranges the list to match the given order using move(), so that every
   * relocation is observable. The order must be a permutation of the list.
   */
  protected reorderTo(order: T[]): void {
    for (let i = 0; i < order.length; i++) {
      if (this.data[i] === order[i]) {
        continue;
      }
      // Positions below i are already final, so search from i onwards.
      const from = this.data.indexOf(order[i], i);
      if (from > i) {
        this.move(i, from);
      }
    }
  }

  /**
   * Array-compatible join method.
   */
  join(separator?: string): string {
    return this.data.join(separator);
  }

  /**
   * Array-compatible at method. Negative indices count from the end.
   * Implemented directly rather than via Array.prototype.at, which the ES2020
   * target of this project does not provide.
   */
  at(index: number): T | undefined {
    const resolved = index < 0 ? this.data.length + index : index;
    return resolved >= 0 && resolved < this.data.length ? this.data[resolved] : undefined;
  }

  /**
   * Array-compatible lastIndexOf method.
   */
  lastIndexOf(element: T): number {
    return this.data.lastIndexOf(element);
  }

  /**
   * Array-compatible flatMap method.
   */
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[], thisArg?: any): U[] {
    return this.data.flatMap((value, index) => callback.call(thisArg, value, index, this.data));
  }

  /**
   * Makes JSON.stringify(list) produce a plain array. Without this the internal
   * fields would be serialized, and `owner` would drag the whole model along.
   */
  toJSON(): T[] {
    return [...this.data];
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
    if (!this.owner || !feature) {
      return;
    }

    // Check if owner delivers notifications
    if ('eDeliver' in this.owner && !(this.owner as any).eDeliver()) {
      return;
    }

    // Check if owner has adapters
    if ('eAdapters' in this.owner) {
      const adapters = (this.owner as any).eAdapters();
      if (!adapters || adapters.length === 0) {
        return;
      }
    } else {
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

  /**
   * This list holds EClass.eStructuralFeatures, which every derived feature list
   * is assembled from, so each change has to invalidate those caches.
   */
  protected override dispatchNotification(
    eventType: NotificationEventType,
    oldValue: any,
    newValue: any,
    position: number
  ): void {
    bumpMetamodelRevision();
    super.dispatchNotification(eventType, oldValue, newValue, position);
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
 * Returns true for anything that holds a sequence of values - a plain array or
 * an EList. Use this instead of Array.isArray() wherever a multi-valued feature
 * value is accepted, since both shapes occur.
 */
export function isListValue<T>(value: any): value is T[] | EList<T> {
  return Array.isArray(value) || isEList<T>(value);
}

/**
 * Normalizes a multi-valued feature value to a plain array. Arrays are returned
 * as-is, ELists are copied out.
 */
export function toArray<T>(value: T[] | EList<T>): T[] {
  return Array.isArray(value) ? value : value.toArray();
}

/**
 * A read-only view on a computed list.
 *
 * Derived accessors such as getEAllStructuralFeatures() do not own their
 * contents - they assemble them from the class and its supertypes. Writing into
 * the result cannot have an effect, so every mutating operation throws instead
 * of failing silently. This mirrors EcoreEList.UnmodifiableEList in Java EMF,
 * where the same methods throw UnsupportedOperationException.
 *
 * The backing array is used directly rather than copied, so wrapping is cheap.
 */
export class UnmodifiableEList<T> extends BasicEList<T> {
  private readonly accessorName: string;

  /**
   * @param data the computed contents; used as backing store, not copied
   * @param accessorName name of the accessor, used in the error message
   */
  constructor(data: T[], accessorName: string) {
    super(null, null);
    this.data = data;
    this.accessorName = accessorName;
  }

  /**
   * Raises the error every mutating method funnels through.
   */
  private refuse(operation: string): never {
    throw new Error(
      `Cannot call ${operation}() on the result of ${this.accessorName}: ` +
      `it is a derived list and cannot be modified. ` +
      `Modify the owning list instead (e.g. getEStructuralFeatures()).`
    );
  }

  override set(_index: number, _element: T): T {
    this.refuse('set');
  }

  override add(_element: T): boolean {
    this.refuse('add');
  }

  override addAt(_index: number, _element: T): void {
    this.refuse('addAt');
  }

  override addAll(_elements: T[]): boolean {
    this.refuse('addAll');
  }

  override addAllAt(_index: number, _elements: T[]): boolean {
    this.refuse('addAllAt');
  }

  override remove(_element: T): boolean {
    this.refuse('remove');
  }

  override removeAt(_index: number): T {
    this.refuse('removeAt');
  }

  override clear(): void {
    this.refuse('clear');
  }

  override move(_toIndex: number, _fromIndex: number): T {
    this.refuse('move');
  }

  override push(..._items: T[]): number {
    this.refuse('push');
  }

  override pop(): T | undefined {
    this.refuse('pop');
  }

  override shift(): T | undefined {
    this.refuse('shift');
  }

  override unshift(..._items: T[]): number {
    this.refuse('unshift');
  }

  override splice(_start: number, _deleteCount?: number, ..._items: T[]): T[] {
    this.refuse('splice');
  }

  override sort(_compareFn?: (a: T, b: T) => number): this {
    // Sorting in place would modify the derived result; sort a copy instead.
    this.refuse('sort');
  }

  override reverse(): this {
    this.refuse('reverse');
  }
}

/**
 * Creates a read-only EList over a computed array, with index access.
 *
 * @param data the computed contents; used as backing store, not copied
 * @param accessorName name of the accessor, used in error messages
 */
export function createUnmodifiableEList<T>(data: T[], accessorName: string): EList<T> {
  return createIndexedProxy(new UnmodifiableEList<T>(data, accessorName));
}

/**
 * Counts structural changes to any metamodel element in this runtime.
 *
 * Derived lists (getEAllStructuralFeatures() and friends) are assembled from a
 * class and its supertypes, so a change anywhere up the hierarchy invalidates
 * them. Java EMF tracks this per class with ESuperAdapter, which maintains a
 * reverse registry of subclasses and pushes invalidation down. A single global
 * counter achieves the same correctness with an O(1) check and no bookkeeping:
 * a cached list is valid exactly while the counter has not moved.
 *
 * The trade-off is that a change to one class invalidates every cached list, not
 * only the affected ones. That matches the typical lifecycle - a model is loaded
 * and then read many times - and is never worse than recomputing on every call,
 * which is what happened before.
 */
let metamodelRevision = 0;

/**
 * Records a structural change. Called by the notifying lists below.
 */
export function bumpMetamodelRevision(): void {
  metamodelRevision++;
}

/**
 * The current revision, to be stored alongside a cached derived list.
 */
export function currentMetamodelRevision(): number {
  return metamodelRevision;
}

/**
 * Holds a derived list together with the revision it was computed at.
 */
export interface DerivedListCache<T> {
  revision: number;
  list: EList<T>;
}

/**
 * Returns the cached derived list, recomputing it when the metamodel changed.
 *
 * Keeping the wrapper (not just the array) in the cache also stabilizes object
 * identity across calls, matching Java EMF where repeated calls to a derived
 * accessor return the same list while the model is unchanged.
 *
 * @param cache holder to read and update; pass a per-object field
 * @param accessorName name of the accessor, used in error messages
 * @param compute builds the contents; only called when the cache is stale
 */
export function cachedDerivedList<T>(
  cache: { value: DerivedListCache<T> | null },
  accessorName: string,
  compute: () => T[]
): EList<T> {
  const revision = currentMetamodelRevision();
  if (cache.value !== null && cache.value.revision === revision) {
    return cache.value.list;
  }
  const list = createUnmodifiableEList(compute(), accessorName);
  cache.value = { revision, list };
  return list;
}

/**
 * A BasicEList that records a structural change on every mutation, so cached
 * derived lists notice. Every mutation funnels through dispatchNotification,
 * which is why overriding it alone is sufficient.
 *
 * The feature is resolved lazily: metamodel lists exist before the Ecore
 * package that describes them has finished bootstrapping.
 */
export class MetamodelEList<T> extends BasicEList<T> {
  private featureResolver: (() => EStructuralFeature | null) | null;

  constructor(owner: EObject | null, featureResolver?: () => EStructuralFeature | null) {
    super(owner, null);
    this.featureResolver = featureResolver ?? null;
  }

  override getFeature(): EStructuralFeature | null {
    if (this.feature === null && this.featureResolver !== null) {
      this.feature = this.featureResolver();
    }
    return this.feature;
  }

  protected override dispatchNotification(
    eventType: NotificationEventType,
    oldValue: any,
    newValue: any,
    position: number
  ): void {
    bumpMetamodelRevision();
    super.dispatchNotification(eventType, oldValue, newValue, position);
  }
}

/**
 * Creates a MetamodelEList with index access.
 */
export function createMetamodelEList<T>(
  owner: EObject | null,
  featureResolver?: () => EStructuralFeature | null
): EList<T> {
  return createIndexedProxy(new MetamodelEList<T>(owner, featureResolver));
}

/**
 * Wraps an EList with a Proxy to enable array-like index access (list[0], list[1], etc.)
 *
 * Every EList now installs this Proxy in its own constructor, so this function
 * is a no-op for lists created by this library and is kept for compatibility
 * with existing call sites. Lists that arrive unwrapped are still wrapped here.
 */
export function createIndexedProxy<T, L extends EList<T>>(list: L): L & { [index: number]: T } {
  if ((list as any)[IS_INDEXED]) {
    return list as L & { [index: number]: T };
  }
  return new Proxy(list, INDEX_ACCESS_HANDLER) as L & { [index: number]: T };
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
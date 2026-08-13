/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject.js';
import { EClass } from './EClass.js';
import { EStructuralFeature } from './EStructuralFeature.js';
import { EReference } from './EReference.js';
import { EList, EObjectContainmentEList, BasicEList, createIndexedProxy } from './EList.js';
import { DynamicEObject } from './runtime/BasicEObject.js';

/**
 * EMap interface - A map backed by an EList of entry EObjects.
 * Mirrors Java EMF's EMap<K,V> which extends EList<Map.Entry<K,V>>.
 *
 * The list contains EObject entries (e.g. EStringToStringMapEntry)
 * with 'key' and 'value' features, while the map methods provide
 * convenient key-based access.
 */
export interface EMap<K, V> extends EList<EObject> {
  getByKey(key: K): V | undefined;
  putByKey(key: K, value: V): V | undefined;
  removeByKey(key: K): V | undefined;
  containsKey(key: K): boolean;
  containsValue(value: V): boolean;
  keys(): K[];
  mapValues(): V[];
  toMap(): Map<K, V>;
}

/**
 * Containment list that notifies the owning EMap on add/remove
 * so it can update its key-based index.
 */
class EMapContainmentEList<K, V> extends EObjectContainmentEList<EObject> {
  private eMap: BasicEMap<K, V>;

  constructor(owner: EObject, feature: EReference, eMap: BasicEMap<K, V>) {
    super(owner, feature);
    this.eMap = eMap;
  }

  protected override didAdd(index: number, element: EObject): void {
    super.didAdd(index, element);
    this.eMap.entryAdded(element);
  }

  protected override didAddMany(index: number, elements: EObject[]): void {
    super.didAddMany(index, elements);
    for (const element of elements) {
      this.eMap.entryAdded(element);
    }
  }

  protected override didRemove(index: number, element: EObject): void {
    super.didRemove(index, element);
    this.eMap.entryRemoved(element);
  }

  protected override didClear(oldData: EObject[]): void {
    super.didClear(oldData);
    this.eMap.entriesCleared();
  }

  protected override didSet(index: number, newElement: EObject, oldElement: EObject): void {
    super.didSet(index, newElement, oldElement);
    this.eMap.entryRemoved(oldElement);
    this.eMap.entryAdded(newElement);
  }
}

/**
 * BasicEMap - EMap implementation that delegates to an EObjectContainmentEList.
 * Mirrors Java EMF's BasicEMap / EcoreEMap pattern.
 *
 * Entries are EObjects with 'key' and 'value' features (e.g. EStringToStringMapEntry).
 * The map index is maintained via didAdd/didRemove callbacks from the delegate list.
 */
export class BasicEMap<K, V> implements EMap<K, V> {
  [index: number]: EObject;

  private delegateList: EMapContainmentEList<K, V>;
  private mapIndex: Map<K, EObject> | null = null;
  private keyFeature: EStructuralFeature;
  private valueFeature: EStructuralFeature;
  private entryEClass: EClass;
  private _owner: EObject;

  constructor(owner: EObject, feature: EReference, entryEClass: EClass) {
    this._owner = owner;
    this.entryEClass = entryEClass;
    this.delegateList = new EMapContainmentEList(owner, feature, this);

    const keyF = entryEClass.getEStructuralFeature('key');
    const valueF = entryEClass.getEStructuralFeature('value');
    if (!keyF || !valueF) {
      throw new Error(`Entry EClass '${entryEClass.getName()}' must have 'key' and 'value' features`);
    }
    this.keyFeature = keyF;
    this.valueFeature = valueF;

    // Same index-access contract as every other EList, see BasicEList.
    return createIndexedProxy<EObject, BasicEMap<K, V>>(this) as BasicEMap<K, V>;
  }

  /**
   * Rebuild map index from the delegate list contents.
   * Entries may have been added before their key/value were set (e.g. by XMI loader),
   * so we rebuild on every map-method access.
   */
  private ensureIndex(): Map<K, EObject> {
    if (this.mapIndex === null) {
      this.mapIndex = new Map();
    }
    // Always rebuild — entries may have had keys set after being added
    this.mapIndex.clear();
    for (let i = 0; i < this.delegateList.size(); i++) {
      const entry = this.delegateList.get(i);
      const key = entry.eGet(this.keyFeature) as K;
      if (key != null) {
        this.mapIndex.set(key, entry);
      }
    }
    return this.mapIndex;
  }

  // ===== Map methods =====

  getByKey(key: K): V | undefined {
    const index = this.ensureIndex();
    const entry = index.get(key);
    if (!entry) return undefined;
    return entry.eGet(this.valueFeature) as V;
  }

  putByKey(key: K, value: V): V | undefined {
    const index = this.ensureIndex();
    const existing = index.get(key);
    if (existing) {
      const oldValue = existing.eGet(this.valueFeature) as V;
      existing.eSet(this.valueFeature, value);
      return oldValue;
    }
    // Create a new entry EObject
    const pkg = this.entryEClass.getEPackage();
    let entry: EObject;
    if (pkg && pkg.getEFactoryInstance()) {
      entry = pkg.getEFactoryInstance()!.create(this.entryEClass);
    } else {
      entry = new DynamicEObject(this.entryEClass);
    }
    entry.eSet(this.keyFeature, key);
    entry.eSet(this.valueFeature, value);
    this.delegateList.add(entry);
    return undefined;
  }

  removeByKey(key: K): V | undefined {
    const index = this.ensureIndex();
    const entry = index.get(key);
    if (!entry) return undefined;
    const oldValue = entry.eGet(this.valueFeature) as V;
    this.delegateList.remove(entry);
    return oldValue;
  }

  containsKey(key: K): boolean {
    return this.ensureIndex().has(key);
  }

  containsValue(value: V): boolean {
    for (const entry of this.ensureIndex().values()) {
      if (entry.eGet(this.valueFeature) === value) {
        return true;
      }
    }
    return false;
  }

  keys(): K[] {
    return Array.from(this.ensureIndex().keys());
  }

  mapValues(): V[] {
    const result: V[] = [];
    for (const entry of this.ensureIndex().values()) {
      result.push(entry.eGet(this.valueFeature) as V);
    }
    return result;
  }

  toMap(): Map<K, V> {
    const result = new Map<K, V>();
    for (const [key, entry] of this.ensureIndex()) {
      result.set(key, entry.eGet(this.valueFeature) as V);
    }
    return result;
  }

  // ===== Index management callbacks (called by EMapContainmentEList) =====

  entryAdded(entry: EObject): void {
    // Invalidate index — entry may not have key set yet
    this.mapIndex = null;
  }

  entryRemoved(entry: EObject): void {
    this.mapIndex = null;
  }

  entriesCleared(): void {
    this.mapIndex = null;
  }

  // ===== EList delegation =====

  size(): number { return this.delegateList.size(); }
  get length(): number { return this.delegateList.length; }
  isEmpty(): boolean { return this.delegateList.isEmpty(); }
  contains(element: EObject): boolean { return this.delegateList.contains(element); }
  indexOf(element: EObject): number { return this.delegateList.indexOf(element); }
  get(index: number): EObject { return this.delegateList.get(index); }
  set(index: number, element: EObject): EObject { return this.delegateList.set(index, element); }
  add(element: EObject): boolean { return this.delegateList.add(element); }
  addAt(index: number, element: EObject): void { this.delegateList.addAt(index, element); }
  addAll(elements: EObject[]): boolean { return this.delegateList.addAll(elements); }
  addAllAt(index: number, elements: EObject[]): boolean { return this.delegateList.addAllAt(index, elements); }
  remove(element: EObject): boolean { return this.delegateList.remove(element); }
  removeAt(index: number): EObject { return this.delegateList.removeAt(index); }
  clear(): void { this.delegateList.clear(); }
  move(toIndex: number, fromIndex: number): EObject { return this.delegateList.move(toIndex, fromIndex); }
  toArray(): EObject[] { return this.delegateList.toArray(); }
  [Symbol.iterator](): Iterator<EObject> { return this.delegateList[Symbol.iterator](); }

  push(...items: EObject[]): number { return this.delegateList.push(...items); }
  filter(callback: (value: EObject, index: number, array: EObject[]) => boolean, thisArg?: any): EObject[] {
    return this.delegateList.filter(callback, thisArg);
  }
  map<U>(callback: (value: EObject, index: number, array: EObject[]) => U, thisArg?: any): U[] {
    return this.delegateList.map(callback, thisArg);
  }
  forEach(callback: (value: EObject, index: number, array: EObject[]) => void, thisArg?: any): void {
    this.delegateList.forEach(callback, thisArg);
  }
  find(callback: (value: EObject, index: number, array: EObject[]) => boolean, thisArg?: any): EObject | undefined {
    return this.delegateList.find(callback, thisArg);
  }
  findIndex(callback: (value: EObject, index: number, array: EObject[]) => boolean, thisArg?: any): number {
    return this.delegateList.findIndex(callback, thisArg);
  }
  some(callback: (value: EObject, index: number, array: EObject[]) => boolean, thisArg?: any): boolean {
    return this.delegateList.some(callback, thisArg);
  }
  every(callback: (value: EObject, index: number, array: EObject[]) => boolean, thisArg?: any): boolean {
    return this.delegateList.every(callback, thisArg);
  }
  includes(element: EObject): boolean { return this.delegateList.includes(element); }
  slice(start?: number, end?: number): EObject[] { return this.delegateList.slice(start, end); }
  concat(...items: (EObject | EObject[] | EList<EObject>)[]): EObject[] { return this.delegateList.concat(...items); }
  sort(compareFn?: (a: EObject, b: EObject) => number): this { this.delegateList.sort(compareFn); return this; }
  reverse(): this { this.delegateList.reverse(); return this; }
  join(separator?: string): string { return this.delegateList.join(separator); }
  at(index: number): EObject | undefined { return this.delegateList.at(index); }
  lastIndexOf(element: EObject): number { return this.delegateList.lastIndexOf(element); }
  flatMap<U>(callback: (value: EObject, index: number, array: EObject[]) => U | U[], thisArg?: any): U[] {
    return this.delegateList.flatMap(callback, thisArg);
  }
  toJSON(): EObject[] { return this.delegateList.toJSON(); }
}

/**
 * Creates an EMap with array-like index access.
 *
 * BasicEMap installs the index-access Proxy in its own constructor, so this is
 * a plain factory now; it is kept because it is the documented way to obtain an
 * EMap.
 */
export function createEMap<K, V>(
  owner: EObject,
  feature: EReference,
  entryEClass: EClass
): EMap<K, V> & { [index: number]: EObject } {
  return new BasicEMap<K, V>(owner, feature, entryEClass) as EMap<K, V> & { [index: number]: EObject };
}

/**
 * Type guard for EMap
 */
export function isEMap<K = any, V = any>(obj: any): obj is EMap<K, V> {
  return !!obj &&
    typeof obj.getByKey === 'function' &&
    typeof obj.putByKey === 'function' &&
    typeof obj.size === 'function' &&
    typeof obj.add === 'function';
}

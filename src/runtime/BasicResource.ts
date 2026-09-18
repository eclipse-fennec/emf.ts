/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Resource } from '../Resource.js';
import { ResourceSet } from '../ResourceSet.js';
import { URI } from '../URI.js';
import { EObject } from '../EObject.js';
import { Notifier } from '../notify/Notifier.js';
import { Adapter } from '../notify/Adapter.js';
import { Notification } from '../notify/Notification.js';
import { EReference } from '../EReference.js';
import { EList, isEList, createResourceContentsEList } from '../EList.js';

/**
 * Whether the object is an Ecore metamodel element, i.e. an EModelElement.
 * Checked structurally, so no part of the Ecore bootstrap is needed to answer it.
 */
function isEModelElement(obj: unknown): boolean {
  return typeof (obj as any)?.getEAnnotations === 'function';
}

/**
 * The name Ecore addresses a child by: an ENamedElement by its name, an
 * EAnnotation by its source. Null for anything else, which keeps the
 * `@feature.index` form.
 */
function namedSegmentKey(obj: unknown): string | null {
  const candidate = obj as any;
  if (typeof candidate?.getName === 'function') {
    return candidate.getName() ?? '';
  }
  if (typeof candidate?.getSource === 'function') {
    return candidate.getSource() ?? '';
  }
  return null;
}

/**
 * The characters BasicEObjectImpl.eEncodeValue() escapes in a fragment
 * segment, plus everything below U+0020.
 */
const FRAGMENT_ESCAPES = new Set([' ', '"', '#', '%', '&', "'", ',', '/', ':', '<', '>']);

function encodeFragmentSegment(value: string): string {
  let result = '';
  for (const character of value) {
    const code = character.codePointAt(0)!;
    result +=
      code < 0x20 || FRAGMENT_ESCAPES.has(character)
        ? `%${code.toString(16).toUpperCase().padStart(2, '0')}`
        : character;
  }
  return result;
}

/**
 * Basic Resource implementation
 * Implements Notifier interface to support EContentAdapter and change notifications.
 */
export class BasicResource implements Resource, Notifier {
  private uri: URI | null;
  private resourceSet: ResourceSet | null = null;
  private contents: EList<EObject>;
  private loaded: boolean = false;
  private modified: boolean = false;
  private errors: Array<{ message: string; location?: string; line?: number; column?: number }> = [];
  private warnings: Array<{ message: string; location?: string; line?: number; column?: number }> = [];

  // Notifier interface fields
  private _eAdapters: Adapter[] = [];
  private _eDeliver: boolean = true;

  constructor(uri?: URI) {
    this.uri = uri || null;
    this.contents = createResourceContentsEList(this);
  }

  // ===== Notifier interface implementation =====

  /**
   * Returns the list of adapters associated with this resource.
   */
  eAdapters(): Adapter[] {
    return this._eAdapters;
  }

  /**
   * Returns whether this resource will deliver notifications to adapters.
   */
  eDeliver(): boolean {
    return this._eDeliver;
  }

  /**
   * Sets whether this resource will deliver notifications to adapters.
   */
  eSetDeliver(deliver: boolean): void {
    this._eDeliver = deliver;
  }

  /**
   * Notifies all adapters of a change.
   */
  eNotify(notification: Notification): void {
    if (this._eDeliver && this._eAdapters.length > 0) {
      for (const adapter of this._eAdapters) {
        adapter.notifyChanged(notification);
      }
    }
  }

  getResourceSet(): ResourceSet | null {
    return this.resourceSet;
  }

  setResourceSet(resourceSet: ResourceSet | null): void {
    this.resourceSet = resourceSet;
  }

  getURI(): URI | null {
    return this.uri;
  }

  setURI(uri: URI | null): void {
    this.uri = uri;
  }

  getContents(): EList<EObject> {
    return this.contents;
  }

  getAllContents(): IterableIterator<EObject> {
    const allContents: EObject[] = [...this.contents];

    // Add all descendants
    for (const root of this.contents) {
      const iterator = root.eAllContents();
      let result = iterator.next();
      while (!result.done) {
        allContents.push(result.value);
        result = iterator.next();
      }
    }

    return allContents[Symbol.iterator]();
  }

  getEObject(uriFragment: string): EObject | null {
    // Simple fragment handling
    if (uriFragment.startsWith('/')) {
      // XPath-like fragment (e.g., //EString or /0/eClassifiers/EString)
      // Split the fragment - keep empty strings to detect leading '//'
      const allParts = uriFragment.split('/');

      // Check if this is a '//' fragment (e.g., //SortOrder)
      // In this case allParts would be ['', '', 'SortOrder']
      const isDoubleSlash = allParts.length >= 2 && allParts[0] === '' && allParts[1] === '';

      const parts = allParts.filter(p => p.length > 0);

      if (parts.length === 0) {
        // Just '/' or '//' - return root
        return this.contents.size() > 0 ? this.contents.get(0) : null;
      }

      let current: EObject | null = null;
      let startIndex = 0;

      if (isDoubleSlash) {
        // For '//' fragments: start with root object
        current = this.contents.size() > 0 ? this.contents.get(0) : null;
        if (!current) {
          return null;
        }
        // Handle @feature.index on root object, or search by name
        if (parts[0].startsWith('@')) {
          current = this.eObjectForURIFragmentSegment(current, parts[0]);
        } else {
          current = this.findByNameInContents(current, parts[0]);
        }
        startIndex = 1;

        if (!current) {
          return null;
        }
      }

      for (let i = startIndex; i < parts.length; i++) {
        const part = parts[i];
        const index = parseInt(part, 10);

        if (current === null) {
          // Root level - try index first, then name
          if (!isNaN(index)) {
            current = index < this.contents.size() ? this.contents.get(index) : null;
          } else {
            // Try to find by name in root contents, or search in first root's eContents
            current = this.findByName(this.contents.toArray(), part);
            if (!current && this.contents.size() > 0) {
              // Fallback: search in root object's eContents (for named elements like EClassifiers)
              current = this.findByNameInContents(this.contents.get(0), part);
            }
          }
        } else {
          // Child level - navigate by index or name
          if (!isNaN(index)) {
            const children: EObject[] = current.eContents();
            current = children[index] || null;
          } else {
            // Try to find by name or feature navigation
            current = this.navigateByNameOrFeature(current, part);
          }
        }

        if (!current) {
          return null;
        }
      }

      return current;
    }

    // ID-based fragment
    return this.getEObjectByID(uriFragment);
  }

  /**
   * Find a named element in an object's eContents().
   * This is used for EMF-style fragment navigation like //SortOrder
   * which searches for named elements within a container (e.g., EPackage's eClassifiers).
   */
  private findByNameInContents(container: EObject, name: string): EObject | null {
    const contents = container.eContents();
    return this.findByName(contents, name);
  }

  /**
   * Find an object by name in a list of objects.
   * Looks for 'name' via:
   * 1. getName() method (for static typed objects)
   * 2. eGet(nameFeature) (for dynamic objects loaded from XMI)
   * 3. Direct name property
   */
  private findByName(objects: EObject[], name: string): EObject | null {
    for (const obj of objects) {
      // Try getName() method first (for static typed objects like BasicEClass)
      if ('getName' in obj && typeof (obj as any).getName === 'function') {
        if ((obj as any).getName() === name) {
          return obj;
        }
      }

      // Try eGet with name feature (for dynamic objects loaded from XMI)
      try {
        const eClass = obj.eClass();
        if (eClass) {
          const nameFeature = eClass.getEStructuralFeature('name');
          if (nameFeature) {
            const nameValue = obj.eGet(nameFeature);
            if (nameValue === name) {
              return obj;
            }
          }
        }
      } catch {
        // Ignore errors and try other methods
      }

      // Try direct name property
      if ('name' in obj && (obj as any).name === name) {
        return obj;
      }
    }
    return null;
  }

  /**
   * Navigate from an object to a child by name or feature.
   */
  private navigateByNameOrFeature(obj: EObject, nameOrFeature: string): EObject | null {
    // Handle EMF @feature.index format (e.g., @ownedElement.5, @eClassifiers.0)
    if (nameOrFeature.startsWith('@')) {
      return this.eObjectForURIFragmentSegment(obj, nameOrFeature);
    }

    // First try to find in direct contents by name
    const contents = obj.eContents();
    const byName = this.findByName(contents, nameOrFeature);
    if (byName) {
      return byName;
    }

    // Try to get feature value by name
    const eClass = obj.eClass();
    const feature = eClass.getEStructuralFeature(nameOrFeature);
    if (feature) {
      const value = obj.eGet(feature);
      if (value && typeof value === 'object' && 'eClass' in value) {
        return value as EObject;
      }
      if (Array.isArray(value) && value.length > 0) {
        return value[0] as EObject;
      }
    }

    return null;
  }

  /**
   * Resolve a @feature.index URI fragment segment (Java EMF format).
   * Formats:
   * - @featureName.index → eGet(feature)[index] (multi-valued)
   * - @featureName → eGet(feature) (single-valued)
   */
  private eObjectForURIFragmentSegment(obj: EObject, segment: string): EObject | null {
    // Strip leading @
    const body = segment.substring(1);
    const eClass = obj.eClass();

    const lastChar = body.charAt(body.length - 1);
    let featureName: string;
    let index = -1;

    // If last char is a digit, look for .index suffix
    if (lastChar >= '0' && lastChar <= '9') {
      const dotIndex = body.lastIndexOf('.');
      if (dotIndex > 0) {
        const possibleIndex = parseInt(body.substring(dotIndex + 1), 10);
        if (!isNaN(possibleIndex)) {
          featureName = body.substring(0, dotIndex);
          index = possibleIndex;
        } else {
          featureName = body;
        }
      } else {
        featureName = body;
      }
    } else {
      featureName = body;
    }

    const feature = eClass.getEStructuralFeature(featureName);
    if (!feature) return null;

    const value = obj.eGet(feature);
    if (value === null || value === undefined) return null;

    if (index >= 0) {
      // Multi-valued: access by index
      if (Array.isArray(value)) {
        return (value[index] as EObject) ?? null;
      }
      if (typeof value === 'object' && 'get' in value && typeof (value as any).get === 'function') {
        return ((value as any).get(index) as EObject) ?? null;
      }
      return null;
    }

    // Single-valued
    if (typeof value === 'object' && 'eClass' in value) {
      return value as EObject;
    }
    return null;
  }

  /**
   * Returns the path fragment identifying the object inside this resource.
   *
   * The format is the one EMF defines: the root index, then one segment per
   * containment step naming the feature - `@<feature>.<index>` for a
   * multi-valued containment and `@<feature>` for a single-valued one:
   *
   *     /1/@operations.0/@parameters.0
   *
   * A bare index path such as `/1/0` cannot be resolved by Java EMF, whose
   * eObjectForURIFragmentSegment() requires the `@` form, and it is ambiguous
   * anyway: the index would have to count across all containment children
   * rather than within one feature, so two features on the same class would
   * collide (#89).
   */
  getURIFragment(eObject: EObject): string {
    const segments: string[] = [];
    let current: EObject | null = eObject;

    while (current) {
      const container: EObject | null = current.eContainer();
      if (!container) {
        segments.unshift(this.uriFragmentRootSegment(current));
        break;
      }

      segments.unshift(this.uriFragmentSegment(container, current));
      current = container;
    }

    return '/' + segments.join('/');
  }

  /**
   * The segment addressing a root object.
   *
   * Empty where the resource holds a single root, which is why EMF writes
   * `//@exceptions.0` rather than `/0/@exceptions.0` - the form its own files
   * carry. ResourceImpl.getURIFragmentRootSegment() does the same.
   */
  protected uriFragmentRootSegment(eObject: EObject): string {
    if (this.contents.size() === 1) {
      return '';
    }
    const index = this.contents.indexOf(eObject);
    return index >= 0 ? String(index) : '';
  }

  /**
   * Builds one `@feature`/`@feature.index` segment for a child of the container.
   *
   * Falls back to the position among all containment children when the feature
   * cannot be determined, which keeps a fragment for objects whose container
   * was set without one - unresolvable by EMF, but no worse than before.
   */
  private uriFragmentSegment(container: EObject, child: EObject): string {
    const named = this.namedSegment(container, child);
    if (named !== null) {
      return named;
    }

    const feature = this.containmentFeatureOf(container, child);
    if (!feature) {
      return String(container.eContents().indexOf(child));
    }

    const name = feature.getName();
    if (!feature.isMany()) {
      return `@${name}`;
    }

    // The index counts within this feature, not across all children.
    const value = container.eGet(feature);
    const index = isEList(value) ? value.indexOf(child) : (value as EObject[]).indexOf(child);
    return `@${name}.${index}`;
  }

  /**
   * The segment for a child of a metamodel element, which Ecore addresses by
   * name rather than by feature and index: `#//ServiceRegistration/reference`,
   * not `#//@eClassifiers.3/@eStructuralFeatures.1`.
   *
   * EModelElementImpl.eURIFragmentSegment() does this for every ENamedElement
   * and, by its source, for every EAnnotation, appending `.n` where an earlier
   * sibling carries the same name. Returns null where the rule does not apply,
   * leaving the `@feature.index` form to the caller.
   */
  private namedSegment(container: EObject, child: EObject): string | null {
    if (!isEModelElement(container)) {
      return null;
    }

    const key = namedSegmentKey(child);
    if (key === null) {
      return null;
    }

    // Java counts earlier siblings that carry the same key.
    let count = 0;
    for (const sibling of container.eContents()) {
      if (sibling === child) {
        break;
      }
      if (namedSegmentKey(sibling) === key) {
        count++;
      }
    }

    const encoded = key === '' ? '%' : encodeFragmentSegment(key);
    return count > 0 ? `${encoded}.${count}` : encoded;
  }

  /**
   * The containment reference holding the child.
   *
   * Normally recorded on the child when the containment list set its container;
   * otherwise the container's containment references are searched.
   */
  private containmentFeatureOf(container: EObject, child: EObject): EReference | null {
    const recorded = child.eContainmentFeature?.();
    if (recorded) {
      return recorded;
    }

    for (const reference of container.eClass().getEAllContainments()) {
      const value = container.eGet(reference);
      if (value === null || value === undefined) {
        continue;
      }
      if (reference.isMany()) {
        const contains = isEList(value) ? value.contains(child) : (value as EObject[]).includes(child);
        if (contains) {
          return reference;
        }
      } else if (value === child) {
        return reference;
      }
    }

    return null;
  }

  async save(options?: Map<string, any>): Promise<void> {
    this.errors = [];
    this.warnings = [];

    try {
      // Serialize to JSON (simple implementation)
      const data = this.serialize();

      // Would write to file/network here

      this.modified = false;
    } catch (err) {
      this.errors.push({
        message: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }

  async load(options?: Map<string, any>): Promise<void> {
    this.errors = [];
    this.warnings = [];

    try {
      // Would load from file/network here

      // For now, just mark as loaded
      this.loaded = true;
    } catch (err) {
      this.errors.push({
        message: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  unload(): void {
    this.contents.clear();
    this.loaded = false;
    this.modified = false;
    this.errors = [];
    this.warnings = [];
  }

  isModified(): boolean {
    return this.modified;
  }

  setModified(isModified: boolean): void {
    this.modified = isModified;
  }

  getErrors(): Array<{ message: string; location?: string; line?: number; column?: number }> {
    return this.errors;
  }

  getWarnings(): Array<{ message: string; location?: string; line?: number; column?: number }> {
    return this.warnings;
  }

  /**
   * Helper to find object by ID attribute
   */
  private getEObjectByID(id: string): EObject | null {
    const iterator = this.getAllContents();
    let result = iterator.next();

    while (!result.done) {
      const obj = result.value;
      const eClass = obj.eClass();
      const idAttr = eClass.getEIDAttribute();

      if (idAttr) {
        const value = obj.eGet(idAttr);
        if (value === id) {
          return obj;
        }
      }

      result = iterator.next();
    }

    return null;
  }

  /**
   * Simple JSON serialization
   */
  private serialize(): any {
    return {
      uri: this.uri?.toString(),
      contents: this.contents.toArray().map(obj => this.serializeObject(obj))
    };
  }

  private serializeObject(obj: EObject): any {
    const eClass = obj.eClass();
    const data: any = {
      eClass: eClass.getName()
    };

    // Serialize all features
    for (const feature of eClass.getEAllStructuralFeatures()) {
      if (feature.isTransient()) continue;

      const value = obj.eGet(feature);
      if (value !== null && value !== undefined) {
        if (feature.isMany() && Array.isArray(value)) {
          data[feature.getName()!] = value.map(v =>
            typeof v === 'object' && 'eClass' in v
              ? this.serializeObject(v)
              : v
          );
        } else {
          data[feature.getName()!] = typeof value === 'object' && 'eClass' in value
            ? this.serializeObject(value)
            : value;
        }
      }
    }

    return data;
  }
}

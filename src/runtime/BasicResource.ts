/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Resource } from '../Resource';
import { ResourceSet } from '../ResourceSet';
import { URI } from '../URI';
import { EObject } from '../EObject';

/**
 * Creates a resource-aware contents list that tracks resource relationships
 */
function createResourceContentsList(resource: Resource): EObject[] {
  const list: EObject[] = [];

  return new Proxy(list, {
    get(target, prop, receiver) {
      if (prop === 'push') {
        return (...items: EObject[]) => {
          for (const item of items) {
            if ('eSetResource' in item) {
              (item as any).eSetResource(resource);
            }
            target.push(item);
          }
          return target.length;
        };
      }
      if (prop === 'splice') {
        return (start: number, deleteCount?: number, ...items: EObject[]) => {
          // Handle removed items
          const removed = target.slice(start, deleteCount !== undefined ? start + deleteCount : undefined);
          for (const item of removed) {
            if ('eSetResource' in item) {
              (item as any).eSetResource(null);
            }
          }
          // Handle added items
          for (const item of items) {
            if ('eSetResource' in item) {
              (item as any).eSetResource(resource);
            }
          }
          return target.splice(start, deleteCount ?? target.length, ...items);
        };
      }
      if (prop === 'pop') {
        return () => {
          const item = target.pop();
          if (item && 'eSetResource' in item) {
            (item as any).eSetResource(null);
          }
          return item;
        };
      }
      if (prop === 'shift') {
        return () => {
          const item = target.shift();
          if (item && 'eSetResource' in item) {
            (item as any).eSetResource(null);
          }
          return item;
        };
      }
      if (prop === 'unshift') {
        return (...items: EObject[]) => {
          for (const item of items) {
            if ('eSetResource' in item) {
              (item as any).eSetResource(resource);
            }
          }
          return target.unshift(...items);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const index = Number(prop);
      if (!isNaN(index)) {
        const oldItem = target[index];
        if (oldItem && 'eSetResource' in oldItem) {
          (oldItem as any).eSetResource(null);
        }
        if (value && 'eSetResource' in value) {
          (value as any).eSetResource(resource);
        }
      }
      return Reflect.set(target, prop, value, receiver);
    }
  });
}

/**
 * Basic Resource implementation
 */
export class BasicResource implements Resource {
  private uri: URI | null;
  private resourceSet: ResourceSet | null = null;
  private contents: EObject[];
  private loaded: boolean = false;
  private modified: boolean = false;
  private errors: Array<{ message: string; location?: string; line?: number; column?: number }> = [];
  private warnings: Array<{ message: string; location?: string; line?: number; column?: number }> = [];

  constructor(uri?: URI) {
    this.uri = uri || null;
    this.contents = createResourceContentsList(this);
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

  getContents(): EObject[] {
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
        return this.contents[0] || null;
      }

      let current: EObject | null = null;
      let startIndex = 0;

      if (isDoubleSlash) {
        // For '//Name' fragments: start with root object and search in its contents
        // This is how EMF handles named element navigation (like //SortOrder in an EPackage)
        current = this.contents[0] || null;
        if (!current) {
          return null;
        }
        // Now search for the first part in the root's eContents()
        current = this.findByNameInContents(current, parts[0]);
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
            current = this.contents[index] || null;
          } else {
            // Try to find by name in root contents, or search in first root's eContents
            current = this.findByName(this.contents, part);
            if (!current && this.contents.length > 0) {
              // Fallback: search in root object's eContents (for named elements like EClassifiers)
              current = this.findByNameInContents(this.contents[0], part);
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

  getURIFragment(eObject: EObject): string {
    // Find position in tree
    const path: number[] = [];
    let current: EObject | null = eObject;

    while (current) {
      const container = current.eContainer();
      if (!container) {
        // Root object
        const index = this.contents.indexOf(current);
        if (index >= 0) {
          path.unshift(index);
        }
        break;
      }

      // Find index in parent's contents
      const siblings = container.eContents();
      const index = siblings.indexOf(current);
      if (index >= 0) {
        path.unshift(index);
      }

      current = container;
    }

    return '/' + path.join('/');
  }

  async save(options?: Map<string, any>): Promise<void> {
    this.errors = [];
    this.warnings = [];

    try {
      // Serialize to JSON (simple implementation)
      const data = this.serialize();

      // Would write to file/network here
      console.log('[Resource] Saved:', this.uri?.toString(), data);

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
      console.log('[Resource] Loading:', this.uri?.toString());

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
    this.contents = [];
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
      contents: this.contents.map(obj => this.serializeObject(obj))
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

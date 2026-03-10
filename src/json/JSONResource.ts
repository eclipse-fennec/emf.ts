/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { BasicResource } from '../runtime/BasicResource';
import { URI } from '../URI';
import { EObject } from '../EObject';
import { Resource } from '../Resource';
import { JSONLoad } from './JSONLoad';
import { JSONSave } from './JSONSave';

/**
 * JSONResource - A resource that loads/saves in emfjson-compatible JSON format.
 *
 * Analogous to XMLResource, but uses JSON instead of XML/XMI.
 *
 * Format example:
 * ```json
 * {
 *   "eClass": "http://example.org/pkg#//MyClass",
 *   "name": "example",
 *   "children": [{ "eClass": "http://example.org/pkg#//Child", "value": 42 }],
 *   "ref": { "$ref": "other.json#//SomeObject" }
 * }
 * ```
 */
export class JSONResource extends BasicResource {
  protected idToEObjectMap: Map<string, EObject> = new Map();
  protected eObjectToIDMap: Map<EObject, string> = new Map();

  constructor(uri?: URI) {
    super(uri);
  }

  /**
   * Get EObject by ID or path fragment.
   */
  getEObject(uriFragment: string): EObject | null {
    const byId = this.idToEObjectMap.get(uriFragment);
    if (byId) {
      return byId;
    }
    return super.getEObject(uriFragment);
  }

  /**
   * Get URI fragment for an object.
   */
  getURIFragment(eObject: EObject): string {
    const id = this.eObjectToIDMap.get(eObject);
    if (id) {
      return id;
    }
    return super.getURIFragment(eObject);
  }

  /**
   * Set ID for an object.
   */
  setID(eObject: EObject, id: string): void {
    if (id) {
      this.idToEObjectMap.set(id, eObject);
      this.eObjectToIDMap.set(eObject, id);
    }
  }

  /**
   * Get ID for an object.
   */
  getID(eObject: EObject): string | null {
    return this.eObjectToIDMap.get(eObject) ?? null;
  }

  protected clearIdMaps(): void {
    this.idToEObjectMap.clear();
    this.eObjectToIDMap.clear();
  }

  /**
   * Load from a JSON string.
   */
  loadFromString(jsonString: string, options?: Map<string, any>): void {
    this.clearIdMaps();
    const opts = options || new Map();
    const loader = this.createJSONLoad();
    loader.load(this, jsonString, opts);

    // Transfer errors
    const loaderErrors = loader.getErrors();
    if (loaderErrors.length > 0) {
      const resourceErrors = this.getErrors();
      for (const err of loaderErrors) {
        resourceErrors.push({ message: err.message });
      }
    }

    (this as any).loaded = true;
  }

  /**
   * Save to a JSON string.
   */
  saveToString(options?: Map<string, any>): string {
    const opts = options || new Map();
    const saver = this.createJSONSave();
    return saver.save(this, opts);
  }

  /**
   * Create the JSON loader.
   */
  protected createJSONLoad(): JSONLoad {
    return new JSONLoad();
  }

  /**
   * Create the JSON saver.
   */
  protected createJSONSave(): JSONSave {
    return new JSONSave();
  }

  /**
   * Unload resource.
   */
  unload(): void {
    super.unload();
    this.clearIdMaps();
  }
}

/**
 * Factory for creating JSONResource instances.
 */
export class JSONResourceFactory implements Resource.Factory {
  createResource(uri: URI): JSONResource {
    return new JSONResource(uri);
  }
}

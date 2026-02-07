/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from './EObject';
import { ResourceSet } from './ResourceSet';
import { URI } from './URI';
import { EList } from './EList';

/**
 * A persistent document. A resource is typically contained by a resource set.
 */
export interface Resource {
  /**
   * Returns the resource set, or null.
   */
  getResourceSet(): ResourceSet | null;

  /**
   * Returns the URI.
   */
  getURI(): URI | null;

  /**
   * Sets the URI.
   */
  setURI(uri: URI | null): void;

  /**
   * Returns the list of root objects.
   */
  getContents(): EList<EObject>;

  /**
   * Returns an iterator over all contents.
   */
  getAllContents(): IterableIterator<EObject>;

  /**
   * Returns the EObject at the given URI fragment, or null.
   */
  getEObject(uriFragment: string): EObject | null;

  /**
   * Returns the URI fragment for the given object.
   */
  getURIFragment(eObject: EObject): string;

  /**
   * Saves the resource with the given options.
   */
  save(options?: Map<string, any>): Promise<void>;

  /**
   * Loads the resource with the given options.
   */
  load(options?: Map<string, any>): Promise<void>;

  /**
   * Loads from a string (for XML/XMI resources).
   * Optional method - not all resources support this.
   */
  loadFromString?(xmlString: string, options?: Map<string, any>): void;

  /**
   * Returns whether the resource is loaded.
   */
  isLoaded(): boolean;

  /**
   * Unloads the resource.
   */
  unload(): void;

  /**
   * Returns whether the resource is modified.
   */
  isModified(): boolean;

  /**
   * Sets whether the resource is modified.
   */
  setModified(isModified: boolean): void;

  /**
   * Returns the list of errors encountered during load/save.
   */
  getErrors(): Array<{ message: string; location?: string; line?: number; column?: number }>;

  /**
   * Returns the list of warnings encountered during load/save.
   */
  getWarnings(): Array<{ message: string; location?: string; line?: number; column?: number }>;
}

/**
 * Resource factory for creating resources.
 */
export namespace Resource {
  export interface Factory {
    /**
     * Creates a resource with the given URI.
     */
    createResource(uri: URI): Resource;
  }

  /**
   * Registry for resource factories.
   */
  export interface FactoryRegistry {
    /**
     * Returns the factory for the given protocol scheme.
     */
    getFactory(uri: URI): Factory | null;

    /**
     * Map from file extension to factory.
     */
    getExtensionToFactoryMap(): Map<string, Factory>;

    /**
     * Map from protocol scheme to factory.
     */
    getProtocolToFactoryMap(): Map<string, Factory>;

    /**
     * Map from content type to factory.
     */
    getContentTypeToFactoryMap(): Map<string, Factory>;
  }

  /**
   * Global factory registry instance.
   */
  export const INSTANCE_FACTORY_REGISTRY: FactoryRegistry = createGlobalFactoryRegistry();
}

function createGlobalFactoryRegistry(): Resource.FactoryRegistry {
  const extensionMap = new Map<string, Resource.Factory>();
  const protocolMap = new Map<string, Resource.Factory>();
  const contentTypeMap = new Map<string, Resource.Factory>();

  return {
    getFactory(uri: URI): Resource.Factory | null {
      const protocol = uri.scheme();
      if (protocol && protocolMap.has(protocol)) {
        return protocolMap.get(protocol)!;
      }

      const extension = uri.fileExtension();
      if (extension && extensionMap.has(extension)) {
        return extensionMap.get(extension)!;
      }

      return null;
    },

    getExtensionToFactoryMap() {
      return extensionMap;
    },

    getProtocolToFactoryMap() {
      return protocolMap;
    },

    getContentTypeToFactoryMap() {
      return contentTypeMap;
    }
  };
}

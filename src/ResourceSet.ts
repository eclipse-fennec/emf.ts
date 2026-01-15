/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Resource } from './Resource';
import { URI } from './URI';
import { EObject } from './EObject';
import { EPackageRegistry } from './EPackage';

/**
 * A collection of related persistent documents.
 */
export interface ResourceSet {
  /**
   * Returns the list of resources.
   */
  getResources(): Resource[];

  /**
   * Returns the resource with the given URI, loading it if necessary.
   */
  getResource(uri: URI, loadOnDemand: boolean): Resource | null;

  /**
   * Creates a resource with the given URI.
   */
  createResource(uri: URI): Resource;

  /**
   * Returns the EObject at the given URI.
   */
  getEObject(uri: URI, loadOnDemand: boolean): EObject | null;

  /**
   * Returns the package registry for this resource set.
   */
  getPackageRegistry(): EPackageRegistry;

  /**
   * Sets the package registry.
   */
  setPackageRegistry(registry: EPackageRegistry): void;

  /**
   * Returns the resource factory registry for this resource set.
   */
  getResourceFactoryRegistry(): Resource.FactoryRegistry;

  /**
   * Sets the resource factory registry.
   */
  setResourceFactoryRegistry(registry: Resource.FactoryRegistry): void;

  /**
   * Returns the URI converter for resolving and normalizing URIs.
   */
  getURIConverter(): URIConverter;

  /**
   * Sets the URI converter.
   */
  setURIConverter(converter: URIConverter): void;
}

/**
 * Converts and normalizes URIs.
 */
export interface URIConverter {
  /**
   * Normalizes the URI.
   */
  normalize(uri: URI): URI;

  /**
   * Creates an input stream for the URI.
   */
  createInputStream(uri: URI): Promise<ReadableStream>;

  /**
   * Creates an output stream for the URI.
   */
  createOutputStream(uri: URI): Promise<WritableStream>;

  /**
   * Returns whether the URI exists.
   */
  exists(uri: URI): Promise<boolean>;

  /**
   * Deletes the resource at the URI.
   */
  delete(uri: URI): Promise<void>;

  /**
   * Returns the URI map for mapping logical URIs to physical URIs.
   */
  getURIMap(): Map<URI, URI>;
}

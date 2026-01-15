/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ResourceSet, URIConverter } from '../ResourceSet';
import { Resource } from '../Resource';
import { URI } from '../URI';
import { EObject } from '../EObject';
import { EPackage, EPackageRegistry } from '../EPackage';
import { BasicResource } from './BasicResource';

/**
 * Basic ResourceSet implementation
 */
export class BasicResourceSet implements ResourceSet {
  private resources: Resource[] = [];
  private packageRegistry: EPackageRegistry;
  private resourceFactoryRegistry: Resource.FactoryRegistry;
  private uriConverter: URIConverter;

  constructor(
    packageRegistry?: EPackageRegistry,
    factoryRegistry?: Resource.FactoryRegistry
  ) {
    // Use provided or create default registries
    this.packageRegistry = packageRegistry || this.createDefaultPackageRegistry();
    this.resourceFactoryRegistry = factoryRegistry || Resource.INSTANCE_FACTORY_REGISTRY;
    this.uriConverter = this.createDefaultURIConverter();
  }

  getResources(): Resource[] {
    return this.resources;
  }

  getResource(uri: URI, loadOnDemand: boolean): Resource | null {
    // Check if already loaded
    const existing = this.resources.find(r => {
      const resUri = r.getURI();
      return resUri && resUri.toString() === uri.toString();
    });

    if (existing) {
      return existing;
    }

    // Try to find in package registry (delegatedGetResource)
    const delegated = this.delegatedGetResource(uri, loadOnDemand);
    if (delegated) {
      return delegated;
    }

    if (!loadOnDemand) {
      return null;
    }

    // Create and load resource
    const resource = this.createResource(uri);
    if (resource) {
      resource.load().catch(err => {
        console.error(`Failed to load resource ${uri}:`, err);
      });
    }

    return resource;
  }

  /**
   * Returns a resolved resource available outside of the resource set.
   * Looks up the URI in the package registry.
   * This is called by getResource when the URI cannot be resolved
   * based on the existing contents of the resource set.
   */
  protected delegatedGetResource(uri: URI, loadOnDemand: boolean): Resource | null {
    const uriString = uri.toString();
    const ePackage = this.packageRegistry.getEPackage(uriString);
    if (ePackage) {
      // Return the package's resource if it has one
      if ('eResource' in ePackage && typeof (ePackage as any).eResource === 'function') {
        const existingResource = (ePackage as any).eResource();
        if (existingResource) {
          return existingResource;
        }
      }
      // If the package doesn't have a resource, create a synthetic one
      // that contains the package and can resolve fragments
      return this.createSyntheticResourceForPackage(ePackage, uri);
    }
    return null;
  }

  /**
   * Creates a synthetic resource for a package that doesn't have one.
   * This allows resolving fragment references like //EString within the package.
   */
  private createSyntheticResourceForPackage(ePackage: any, uri: URI): Resource {
    // Check if we already have a synthetic resource for this package
    const existing = this.resources.find(r => {
      if ('_syntheticPackage' in r) {
        return (r as any)._syntheticPackage === ePackage;
      }
      return false;
    });
    if (existing) {
      return existing;
    }

    // Create a synthetic resource that wraps the package
    const resource = new SyntheticPackageResource(uri, ePackage);
    resource.setResourceSet(this);
    this.resources.push(resource);
    return resource;
  }

  createResource(uri: URI): Resource {
    // Get factory for this URI
    const factory = this.resourceFactoryRegistry.getFactory(uri);

    let resource: Resource;
    if (factory) {
      resource = factory.createResource(uri);
    } else {
      // Default resource
      resource = new BasicResource(uri);
    }

    // Set resource set
    if ('setResourceSet' in resource) {
      (resource as any).setResourceSet(this);
    }

    // Add to resources
    this.resources.push(resource);

    return resource;
  }

  getEObject(uri: URI, loadOnDemand: boolean): EObject | null {
    const fragment = uri.fragment();
    if (!fragment) {
      return null;
    }

    // Get resource (without fragment)
    const resourceURI = URI.createURI(uri.toString().split('#')[0]);
    const resource = this.getResource(resourceURI, loadOnDemand);

    if (!resource) {
      return null;
    }

    // Get object from resource
    return resource.getEObject(fragment);
  }

  getPackageRegistry(): EPackageRegistry {
    return this.packageRegistry;
  }

  setPackageRegistry(registry: EPackageRegistry): void {
    this.packageRegistry = registry;
  }

  getResourceFactoryRegistry(): Resource.FactoryRegistry {
    return this.resourceFactoryRegistry;
  }

  setResourceFactoryRegistry(registry: Resource.FactoryRegistry): void {
    this.resourceFactoryRegistry = registry;
  }

  getURIConverter(): URIConverter {
    return this.uriConverter;
  }

  setURIConverter(converter: URIConverter): void {
    this.uriConverter = converter;
  }

  /**
   * Create default package registry that delegates to global EPackageRegistry.INSTANCE
   */
  private createDefaultPackageRegistry(): EPackageRegistry {
    const map = new Map<string, any>();

    return {
      getEPackage(nsURI: string) {
        // First check local map
        const value = map.get(nsURI);
        if (value) {
          if ('getEPackage' in value) return value.getEPackage();
          return value;
        }
        // Fallback to global registry
        return EPackageRegistry.INSTANCE.getEPackage(nsURI);
      },

      getEFactory(nsURI: string) {
        const pkg = this.getEPackage(nsURI);
        return pkg ? pkg.getEFactoryInstance() : null;
      },

      get(nsURI: string) {
        return map.get(nsURI) || EPackageRegistry.INSTANCE.get(nsURI);
      },

      set(nsURI: string, value: any) {
        map.set(nsURI, value);
      },

      delete(nsURI: string) {
        return map.delete(nsURI);
      },

      has(nsURI: string) {
        return map.has(nsURI) || EPackageRegistry.INSTANCE.has(nsURI);
      },

      keys() {
        return map.keys();
      },

      values() {
        return map.values();
      }
    };
  }

  /**
   * Create default URI converter
   */
  private createDefaultURIConverter(): URIConverter {
    const uriMap = new Map<URI, URI>();

    return {
      normalize(uri: URI): URI {
        // Apply URI mappings
        for (const [source, target] of uriMap.entries()) {
          const sourceStr = source.toString();
          const uriStr = uri.toString();
          if (uriStr.startsWith(sourceStr)) {
            const remainder = uriStr.substring(sourceStr.length);
            return URI.createURI(target.toString() + remainder);
          }
        }
        return uri;
      },

      async createInputStream(uri: URI): Promise<ReadableStream> {
        throw new Error('createInputStream not implemented');
      },

      async createOutputStream(uri: URI): Promise<WritableStream> {
        throw new Error('createOutputStream not implemented');
      },

      async exists(uri: URI): Promise<boolean> {
        return false;
      },

      async delete(uri: URI): Promise<void> {
        throw new Error('delete not implemented');
      },

      getURIMap(): Map<URI, URI> {
        return uriMap;
      }
    };
  }
}

/**
 * A synthetic resource that wraps an EPackage for fragment resolution.
 * Used when a package is registered in the registry but doesn't have a resource.
 */
class SyntheticPackageResource implements Resource {
  private uri: URI;
  private resourceSet: ResourceSet | null = null;
  public readonly _syntheticPackage: EPackage;

  constructor(uri: URI, ePackage: EPackage) {
    this.uri = uri;
    this._syntheticPackage = ePackage;
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
    if (uri) this.uri = uri;
  }

  getContents(): EObject[] {
    return [this._syntheticPackage as unknown as EObject];
  }

  getAllContents(): IterableIterator<EObject> {
    const contents = this.getContents();
    return contents[Symbol.iterator]();
  }

  getEObject(uriFragment: string): EObject | null {
    // Remove leading slashes
    let path = uriFragment;
    while (path.startsWith('/')) {
      path = path.substring(1);
    }

    if (!path) {
      return this._syntheticPackage as unknown as EObject;
    }

    // Split by / for nested paths
    const segments = path.split('/');
    const classifierName = segments[0];

    // Find classifier by name
    const classifier = this._syntheticPackage.getEClassifier(classifierName);
    if (classifier) {
      return classifier as unknown as EObject;
    }

    return null;
  }

  getURIFragment(eObject: EObject): string {
    // Check if it's the package itself
    if (eObject === this._syntheticPackage) {
      return '/';
    }

    // Check classifiers
    for (const classifier of this._syntheticPackage.getEClassifiers()) {
      if (classifier === eObject) {
        return '//' + classifier.getName();
      }
    }

    return '';
  }

  async save(options?: Map<string, any>): Promise<void> {
    // Synthetic resources cannot be saved
  }

  async load(options?: Map<string, any>): Promise<void> {
    // Already loaded
  }

  isLoaded(): boolean {
    return true;
  }

  unload(): void {
    // Cannot unload
  }

  isModified(): boolean {
    return false;
  }

  setModified(isModified: boolean): void {
    // Cannot modify
  }

  getErrors(): Array<{ message: string; location?: string; line?: number; column?: number }> {
    return [];
  }

  getWarnings(): Array<{ message: string; location?: string; line?: number; column?: number }> {
    return [];
  }
}

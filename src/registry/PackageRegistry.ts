/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EPackage, EPackageRegistry as IEPackageRegistry } from '../EPackage';
import { EFactory } from '../EFactory';
import { Registry, ExtensionListener, Extension } from './PluginRegistry';
import { ExtensionPoints, GeneratedPackageExtension, DynamicPackageExtension } from './ExtensionPoints';

/**
 * Extension-aware EPackage Registry
 * Automatically populates from plugin extensions
 */
export class ExtensionAwarePackageRegistry implements IEPackageRegistry {
  private packages = new Map<string, EPackage>();
  private pendingPackages = new Map<string, () => EPackage | Promise<EPackage>>();

  constructor() {
    // Listen for package registrations
    this.setupExtensionListeners();
  }

  private setupExtensionListeners(): void {
    // Listen for generated packages
    Registry.addExtensionListener(
      ExtensionPoints.GENERATED_PACKAGE,
      {
        onExtensionAdded: (ext: Extension<GeneratedPackageExtension>) => {
          const contrib = ext.contribution;
          console.log(`[PackageRegistry] Registered generated package: ${contrib.uri}`);

          // Store as pending (lazy loading)
          this.pendingPackages.set(contrib.uri, async () => {
            const pkg = await contrib.packageClass();
            this.packages.set(contrib.uri, pkg);
            return pkg;
          });
        },
        onExtensionRemoved: (ext: Extension<GeneratedPackageExtension>) => {
          const uri = ext.contribution.uri;
          console.log(`[PackageRegistry] Unregistered package: ${uri}`);
          this.packages.delete(uri);
          this.pendingPackages.delete(uri);
        }
      }
    );

    // Listen for dynamic packages
    Registry.addExtensionListener(
      ExtensionPoints.DYNAMIC_PACKAGE,
      {
        onExtensionAdded: async (ext: Extension<DynamicPackageExtension>) => {
          const contrib = ext.contribution;
          console.log(`[PackageRegistry] Loading dynamic package: ${contrib.uri} from ${contrib.location}`);

          // Load .ecore file
          const pkg = await this.loadDynamicPackage(contrib.location);
          this.packages.set(contrib.uri, pkg);
        },
        onExtensionRemoved: (ext: Extension<DynamicPackageExtension>) => {
          this.packages.delete(ext.contribution.uri);
        }
      }
    );

    // Process existing extensions
    this.processExistingExtensions();
  }

  private processExistingExtensions(): void {
    // Process generated packages
    const generatedPkgs = Registry.getExtensions<GeneratedPackageExtension>(
      ExtensionPoints.GENERATED_PACKAGE
    );
    generatedPkgs.forEach(ext => {
      this.pendingPackages.set(ext.contribution.uri, ext.contribution.packageClass);
    });

    console.log(`[PackageRegistry] Found ${generatedPkgs.length} generated packages`);
  }

  private async loadDynamicPackage(location: string): Promise<EPackage> {
    // TODO: Implement .ecore file loading
    // This would parse the .ecore XML and create EPackage dynamically
    throw new Error(`Dynamic package loading not yet implemented: ${location}`);
  }

  // IEPackageRegistry implementation

  getEPackage(nsURI: string): EPackage | null {
    // Check if already loaded
    if (this.packages.has(nsURI)) {
      return this.packages.get(nsURI)!;
    }

    // Check if pending (lazy load synchronously)
    if (this.pendingPackages.has(nsURI)) {
      const loader = this.pendingPackages.get(nsURI)!;
      const pkg = loader();

      // If the loader returns a Promise, we can't handle it synchronously
      // User should pre-load async packages before accessing them
      if (pkg instanceof Promise) {
        console.warn(`[PackageRegistry] Cannot lazy-load async package: ${nsURI}. Pre-load it first.`);
        return null;
      }

      this.packages.set(nsURI, pkg);
      this.pendingPackages.delete(nsURI);
      return pkg;
    }

    return null;
  }

  getEFactory(nsURI: string): EFactory | null {
    const pkg = this.packages.get(nsURI);
    return pkg ? pkg.getEFactoryInstance() : null;
  }

  get(nsURI: string): EPackage | null {
    return this.packages.get(nsURI) || null;
  }

  set(nsURI: string, value: EPackage): void {
    this.packages.set(nsURI, value);
    // Also register all subpackages recursively
    this.registerSubpackages(value);
  }

  /**
   * Recursively registers all subpackages of the given package.
   * This ensures that nested packages with their own nsURI can be resolved
   * by the registry when loading XMI files.
   *
   * NOTE: This is an intentional enhancement over Java EMF behavior.
   * In Java EMF, subpackages must be registered separately. This implementation
   * automatically registers subpackages to support dynamically loaded packages.
   */
  private registerSubpackages(pkg: EPackage): void {
    for (const subPkg of pkg.getESubpackages()) {
      const subNsURI = subPkg.getNsURI();
      if (subNsURI) {
        this.packages.set(subNsURI, subPkg);
      }
      // Recursively register nested subpackages
      this.registerSubpackages(subPkg);
    }
  }

  delete(nsURI: string): boolean {
    return this.packages.delete(nsURI);
  }

  has(nsURI: string): boolean {
    return this.packages.has(nsURI) || this.pendingPackages.has(nsURI);
  }

  keys(): IterableIterator<string> {
    return this.packages.keys();
  }

  values(): IterableIterator<EPackage> {
    return this.packages.values();
  }

  /**
   * Get all registered package URIs (including pending)
   */
  getAllURIs(): string[] {
    return [
      ...Array.from(this.packages.keys()),
      ...Array.from(this.pendingPackages.keys())
    ];
  }

  /**
   * Force load all pending packages
   */
  async loadAllPackages(): Promise<void> {
    const pending = Array.from(this.pendingPackages.entries());
    await Promise.all(
      pending.map(async ([uri, loader]) => {
        const pkg = await loader();
        this.packages.set(uri, pkg);
      })
    );
    this.pendingPackages.clear();
    console.log(`[PackageRegistry] Loaded ${pending.length} packages`);
  }
}

/**
 * Create global instance with extension support
 */
export function createExtensionAwareRegistry(): IEPackageRegistry {
  return new ExtensionAwarePackageRegistry();
}

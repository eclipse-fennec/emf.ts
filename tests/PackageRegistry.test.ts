/**
 * @fileoverview Tests for EPackageRegistry.registerPackage (#67)
 *
 * registerPackage(pkg) is part of the EPackageRegistry interface, so every way
 * of obtaining a registry behaves the same. Previously only the registries from
 * src/ecore/index.ts had the method, while the registry of a ResourceSet did
 * not - which is what #67 reported.
 *
 * @module tests/PackageRegistry
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  BasicEPackage,
  EPackage,
  EPackageRegistry,
  EResourceSetImpl,
  createPackageRegistry,
  getPackageRegistry,
} from '../src';
import { ExtensionAwarePackageRegistry } from '../src/registry/PackageRegistry.js';

/** nsURIs touched by these tests, removed from the global registry afterwards. */
const NS_MAIN = 'http://test.registry/main';
const NS_SUB = 'http://test.registry/sub';

function createPackageWithSubpackage(): EPackage {
  const pkg = new BasicEPackage();
  pkg.setName('main');
  pkg.setNsURI(NS_MAIN);
  pkg.setNsPrefix('main');

  const sub = new BasicEPackage();
  sub.setName('sub');
  sub.setNsURI(NS_SUB);
  sub.setNsPrefix('sub');
  pkg.getESubpackages().add(sub);

  return pkg;
}

/**
 * The four ways to obtain a registry. All of them must accept registerPackage.
 */
const registries: [string, () => EPackageRegistry][] = [
  ['ResourceSet registry', () => new EResourceSetImpl().getPackageRegistry()],
  ['global registry', () => EPackageRegistry.INSTANCE],
  ['createPackageRegistry()', () => createPackageRegistry()],
  ['getPackageRegistry()', () => getPackageRegistry()],
  ['ExtensionAwarePackageRegistry', () => new ExtensionAwarePackageRegistry()],
];

describe('EPackageRegistry.registerPackage (#67)', () => {
  afterEach(() => {
    EPackageRegistry.INSTANCE.delete(NS_MAIN);
    EPackageRegistry.INSTANCE.delete(NS_SUB);
  });

  describe.each(registries)('%s', (_label, makeRegistry) => {
    it('should expose registerPackage', () => {
      expect(typeof makeRegistry().registerPackage).toBe('function');
    });

    it('should register the package under its own nsURI', () => {
      const registry = makeRegistry();
      const pkg = createPackageWithSubpackage();

      registry.registerPackage(pkg);

      expect(registry.getEPackage(NS_MAIN)).toBe(pkg);
    });

    it('should register subpackages as well, like set() does', () => {
      const registry = makeRegistry();
      const pkg = createPackageWithSubpackage();

      registry.registerPackage(pkg);

      expect(registry.getEPackage(NS_SUB)?.getName()).toBe('sub');
    });

    it('should throw for a package without an nsURI', () => {
      const registry = makeRegistry();
      const pkg = new BasicEPackage();
      pkg.setName('nameless');

      expect(() => registry.registerPackage(pkg)).toThrow(/nsURI/);
    });
  });

  it('should make the registered package resolvable through the ResourceSet', () => {
    // The reported use case: register a package, then have the ResourceSet
    // resolve references against it.
    const resourceSet = new EResourceSetImpl();
    const pkg = createPackageWithSubpackage();

    resourceSet.getPackageRegistry().registerPackage(pkg);

    expect(resourceSet.getPackageRegistry().getEPackage(NS_MAIN)).toBe(pkg);
  });
});

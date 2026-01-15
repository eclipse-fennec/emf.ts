/**
 * Test script to verify external URI reference resolution
 */
import { describe, it, expect } from 'vitest';
import { EPackageRegistry } from '../src/EPackage';
import { getEcorePackage, ECORE_NS_URI } from '../src/ecore/EcorePackage';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { URI } from '../src/URI';

describe('External Reference Resolution', () => {
  it('should register EcorePackage in global registry', () => {
    const ecorePackage = getEcorePackage();
    expect(ecorePackage.getName()).toBe('ecore');
    expect(ecorePackage.getNsURI()).toBe(ECORE_NS_URI);

    const registeredPackage = EPackageRegistry.INSTANCE.getEPackage(ECORE_NS_URI);
    expect(registeredPackage).not.toBeNull();
  });

  it('should find EString via getEClassifier', () => {
    const ecorePackage = getEcorePackage();
    const eString = ecorePackage.getEClassifier('EString');

    expect(eString).not.toBeNull();
    expect(eString?.getName()).toBe('EString');
  });

  it('should resolve external URI via ResourceSet.getEObject', () => {
    const ecorePackage = getEcorePackage();
    const resourceSet = new BasicResourceSet();
    resourceSet.getPackageRegistry().set(ECORE_NS_URI, ecorePackage);

    const uri = URI.createURI(ECORE_NS_URI + '#//EString');
    const resolved = resourceSet.getEObject(uri, true);

    expect(resolved).not.toBeNull();
    expect((resolved as any).getName()).toBe('EString');
  });

  it('should resolve external URI via delegatedGetResource', () => {
    const ecorePackage = getEcorePackage();
    const resourceSet = new BasicResourceSet();
    resourceSet.getPackageRegistry().set(ECORE_NS_URI, ecorePackage);

    const baseUri = URI.createURI(ECORE_NS_URI);
    const resource = resourceSet.getResource(baseUri, false);

    expect(resource).not.toBeNull();
    expect(resource?.getContents().length).toBeGreaterThan(0);

    const firstContent = resource?.getContents()[0];
    expect((firstContent as any).getName()).toBe('ecore');
  });

  it('should resolve EClass via fragment path', () => {
    const ecorePackage = getEcorePackage();
    const resourceSet = new BasicResourceSet();
    resourceSet.getPackageRegistry().set(ECORE_NS_URI, ecorePackage);

    const uri = URI.createURI(ECORE_NS_URI + '#//EClass');
    const resolved = resourceSet.getEObject(uri, true);

    expect(resolved).not.toBeNull();
    expect((resolved as any).getName()).toBe('EClass');
  });

  it('should resolve EDataType via fragment path', () => {
    const ecorePackage = getEcorePackage();
    const resourceSet = new BasicResourceSet();
    resourceSet.getPackageRegistry().set(ECORE_NS_URI, ecorePackage);

    const uri = URI.createURI(ECORE_NS_URI + '#//EInt');
    const resolved = resourceSet.getEObject(uri, true);

    expect(resolved).not.toBeNull();
    expect((resolved as any).getName()).toBe('EInt');
  });
});

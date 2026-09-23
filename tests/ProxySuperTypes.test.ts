/**
 * @fileoverview Derivations over a proxy super type (#104)
 *
 * A proxy in eSuperTypes made eight methods of BasicEClass throw, among them
 * getEStructuralFeature() for a feature the class defines itself. An editor
 * listing the features of such a class got nothing at all.
 *
 * Two causes, both of which Java EMF avoids by construction:
 *
 *   - eSuperTypes was a list that never resolved, so a proxy stayed in it even
 *     once its package was registered. EMF hands out a resolving list.
 *   - a stand-in for an unresolved reference was an EProxyImpl, a class of its
 *     own without getESuperTypes(). EMF creates it through the factory of the
 *     expected type, so an unresolvable EClass is still an EClass with empty
 *     lists, and the derivations walk over it without noticing.
 *
 * @module tests/ProxySuperTypes
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';

const BASE_NS = 'http://test.proxysuper/base';

const BASE = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="base" nsURI="${BASE_NS}" nsPrefix="b">
  <eClassifiers xsi:type="ecore:EClass" name="Base">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="geerbt"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

/** A subclass whose super type lives in the given namespace. */
function sub(nsURI: string, testId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="sub" nsURI="http://test.proxysuper/${testId}" nsPrefix="s">
  <eClassifiers xsi:type="ecore:EClass" name="Sub">
    <eSuperTypes href="${nsURI}#//Base"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="path"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;
}

/** Loads the subclass alone; its super type is a proxy. */
function load(testId: string, superTypeNs = 'http://test.proxysuper/missing') {
  const resourceSet = new EResourceSetImpl();
  const resource = resourceSet.createResource(URI.createURI(`${testId}.ecore`));
  (resource as any).loadFromString(sub(superTypeNs, testId));
  const pkg = resource.getContents().get(0) as EPackage;

  return {
    resourceSet,
    resource,
    subClass: pkg.getEClassifier('Sub') as EClass,
    /** Loads and registers the package holding Base, after the fact. */
    registerBase() {
      const baseResource = resourceSet.createResource(URI.createURI(`${testId}-base.ecore`));
      (baseResource as any).loadFromString(BASE);
      const basePkg = baseResource.getContents().get(0) as EPackage;
      EPackageRegistry.INSTANCE.set(BASE_NS, basePkg);
      resourceSet.getPackageRegistry().set(BASE_NS, basePkg);
    },
  };
}

/** The feature names a derivation returns. */
function featureNames(eClass: EClass): string[] {
  return [...eClass.getEAllStructuralFeatures()].map(f => f.getName() ?? '');
}

describe('An unresolvable super type no longer breaks the derivations (#104)', () => {
  it.each([
    ['getEAllSuperTypes', (c: any) => c.getEAllSuperTypes()],
    ['getEAllStructuralFeatures', (c: any) => c.getEAllStructuralFeatures()],
    ['getEAllAttributes', (c: any) => c.getEAllAttributes()],
    ['getEAllReferences', (c: any) => c.getEAllReferences()],
    ['getEAllOperations', (c: any) => c.getEAllOperations()],
    ['getEAllContainments', (c: any) => c.getEAllContainments()],
    ['getEStructuralFeature', (c: any) => c.getEStructuralFeature('path')],
    ['isSuperTypeOf', (c: any) => c.isSuperTypeOf(c)],
  ])('%s should not throw', (_label, call) => {
    const { subClass } = load(`nothrow-${_label}`);

    expect(() => call(subClass)).not.toThrow();
  });

  it('should still report the features the class defines itself', () => {
    // The worst part of the report: an editor got nothing, not even the local
    // features, because the call itself failed.
    const { subClass } = load('own');

    expect(featureNames(subClass)).toEqual(['path']);
  });

  it('should keep the unresolved super type in the list', () => {
    const { subClass } = load('kept');
    const superTypes = [...subClass.getESuperTypes()];

    expect(superTypes).toHaveLength(1);
    expect((superTypes[0] as any).eIsProxy()).toBe(true);
  });

  it('should make the stand-in a real EClass with empty lists', () => {
    const { subClass } = load('typed');
    const superType = [...subClass.getESuperTypes()][0] as any;

    expect(typeof superType.getESuperTypes).toBe('function');
    expect(superType.getEStructuralFeatures().size()).toBe(0);
  });

  it('should write the reference back unchanged', () => {
    const { resource } = load('save');

    expect((resource as any).saveToString()).toContain(
      '<eSuperTypes href="http://test.proxysuper/missing#//Base"/>'
    );
  });
});

describe('A super type that becomes available is resolved (#104)', () => {
  it('should replace the proxy once its package is registered', () => {
    const fixture = load('resolve', BASE_NS);
    expect(([...fixture.subClass.getESuperTypes()][0] as any).eIsProxy()).toBe(true);

    fixture.registerBase();
    const superType = [...fixture.subClass.getESuperTypes()][0] as any;

    expect(superType.eIsProxy()).toBe(false);
    expect(superType.getName()).toBe('Base');
  });

  it('should then inherit the features of that super type', () => {
    const fixture = load('inherit', BASE_NS);
    fixture.registerBase();

    expect(featureNames(fixture.subClass)).toEqual(['geerbt', 'path']);
  });
});

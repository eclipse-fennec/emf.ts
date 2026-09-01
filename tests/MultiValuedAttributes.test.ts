/**
 * @fileoverview Round-trip tests for multi-valued attributes (#75)
 *
 * XMLSave writes a multi-valued data type feature as one whitespace-separated
 * attribute. The reader has to split it again, otherwise the whole attribute
 * becomes a single entry: EString values got joined, numeric values beyond the
 * first were dropped, and [true, false] came back as [false] - a wrong value
 * rather than a missing one.
 *
 * The attribute form is only reversible while no value contains whitespace and
 * none is empty. Those cases are written as child elements instead, which is
 * what Java EMF does in XMLSaveImpl.saveDataTypeMany().
 *
 * @module tests/MultiValuedAttributes
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { EStructuralFeature } from '../src/EStructuralFeature.js';
import type { EList } from '../src/EList.js';

const ECORE_NS = 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#/';

/** Builds a metamodel with one multi-valued attribute of the given type. */
function metamodel(nsURI: string, typeName: string, upperBound = '-1'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="t" nsURI="${nsURI}" nsPrefix="t">
  <eClassifiers xsi:type="ecore:EClass" name="C">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="werte" upperBound="${upperBound}"
        eType="${ECORE_NS}/${typeName}"/>
  </eClassifiers>
</ecore:EPackage>`;
}

interface Fixture {
  feature: EStructuralFeature;
  /** Saves the given values and reads them back, returning both sides. */
  roundTrip(values: unknown[]): { xmi: string; values: unknown[] };
}

/**
 * Registers a metamodel and returns a helper that saves and reloads instances.
 * Each call uses its own nsURI so the tests stay independent.
 */
function fixture(typeName: string, testId: string): Fixture {
  const nsURI = `http://test.multivalued/${testId}`;
  const resourceSet = new EResourceSetImpl();
  const metaResource = resourceSet.createResource(URI.createURI(`${testId}.ecore`));
  (metaResource as any).loadFromString(metamodel(nsURI, typeName));

  const pkg = metaResource.getContents().get(0) as EPackage;
  EPackageRegistry.INSTANCE.set(nsURI, pkg);
  resourceSet.getPackageRegistry().set(nsURI, pkg);

  const eClass = pkg.getEClassifier('C') as EClass;
  const feature = eClass.getEStructuralFeature('werte')!;

  return {
    feature,
    roundTrip(values: unknown[]) {
      const obj = pkg.getEFactoryInstance().create(eClass);
      const list = obj.eGet(feature) as EList<unknown>;
      for (const value of values) {
        list.add(value);
      }

      const out = resourceSet.createResource(URI.createURI(`${testId}-out.xmi`));
      out.getContents().add(obj);
      const xmi = (out as any).saveToString();

      const back = resourceSet.createResource(URI.createURI(`${testId}-in.xmi`));
      (back as any).loadFromString(xmi);
      expect(back.getErrors()).toHaveLength(0);

      const reloaded = back.getContents().get(0).eGet(feature) as EList<unknown>;
      return { xmi, values: reloaded.toArray() };
    },
  };
}

describe('Multi-valued attributes survive a round trip (#75)', () => {
  it.each([
    ['EString', ['alpha', 'beta']],
    ['EInt', [1, 2, 3]],
    ['ELong', [10, 20]],
    ['EDouble', [1.5, 2.5]],
    ['EFloat', [1.5, 2.5]],
    ['EBoolean', [true, false]],
  ])('%s', (typeName, values) => {
    const result = fixture(typeName, `rt-${typeName}`).roundTrip(values);

    expect(result.values).toEqual(values);
  });

  it('should write simple values as one whitespace-separated attribute', () => {
    const result = fixture('EString', 'attr-form').roundTrip(['alpha', 'beta']);

    expect(result.xmi).toContain('werte="alpha beta"');
    expect(result.xmi).not.toContain('<werte>');
  });

  it('should not turn [true, false] into [false]', () => {
    // The worst variant of the bug: comparing the whole string "true false"
    // against "true" yielded a single wrong value instead of a missing one.
    const result = fixture('EBoolean', 'bool-detail').roundTrip([true, false]);

    expect(result.values).toEqual([true, false]);
    expect(result.values).not.toEqual([false]);
  });

  it('should keep a single value in a multi-valued feature', () => {
    const result = fixture('EString', 'single-entry').roundTrip(['solo']);

    expect(result.values).toEqual(['solo']);
  });

  it('should keep an empty list empty', () => {
    const result = fixture('EString', 'empty-list').roundTrip([]);

    expect(result.values).toEqual([]);
  });
});

describe('Values that the attribute form cannot represent (#75)', () => {
  it('should write values containing whitespace as child elements', () => {
    const result = fixture('EString', 'ws-elements').roundTrip(['a b', 'c']);

    expect(result.xmi).toContain('<werte>a b</werte>');
    expect(result.xmi).toContain('<werte>c</werte>');
    expect(result.xmi).not.toMatch(/werte="/);
    expect(result.values).toEqual(['a b', 'c']);
  });

  it('should round-trip a single value containing whitespace', () => {
    const result = fixture('EString', 'ws-single').roundTrip(['hallo welt']);

    expect(result.values).toEqual(['hallo welt']);
  });

  it('should round-trip an empty string among other values', () => {
    // Joined into an attribute an empty value would simply disappear.
    const result = fixture('EString', 'ws-empty').roundTrip(['', 'x']);

    expect(result.values).toEqual(['', 'x']);
  });

  it('should read child elements written by hand', () => {
    // The element form is what Java EMF produces, so it has to be readable
    // regardless of who wrote the file.
    const nsURI = 'http://test.multivalued/hand-written';
    const resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI('hand.ecore'));
    (metaResource as any).loadFromString(metamodel(nsURI, 'EString'));
    const pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(nsURI, pkg);
    resourceSet.getPackageRegistry().set(nsURI, pkg);

    const resource = resourceSet.createResource(URI.createURI('hand.xmi'));
    (resource as any).loadFromString(`<?xml version="1.0" encoding="UTF-8"?>
<t:C xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:t="${nsURI}">
  <werte>erster wert</werte>
  <werte>zweiter</werte>
</t:C>`);

    const eClass = pkg.getEClassifier('C') as EClass;
    const feature = eClass.getEStructuralFeature('werte')!;
    const values = resource.getContents().get(0).eGet(feature) as EList<unknown>;

    expect(resource.getErrors()).toHaveLength(0);
    expect(values.toArray()).toEqual(['erster wert', 'zweiter']);
  });
});

describe('Single-valued attributes are unaffected (#75)', () => {
  it('should keep a value containing whitespace in one attribute', () => {
    // Splitting must apply to multi-valued features only. A single-valued
    // feature holds the value directly rather than in an EList, so this cannot
    // reuse the fixture above.
    const nsURI = 'http://test.multivalued/single-valued';
    const resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI('sv.ecore'));
    (metaResource as any).loadFromString(metamodel(nsURI, 'EString', '1'));
    const pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(nsURI, pkg);
    resourceSet.getPackageRegistry().set(nsURI, pkg);

    const eClass = pkg.getEClassifier('C') as EClass;
    const feature = eClass.getEStructuralFeature('werte')!;
    expect(feature.isMany()).toBe(false);

    const obj = pkg.getEFactoryInstance().create(eClass);
    obj.eSet(feature, 'hallo welt');

    const out = resourceSet.createResource(URI.createURI('sv-out.xmi'));
    out.getContents().add(obj);
    const xmi = (out as any).saveToString();
    expect(xmi).toContain('werte="hallo welt"');

    const back = resourceSet.createResource(URI.createURI('sv-in.xmi'));
    (back as any).loadFromString(xmi);

    expect(back.getErrors()).toHaveLength(0);
    expect(back.getContents().get(0).eGet(feature)).toBe('hallo welt');
  });
});

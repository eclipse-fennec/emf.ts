/**
 * @fileoverview Round-trip tests for attributes whose value equals the default (#95)
 *
 * XMLSave decided whether to write an attribute by comparing its value against
 * the default. "Equal to the default" and "never set" are two different states
 * though, and only the second one may be dropped: a document that explicitly
 * carried apiType="PROVIDER" lost that attribute on every save, because
 * PROVIDER is also the defaultValueLiteral - even with lowerBound="1", which
 * made the result invalid against its own metamodel.
 *
 * Java EMF asks XMLSaveImpl.shouldSaveFeature(), which consults eIsSet() and
 * the keepDefaults option. The value comparison stays in front of it, because
 * the Ecore metamodel classes hold their state in typed fields rather than in
 * the reflective settings map.
 *
 * @module tests/DefaultValuedAttributes
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import { OPTION_KEEP_DEFAULT_CONTENT } from '../src/xmi/index.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { EStructuralFeature } from '../src/EStructuralFeature.js';

const ECORE_TYPE = 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#/';

/**
 * A metamodel with one enum and one class whose attributes all declare a
 * default: the enum attribute is required, as in the model that reported this.
 */
function metamodel(nsURI: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="t" nsURI="${nsURI}" nsPrefix="t">
  <eClassifiers xsi:type="ecore:EEnum" name="ApiType">
    <eLiterals name="PROVIDER"/>
    <eLiterals name="CONSUMER" value="1"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="C">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="apiType" lowerBound="1"
        eType="#//ApiType" defaultValueLiteral="PROVIDER"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="flag"
        eType="${ECORE_TYPE}/EBoolean" defaultValueLiteral="false"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="count"
        eType="${ECORE_TYPE}/EInt" defaultValueLiteral="0"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="label"
        eType="${ECORE_TYPE}/EString"/>
  </eClassifiers>
</ecore:EPackage>`;
}

interface Fixture {
  pkg: EPackage;
  eClass: EClass;
  feature(name: string): EStructuralFeature;
  /** Loads an instance document and saves it again. */
  roundTrip(attributes: string, options?: Map<string, any>): string;
  /** Saves a programmatically built instance. */
  save(build: (obj: any) => void, options?: Map<string, any>): string;
}

/** Registers the metamodel under an nsURI of its own, so tests stay independent. */
function fixture(testId: string): Fixture {
  const nsURI = `http://test.defaults/${testId}`;
  const resourceSet = new EResourceSetImpl();
  const metaResource = resourceSet.createResource(URI.createURI(`${testId}.ecore`));
  (metaResource as any).loadFromString(metamodel(nsURI));

  const pkg = metaResource.getContents().get(0) as EPackage;
  EPackageRegistry.INSTANCE.set(nsURI, pkg);
  resourceSet.getPackageRegistry().set(nsURI, pkg);

  const eClass = pkg.getEClassifier('C') as EClass;
  let counter = 0;

  return {
    pkg,
    eClass,
    feature(name: string) {
      return eClass.getEStructuralFeature(name)!;
    },
    roundTrip(attributes: string, options?: Map<string, any>) {
      const resource = resourceSet.createResource(URI.createURI(`${testId}-${counter++}.xmi`));
      (resource as any).loadFromString(`<?xml version="1.0" encoding="UTF-8"?>
<t:C xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:t="${nsURI}" ${attributes}/>`);
      expect(resource.getErrors()).toHaveLength(0);
      return (resource as any).saveToString(options);
    },
    save(build: (obj: any) => void, options?: Map<string, any>) {
      const obj = pkg.getEFactoryInstance().create(eClass);
      build(obj);
      const resource = resourceSet.createResource(URI.createURI(`${testId}-${counter++}.xmi`));
      resource.getContents().add(obj);
      return (resource as any).saveToString(options);
    },
  };
}

describe('Attributes set to their default value survive a round trip (#95)', () => {
  it('should keep a required enum attribute that equals its default', () => {
    // The reported case: apiType="PROVIDER" with defaultValueLiteral="PROVIDER".
    const xmi = fixture('enum-required').roundTrip('apiType="PROVIDER"');

    expect(xmi).toContain('apiType="PROVIDER"');
  });

  it.each([
    ['apiType="PROVIDER"', 'apiType="PROVIDER"'],
    ['flag="false"', 'flag="false"'],
    ['count="0"', 'count="0"'],
    ['label=""', 'label=""'],
  ])('%s', (input, expected) => {
    const xmi = fixture(`kind-${input.replace(/\W/g, '')}`).roundTrip(input);

    expect(xmi).toContain(expected);
  });

  it('should keep every default-valued attribute of one document at once', () => {
    const xmi = fixture('all').roundTrip('apiType="PROVIDER" flag="false" count="0"');

    expect(xmi).toContain('apiType="PROVIDER"');
    expect(xmi).toContain('flag="false"');
    expect(xmi).toContain('count="0"');
  });

  it('should survive repeated round trips without eroding', () => {
    // The loss was per save, so a second cycle is where a partial fix shows.
    const first = fixture('repeat').roundTrip('apiType="PROVIDER" flag="false"');
    const resourceSet = new EResourceSetImpl();
    const again = resourceSet.createResource(URI.createURI('repeat-2.xmi'));
    (again as any).loadFromString(first);

    expect((again as any).saveToString()).toContain('apiType="PROVIDER"');
  });
});

describe('Attributes that were never set stay out of the document (#95)', () => {
  it('should not write defaults for an untouched object', () => {
    const xmi = fixture('untouched').save(() => {});

    expect(xmi).not.toContain('apiType=');
    expect(xmi).not.toContain('flag=');
    expect(xmi).not.toContain('count=');
  });

  it('should write a value assigned through eSet, even where it is the default', () => {
    const f = fixture('eset');
    const xmi = f.save(obj => obj.eSet(f.feature('apiType'), 'PROVIDER'));

    expect(xmi).toContain('apiType="PROVIDER"');
  });

  it('should drop the attribute again after eUnset', () => {
    const f = fixture('eunset');
    const xmi = f.save(obj => {
      obj.eSet(f.feature('flag'), false);
      obj.eUnset(f.feature('flag'));
    });

    expect(xmi).not.toContain('flag=');
  });

  it('should still write a value that differs from the default', () => {
    const f = fixture('differs');
    const xmi = f.save(obj => obj.eSet(f.feature('apiType'), 'CONSUMER'));

    expect(xmi).toContain('apiType="CONSUMER"');
  });
});

describe('OPTION_KEEP_DEFAULT_CONTENT (#95)', () => {
  it('should write every feature that declares a default literal', () => {
    const options = new Map<string, any>([[OPTION_KEEP_DEFAULT_CONTENT, true]]);
    const xmi = fixture('keep').save(() => {}, options);

    expect(xmi).toContain('apiType="PROVIDER"');
    expect(xmi).toContain('flag="false"');
    expect(xmi).toContain('count="0"');
  });

  it('should leave features without a default literal alone', () => {
    const options = new Map<string, any>([[OPTION_KEEP_DEFAULT_CONTENT, true]]);
    const xmi = fixture('keep-nolit').save(() => {}, options);

    expect(xmi).not.toContain('label=');
  });
});

describe('The Ecore metamodel is unaffected (#95)', () => {
  /**
   * The Ecore classes keep their state in typed fields, so eIsSet() reports
   * false for values assigned through their setters. Deciding purely by
   * eIsSet() would have dropped name, nsURI and every other such attribute.
   */
  it('should write a metamodel unchanged', () => {
    const resourceSet = new EResourceSetImpl();
    const source = metamodel('http://test.defaults/ecore-rt');
    const resource = resourceSet.createResource(URI.createURI('ecore-rt.ecore'));
    (resource as any).loadFromString(source);

    const xmi = (resource as any).saveToString();

    expect(xmi).toContain('name="ApiType"');
    expect(xmi).toContain('nsURI="http://test.defaults/ecore-rt"');
    expect(xmi).toContain('defaultValueLiteral="PROVIDER"');
    expect(xmi).toContain('lowerBound="1"');
    // Ecore defaults the document never stated stay out.
    expect(xmi).not.toContain('abstract="false"');
    expect(xmi).not.toContain('upperBound="1"');
  });
});

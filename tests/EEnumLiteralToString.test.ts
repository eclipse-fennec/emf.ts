/**
 * @fileoverview Tests for EEnumLiteral.toString() (#76)
 *
 * Since enum attributes hold the EEnumLiteral object rather than a string,
 * `String(value)` is what display, logging and comparison code hits. It used to
 * produce the inherited `EEnumLiteral@<hash>` from BasicEObject.
 *
 * Java EMF returns getLiteral() from EEnumLiteralImpl.toString(), and
 * getLiteral() falls back to the name when no explicit literal is set.
 *
 * @module tests/EEnumLiteralToString
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import { BasicEEnumLiteral } from '../src/runtime/index.js';
import type { EPackage } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EEnum } from '../src/EEnum.js';

const NS_URI = 'http://test.enumliteral/tostring';

const MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="e" nsURI="${NS_URI}" nsPrefix="e">
  <eClassifiers xsi:type="ecore:EEnum" name="Strategie">
    <eLiterals name="UNIFIED"/>
    <eLiterals name="SPLIT" value="1"/>
    <eLiterals name="EIGENES" value="2" literal="eigenes-literal"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="C">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="strategie" eType="#//Strategie"/>
  </eClassifiers>
</ecore:EPackage>`;

describe('EEnumLiteral.toString() (#76)', () => {
  let pkg: EPackage;
  let strategie: EEnum;

  beforeEach(() => {
    const resourceSet = new EResourceSetImpl();
    const resource = resourceSet.createResource(URI.createURI('enum-tostring.ecore'));
    (resource as any).loadFromString(MODEL);
    pkg = resource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(NS_URI, pkg);
    resourceSet.getPackageRegistry().set(NS_URI, pkg);
    strategie = pkg.getEClassifier('Strategie') as EEnum;
  });

  it('should return the name when no explicit literal is set', () => {
    const literal = strategie.getEEnumLiteral('UNIFIED')!;

    expect(String(literal)).toBe('UNIFIED');
    expect(`${literal}`).toBe('UNIFIED');
    expect('wert=' + literal).toBe('wert=UNIFIED');
  });

  it('should return the literal when it differs from the name', () => {
    // Java EMF returns getLiteral(), which is also what gets serialized.
    const literal = strategie.getEEnumLiteral('EIGENES')!;

    expect(literal.getName()).toBe('EIGENES');
    expect(literal.getLiteral()).toBe('eigenes-literal');
    expect(String(literal)).toBe('eigenes-literal');
  });

  it('should apply to a literal read back from a file', () => {
    // The reported path: eGet on an enum attribute yields the EEnumLiteral.
    const resourceSet = new EResourceSetImpl();
    resourceSet.getPackageRegistry().set(NS_URI, pkg);
    const eClass = pkg.getEClassifier('C') as EClass;
    const feature = eClass.getEStructuralFeature('strategie')!;

    const obj = pkg.getEFactoryInstance().create(eClass);
    obj.eSet(feature, strategie.getEEnumLiteral('UNIFIED'));
    const out = resourceSet.createResource(URI.createURI('enum-out.xmi'));
    out.getContents().add(obj);
    const xmi = (out as any).saveToString();

    const back = resourceSet.createResource(URI.createURI('enum-in.xmi'));
    (back as any).loadFromString(xmi);
    const value = back.getContents().get(0).eGet(feature);

    expect(String(value)).toBe('UNIFIED');
    expect(xmi).toContain('strategie="UNIFIED"');
  });

  it('should return an empty string for a literal without name or literal', () => {
    const bare = new BasicEEnumLiteral();

    expect(String(bare)).toBe('');
  });

  it('should not change toString() on other model objects', () => {
    // BasicEObject.toString() stays the identity-style debug form; only
    // EEnumLiteral overrides it.
    const eClass = pkg.getEClassifier('C') as EClass;

    expect(String(eClass)).toMatch(/^EClass@/);
  });
});

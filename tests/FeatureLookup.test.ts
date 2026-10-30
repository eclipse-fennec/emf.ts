/**
 * @fileoverview getEStructuralFeature(name) and its cache (#126)
 *
 * The lookup scanned getEAllStructuralFeatures() on every call. An OCL
 * evaluator does that for every `self.x` navigation, which on a class with 200
 * inherited features cost up to 17 us per call. EClassImpl keeps the same map
 * in eNameToFeatureMap, rebuilt whenever the feature collection changes.
 *
 * The cache rides on the metamodel revision counter. Renaming a feature
 * touches no list, so it bumps that counter itself - as
 * EStructuralFeatureImpl.setName() reports STRUCTURAL_FEATURES to its class.
 *
 * @module tests/FeatureLookup
 */
import { describe, it, expect } from 'vitest';
import { BasicEPackage, BasicEClass, BasicEAttribute, BasicEReference, EcoreDataTypes } from '../src';
import type { EStructuralFeature } from '../src/EStructuralFeature.js';

/** A base class with `inherited`, a subclass with `own`. */
function hierarchy(testId: string) {
  const pkg = new BasicEPackage();
  pkg.setName('p');
  pkg.setNsURI(`http://test.lookup/${testId}`);
  pkg.setNsPrefix('p');

  const attribute = (name: string) => {
    const attr = new BasicEAttribute();
    attr.setName(name);
    attr.setEType(EcoreDataTypes.EString);
    return attr;
  };

  const base = new BasicEClass();
  base.setName('Base');
  const inherited = attribute('inherited');
  base.getEStructuralFeatures().add(inherited);

  const sub = new BasicEClass();
  sub.setName('Sub');
  sub.getESuperTypes().add(base);
  const own = attribute('own');
  sub.getEStructuralFeatures().add(own);

  pkg.getEClassifiers().add(base);
  pkg.getEClassifiers().add(sub);

  return { pkg, base, sub, inherited, own, attribute };
}

describe('Looking a feature up by name (#126)', () => {
  it.each([
    ['an own feature', 'own'],
    ['an inherited feature', 'inherited'],
  ])('should find %s', (_label, name) => {
    const h = hierarchy(`find-${name}`);

    expect(h.sub.getEStructuralFeature(name)?.getName()).toBe(name);
  });

  it('should return null for a name nothing carries', () => {
    const h = hierarchy('miss');

    expect(h.sub.getEStructuralFeature('absent')).toBeNull();
  });

  it('should keep answering by index', () => {
    const h = hierarchy('index');
    const all = h.sub.getEAllStructuralFeatures();

    expect(h.sub.getEStructuralFeature(0)).toBe(all.get(0));
  });

  it('should let the first of two same-named features win', () => {
    // What the linear search did, and what EClassImpl preserves by putting a
    // duplicate back into the map.
    const h = hierarchy('duplicate');
    const shadowing = h.attribute('inherited');
    h.sub.getEStructuralFeatures().add(shadowing);

    const all = [...h.sub.getEAllStructuralFeatures()].filter(f => f.getName() === 'inherited');
    expect(all.length).toBe(2);
    expect(h.sub.getEStructuralFeature('inherited')).toBe(all[0]);
  });
});

describe('The cache follows the metamodel (#126)', () => {
  it('should see a feature added afterwards', () => {
    const h = hierarchy('added');
    expect(h.sub.getEStructuralFeature('later')).toBeNull();

    h.sub.getEStructuralFeatures().add(h.attribute('later'));

    expect(h.sub.getEStructuralFeature('later')?.getName()).toBe('later');
  });

  it('should forget a feature that was removed', () => {
    const h = hierarchy('removed');
    expect(h.sub.getEStructuralFeature('own')).toBe(h.own);

    h.sub.getEStructuralFeatures().remove(h.own);

    expect(h.sub.getEStructuralFeature('own')).toBeNull();
  });

  it('should follow a rename, under the new name and not the old', () => {
    // Renaming touches no list, so setName() bumps the revision itself.
    const h = hierarchy('renamed');
    expect(h.sub.getEStructuralFeature('own')).toBe(h.own);

    h.own.setName('renamed');

    expect(h.sub.getEStructuralFeature('renamed')).toBe(h.own);
    expect(h.sub.getEStructuralFeature('own')).toBeNull();
  });

  it('should see features of a super type added afterwards', () => {
    const h = hierarchy('supertype');
    const extra = new BasicEClass();
    extra.setName('Extra');
    extra.getEStructuralFeatures().add(h.attribute('fromExtra'));
    h.pkg.getEClassifiers().add(extra);
    expect(h.sub.getEStructuralFeature('fromExtra')).toBeNull();

    h.sub.getESuperTypes().add(extra);

    expect(h.sub.getEStructuralFeature('fromExtra')?.getName()).toBe('fromExtra');
  });

  it('should lose them again when the super type goes', () => {
    const h = hierarchy('supertype-removed');
    expect(h.sub.getEStructuralFeature('inherited')).toBe(h.inherited);

    h.sub.getESuperTypes().remove(h.base);

    expect(h.sub.getEStructuralFeature('inherited')).toBeNull();
  });

  it('should answer a renamed reference too', () => {
    const h = hierarchy('reference');
    const ref = new BasicEReference();
    ref.setName('target');
    ref.setEType(h.base);
    h.sub.getEStructuralFeatures().add(ref as unknown as EStructuralFeature);
    expect(h.sub.getEStructuralFeature('target')).toBe(ref);

    ref.setName('other');

    expect(h.sub.getEStructuralFeature('other')).toBe(ref);
    expect(h.sub.getEStructuralFeature('target')).toBeNull();
  });
});

/**
 * @fileoverview EClass.isSuperTypeOf() and the identity case (#107)
 *
 * A class is not among its own super types, so
 * `someClass.getEAllSuperTypes().includes(this)` alone answers false when
 * asked about the class itself. EClassImpl states the case explicitly:
 *
 *   return someClass == this || someClass.getEAllSuperTypes().contains(this);
 *
 * Every caller inside this library guarded the case itself, so nothing here
 * misbehaved; application code calling it directly got the wrong answer.
 *
 * @module tests/SuperTypeOf
 */
import { describe, it, expect } from 'vitest';
import { BasicEClass, BasicEPackage, BasicEAttribute, EcoreDataTypes, EcoreUtil } from '../src';
import type { EClass } from '../src/EClass.js';

/** A -> B -> C, each extending the one before, plus an unrelated class. */
function hierarchy() {
  const pkg = new BasicEPackage();
  pkg.setName('h');
  pkg.setNsURI('http://test.supertypeof/h');
  pkg.setNsPrefix('h');

  const make = (name: string, ...superTypes: EClass[]) => {
    const eClass = new BasicEClass();
    eClass.setName(name);
    for (const superType of superTypes) {
      eClass.getESuperTypes().add(superType);
    }
    pkg.getEClassifiers().add(eClass);
    return eClass;
  };

  const base = make('Base');
  const middle = make('Middle', base);
  const leaf = make('Leaf', middle);
  const other = make('Other');

  const attr = new BasicEAttribute();
  attr.setName('wert');
  attr.setEType(EcoreDataTypes.EString);
  base.getEStructuralFeatures().add(attr);

  return { pkg, base, middle, leaf, other };
}

describe('isSuperTypeOf covers the class itself (#107)', () => {
  it.each([
    ['a class and itself', (h: any) => [h.base, h.base], true],
    ['a leaf and itself', (h: any) => [h.leaf, h.leaf], true],
    ['a direct super type', (h: any) => [h.base, h.middle], true],
    ['a transitive super type', (h: any) => [h.base, h.leaf], true],
    ['the other direction', (h: any) => [h.leaf, h.base], false],
    ['an unrelated class', (h: any) => [h.base, h.other], false],
  ])('%s', (_label, pick, expected) => {
    const [superType, someClass] = pick(hierarchy());

    expect(superType.isSuperTypeOf(someClass)).toBe(expected);
  });
});

describe('What already worked keeps working (#107)', () => {
  it('should still recognise an instance of the class itself', () => {
    const h = hierarchy();
    const instance = h.pkg.getEFactoryInstance().create(h.base);

    expect(h.base.isInstance(instance)).toBe(true);
  });

  it('should still recognise an instance of a subclass', () => {
    const h = hierarchy();
    const instance = h.pkg.getEFactoryInstance().create(h.leaf);

    expect(h.base.isInstance(instance)).toBe(true);
  });

  it('should still reject an unrelated instance', () => {
    const h = hierarchy();
    const instance = h.pkg.getEFactoryInstance().create(h.other);

    expect(h.base.isInstance(instance)).toBe(false);
  });

  it('should leave EcoreUtil.isInstance unchanged', () => {
    const h = hierarchy();
    const instance = h.pkg.getEFactoryInstance().create(h.leaf);

    expect(EcoreUtil.isInstance(instance, h.base)).toBe(true);
    expect(EcoreUtil.isInstance(instance, h.other)).toBe(false);
  });
});

describe('EcoreUtil.isSuperTypeOf follows the same contract (#107)', () => {
  // Two functions of the same name with different answers for the same
  // question would be a trap, so this one counts a class as its own too.
  it.each([
    ['a class and itself', (h: any) => [h.base, h.base], true],
    ['a transitive super type', (h: any) => [h.base, h.leaf], true],
    ['an unrelated class', (h: any) => [h.base, h.other], false],
  ])('%s', (_label, pick, expected) => {
    const [superType, subType] = pick(hierarchy());

    expect(EcoreUtil.isSuperTypeOf(superType, subType)).toBe(expected);
  });
});

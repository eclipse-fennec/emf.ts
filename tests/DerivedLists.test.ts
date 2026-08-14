/**
 * @fileoverview Tests for EList-returning accessors and derived list caching
 *
 * All multi-valued accessors return an EList, matching Java EMF. Accessors that
 * own their contents are modifiable; derived accessors, which assemble their
 * result from the class and its supertypes, are read-only and cached until the
 * metamodel changes.
 *
 * @module tests/DerivedLists
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicEPackage,
  BasicEOperation,
  EcoreDataTypes,
  isEList,
  type EClass,
} from '../src';

function attribute(name: string): BasicEAttribute {
  const attr = new BasicEAttribute();
  attr.setName(name);
  attr.setEType(EcoreDataTypes.EString);
  return attr;
}

function reference(name: string, type: EClass, containment = false): BasicEReference {
  const ref = new BasicEReference();
  ref.setName(name);
  ref.setEType(type);
  ref.setContainment(containment);
  return ref;
}

describe('EList-returning accessors', () => {
  let pkg: BasicEPackage;
  let base: BasicEClass;
  let derived: BasicEClass;

  beforeEach(() => {
    pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.derived');

    base = new BasicEClass();
    base.setName('Base');
    base.addFeature(attribute('baseAttr'));
    pkg.getEClassifiers().add(base);

    derived = new BasicEClass();
    derived.setName('Derived');
    derived.getESuperTypes().add(base);
    derived.addFeature(attribute('ownAttr'));
    pkg.getEClassifiers().add(derived);
  });

  describe('owned accessors are modifiable ELists', () => {
    it('should return an EList from getESuperTypes', () => {
      expect(isEList(derived.getESuperTypes())).toBe(true);
      expect(derived.getESuperTypes().size()).toBe(1);
    });

    it('should let getESuperTypes be modified and take effect', () => {
      const another = new BasicEClass();
      another.setName('Another');

      derived.getESuperTypes().add(another);

      expect(derived.getESuperTypes().size()).toBe(2);
      expect(derived.getEAllSuperTypes().contains(another)).toBe(true);
    });

    it('should return an EList from getEOperations and accept additions', () => {
      const op = new BasicEOperation();
      op.setName('doIt');

      derived.getEOperations().add(op);

      expect(isEList(derived.getEOperations())).toBe(true);
      expect(derived.getEOperations().size()).toBe(1);
      expect(derived.getEAllOperations().contains(op)).toBe(true);
    });
  });

  describe('derived accessors are read-only', () => {
    it.each([
      'getEAllSuperTypes',
      'getEAllStructuralFeatures',
      'getEAttributes',
      'getEAllAttributes',
      'getEReferences',
      'getEAllReferences',
      'getEAllContainments',
      'getEAllOperations',
    ])('%s should refuse modification', accessor => {
      const list = (derived as any)[accessor]();

      expect(isEList(list)).toBe(true);
      expect(() => list.add(attribute('x'))).toThrow(/derived list and cannot be modified/);
      expect(() => list.clear()).toThrow(/derived list and cannot be modified/);
    });

    it('should name the accessor in the error message', () => {
      expect(() => (derived.getEAllStructuralFeatures() as any).add(attribute('x')))
        .toThrow(/getEAllStructuralFeatures/);
    });

    it('should still support reading', () => {
      const all = derived.getEAllStructuralFeatures();

      expect(all.size()).toBe(2);
      expect(all.map(f => f.getName())).toEqual(['baseAttr', 'ownAttr']);
      expect(all[0].getName()).toBe('baseAttr');
      expect([...all].length).toBe(2);
    });
  });

  describe('caching', () => {
    it('should return the identical list while the metamodel is unchanged', () => {
      // Java EMF caches derived lists per class, so repeated calls yield the
      // same list object.
      expect(derived.getEAllStructuralFeatures()).toBe(derived.getEAllStructuralFeatures());
      expect(derived.getEAllSuperTypes()).toBe(derived.getEAllSuperTypes());
    });

    it('should recompute after a feature is added to the class itself', () => {
      const before = derived.getEAllStructuralFeatures();

      derived.addFeature(attribute('added'));
      const after = derived.getEAllStructuralFeatures();

      expect(after).not.toBe(before);
      expect(after.size()).toBe(3);
      expect(after.map(f => f.getName())).toContain('added');
    });

    it('should recompute after a feature is added to a supertype', () => {
      // The invalidation has to reach subclasses, which is what ESuperAdapter
      // does in Java EMF.
      expect(derived.getEAllStructuralFeatures().size()).toBe(2);

      base.addFeature(attribute('lateBaseAttr'));

      expect(derived.getEAllStructuralFeatures().size()).toBe(3);
      expect(derived.getEAllStructuralFeatures().map(f => f.getName())).toContain('lateBaseAttr');
    });

    it('should recompute through two levels of inheritance', () => {
      const leaf = new BasicEClass();
      leaf.setName('Leaf');
      leaf.getESuperTypes().add(derived);
      pkg.getEClassifiers().add(leaf);

      expect(leaf.getEAllStructuralFeatures().size()).toBe(2);

      base.addFeature(attribute('grandparentAttr'));

      expect(leaf.getEAllStructuralFeatures().size()).toBe(3);
    });

    it('should recompute after a supertype is added', () => {
      const extra = new BasicEClass();
      extra.setName('Extra');
      extra.addFeature(attribute('extraAttr'));

      expect(derived.getEAllStructuralFeatures().size()).toBe(2);

      derived.getESuperTypes().add(extra);

      expect(derived.getEAllStructuralFeatures().size()).toBe(3);
    });

    it('should recompute after a feature is removed', () => {
      const doomed = attribute('doomed');
      derived.addFeature(doomed);
      expect(derived.getEAllStructuralFeatures().size()).toBe(3);

      derived.getEStructuralFeatures().remove(doomed);

      expect(derived.getEAllStructuralFeatures().size()).toBe(2);
    });

    it('should keep attribute and reference views in sync', () => {
      expect(derived.getEAllAttributes().size()).toBe(2);
      expect(derived.getEAllReferences().size()).toBe(0);

      derived.addFeature(reference('ref', base, true));

      expect(derived.getEAllReferences().size()).toBe(1);
      expect(derived.getEAllContainments().size()).toBe(1);
      expect(derived.getEAllAttributes().size()).toBe(2);
    });
  });

  describe('eSet on multi-valued features', () => {
    it('should accept a plain array', () => {
      const replacement = [attribute('r1'), attribute('r2')];
      const feature = derived.eClass().getEStructuralFeature('eStructuralFeatures')!;

      derived.eSet(feature, replacement);

      expect(derived.getEStructuralFeatures().map(f => f.getName())).toEqual(['r1', 'r2']);
    });

    it('should accept an EList', () => {
      // Before the unification this silently did nothing, because the eSet
      // implementations checked Array.isArray().
      const source = new BasicEClass();
      source.setName('Source');
      source.addFeature(attribute('fromSource'));
      const feature = derived.eClass().getEStructuralFeature('eStructuralFeatures')!;

      derived.eSet(feature, source.getEStructuralFeatures());

      expect(derived.getEStructuralFeatures().map(f => f.getName())).toEqual(['fromSource']);
    });

    it('should reflect eSet in the derived lists', () => {
      const feature = derived.eClass().getEStructuralFeature('eStructuralFeatures')!;

      derived.eSet(feature, [attribute('only')]);

      expect(derived.getEAllStructuralFeatures().map(f => f.getName())).toEqual(['baseAttr', 'only']);
    });
  });
});

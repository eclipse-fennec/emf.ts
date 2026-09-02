/**
 * @fileoverview Tests for containment of classifiers and subpackages (#80)
 *
 * Adding to a containment list has to set eContainer(), whichever list it is.
 * EClassifiersEList and ESubpackagesEList extended BasicEList, which knows
 * nothing about containment, while EClass.eStructuralFeatures used the
 * containment variant - so an EAttribute knew its EClass but an EClass did not
 * know its EPackage.
 *
 * Everything walking up the tree was affected and answered silently wrong:
 * EcoreUtil.getRootContainer(), isAncestor() and getURI().
 *
 * @module tests/Containment
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEDataType,
  BasicEEnum,
  EcoreDataTypes,
  EcoreUtil,
} from '../src';

describe('Containment of classifiers and subpackages (#80)', () => {
  let pkg: BasicEPackage;
  let eClass: BasicEClass;
  let attr: BasicEAttribute;
  let subPkg: BasicEPackage;

  beforeEach(() => {
    pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.containment/p');
    pkg.setNsPrefix('p');

    eClass = new BasicEClass();
    eClass.setName('A');
    pkg.getEClassifiers().add(eClass);

    attr = new BasicEAttribute();
    attr.setName('a1');
    attr.setEType(EcoreDataTypes.EString);
    eClass.getEStructuralFeatures().add(attr);

    subPkg = new BasicEPackage();
    subPkg.setName('sub');
    subPkg.setNsURI('http://test.containment/p/sub');
    subPkg.setNsPrefix('s');
    pkg.getESubpackages().add(subPkg);
  });

  describe('eContainer is set', () => {
    it('should set the container when a classifier is added', () => {
      expect((eClass as any).eContainer()).toBe(pkg);
    });

    it('should set the container when a subpackage is added', () => {
      expect((subPkg as any).eContainer()).toBe(pkg);
    });

    it('should keep setting the container for structural features', () => {
      // This worked before; pinned so the two paths cannot drift apart again.
      expect((attr as any).eContainer()).toBe(eClass);
    });

    it.each([
      ['EClass', () => new BasicEClass()],
      ['EDataType', () => new BasicEDataType()],
      ['EEnum', () => new BasicEEnum()],
    ])('should set the container for a %s', (_label, create) => {
      const classifier: any = create();
      classifier.setName('X');

      pkg.getEClassifiers().add(classifier);

      expect(classifier.eContainer()).toBe(pkg);
    });
  });

  describe('the inverse references still work', () => {
    it('should keep ePackage on the classifier', () => {
      expect(eClass.getEPackage()).toBe(pkg);
    });

    it('should keep eSuperPackage on the subpackage', () => {
      expect((subPkg as any).getESuperPackage()).toBe(pkg);
    });
  });

  describe('removal clears both', () => {
    it('should clear container and ePackage when a classifier is removed', () => {
      pkg.getEClassifiers().remove(eClass);

      expect((eClass as any).eContainer()).toBeNull();
      expect(eClass.getEPackage()).toBeNull();
    });

    it('should clear container when a subpackage is removed', () => {
      pkg.getESubpackages().remove(subPkg);

      expect((subPkg as any).eContainer()).toBeNull();
    });

    it('should clear the container on clear()', () => {
      pkg.getEClassifiers().clear();

      expect((eClass as any).eContainer()).toBeNull();
    });
  });

  describe('walking up the tree', () => {
    it('should reach the package from a classifier', () => {
      expect(EcoreUtil.getRootContainer(eClass)).toBe(pkg);
    });

    it('should reach the package from a feature, two levels up', () => {
      expect(EcoreUtil.getRootContainer(attr)).toBe(pkg);
    });

    it('should recognize the package as ancestor of a classifier', () => {
      expect(EcoreUtil.isAncestor(pkg, eClass)).toBe(true);
    });

    it('should recognize the package as ancestor of a nested feature', () => {
      expect(EcoreUtil.isAncestor(pkg, attr)).toBe(true);
    });

    it('should not claim an unrelated package as ancestor', () => {
      const other = new BasicEPackage();
      other.setName('other');
      other.setNsURI('http://test.containment/other');

      expect(EcoreUtil.isAncestor(other, eClass)).toBe(false);
    });

    it('should reach the root through a subpackage', () => {
      const nested = new BasicEClass();
      nested.setName('Nested');
      subPkg.getEClassifiers().add(nested);

      expect(EcoreUtil.getRootContainer(nested)).toBe(pkg);
      expect(EcoreUtil.isAncestor(pkg, nested)).toBe(true);
    });
  });

  describe('moving between packages', () => {
    it('should update the container when a classifier moves', () => {
      // Containment is exclusive: adding to another list detaches from the old
      // one, which is the behaviour EObjectContainmentEList brings along.
      subPkg.getEClassifiers().add(eClass);

      expect((eClass as any).eContainer()).toBe(subPkg);
      expect(eClass.getEPackage()).toBe(subPkg);
      expect(pkg.getEClassifiers().contains(eClass)).toBe(false);
    });
  });
});

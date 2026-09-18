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
  BasicEEnumLiteral,
  BasicEOperation,
  BasicEParameter,
  BasicEAnnotation,
  BasicETypeParameter,
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

/**
 * The same gap, at the six lists #80 did not cover (#98).
 *
 * eOperations, eParameters, eLiterals, eTypeParameters and the eAnnotations of
 * every class used createMetamodelEList(), which does not set eContainer. An
 * operation therefore had no fragment at all - getURIFragment() stopped at the
 * first step and returned the bare root - so nothing could reference it across
 * documents.
 */
describe('Containment of operations, parameters, literals and annotations (#98)', () => {
  function metamodel() {
    const pkg = new BasicEPackage();
    pkg.setName('m');
    pkg.setNsURI('http://test.containment/m');
    pkg.setNsPrefix('m');

    const eClass = new BasicEClass();
    eClass.setName('C');
    pkg.getEClassifiers().add(eClass);

    const operation = new BasicEOperation();
    operation.setName('op');
    eClass.getEOperations().add(operation);

    const parameter = new BasicEParameter();
    parameter.setName('p');
    operation.getEParameters().add(parameter);

    const eEnum = new BasicEEnum();
    eEnum.setName('E');
    pkg.getEClassifiers().add(eEnum);

    const literal = new BasicEEnumLiteral();
    literal.setName('L');
    eEnum.getELiterals().add(literal);

    const annotation = new BasicEAnnotation();
    annotation.setSource('http://example.org/doc');
    eClass.getEAnnotations().add(annotation);

    const typeParameter = new BasicETypeParameter();
    typeParameter.setName('T');
    eClass.getETypeParameters().add(typeParameter);

    return { pkg, eClass, operation, parameter, eEnum, literal, annotation, typeParameter };
  }

  describe('eContainer is set', () => {
    it.each([
      ['an operation', (m: any) => [m.operation, m.eClass]],
      ['a parameter', (m: any) => [m.parameter, m.operation]],
      ['an enum literal', (m: any) => [m.literal, m.eEnum]],
      ['an annotation', (m: any) => [m.annotation, m.eClass]],
      ['a type parameter', (m: any) => [m.typeParameter, m.eClass]],
      ['an annotation on a package', (m: any) => {
        const annotation = new BasicEAnnotation();
        annotation.setSource('http://example.org/pkg');
        m.pkg.getEAnnotations().add(annotation);
        return [annotation, m.pkg];
      }],
    ])('for %s', (_label, pick) => {
      const [child, expected] = pick(metamodel());

      expect(child.eContainer()).toBe(expected);
    });
  });

  describe('the typed back-references still work', () => {
    it('should keep eContainingClass, eOperation, eEnum and eModelElement', () => {
      const m = metamodel();

      expect(m.operation.getEContainingClass()).toBe(m.eClass);
      expect(m.parameter.getEOperation()).toBe(m.operation);
      expect(m.literal.getEEnum()).toBe(m.eEnum);
      expect(m.annotation.getEModelElement()).toBe(m.eClass);
    });

    it('should clear both sides on removal', () => {
      const m = metamodel();

      m.eClass.getEOperations().remove(m.operation);

      expect(m.operation.eContainer()).toBeNull();
      expect(m.operation.getEContainingClass()).toBeNull();
    });
  });

  describe('walking up the tree', () => {
    it('should reach the package from a parameter', () => {
      const m = metamodel();

      expect(EcoreUtil.getRootContainer(m.parameter)).toBe(m.pkg);
    });

    it('should see the package as an ancestor of an operation', () => {
      const m = metamodel();

      expect(EcoreUtil.isAncestor(m.pkg, m.operation)).toBe(true);
    });
  });
});

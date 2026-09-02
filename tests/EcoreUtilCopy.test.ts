/**
 * @fileoverview Tests for EcoreUtil.copy / copyAll / Copier (#79)
 *
 * EcoreUtil.copy used to copy attribute values of the given object only, so
 * containment children were lost. Java EMF copies deeply through Copier:
 * children come along, cross-references whose target lies inside the copied
 * tree point at the copy, and references leaving the tree stay on the original.
 *
 * @module tests/EcoreUtilCopy
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicEOperation,
  EcoreDataTypes,
  EcoreUtil,
  Copier,
} from '../src';
import type { EClass } from '../src/EClass.js';

function attribute(name: string): BasicEAttribute {
  const attr = new BasicEAttribute();
  attr.setName(name);
  attr.setEType(EcoreDataTypes.EString);
  return attr;
}

describe('EcoreUtil.copy copies deeply (#79)', () => {
  let pkg: BasicEPackage;
  let sensor: BasicEClass;

  beforeEach(() => {
    pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.copy/p');
    pkg.setNsPrefix('p');

    sensor = new BasicEClass();
    sensor.setName('Sensor');
    pkg.getEClassifiers().add(sensor);
    sensor.getEStructuralFeatures().add(attribute('a'));
    sensor.getEStructuralFeatures().add(attribute('b'));

    const op = new BasicEOperation();
    op.setName('measure');
    sensor.getEOperations().add(op);
  });

  it('should bring the containment children along', () => {
    // The reported case: two features and one operation went missing.
    const copy = EcoreUtil.copy(sensor);

    expect(copy.getName()).toBe('Sensor');
    expect(copy.getEStructuralFeatures().size()).toBe(2);
    expect(copy.getEOperations().size()).toBe(1);
  });

  it('should produce independent children, not shared ones', () => {
    const copy = EcoreUtil.copy(sensor);

    expect(copy).not.toBe(sensor);
    expect(copy.getEStructuralFeatures().get(0)).not.toBe(sensor.getEStructuralFeatures().get(0));
    expect(copy.getEStructuralFeatures().map(f => f.getName())).toEqual(['a', 'b']);
  });

  it('should keep references out of the copied tree on the original target', () => {
    // What the report asks for: the copied attributes keep pointing at the same
    // EString, not at a copy of it.
    const copy = EcoreUtil.copy(sensor);

    expect(copy.getEStructuralFeatures().get(0).getEType()).toBe(EcoreDataTypes.EString);
  });

  it('should set the container of copied children to the copy', () => {
    const copy = EcoreUtil.copy(sensor);

    expect((copy.getEStructuralFeatures().get(0) as any).eContainer()).toBe(copy);
  });

  it('should copy a whole package including subpackages', () => {
    const sub = new BasicEPackage();
    sub.setName('sub');
    sub.setNsURI('http://test.copy/p/sub');
    sub.setNsPrefix('s');
    pkg.getESubpackages().add(sub);

    const copy = EcoreUtil.copy(pkg);

    expect(copy.getEClassifiers().size()).toBe(1);
    expect(copy.getESubpackages().size()).toBe(1);
    expect((copy.getEClassifiers().get(0) as EClass).getEStructuralFeatures().size()).toBe(2);
    expect((copy.getEClassifiers().get(0) as any).eContainer()).toBe(copy);
  });

  it('should not modify the original', () => {
    EcoreUtil.copy(sensor);

    expect(sensor.getEStructuralFeatures().size()).toBe(2);
    expect(sensor.getEOperations().size()).toBe(1);
    expect(pkg.getEClassifiers().contains(sensor)).toBe(true);
  });
});

describe('Cross-references when copying (#79)', () => {
  let pkg: BasicEPackage;
  let a: BasicEClass;
  let b: BasicEClass;

  beforeEach(() => {
    pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.copy/refs');
    pkg.setNsPrefix('p');

    a = new BasicEClass();
    a.setName('A');
    pkg.getEClassifiers().add(a);

    b = new BasicEClass();
    b.setName('B');
    pkg.getEClassifiers().add(b);

    // A.ref -> B, a non-containment reference between two separate classes
    const ref = new BasicEReference();
    ref.setName('ref');
    ref.setEType(b);
    ref.setContainment(false);
    a.getEStructuralFeatures().add(ref);

    b.getESuperTypes().add(a);
  });

  it('should redirect references to the copy when both are copied together', () => {
    const [copyA, copyB] = EcoreUtil.copyAll([a, b]);

    expect(copyA.getEStructuralFeatures().get(0).getEType()).toBe(copyB);
    expect(copyB.getESuperTypes().get(0)).toBe(copyA);
  });

  it('should leave a reference on the original when only one side is copied', () => {
    // Copying A alone makes B external, so the reference stays on the original.
    const copyA = EcoreUtil.copy(a);

    expect(copyA.getEStructuralFeatures().get(0).getEType()).toBe(b);
  });

  it('should redirect references inside a copied package', () => {
    // Copying the package copies both classes, so the reference between them
    // has to follow into the copy.
    const copy = EcoreUtil.copy(pkg);
    const copyA = copy.getEClassifiers().get(0) as EClass;
    const copyB = copy.getEClassifiers().get(1) as EClass;

    expect(copyA.getEStructuralFeatures().get(0).getEType()).toBe(copyB);
    expect(copyB.getESuperTypes().get(0)).toBe(copyA);
  });

  it('should copy several objects with one call to copyAll', () => {
    const copies = EcoreUtil.copyAll([a, b]);

    expect(copies).toHaveLength(2);
    expect(copies[0]).not.toBe(a);
    expect(copies[1]).not.toBe(b);
  });
});

describe('Copier (#79)', () => {
  it('should expose the mapping from original to copy', () => {
    // What Java's Copier is used for, where it is a Map subclass.
    const pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.copy/copier');
    const eClass = new BasicEClass();
    eClass.setName('A');
    pkg.getEClassifiers().add(eClass);
    const attr = attribute('x');
    eClass.getEStructuralFeatures().add(attr);

    const copier = new Copier();
    const copy = copier.copy(eClass);
    copier.copyReferences();

    expect(copier.mapping.get(eClass)).toBe(copy);
    expect(copier.mapping.get(attr)).toBe((copy as EClass).getEStructuralFeatures().get(0));
  });

  it('should return the same copy when an object is copied twice', () => {
    const eClass = new BasicEClass();
    eClass.setName('A');
    const pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.copy/twice');
    pkg.getEClassifiers().add(eClass);

    const copier = new Copier();

    expect(copier.copy(eClass)).toBe(copier.copy(eClass));
  });
});

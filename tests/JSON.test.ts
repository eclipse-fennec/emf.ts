/**
 * @fileoverview JSON Codec Tests - adapted from emfjson-jackson Java test suite
 *
 * Based on: https://github.com/emfjson/emfjson-jackson
 *   src/test/java/org/emfjson/jackson/tests/
 *
 * Adapted test classes:
 * - ValueTest.java        -> "Value Serialization" (string, int, boolean, null, multi-valued)
 * - ContainmentTest.java  -> "Containment" (single, many, nested, proxy containment)
 * - ReferenceTest.java    -> "References" (single, many, cross-resource $ref)
 * - EnumTest.java         -> "Enums" (literal names, default omission)
 * - PolymorphicTest.java  -> "Polymorphic Types" (eClass for subtypes)
 * - NoTypeTest.java       -> "No Type Mode" (omit eClass)
 * - ReaderTest.java       -> "Reader Robustness" (field order, unknown features)
 * - ExternalReferencesTest.java -> "External References" ($ref URIs)
 * - DynamicInstanceTest.java    -> "Dynamic Instances"
 * - DynamicContainmentTest.java -> "Dynamic Containment"
 * - DynamicValueTest.java       -> "Dynamic Values"
 * - ModuleTest.java       -> "Module / Factory Registration"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  JSONResource,
  JSONResourceFactory,
  OPTION_SERIALIZE_TYPE,
  SERIALIZE_TYPE_ALWAYS,
  SERIALIZE_TYPE_POLYMORPHIC,
} from '../src/json';
import { URI } from '../src/URI';
import { Resource } from '../src/Resource';
import { BasicEPackage } from '../src/runtime/BasicEPackage';
import { BasicEClass } from '../src/runtime/BasicEClass';
import { BasicEFactory } from '../src/runtime/BasicEFactory';
import { BasicEAttribute } from '../src/runtime/BasicEAttribute';
import { BasicEDataType } from '../src/runtime/BasicEDataType';
import { BasicEReference } from '../src/runtime/BasicEReference';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { EProxyImpl } from '../src/runtime/EProxyImpl';
import { EObject } from '../src/EObject';

// ─── Shared model setup ──────────────────────────────────────────────
// Mirrors the Xcore model from emfjson-jackson's test suite but built
// dynamically (no code generation).

function createTestModel() {
  const resourceSet = new BasicResourceSet();

  // ── Package ────────────────────────────────────────────────────
  const pkg = new BasicEPackage();
  pkg.setName('model');
  pkg.setNsURI('http://www.emfjson.org/jackson/model');
  pkg.setNsPrefix('model');

  const factory = new BasicEFactory();
  factory.setEPackage(pkg);
  pkg.setEFactoryInstance(factory);

  // ── Data types ─────────────────────────────────────────────────
  const EString = new BasicEDataType();
  EString.setName('EString');
  EString.setInstanceClassName('string');
  EString.setEPackage(pkg);
  pkg.getEClassifiers().push(EString);

  const EInt = new BasicEDataType();
  EInt.setName('EInt');
  EInt.setInstanceClassName('number');
  EInt.setEPackage(pkg);
  pkg.getEClassifiers().push(EInt);

  const EBoolean = new BasicEDataType();
  EBoolean.setName('EBoolean');
  EBoolean.setInstanceClassName('boolean');
  EBoolean.setEPackage(pkg);
  pkg.getEClassifiers().push(EBoolean);

  // ── Helper to create attribute ─────────────────────────────────
  function attr(name: string, type: BasicEDataType, many = false) {
    const a = new BasicEAttribute();
    a.setName(name);
    a.setEType(type);
    if (many) a.setUpperBound(-1);
    return a;
  }
  function ref(name: string, type: BasicEClass, containment: boolean, many = false) {
    const r = new BasicEReference();
    r.setName(name);
    r.setEType(type);
    r.setContainment(containment);
    if (many) r.setUpperBound(-1);
    return r;
  }

  // ── ETypes class (from ValueTest) ──────────────────────────────
  const ETypes = new BasicEClass();
  ETypes.setName('ETypes');
  ETypes.setEPackage(pkg);
  pkg.getEClassifiers().push(ETypes);
  ETypes.getEStructuralFeatures().push(attr('eString', EString));
  ETypes.getEStructuralFeatures().push(attr('eStrings', EString, true));
  ETypes.getEStructuralFeatures().push(attr('eInt', EInt));
  ETypes.getEStructuralFeatures().push(attr('eInts', EInt, true));
  ETypes.getEStructuralFeatures().push(attr('eBoolean', EBoolean));
  ETypes.getEStructuralFeatures().push(attr('eBooleans', EBoolean, true));

  // ── User class ─────────────────────────────────────────────────
  const User = new BasicEClass();
  User.setName('User');
  User.setEPackage(pkg);
  pkg.getEClassifiers().push(User);
  User.getEStructuralFeatures().push(attr('userId', EString));
  User.getEStructuralFeatures().push(attr('name', EString));

  // ── Address class ──────────────────────────────────────────────
  const Address = new BasicEClass();
  Address.setName('Address');
  Address.setEPackage(pkg);
  pkg.getEClassifiers().push(Address);
  Address.getEStructuralFeatures().push(attr('addId', EString));
  Address.getEStructuralFeatures().push(attr('city', EString));
  Address.getEStructuralFeatures().push(attr('street', EString));
  Address.getEStructuralFeatures().push(attr('number', EInt));

  // User.address (single containment)
  User.getEStructuralFeatures().push(ref('address', Address, true));
  // User.uniqueFriend (single non-containment)
  User.getEStructuralFeatures().push(ref('uniqueFriend', User, false));
  // User.friends (many non-containment)
  User.getEStructuralFeatures().push(ref('friends', User, false, true));

  // ── Node class (tree) ──────────────────────────────────────────
  const Node = new BasicEClass();
  Node.setName('Node');
  Node.setEPackage(pkg);
  pkg.getEClassifiers().push(Node);
  Node.getEStructuralFeatures().push(attr('label', EString));
  Node.getEStructuralFeatures().push(ref('child', Node, true, true));
  Node.getEStructuralFeatures().push(ref('target', Node, false));

  // ── Container class ────────────────────────────────────────────
  const Container = new BasicEClass();
  Container.setName('Container');
  Container.setEPackage(pkg);
  pkg.getEClassifiers().push(Container);

  // ── AbstractType (abstract base) ───────────────────────────────
  const AbstractType = new BasicEClass();
  AbstractType.setName('AbstractType');
  AbstractType.setAbstract(true);
  AbstractType.setEPackage(pkg);
  pkg.getEClassifiers().push(AbstractType);
  AbstractType.getEStructuralFeatures().push(attr('name', EString));

  // ── ConcreteTypeOne ────────────────────────────────────────────
  const ConcreteTypeOne = new BasicEClass();
  ConcreteTypeOne.setName('ConcreteTypeOne');
  ConcreteTypeOne.setEPackage(pkg);
  ConcreteTypeOne.getESuperTypes().push(AbstractType);
  pkg.getEClassifiers().push(ConcreteTypeOne);
  ConcreteTypeOne.getEStructuralFeatures().push(ref('refProperty', AbstractType, false, true));

  // ── ConcreteTypeTwo ────────────────────────────────────────────
  const ConcreteTypeTwo = new BasicEClass();
  ConcreteTypeTwo.setName('ConcreteTypeTwo');
  ConcreteTypeTwo.setEPackage(pkg);
  ConcreteTypeTwo.getESuperTypes().push(AbstractType);
  pkg.getEClassifiers().push(ConcreteTypeTwo);

  // Container.elements (many containment, typed as AbstractType)
  Container.getEStructuralFeatures().push(ref('elements', AbstractType, true, true));

  // ── PrimaryObject ──────────────────────────────────────────────
  const PrimaryObject = new BasicEClass();
  PrimaryObject.setName('PrimaryObject');
  PrimaryObject.setEPackage(pkg);
  pkg.getEClassifiers().push(PrimaryObject);
  PrimaryObject.getEStructuralFeatures().push(attr('name', EString));

  // ── TargetObject ───────────────────────────────────────────────
  const TargetObject = new BasicEClass();
  TargetObject.setName('TargetObject');
  TargetObject.setEPackage(pkg);
  pkg.getEClassifiers().push(TargetObject);
  TargetObject.getEStructuralFeatures().push(attr('singleAttribute', EString));

  // PrimaryObject -> singleContainmentReferenceNoProxies (single containment)
  PrimaryObject.getEStructuralFeatures().push(ref('singleContainmentReferenceNoProxies', TargetObject, true));
  // PrimaryObject -> multipleContainmentReferenceNoProxies (many containment)
  PrimaryObject.getEStructuralFeatures().push(ref('multipleContainmentReferenceNoProxies', TargetObject, true, true));
  // PrimaryObject -> singleNonContainmentReference (single non-containment)
  PrimaryObject.getEStructuralFeatures().push(ref('singleNonContainmentReference', TargetObject, false));
  // PrimaryObject -> multipleNonContainmentReference (many non-containment)
  PrimaryObject.getEStructuralFeatures().push(ref('multipleNonContainmentReference', TargetObject, false, true));

  // Register
  resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

  return {
    resourceSet, pkg, factory,
    EString, EInt, EBoolean,
    ETypes, User, Address, Node,
    Container, AbstractType, ConcreteTypeOne, ConcreteTypeTwo,
    PrimaryObject, TargetObject,
  };
}

// Helper: shorthand feature getter
function f(cls: BasicEClass, name: string) {
  return cls.getEStructuralFeature(name)!;
}

const nsURI = 'http://www.emfjson.org/jackson/model';

// =====================================================================
// Tests
// =====================================================================

describe('JSON Codec (adapted from emfjson-jackson)', () => {
  let m: ReturnType<typeof createTestModel>;

  beforeEach(() => {
    m = createTestModel();
  });

  // ── ModuleTest / Factory Registration ──────────────────────────
  describe('Module / Factory Registration (ModuleTest)', () => {
    it('should auto-register .json extension factory', () => {
      const map = Resource.INSTANCE_FACTORY_REGISTRY.getExtensionToFactoryMap();
      expect(map.has('json')).toBe(true);
      expect(map.get('json')).toBeInstanceOf(JSONResourceFactory);
    });

    it('should create JSONResource via factory', () => {
      const fac = new JSONResourceFactory();
      const res = fac.createResource(URI.createURI('test://model.json'));
      expect(res).toBeInstanceOf(JSONResource);
    });

    it('should save a single EClass-like object (testSaveWithModule analog)', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.User);
      obj.eSet(f(m.User, 'userId'), 'u1');
      obj.eSet(f(m.User, 'name'), 'Paul');
      res.getContents().push(obj);

      const json = res.saveToString();
      const parsed = JSON.parse(json);

      expect(parsed.eClass).toBe(`${nsURI}#//User`);
      expect(parsed.userId).toBe('u1');
      expect(parsed.name).toBe('Paul');
    });
  });

  // ── ValueTest ──────────────────────────────────────────────────
  describe('Value Serialization (ValueTest)', () => {
    // --- testStringValues ---
    it('should save string values', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.ETypes);
      obj.eSet(f(m.ETypes, 'eString'), 'Hello');

      res.getContents().push(obj);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eClass).toBe(`${nsURI}#//ETypes`);
      expect(parsed.eString).toBe('Hello');
    });

    // --- testLoadStringValues ---
    it('should load string values', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//ETypes`,
        eString: 'Hello',
      }));

      const obj = res.getContents().get(0);
      expect(obj.eGet(f(m.ETypes, 'eString'))).toBe('Hello');
    });

    // --- testStringValues multi-valued ---
    it('should save multi-valued string attributes as JSON array', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.ETypes);
      const list = obj.eGet(f(m.ETypes, 'eStrings')) as any[];
      list.push('Hello');
      list.push('The');
      list.push('World');

      res.getContents().push(obj);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eStrings).toEqual(['Hello', 'The', 'World']);
    });

    // --- testLoadStringValues multi-valued ---
    it('should load multi-valued string attributes from JSON array', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//ETypes`,
        eStrings: ['Hello', 'The', 'World'],
      }));

      const obj = res.getContents().get(0);
      const list = obj.eGet(f(m.ETypes, 'eStrings')) as any[];
      expect([...list]).toEqual(['Hello', 'The', 'World']);
    });

    // --- testIntValues ---
    it('should save int values as JSON numbers', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.ETypes);
      obj.eSet(f(m.ETypes, 'eInt'), 2);

      res.getContents().push(obj);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eInt).toBe(2);
    });

    // --- testLoadIntValues ---
    it('should load int values from JSON numbers', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//ETypes`,
        eInt: 2,
      }));

      const obj = res.getContents().get(0);
      expect(obj.eGet(f(m.ETypes, 'eInt'))).toBe(2);
    });

    // --- testIntValues multi-valued ---
    it('should save multi-valued int attributes as JSON array', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.ETypes);
      const list = obj.eGet(f(m.ETypes, 'eInts')) as any[];
      list.push(2);
      list.push(4);
      list.push(7);

      res.getContents().push(obj);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eInts).toEqual([2, 4, 7]);
    });

    // --- testLoadIntValues multi-valued ---
    it('should load multi-valued int attributes from JSON array', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//ETypes`,
        eInts: [2, 4, 7],
      }));

      const obj = res.getContents().get(0);
      const list = obj.eGet(f(m.ETypes, 'eInts')) as any[];
      expect([...list]).toEqual([2, 4, 7]);
    });

    // --- testBooleanValues ---
    it('should save boolean values as JSON booleans', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.ETypes);
      obj.eSet(f(m.ETypes, 'eBoolean'), true);

      res.getContents().push(obj);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eBoolean).toBe(true);
    });

    // --- testBooleanValues multi-valued ---
    it('should save multi-valued boolean attributes as JSON array', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const obj = m.factory.create(m.ETypes);
      const list = obj.eGet(f(m.ETypes, 'eBooleans')) as any[];
      list.push(false);
      list.push(true);

      res.getContents().push(obj);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eBooleans).toEqual([false, true]);
    });

    // --- testLoadNullValue ---
    it('should load null attribute value', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//ETypes`,
        eString: null,
      }));

      const obj = res.getContents().get(0);
      // null attribute should remain null/undefined
      const val = obj.eGet(f(m.ETypes, 'eString'));
      expect(val === null || val === undefined).toBe(true);
    });
  });

  // ── ContainmentTest ────────────────────────────────────────────
  describe('Containment (ContainmentTest)', () => {
    // --- testSaveOneRootObjectWithAttributes ---
    it('should save one root object with attributes', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const user = m.factory.create(m.User);
      user.eSet(f(m.User, 'userId'), '1');
      user.eSet(f(m.User, 'name'), 'John');
      res.getContents().push(user);

      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eClass).toBe(`${nsURI}#//User`);
      expect(parsed.userId).toBe('1');
      expect(parsed.name).toBe('John');
    });

    // --- testSaveTwoRootObjectsWithAttributesNoReferences ---
    it('should save two root objects as JSON array', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const u1 = m.factory.create(m.User);
      u1.eSet(f(m.User, 'userId'), '1');
      u1.eSet(f(m.User, 'name'), 'John');

      const u2 = m.factory.create(m.User);
      u2.eSet(f(m.User, 'userId'), '2');
      u2.eSet(f(m.User, 'name'), 'Mary');

      res.getContents().push(u1);
      res.getContents().push(u2);

      const parsed = JSON.parse(res.saveToString());

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].userId).toBe('1');
      expect(parsed[0].name).toBe('John');
      expect(parsed[1].userId).toBe('2');
      expect(parsed[1].name).toBe('Mary');
    });

    // --- testSaveOneObjectWithOneChild ---
    it('should save single containment as nested object', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const user = m.factory.create(m.User);
      user.eSet(f(m.User, 'userId'), 'u1');
      user.eSet(f(m.User, 'name'), 'Paul');

      const addr = m.factory.create(m.Address);
      addr.eSet(f(m.Address, 'addId'), 'a1');
      user.eSet(f(m.User, 'address'), addr);

      res.getContents().push(user);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.address).toBeDefined();
      expect(typeof parsed.address).toBe('object');
      expect(parsed.address.addId).toBe('a1');
    });

    // --- testLoadOneObjectWithOneChild ---
    it('should load single containment from nested object', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        userId: 'u1',
        name: 'Paul',
        address: { addId: 'a1' },
      }));

      const user = res.getContents().get(0);
      expect(user.eGet(f(m.User, 'name'))).toBe('Paul');
      const addr = user.eGet(f(m.User, 'address')) as EObject;
      expect(addr).toBeDefined();
      expect(addr.eClass().getName()).toBe('Address');
      expect(addr.eGet(f(m.Address, 'addId'))).toBe('a1');
    });

    // --- testSaveOneObjectWithManyChildren ---
    it('should save many containment as JSON array', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const root = m.factory.create(m.Node);
      root.eSet(f(m.Node, 'label'), 'root');

      const c1 = m.factory.create(m.Node);
      c1.eSet(f(m.Node, 'label'), 'c1');
      const c2 = m.factory.create(m.Node);
      c2.eSet(f(m.Node, 'label'), 'c2');
      const c3 = m.factory.create(m.Node);
      c3.eSet(f(m.Node, 'label'), 'c3');

      const children = root.eGet(f(m.Node, 'child')) as any[];
      children.push(c1);
      children.push(c2);
      children.push(c3);

      res.getContents().push(root);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.child).toHaveLength(3);
      expect(parsed.child[0].label).toBe('c1');
      expect(parsed.child[1].label).toBe('c2');
      expect(parsed.child[2].label).toBe('c3');
    });

    // --- testLoadOneObjectWithManyChildren ---
    it('should load many containment from JSON array', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//Node`,
        label: 'root',
        child: [
          { label: 'c1' },
          { label: 'c2' },
          { label: 'c3' },
        ],
      }));

      const root = res.getContents().get(0);
      expect(root.eGet(f(m.Node, 'label'))).toBe('root');
      const children = root.eGet(f(m.Node, 'child')) as any[];
      expect(children).toHaveLength(3);
      expect(children[0].eGet(f(m.Node, 'label'))).toBe('c1');
      expect(children[1].eGet(f(m.Node, 'label'))).toBe('c2');
      expect(children[2].eGet(f(m.Node, 'label'))).toBe('c3');
    });

    // --- testSaveProxyContainment ---
    it('should save proxy containment as $ref within containment array', () => {
      const res = new JSONResource(URI.createURI('test://source.json'));
      res.setResourceSet(m.resourceSet);

      const root = m.factory.create(m.Node);
      root.eSet(f(m.Node, 'label'), '2');

      const proxy = new EProxyImpl(URI.createURI('proxy.json#/'), m.Node);
      const children = root.eGet(f(m.Node, 'child')) as any[];
      children.push(proxy);

      res.getContents().push(root);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.label).toBe('2');
      expect(parsed.child).toHaveLength(1);
      // Proxy inside containment serializes as $ref
      expect(parsed.child[0].$ref).toBe('proxy.json#/');
    });

    // --- deep hierarchy: PrimaryObject > TargetObject containment ---
    it('should save/load single containment reference (PrimaryObject.singleContainment)', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const primary = m.factory.create(m.PrimaryObject);
      primary.eSet(f(m.PrimaryObject, 'name'), 'TheSource');

      const target = m.factory.create(m.TargetObject);
      target.eSet(f(m.TargetObject, 'singleAttribute'), 'Foo');
      primary.eSet(f(m.PrimaryObject, 'singleContainmentReferenceNoProxies'), target);

      res.getContents().push(primary);
      const jsonStr = res.saveToString();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.name).toBe('TheSource');
      expect(parsed.singleContainmentReferenceNoProxies).toBeDefined();
      expect(parsed.singleContainmentReferenceNoProxies.singleAttribute).toBe('Foo');

      // Round-trip
      const res2 = new JSONResource(URI.createURI('test://in.json'));
      res2.setResourceSet(m.resourceSet);
      res2.loadFromString(jsonStr);

      const loaded = res2.getContents().get(0);
      expect(loaded.eGet(f(m.PrimaryObject, 'name'))).toBe('TheSource');
      const contained = loaded.eGet(f(m.PrimaryObject, 'singleContainmentReferenceNoProxies')) as EObject;
      expect(contained.eClass().getName()).toBe('TargetObject');
      expect(contained.eGet(f(m.TargetObject, 'singleAttribute'))).toBe('Foo');
    });

    // --- many containment: PrimaryObject.multipleContainment ---
    it('should save/load many containment reference', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const primary = m.factory.create(m.PrimaryObject);
      primary.eSet(f(m.PrimaryObject, 'name'), 'source');

      const t1 = m.factory.create(m.TargetObject);
      t1.eSet(f(m.TargetObject, 'singleAttribute'), 'A');
      const t2 = m.factory.create(m.TargetObject);
      t2.eSet(f(m.TargetObject, 'singleAttribute'), 'B');

      const list = primary.eGet(f(m.PrimaryObject, 'multipleContainmentReferenceNoProxies')) as any[];
      list.push(t1);
      list.push(t2);

      res.getContents().push(primary);
      const jsonStr = res.saveToString();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.multipleContainmentReferenceNoProxies).toHaveLength(2);
      expect(parsed.multipleContainmentReferenceNoProxies[0].singleAttribute).toBe('A');
      expect(parsed.multipleContainmentReferenceNoProxies[1].singleAttribute).toBe('B');

      // Round-trip
      const res2 = new JSONResource(URI.createURI('test://in.json'));
      res2.setResourceSet(m.resourceSet);
      res2.loadFromString(jsonStr);

      const lp = res2.getContents().get(0);
      const llist = lp.eGet(f(m.PrimaryObject, 'multipleContainmentReferenceNoProxies')) as any[];
      expect(llist).toHaveLength(2);
      expect(llist[0].eGet(f(m.TargetObject, 'singleAttribute'))).toBe('A');
      expect(llist[1].eGet(f(m.TargetObject, 'singleAttribute'))).toBe('B');
    });
  });

  // ── ReferenceTest ──────────────────────────────────────────────
  describe('References (ReferenceTest)', () => {
    // --- testSaveTwoObjectsWithAttributesOneReference ---
    it('should save two root objects where one references the other via $ref', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const u1 = m.factory.create(m.User);
      u1.eSet(f(m.User, 'userId'), '1');
      u1.eSet(f(m.User, 'name'), 'John');

      const u2 = m.factory.create(m.User);
      u2.eSet(f(m.User, 'userId'), '2');
      u2.eSet(f(m.User, 'name'), 'Mary');

      u1.eSet(f(m.User, 'uniqueFriend'), u2);

      res.getContents().push(u1);
      res.getContents().push(u2);

      const parsed = JSON.parse(res.saveToString());

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe('John');
      expect(parsed[0].uniqueFriend).toBeDefined();
      expect(parsed[0].uniqueFriend.$ref).toBeDefined();
      expect(parsed[1].name).toBe('Mary');
    });

    // --- testLoadTwoObjectsWithAttributesOneReference ---
    it('should load a single non-containment $ref between two root objects', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      // First save so we get valid $ref URIs
      const resSave = new JSONResource(URI.createURI('test://in.json'));
      resSave.setResourceSet(m.resourceSet);

      const u1 = m.factory.create(m.User);
      u1.eSet(f(m.User, 'userId'), '1');
      u1.eSet(f(m.User, 'name'), 'John');

      const u2 = m.factory.create(m.User);
      u2.eSet(f(m.User, 'userId'), '2');
      u2.eSet(f(m.User, 'name'), 'Mary');

      u1.eSet(f(m.User, 'uniqueFriend'), u2);
      resSave.getContents().push(u1);
      resSave.getContents().push(u2);

      const jsonStr = resSave.saveToString();

      // Load
      res.loadFromString(jsonStr);
      expect(res.getContents().size()).toBe(2);
      expect(res.getContents().get(0).eGet(f(m.User, 'name'))).toBe('John');
      expect(res.getContents().get(1).eGet(f(m.User, 'name'))).toBe('Mary');
    });

    // --- testLoadWithExternalReference ---
    it('should create proxy for external cross-resource $ref', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        userId: '2',
        uniqueFriend: { $ref: 'http://resources/first#1' },
      }));

      const user = res.getContents().get(0);
      const friend = user.eGet(f(m.User, 'uniqueFriend'));
      expect(friend).toBeDefined();
      expect(friend.eIsProxy()).toBe(true);
      expect(friend.eProxyURI().toString()).toBe('http://resources/first#1');
    });

    // --- many non-containment references ---
    it('should save many non-containment references as $ref array', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const primary = m.factory.create(m.PrimaryObject);
      primary.eSet(f(m.PrimaryObject, 'name'), 'obj1');

      const t1 = m.factory.create(m.TargetObject);
      t1.eSet(f(m.TargetObject, 'singleAttribute'), 'A');
      const t2 = m.factory.create(m.TargetObject);
      t2.eSet(f(m.TargetObject, 'singleAttribute'), 'B');

      // containment first
      const clist = primary.eGet(f(m.PrimaryObject, 'multipleContainmentReferenceNoProxies')) as any[];
      clist.push(t1);
      clist.push(t2);

      // non-containment references
      const rlist = primary.eGet(f(m.PrimaryObject, 'multipleNonContainmentReference')) as any[];
      rlist.push(t1);
      rlist.push(t2);

      res.getContents().push(primary);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.multipleNonContainmentReference).toHaveLength(2);
      expect(parsed.multipleNonContainmentReference[0].$ref).toBeDefined();
      expect(parsed.multipleNonContainmentReference[1].$ref).toBeDefined();
    });

    // --- external $ref with proxy ---
    it('should serialize proxy reference with external URI as $ref', () => {
      const res = new JSONResource(URI.createURI('test://source.json'));
      res.setResourceSet(m.resourceSet);

      const primary = m.factory.create(m.PrimaryObject);
      primary.eSet(f(m.PrimaryObject, 'name'), 'src');

      const proxy = new EProxyImpl(URI.createURI('target.json#/'), m.TargetObject);
      primary.eSet(f(m.PrimaryObject, 'singleNonContainmentReference'), proxy);

      res.getContents().push(primary);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.singleNonContainmentReference.$ref).toBe('target.json#/');
    });
  });

  // ── PolymorphicTest ────────────────────────────────────────────
  describe('Polymorphic Types (PolymorphicTest)', () => {
    // --- testSaveTwoObjectsWithTypeInformation ---
    it('should write eClass for each element in polymorphic containment', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const container = m.factory.create(m.Container);
      const c1 = m.factory.create(m.ConcreteTypeOne);
      c1.eSet(f(m.AbstractType, 'name'), 'First');
      const c2 = m.factory.create(m.ConcreteTypeTwo);
      c2.eSet(f(m.AbstractType, 'name'), 'Two');

      const elements = container.eGet(f(m.Container, 'elements')) as any[];
      elements.push(c1);
      elements.push(c2);

      res.getContents().push(container);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.elements).toHaveLength(2);
      expect(parsed.elements[0].eClass).toBe(`${nsURI}#//ConcreteTypeOne`);
      expect(parsed.elements[0].name).toBe('First');
      expect(parsed.elements[1].eClass).toBe(`${nsURI}#//ConcreteTypeTwo`);
      expect(parsed.elements[1].name).toBe('Two');
    });

    // --- testLoadTwoObjectsWithTypeInformation ---
    it('should load polymorphic containment children using eClass', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//Container`,
        elements: [
          { eClass: `${nsURI}#//ConcreteTypeOne`, name: 'First' },
          { eClass: `${nsURI}#//ConcreteTypeTwo`, name: 'Two' },
        ],
      }));

      const container = res.getContents().get(0);
      const elements = container.eGet(f(m.Container, 'elements')) as any[];
      expect(elements).toHaveLength(2);

      expect(elements[0].eClass().getName()).toBe('ConcreteTypeOne');
      expect(elements[0].eGet(f(m.AbstractType, 'name'))).toBe('First');

      expect(elements[1].eClass().getName()).toBe('ConcreteTypeTwo');
      expect(elements[1].eGet(f(m.AbstractType, 'name'))).toBe('Two');
    });

    // --- polymorphic round-trip ---
    it('should round-trip polymorphic containment', () => {
      const res = new JSONResource(URI.createURI('test://rt.json'));
      res.setResourceSet(m.resourceSet);

      const container = m.factory.create(m.Container);
      const c1 = m.factory.create(m.ConcreteTypeOne);
      c1.eSet(f(m.AbstractType, 'name'), 'Alpha');
      const c2 = m.factory.create(m.ConcreteTypeTwo);
      c2.eSet(f(m.AbstractType, 'name'), 'Beta');

      const elements = container.eGet(f(m.Container, 'elements')) as any[];
      elements.push(c1);
      elements.push(c2);
      res.getContents().push(container);

      const jsonStr = res.saveToString();

      const res2 = new JSONResource(URI.createURI('test://rt.json'));
      res2.setResourceSet(m.resourceSet);
      res2.loadFromString(jsonStr);

      const lc = res2.getContents().get(0);
      const le = lc.eGet(f(m.Container, 'elements')) as any[];
      expect(le).toHaveLength(2);
      expect(le[0].eClass().getName()).toBe('ConcreteTypeOne');
      expect(le[0].eGet(f(m.AbstractType, 'name'))).toBe('Alpha');
      expect(le[1].eClass().getName()).toBe('ConcreteTypeTwo');
      expect(le[1].eGet(f(m.AbstractType, 'name'))).toBe('Beta');
    });

    // --- no eClass when type matches declared (POLYMORPHIC mode) ---
    it('should omit eClass when actual type matches declared type', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const user = m.factory.create(m.User);
      user.eSet(f(m.User, 'name'), 'TestUser');
      const addr = m.factory.create(m.Address);
      addr.eSet(f(m.Address, 'city'), 'City');
      user.eSet(f(m.User, 'address'), addr);

      res.getContents().push(user);
      const parsed = JSON.parse(res.saveToString());

      // address type matches declared type Address -> no eClass on child
      expect(parsed.address.eClass).toBeUndefined();
      expect(parsed.address.city).toBe('City');
    });
  });

  // ── NoTypeTest ─────────────────────────────────────────────────
  describe('No Type Mode (NoTypeTest)', () => {
    // --- testSaveSingleObjectWithNoType analog: SERIALIZE_TYPE_ALWAYS vs default ---
    it('should include eClass on root by default (POLYMORPHIC mode)', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const user = m.factory.create(m.User);
      user.eSet(f(m.User, 'userId'), 'u1');
      user.eSet(f(m.User, 'name'), 'Paul');
      res.getContents().push(user);

      const parsed = JSON.parse(res.saveToString());
      expect(parsed.eClass).toBe(`${nsURI}#//User`);
    });

    it('should include eClass on all objects in ALWAYS mode', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const user = m.factory.create(m.User);
      user.eSet(f(m.User, 'userId'), 'u1');
      user.eSet(f(m.User, 'name'), 'Paul');
      const addr = m.factory.create(m.Address);
      addr.eSet(f(m.Address, 'addId'), 'a1');
      user.eSet(f(m.User, 'address'), addr);
      res.getContents().push(user);

      const opts = new Map<string, any>();
      opts.set(OPTION_SERIALIZE_TYPE, SERIALIZE_TYPE_ALWAYS);
      const parsed = JSON.parse(res.saveToString(opts));

      expect(parsed.eClass).toBe(`${nsURI}#//User`);
      expect(parsed.address.eClass).toBe(`${nsURI}#//Address`);
    });
  });

  // ── ReaderTest (robustness) ────────────────────────────────────
  describe('Reader Robustness (ReaderTest)', () => {
    // --- shouldReadObjectWhenEClassFieldIsNotFirst ---
    it('should load object when eClass is not the first field', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      // eClass appears after other fields
      const jsonStr = '{"userId":"u1","name":"Paul","eClass":"' + nsURI + '#//User"}';
      res.loadFromString(jsonStr);

      expect(res.getContents().size()).toBe(1);
      const user = res.getContents().get(0);
      expect(user.eClass().getName()).toBe('User');
      expect(user.eGet(f(m.User, 'userId'))).toBe('u1');
      expect(user.eGet(f(m.User, 'name'))).toBe('Paul');
    });

    // --- shouldReadObjectTreeWithEClassFieldNotFirst ---
    it('should load nested objects when eClass is not first in child', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        name: 'Paul',
        address: {
          city: 'Somewhere',
          eClass: `${nsURI}#//Address`,
          addId: 'a1',
        },
      }));

      const user = res.getContents().get(0);
      const addr = user.eGet(f(m.User, 'address')) as EObject;
      expect(addr.eClass().getName()).toBe('Address');
      expect(addr.eGet(f(m.Address, 'city'))).toBe('Somewhere');
      expect(addr.eGet(f(m.Address, 'addId'))).toBe('a1');
    });

    // --- shouldSkipAttributeFieldForWhichThereIsNoFeature ---
    it('should skip unknown attribute fields without crashing', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        userId: 'u1',
        unknownField: 'should be skipped',
        name: 'Paul',
      }));

      const user = res.getContents().get(0);
      expect(user.eGet(f(m.User, 'userId'))).toBe('u1');
      expect(user.eGet(f(m.User, 'name'))).toBe('Paul');
    });

    // --- shouldSkipObjectFieldForWhichThereIsNoFeature ---
    it('should skip unknown object fields without crashing', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        userId: 'u1',
        unknownNested: { foo: 'bar', baz: 42 },
        name: 'Paul',
      }));

      const user = res.getContents().get(0);
      expect(user.eGet(f(m.User, 'userId'))).toBe('u1');
      expect(user.eGet(f(m.User, 'name'))).toBe('Paul');
    });

    // --- shouldSkipArrayFieldForWhichThereIsNoFeature ---
    it('should skip unknown array fields without crashing', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        userId: 'u1',
        unknownArray: [1, 2, 3],
        name: 'Paul',
      }));

      const user = res.getContents().get(0);
      expect(user.eGet(f(m.User, 'userId'))).toBe('u1');
      expect(user.eGet(f(m.User, 'name'))).toBe('Paul');
    });

    // --- error reporting for unknown features ---
    it('should report errors for unknown features', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//User`,
        unknownField: 'oops',
      }));

      expect(res.getErrors().length).toBeGreaterThan(0);
      expect(res.getErrors()[0].message).toContain('unknownField');
    });
  });

  // ── ExternalReferencesTest ─────────────────────────────────────
  describe('External References (ExternalReferencesTest)', () => {
    it('should create proxy for $ref pointing to another resource', () => {
      const res = new JSONResource(URI.createURI('test://source.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//PrimaryObject`,
        name: 'src',
        singleNonContainmentReference: { $ref: 'target.json#/' },
      }));

      const primary = res.getContents().get(0);
      const ref = primary.eGet(f(m.PrimaryObject, 'singleNonContainmentReference'));
      expect(ref).toBeDefined();
      expect(ref.eIsProxy()).toBe(true);
      expect(ref.eProxyURI().toString()).toBe('target.json#/');
    });

    it('should create proxies for multiple external $ref', () => {
      const res = new JSONResource(URI.createURI('test://source.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//PrimaryObject`,
        name: 'src',
        multipleNonContainmentReference: [
          { $ref: 'target1.json#/0' },
          { $ref: 'target2.json#/0' },
        ],
      }));

      const primary = res.getContents().get(0);
      const refs = primary.eGet(f(m.PrimaryObject, 'multipleNonContainmentReference')) as any[];
      expect(refs).toHaveLength(2);
      expect(refs[0].eIsProxy()).toBe(true);
      expect(refs[0].eProxyURI().toString()).toBe('target1.json#/0');
      expect(refs[1].eIsProxy()).toBe(true);
      expect(refs[1].eProxyURI().toString()).toBe('target2.json#/0');
    });
  });

  // ── DynamicInstanceTest ────────────────────────────────────────
  describe('Dynamic Instances (DynamicInstanceTest)', () => {
    let dynPkg: BasicEPackage;
    let classA: BasicEClass;
    let classB: BasicEClass;

    beforeEach(() => {
      dynPkg = new BasicEPackage();
      dynPkg.setName('p');
      dynPkg.setNsURI('http://foo.org/p');
      dynPkg.setNsPrefix('p');

      const dynFactory = new BasicEFactory();
      dynFactory.setEPackage(dynPkg);
      dynPkg.setEFactoryInstance(dynFactory);

      const dynString = new BasicEDataType();
      dynString.setName('EString');
      dynString.setInstanceClassName('string');
      dynString.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(dynString);

      classA = new BasicEClass();
      classA.setName('A');
      classA.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(classA);

      const labelAttr = new BasicEAttribute();
      labelAttr.setName('label');
      labelAttr.setEType(dynString);
      classA.getEStructuralFeatures().push(labelAttr);

      classB = new BasicEClass();
      classB.setName('B');
      classB.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(classB);

      // A.bs (many containment of B)
      const bsRef = new BasicEReference();
      bsRef.setName('bs');
      bsRef.setEType(classB);
      bsRef.setContainment(true);
      bsRef.setUpperBound(-1);
      classA.getEStructuralFeatures().push(bsRef);

      m.resourceSet.getPackageRegistry().set('http://foo.org/p', dynPkg);
    });

    // --- testSaveOneObject ---
    it('should save a dynamic instance', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const a = dynPkg.getEFactoryInstance().create(classA);
      a.eSet(classA.getEStructuralFeature('label')!, '1');
      res.getContents().push(a);

      const parsed = JSON.parse(res.saveToString());
      expect(parsed.eClass).toBe('http://foo.org/p#//A');
      expect(parsed.label).toBe('1');
    });

    // --- testSaveOneRootWithChildren ---
    it('should save a dynamic instance with children', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const dynFactory = dynPkg.getEFactoryInstance();
      const a = dynFactory.create(classA);
      a.eSet(classA.getEStructuralFeature('label')!, '1');

      const b1 = dynFactory.create(classB);
      const b2 = dynFactory.create(classB);
      const bs = a.eGet(classA.getEStructuralFeature('bs')!) as any[];
      bs.push(b1);
      bs.push(b2);

      res.getContents().push(a);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eClass).toBe('http://foo.org/p#//A');
      expect(parsed.label).toBe('1');
      expect(parsed.bs).toHaveLength(2);
    });

    // --- testLoadOneRootWithChildren ---
    it('should load a dynamic instance with children', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: 'http://foo.org/p#//A',
        label: '1',
        bs: [{}, {}],
      }));

      const a = res.getContents().get(0);
      expect(a.eClass().getName()).toBe('A');
      expect(a.eGet(classA.getEStructuralFeature('label')!)).toBe('1');
      const bs = a.eGet(classA.getEStructuralFeature('bs')!) as any[];
      expect(bs).toHaveLength(2);
      expect(bs[0].eClass().getName()).toBe('B');
    });
  });

  // ── DynamicContainmentTest ─────────────────────────────────────
  describe('Dynamic Containment (DynamicContainmentTest)', () => {
    let dynPkg: BasicEPackage;
    let classA: BasicEClass;
    let classB: BasicEClass;

    beforeEach(() => {
      dynPkg = new BasicEPackage();
      dynPkg.setName('dynamic');
      dynPkg.setNsURI('http://emfjson/dynamic/model');
      dynPkg.setNsPrefix('dyn');

      const dynFactory = new BasicEFactory();
      dynFactory.setEPackage(dynPkg);
      dynPkg.setEFactoryInstance(dynFactory);

      classA = new BasicEClass();
      classA.setName('A');
      classA.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(classA);

      classB = new BasicEClass();
      classB.setName('B');
      classB.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(classB);

      // A.containB (single containment)
      const containBRef = new BasicEReference();
      containBRef.setName('containB');
      containBRef.setEType(classB);
      containBRef.setContainment(true);
      classA.getEStructuralFeatures().push(containBRef);

      m.resourceSet.getPackageRegistry().set('http://emfjson/dynamic/model', dynPkg);
    });

    // --- testSaveContainmentWithOpposite ---
    it('should save dynamic containment', () => {
      const res = new JSONResource(URI.createURI('test://out.json'));
      res.setResourceSet(m.resourceSet);

      const dynFactory = dynPkg.getEFactoryInstance();
      const a = dynFactory.create(classA);
      const b = dynFactory.create(classB);
      a.eSet(classA.getEStructuralFeature('containB')!, b);

      res.getContents().push(a);
      const parsed = JSON.parse(res.saveToString());

      expect(parsed.eClass).toBe('http://emfjson/dynamic/model#//A');
      expect(parsed.containB).toBeDefined();
      expect(typeof parsed.containB).toBe('object');
    });

    // --- testLoadContainmentWithOpposite ---
    it('should load dynamic containment', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: 'http://emfjson/dynamic/model#//A',
        containB: {
          eClass: 'http://emfjson/dynamic/model#//B',
        },
      }));

      const a = res.getContents().get(0);
      expect(a.eClass().getName()).toBe('A');
      const b = a.eGet(classA.getEStructuralFeature('containB')!) as EObject;
      expect(b).toBeDefined();
      expect(b.eClass().getName()).toBe('B');
    });
  });

  // ── DynamicPolymorphicTest ─────────────────────────────────────
  describe('Dynamic Polymorphic (DynamicPolymorphicTest)', () => {
    let dynPkg: BasicEPackage;
    let classA: BasicEClass;
    let classC: BasicEClass;
    let classD: BasicEClass;

    beforeEach(() => {
      dynPkg = new BasicEPackage();
      dynPkg.setName('dynamic');
      dynPkg.setNsURI('http://emfjson/dynamic/model2');
      dynPkg.setNsPrefix('dyn2');

      const dynFactory = new BasicEFactory();
      dynFactory.setEPackage(dynPkg);
      dynPkg.setEFactoryInstance(dynFactory);

      const dynString = new BasicEDataType();
      dynString.setName('EString');
      dynString.setInstanceClassName('string');
      dynString.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(dynString);

      classA = new BasicEClass();
      classA.setName('A');
      classA.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(classA);

      classC = new BasicEClass();
      classC.setName('C');
      classC.setEPackage(dynPkg);
      dynPkg.getEClassifiers().push(classC);
      const cName = new BasicEAttribute();
      cName.setName('name');
      cName.setEType(dynString);
      classC.getEStructuralFeatures().push(cName);

      classD = new BasicEClass();
      classD.setName('D');
      classD.setEPackage(dynPkg);
      classD.getESuperTypes().push(classC);
      dynPkg.getEClassifiers().push(classD);

      // A.singleC (single containment typed as C)
      const singleCRef = new BasicEReference();
      singleCRef.setName('singleC');
      singleCRef.setEType(classC);
      singleCRef.setContainment(true);
      classA.getEStructuralFeatures().push(singleCRef);

      // A.manyC (many containment typed as C)
      const manyCRef = new BasicEReference();
      manyCRef.setName('manyC');
      manyCRef.setEType(classC);
      manyCRef.setContainment(true);
      manyCRef.setUpperBound(-1);
      classA.getEStructuralFeatures().push(manyCRef);

      m.resourceSet.getPackageRegistry().set('http://emfjson/dynamic/model2', dynPkg);
    });

    // --- testContainmentWithHierarchyOfTypes ---
    it('should load polymorphic containment with dynamic subtypes', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      const NS = 'http://emfjson/dynamic/model2';
      res.loadFromString(JSON.stringify({
        eClass: `${NS}#//A`,
        singleC: { eClass: `${NS}#//C`, name: 'c1' },
        manyC: [
          { eClass: `${NS}#//C`, name: 'c2' },
          { eClass: `${NS}#//D`, name: 'd1' },
        ],
      }));

      const a = res.getContents().get(0);
      const sc = a.eGet(classA.getEStructuralFeature('singleC')!) as EObject;
      expect(sc.eClass().getName()).toBe('C');
      expect(sc.eGet(classC.getEStructuralFeature('name')!)).toBe('c1');

      const mc = a.eGet(classA.getEStructuralFeature('manyC')!) as any[];
      expect(mc).toHaveLength(2);
      expect(mc[0].eClass().getName()).toBe('C');
      expect(mc[0].eGet(classC.getEStructuralFeature('name')!)).toBe('c2');
      expect(mc[1].eClass().getName()).toBe('D');
      expect(mc[1].eGet(classC.getEStructuralFeature('name')!)).toBe('d1');
    });

    it('should round-trip polymorphic dynamic containment', () => {
      const res = new JSONResource(URI.createURI('test://rt.json'));
      res.setResourceSet(m.resourceSet);

      const dynFactory = dynPkg.getEFactoryInstance();
      const a = dynFactory.create(classA);

      const c = dynFactory.create(classC);
      c.eSet(classC.getEStructuralFeature('name')!, 'cVal');
      a.eSet(classA.getEStructuralFeature('singleC')!, c);

      const d = dynFactory.create(classD);
      d.eSet(classC.getEStructuralFeature('name')!, 'dVal');
      const mc = a.eGet(classA.getEStructuralFeature('manyC')!) as any[];
      mc.push(c);  // C in C-typed slot -> no eClass needed
      mc.push(d);  // D in C-typed slot -> eClass needed

      res.getContents().push(a);
      const jsonStr = res.saveToString();
      const parsed = JSON.parse(jsonStr);

      // Verify D has eClass, C does not
      expect(parsed.manyC[0].eClass).toBeUndefined(); // C matches declared
      expect(parsed.manyC[1].eClass).toBe('http://emfjson/dynamic/model2#//D');

      // Reload
      const res2 = new JSONResource(URI.createURI('test://rt.json'));
      res2.setResourceSet(m.resourceSet);
      res2.loadFromString(jsonStr);

      const la = res2.getContents().get(0);
      const lmc = la.eGet(classA.getEStructuralFeature('manyC')!) as any[];
      expect(lmc).toHaveLength(2);
      expect(lmc[0].eClass().getName()).toBe('C');
      expect(lmc[1].eClass().getName()).toBe('D');
    });
  });

  // ── Node tree round-trip ───────────────────────────────────────
  describe('Deep Hierarchy (from ReferenceTest.testLoadObjectWithDeepHierarchy)', () => {
    it('should round-trip a deep tree structure', () => {
      const res = new JSONResource(URI.createURI('test://tree.json'));
      res.setResourceSet(m.resourceSet);

      const fac = m.factory;
      const root = fac.create(m.Node);
      root.eSet(f(m.Node, 'label'), 'root');

      const a = fac.create(m.Node);
      a.eSet(f(m.Node, 'label'), 'a');
      const b = fac.create(m.Node);
      b.eSet(f(m.Node, 'label'), 'b');
      const c = fac.create(m.Node);
      c.eSet(f(m.Node, 'label'), 'c');
      const d = fac.create(m.Node);
      d.eSet(f(m.Node, 'label'), 'd');

      (root.eGet(f(m.Node, 'child')) as any[]).push(a);
      (root.eGet(f(m.Node, 'child')) as any[]).push(b);
      (a.eGet(f(m.Node, 'child')) as any[]).push(c);
      (c.eGet(f(m.Node, 'child')) as any[]).push(d);

      res.getContents().push(root);
      const jsonStr = res.saveToString();
      const parsed = JSON.parse(jsonStr);

      // Verify structure
      expect(parsed.label).toBe('root');
      expect(parsed.child).toHaveLength(2);
      expect(parsed.child[0].label).toBe('a');
      expect(parsed.child[0].child).toHaveLength(1);
      expect(parsed.child[0].child[0].label).toBe('c');
      expect(parsed.child[0].child[0].child).toHaveLength(1);
      expect(parsed.child[0].child[0].child[0].label).toBe('d');
      expect(parsed.child[1].label).toBe('b');

      // Round-trip
      const res2 = new JSONResource(URI.createURI('test://tree.json'));
      res2.setResourceSet(m.resourceSet);
      res2.loadFromString(jsonStr);

      const lr = res2.getContents().get(0);
      expect(lr.eGet(f(m.Node, 'label'))).toBe('root');
      const lc = lr.eGet(f(m.Node, 'child')) as any[];
      expect(lc).toHaveLength(2);
      expect(lc[0].eGet(f(m.Node, 'label'))).toBe('a');
      const lcc = lc[0].eGet(f(m.Node, 'child')) as any[];
      expect(lcc).toHaveLength(1);
      expect(lcc[0].eGet(f(m.Node, 'label'))).toBe('c');
      const lccc = lcc[0].eGet(f(m.Node, 'child')) as any[];
      expect(lccc).toHaveLength(1);
      expect(lccc[0].eGet(f(m.Node, 'label'))).toBe('d');
    });
  });

  // ── Error handling ─────────────────────────────────────────────
  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', () => {
      const res = new JSONResource(URI.createURI('test://bad.json'));
      res.setResourceSet(m.resourceSet);
      res.loadFromString('not valid json {{{');

      expect(res.getErrors().length).toBeGreaterThan(0);
      expect(res.getErrors()[0].message).toContain('Invalid JSON');
      expect(res.getContents().size()).toBe(0);
    });

    it('should handle empty object', () => {
      const res = new JSONResource(URI.createURI('test://empty.json'));
      res.setResourceSet(m.resourceSet);
      res.loadFromString('{}');

      // No eClass -> error, no objects
      expect(res.getContents().size()).toBe(0);
      expect(res.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const res = new JSONResource(URI.createURI('test://empty.json'));
      res.setResourceSet(m.resourceSet);
      res.loadFromString('[]');

      expect(res.getContents().size()).toBe(0);
    });

    it('should save empty resource as {}', () => {
      const res = new JSONResource(URI.createURI('test://empty.json'));
      expect(res.saveToString()).toBe('{}');
    });

    it('should report error for unknown package nsURI', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: 'http://unknown.org/pkg#//Foo',
      }));

      expect(res.getErrors().length).toBeGreaterThan(0);
      expect(res.getErrors()[0].message).toContain('Package not found');
    });

    it('should report error for unknown classifier', () => {
      const res = new JSONResource(URI.createURI('test://in.json'));
      res.setResourceSet(m.resourceSet);

      res.loadFromString(JSON.stringify({
        eClass: `${nsURI}#//NonExistent`,
      }));

      expect(res.getErrors().length).toBeGreaterThan(0);
      expect(res.getErrors()[0].message).toContain('NonExistent');
    });
  });

  // ── Comprehensive Round-Trip ───────────────────────────────────
  describe('Comprehensive Round-Trip', () => {
    it('should round-trip attributes + containments + cross-refs', () => {
      const res = new JSONResource(URI.createURI('test://full.json'));
      res.setResourceSet(m.resourceSet);

      const fac = m.factory;

      const primary = fac.create(m.PrimaryObject);
      primary.eSet(f(m.PrimaryObject, 'name'), 'TheSource');

      const t1 = fac.create(m.TargetObject);
      t1.eSet(f(m.TargetObject, 'singleAttribute'), 'target-1');
      const t2 = fac.create(m.TargetObject);
      t2.eSet(f(m.TargetObject, 'singleAttribute'), 'target-2');

      // Containment
      const cList = primary.eGet(f(m.PrimaryObject, 'multipleContainmentReferenceNoProxies')) as any[];
      cList.push(t1);
      cList.push(t2);

      // Cross-reference
      primary.eSet(f(m.PrimaryObject, 'singleNonContainmentReference'), t1);

      res.getContents().push(primary);
      const jsonStr = res.saveToString();

      // Reload
      const res2 = new JSONResource(URI.createURI('test://full.json'));
      res2.setResourceSet(m.resourceSet);
      res2.loadFromString(jsonStr);

      const lp = res2.getContents().get(0);
      expect(lp.eGet(f(m.PrimaryObject, 'name'))).toBe('TheSource');

      const lc = lp.eGet(f(m.PrimaryObject, 'multipleContainmentReferenceNoProxies')) as any[];
      expect(lc).toHaveLength(2);
      expect(lc[0].eGet(f(m.TargetObject, 'singleAttribute'))).toBe('target-1');
      expect(lc[1].eGet(f(m.TargetObject, 'singleAttribute'))).toBe('target-2');
    });
  });
});

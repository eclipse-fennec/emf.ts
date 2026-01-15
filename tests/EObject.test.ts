/**
 * EObject Tests
 * Tests for basic EObject functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicEFactory,
  DynamicEObject,
  EcoreDataTypes
} from '../src/runtime';
import { EClass } from '../src/EClass';
import { EPackage } from '../src/EPackage';

describe('EObject', () => {
  let personPackage: EPackage;
  let personClass: EClass;
  let nameAttr: any;
  let ageAttr: any;
  let childrenRef: any;

  beforeEach(() => {
    // Create Person metamodel
    personClass = new BasicEClass();
    personClass.setName('Person');

    nameAttr = new BasicEAttribute();
    nameAttr.setName('name');
    nameAttr.setEType(EcoreDataTypes.EString);
    (personClass as any).addFeature(nameAttr);

    ageAttr = new BasicEAttribute();
    ageAttr.setName('age');
    ageAttr.setEType(EcoreDataTypes.EInt);
    (personClass as any).addFeature(ageAttr);

    childrenRef = new BasicEReference();
    childrenRef.setName('children');
    childrenRef.setEType(personClass);
    childrenRef.setUpperBound(-1);
    childrenRef.setContainment(true);
    (personClass as any).addFeature(childrenRef);

    personPackage = new (class extends BasicEPackage {
      constructor() {
        super();
        this.setName('person');
        this.setNsURI('http://example.com/person');
        this.setNsPrefix('person');
      }
    })();
    personPackage.getEClassifiers().push(personClass);
  });

  describe('eGet and eSet', () => {
    it('should get and set attribute values', () => {
      const factory = personPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      person.eSet(nameAttr, 'Alice');
      expect(person.eGet(nameAttr)).toBe('Alice');

      person.eSet(ageAttr, 30);
      expect(person.eGet(ageAttr)).toBe(30);
    });

    it('should return default values for unset attributes', () => {
      const factory = personPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      expect(person.eGet(nameAttr)).toBeNull();
      expect(person.eGet(ageAttr)).toBe(0); // Default for int
    });
  });

  describe('eIsSet and eUnset', () => {
    it('should track whether features are set', () => {
      const factory = personPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      expect(person.eIsSet(nameAttr)).toBe(false);

      person.eSet(nameAttr, 'Bob');
      expect(person.eIsSet(nameAttr)).toBe(true);

      person.eUnset(nameAttr);
      expect(person.eIsSet(nameAttr)).toBe(false);
    });
  });

  describe('eContainer and eContainmentFeature', () => {
    it('should track container relationships', () => {
      const factory = personPackage.getEFactoryInstance();
      const parent = factory.create(personClass);
      const child = factory.create(personClass);

      const children = parent.eGet(childrenRef) as any[];
      children.push(child);

      expect(child.eContainer()).toBe(parent);
      expect(child.eContainmentFeature()).toBe(childrenRef);
    });

    it('should return null for root objects', () => {
      const factory = personPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      expect(person.eContainer()).toBeNull();
      expect(person.eContainmentFeature()).toBeNull();
    });
  });

  describe('eContents', () => {
    it('should return direct children', () => {
      const factory = personPackage.getEFactoryInstance();
      const parent = factory.create(personClass);
      const child1 = factory.create(personClass);
      const child2 = factory.create(personClass);

      const children = parent.eGet(childrenRef) as any[];
      children.push(child1);
      children.push(child2);

      const contents = parent.eContents();
      expect(contents).toHaveLength(2);
      expect(contents).toContain(child1);
      expect(contents).toContain(child2);
    });

    it('should return empty array for objects without children', () => {
      const factory = personPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      expect(person.eContents()).toHaveLength(0);
    });
  });

  describe('eAllContents', () => {
    it('should return all descendants', () => {
      const factory = personPackage.getEFactoryInstance();
      const grandparent = factory.create(personClass);
      const parent = factory.create(personClass);
      const child = factory.create(personClass);

      const gpChildren = grandparent.eGet(childrenRef) as any[];
      gpChildren.push(parent);

      const pChildren = parent.eGet(childrenRef) as any[];
      pChildren.push(child);

      const allContents: any[] = [];
      const iterator = grandparent.eAllContents();
      let result = iterator.next();
      while (!result.done) {
        allContents.push(result.value);
        result = iterator.next();
      }

      expect(allContents).toHaveLength(2);
      expect(allContents).toContain(parent);
      expect(allContents).toContain(child);
    });
  });

  describe('eClass', () => {
    it('should return the object\'s class', () => {
      const factory = personPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      expect(person.eClass()).toBe(personClass);
    });
  });

  describe('DynamicEObject', () => {
    it('should create instances without factory', () => {
      const person = new DynamicEObject(personClass);

      expect(person.eClass()).toBe(personClass);
      person.eSet(nameAttr, 'Dynamic');
      expect(person.eGet(nameAttr)).toBe('Dynamic');
    });
  });
});

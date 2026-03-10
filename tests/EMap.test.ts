import { describe, it, expect } from 'vitest';
import { getEcorePackage } from '../src/ecore/EcorePackage';
import { ecoreRegistry } from '../src/ecore/EcoreRegistry';
import { createEMap, isEMap, EMap } from '../src/EMap';
import { isEList } from '../src/EList';
import { BasicEAnnotation } from '../src/runtime/BasicEAnnotation';
import { EReference } from '../src/EReference';

// Ensure Ecore is initialized
getEcorePackage();

function createTestEMap(): EMap<string, string> & { [index: number]: any } {
  const annotation = new BasicEAnnotation();
  const eAnnotationClass = ecoreRegistry.getEAnnotationClass();
  const detailsFeature = eAnnotationClass.getEStructuralFeature('details') as EReference;
  const entryEClass = ecoreRegistry.getEStringToStringMapEntryClass();
  return createEMap<string, string>(annotation, detailsFeature, entryEClass);
}

describe('EMap', () => {
  describe('EList compatibility', () => {
    it('should be recognized as EList', () => {
      const map = createTestEMap();
      expect(isEList(map)).toBe(true);
    });

    it('should support size(), isEmpty()', () => {
      const map = createTestEMap();
      expect(map.size()).toBe(0);
      expect(map.isEmpty()).toBe(true);
    });

    it('should support push() and get()', () => {
      const map = createTestEMap();
      const entryEClass = ecoreRegistry.getEStringToStringMapEntryClass();
      const entry = getEcorePackage().getEFactoryInstance()!.create(entryEClass);
      const keyF = entryEClass.getEStructuralFeature('key')!;
      const valueF = entryEClass.getEStructuralFeature('value')!;
      entry.eSet(keyF, 'testKey');
      entry.eSet(valueF, 'testValue');

      map.push(entry);
      expect(map.size()).toBe(1);
      expect(map.get(0)).toBe(entry);
    });

    it('should support add() and remove()', () => {
      const map = createTestEMap();
      const entryEClass = ecoreRegistry.getEStringToStringMapEntryClass();
      const entry = getEcorePackage().getEFactoryInstance()!.create(entryEClass);
      entry.eSet(entryEClass.getEStructuralFeature('key')!, 'k');
      entry.eSet(entryEClass.getEStructuralFeature('value')!, 'v');

      map.add(entry);
      expect(map.size()).toBe(1);
      expect(map.contains(entry)).toBe(true);

      map.remove(entry);
      expect(map.size()).toBe(0);
    });

    it('should support index access via proxy', () => {
      const map = createTestEMap();
      map.putByKey('a', 'alpha');
      expect(map[0]).toBeDefined();
      expect(map[0].eGet(ecoreRegistry.getEStringToStringMapEntryClass().getEStructuralFeature('key')!)).toBe('a');
    });
  });

  describe('Containment', () => {
    it('should set eContainer on entry EObjects after push()', () => {
      const annotation = new BasicEAnnotation();
      const details = annotation.getDetails();
      details.putByKey('name', 'test');

      const entry = details.get(0);
      expect(entry.eContainer()).toBe(annotation);
    });

    it('should clear eContainer on removed entries', () => {
      const annotation = new BasicEAnnotation();
      const details = annotation.getDetails();
      details.putByKey('name', 'test');

      const entry = details.get(0);
      details.remove(entry);
      expect(entry.eContainer()).toBeNull();
    });
  });

  describe('Map operations', () => {
    it('should support putByKey() and getByKey()', () => {
      const map = createTestEMap();
      const oldVal = map.putByKey('key1', 'value1');
      expect(oldVal).toBeUndefined();
      expect(map.getByKey('key1')).toBe('value1');
    });

    it('should update value on putByKey() with existing key', () => {
      const map = createTestEMap();
      map.putByKey('key1', 'value1');
      const oldVal = map.putByKey('key1', 'value2');
      expect(oldVal).toBe('value1');
      expect(map.getByKey('key1')).toBe('value2');
      // Should not add a second entry
      expect(map.size()).toBe(1);
    });

    it('should support removeByKey()', () => {
      const map = createTestEMap();
      map.putByKey('key1', 'value1');
      const removed = map.removeByKey('key1');
      expect(removed).toBe('value1');
      expect(map.getByKey('key1')).toBeUndefined();
      expect(map.size()).toBe(0);
    });

    it('should return undefined for removeByKey() with non-existent key', () => {
      const map = createTestEMap();
      expect(map.removeByKey('nonexistent')).toBeUndefined();
    });

    it('should support containsKey()', () => {
      const map = createTestEMap();
      map.putByKey('key1', 'value1');
      expect(map.containsKey('key1')).toBe(true);
      expect(map.containsKey('key2')).toBe(false);
    });

    it('should support containsValue()', () => {
      const map = createTestEMap();
      map.putByKey('key1', 'value1');
      expect(map.containsValue('value1')).toBe(true);
      expect(map.containsValue('value2')).toBe(false);
    });

    it('should support keys()', () => {
      const map = createTestEMap();
      map.putByKey('a', '1');
      map.putByKey('b', '2');
      expect(map.keys().sort()).toEqual(['a', 'b']);
    });

    it('should support mapValues()', () => {
      const map = createTestEMap();
      map.putByKey('a', '1');
      map.putByKey('b', '2');
      expect(map.mapValues().sort()).toEqual(['1', '2']);
    });

    it('should support toMap()', () => {
      const map = createTestEMap();
      map.putByKey('name', 'John');
      map.putByKey('age', '30');
      const jsMap = map.toMap();
      expect(jsMap).toBeInstanceOf(Map);
      expect(jsMap.get('name')).toBe('John');
      expect(jsMap.get('age')).toBe('30');
      expect(jsMap.size).toBe(2);
    });

    it('should support clear()', () => {
      const map = createTestEMap();
      map.putByKey('a', '1');
      map.putByKey('b', '2');
      map.clear();
      expect(map.size()).toBe(0);
      expect(map.containsKey('a')).toBe(false);
      expect(map.containsKey('b')).toBe(false);
    });
  });

  describe('isEMap type guard', () => {
    it('should return true for EMap instances', () => {
      const map = createTestEMap();
      expect(isEMap(map)).toBe(true);
    });

    it('should return false for plain objects', () => {
      expect(isEMap({})).toBe(false);
      expect(isEMap(null)).toBe(false);
      expect(isEMap(new Map())).toBe(false);
    });
  });

  describe('Index update on list add', () => {
    it('should update map index when entry is added via list add()', () => {
      const map = createTestEMap();
      const entryEClass = ecoreRegistry.getEStringToStringMapEntryClass();
      const entry = getEcorePackage().getEFactoryInstance()!.create(entryEClass);
      entry.eSet(entryEClass.getEStructuralFeature('key')!, 'listKey');
      entry.eSet(entryEClass.getEStructuralFeature('value')!, 'listValue');

      map.add(entry);
      expect(map.getByKey('listKey')).toBe('listValue');
    });

    it('should remove from map index when entry is removed via list remove()', () => {
      const map = createTestEMap();
      map.putByKey('x', 'y');
      const entry = map.get(0);
      map.remove(entry);
      expect(map.containsKey('x')).toBe(false);
    });
  });
});

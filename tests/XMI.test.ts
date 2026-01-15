/**
 * @fileoverview XMI Loading Tests - XMI/XML Grundfunktionalität
 *
 * Testet die grundlegenden XMI-Funktionen:
 * - XMIResource Erstellung und Konfiguration
 * - ID-Handling für Querverweise
 * - Type Guards für EMF-Typen
 * - ResourceSet mit Package-Registry
 *
 * @example
 * ```typescript
 * // XMI Resource erstellen
 * const uri = URI.createURI('model.xmi');
 * const resource = new XMIResource(uri);
 *
 * // Oder via Factory
 * const factory = new XMIResourceFactory();
 * const resource2 = factory.createResource(uri);
 *
 * // ID setzen für Referenzen
 * resource.setID(obj, 'my_id');
 * resource.getEObject('my_id'); // obj
 * ```
 *
 * @module tests/XMI
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XMIResource, XMIResourceFactory } from '../src/xmi/XMLResource';
import { URI } from '../src/URI';
import { BasicEPackage } from '../src/runtime/BasicEPackage';
import { BasicEClass } from '../src/runtime/BasicEClass';
import { BasicEFactory } from '../src/runtime/BasicEFactory';
import { BasicEAttribute } from '../src/runtime/BasicEAttribute';
import { BasicEDataType } from '../src/runtime/BasicEDataType';
import { BasicEReference } from '../src/runtime/BasicEReference';
import { EPackageRegistry } from '../src/EPackage';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { isEClass, isEDataType, isEAttribute, isEReference } from '../src/util/TypeGuards';

/**
 * @description XMI Loading Grundfunktionen
 * XMIResource und zugehörige Utilities.
 *
 * @example
 * ```typescript
 * const resource = new XMIResource(URI.createURI('model.xmi'));
 * resource.getContents().push(obj);
 * ```
 */
describe('XMI Loading', () => {
  /**
   * @description XMIResource Erstellung
   * @example
   * ```typescript
   * const uri = URI.createURI('model.xmi');
   * const resource = new XMIResource(uri);
   * ```
   */
  describe('XMIResource', () => {
    /**
     * @description XMI Resource erstellen
     * @example
     * ```typescript
     * const resource = new XMIResource(URI.createURI('model.xmi'));
     * resource.getContents(); // []
     * ```
     */
    it('should create an XMI resource', () => {
      const uri = URI.createURI('test://model.xmi');
      const resource = new XMIResource(uri);

      expect(resource).toBeDefined();
      expect(resource.getURI()).toBe(uri);
      expect(resource.getContents()).toEqual([]);
    });

    it('should be created by XMIResourceFactory', () => {
      const factory = new XMIResourceFactory();
      const uri = URI.createURI('test://model.xmi');
      const resource = factory.createResource(uri);

      expect(resource).toBeInstanceOf(XMIResource);
    });
  });

  /**
   * @description ID-Handling für Querverweise
   * XMIResource verwaltet IDs für Objekte.
   *
   * @example
   * ```typescript
   * resource.setID(obj, 'unique_id');
   * resource.getID(obj);         // 'unique_id'
   * resource.getEObject('unique_id'); // obj
   * ```
   */
  describe('ID Handling', () => {
    /**
     * @description Objekt-IDs verfolgen
     * @example
     * ```typescript
     * resource.setID(obj, 'id1');
     * resource.getID(obj); // 'id1'
     * resource.getEObject('id1'); // obj
     * ```
     */
    it('should track object IDs', () => {
      const resource = new XMIResource(URI.createURI('test://model.xmi'));

      // Create a simple package with one class
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test.com/model');
      pkg.setNsPrefix('test');

      const factory = new BasicEFactory(pkg);
      pkg.setEFactoryInstance(factory);

      const eClass = new BasicEClass();
      eClass.setName('TestClass');
      pkg.getEClassifiers().push(eClass);

      // Create an instance
      const obj = factory.create(eClass);

      // Set ID
      resource.getContents().push(obj);
      resource.setID(obj, 'obj1');

      expect(resource.getID(obj)).toBe('obj1');
      expect(resource.getEObject('obj1')).toBe(obj);
    });
  });

  /**
   * @description Type Guards für EMF-Typen
   * Hilfsfunktionen zur Typerkennung.
   *
   * @example
   * ```typescript
   * import { isEClass, isEAttribute } from '../src/util/TypeGuards';
   *
   * if (isEClass(classifier)) {
   *   classifier.getEStructuralFeatures();
   * }
   * ```
   */
  describe('Type Guards', () => {
    /**
     * @description EClass erkennen
     * @example
     * ```typescript
     * isEClass(myClass);     // true
     * isEDataType(myClass);  // false
     * ```
     */
    it('should correctly identify EClass', () => {
      const eClass = new BasicEClass();
      eClass.setName('TestClass');

      expect(isEClass(eClass)).toBe(true);
      expect(isEDataType(eClass)).toBe(false);
    });

    it('should correctly identify EDataType', () => {
      const dataType = new BasicEDataType();
      dataType.setName('TestDataType');

      expect(isEDataType(dataType)).toBe(true);
      expect(isEClass(dataType)).toBe(false);
    });

    it('should correctly identify EAttribute', () => {
      const attr = new BasicEAttribute();
      attr.setName('testAttr');

      expect(isEAttribute(attr)).toBe(true);
      expect(isEReference(attr)).toBe(false);
    });

    it('should correctly identify EReference', () => {
      const ref = new BasicEReference();
      ref.setName('testRef');

      expect(isEReference(ref)).toBe(true);
      expect(isEAttribute(ref)).toBe(false);
    });
  });

  /**
   * @description ResourceSet mit Package-Registry
   * Packages werden im ResourceSet registriert für XMI-Loading.
   *
   * @example
   * ```typescript
   * const resourceSet = new BasicResourceSet();
   * resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);
   *
   * const resource = resourceSet.createResource(uri);
   * // Kann jetzt Instanzen des registrierten Packages laden
   * ```
   */
  describe('ResourceSet with Package Registry', () => {
    let resourceSet: BasicResourceSet;
    let testPackage: BasicEPackage;

    beforeEach(() => {
      resourceSet = new BasicResourceSet();

      // Create a test package
      testPackage = new BasicEPackage();
      testPackage.setName('test');
      testPackage.setNsURI('http://test.com/model');
      testPackage.setNsPrefix('test');

      const factory = new BasicEFactory(testPackage);
      testPackage.setEFactoryInstance(factory);

      // Add a class
      const personClass = new BasicEClass();
      personClass.setName('Person');
      testPackage.getEClassifiers().push(personClass);

      // Add a string type
      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClass('string');
      testPackage.getEClassifiers().push(stringType);

      // Add name attribute
      const nameAttr = new BasicEAttribute();
      nameAttr.setName('name');
      nameAttr.setEType(stringType);
      personClass.getEStructuralFeatures().push(nameAttr);

      // Register the package
      resourceSet.getPackageRegistry().set('http://test.com/model', testPackage);
    });

    it('should register packages in resource set', () => {
      const pkg = resourceSet.getPackageRegistry().getEPackage('http://test.com/model');
      expect(pkg).toBe(testPackage);
    });

    it('should create resources with package registry', () => {
      const uri = URI.createURI('test://model.xmi');
      const resource = resourceSet.createResource(uri);

      expect(resource.getResourceSet()).toBe(resourceSet);
    });
  });

  describe('URI Operations', () => {
    it('should check if URI is relative', () => {
      const absoluteUri = URI.createURI('http://example.com/model.xmi');
      const relativeUri = URI.createURI('model.xmi');

      expect(absoluteUri.isRelative()).toBe(false);
      expect(relativeUri.isRelative()).toBe(true);
    });
  });
});

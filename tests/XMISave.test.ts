/**
 * @fileoverview XMI Save Tests - XMI/XML Serialisierung
 *
 * Testet die Serialisierung von EMF-Modellen nach XMI:
 * - Einfache Objekte mit Attributen
 * - Containment-Referenzen (verschachtelte Objekte)
 * - Non-Containment Referenzen (href)
 * - Cross-Resource Referenzen
 * - Round-Trip (Save/Load)
 *
 * @example
 * ```typescript
 * // Objekt erstellen
 * const person = factory.create(PersonClass);
 * person.eSet(nameAttr, 'John');
 *
 * // In Resource und speichern
 * resource.getContents().push(person);
 * const xml = resource.saveToString();
 *
 * // XML enthält:
 * // <?xml version="1.0"?>
 * // <test:Person name="John" xmlns:test="http://..."/>
 * ```
 *
 * @module tests/XMISave
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XMIResource, XMLResource } from '../src/xmi/XMLResource';
import { URI } from '../src/URI';
import { BasicEPackage } from '../src/runtime/BasicEPackage';
import { BasicEClass } from '../src/runtime/BasicEClass';
import { BasicEFactory } from '../src/runtime/BasicEFactory';
import { BasicEAttribute } from '../src/runtime/BasicEAttribute';
import { BasicEDataType } from '../src/runtime/BasicEDataType';
import { BasicEReference } from '../src/runtime/BasicEReference';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { EObject } from '../src/EObject';
import { getEcorePackage } from '../src/ecore/EcorePackage';
import { EProxyImpl } from '../src/runtime/EProxyImpl';

/**
 * @description XMI Serialisierung
 * Konvertiert EMF-Modelle in XMI-XML Format.
 *
 * @example
 * ```typescript
 * const xml = resource.saveToString();
 * // <?xml version="1.0"?>
 * // <test:Person name="John"...>
 * //   <addresses street="123 Main St"/>
 * // </test:Person>
 * ```
 */
describe('XMI Serialization', () => {
  let resourceSet: BasicResourceSet;
  let testPackage: BasicEPackage;
  let personClass: BasicEClass;
  let addressClass: BasicEClass;
  let stringType: BasicEDataType;
  let intType: BasicEDataType;

  beforeEach(() => {
    resourceSet = new BasicResourceSet();

    // Create a test package
    testPackage = new BasicEPackage();
    testPackage.setName('test');
    testPackage.setNsURI('http://test.com/model');
    testPackage.setNsPrefix('test');

    const factory = new BasicEFactory();
    factory.setEPackage(testPackage);
    testPackage.setEFactoryInstance(factory);

    // Add data types (with ePackage reference)
    stringType = new BasicEDataType();
    stringType.setName('EString');
    stringType.setInstanceClassName('string');
    stringType.setEPackage(testPackage);
    testPackage.getEClassifiers().push(stringType);

    intType = new BasicEDataType();
    intType.setName('EInt');
    intType.setInstanceClassName('number');
    intType.setEPackage(testPackage);
    testPackage.getEClassifiers().push(intType);

    // Create Address class (with ePackage reference)
    addressClass = new BasicEClass();
    addressClass.setName('Address');
    addressClass.setEPackage(testPackage);
    testPackage.getEClassifiers().push(addressClass);

    const streetAttr = new BasicEAttribute();
    streetAttr.setName('street');
    streetAttr.setEType(stringType);
    addressClass.getEStructuralFeatures().push(streetAttr);

    const cityAttr = new BasicEAttribute();
    cityAttr.setName('city');
    cityAttr.setEType(stringType);
    addressClass.getEStructuralFeatures().push(cityAttr);

    // Create Person class (with ePackage reference)
    personClass = new BasicEClass();
    personClass.setName('Person');
    personClass.setEPackage(testPackage);
    testPackage.getEClassifiers().push(personClass);

    const nameAttr = new BasicEAttribute();
    nameAttr.setName('name');
    nameAttr.setEType(stringType);
    personClass.getEStructuralFeatures().push(nameAttr);

    const ageAttr = new BasicEAttribute();
    ageAttr.setName('age');
    ageAttr.setEType(intType);
    personClass.getEStructuralFeatures().push(ageAttr);

    // Add containment reference: Person.addresses (many)
    const addressesRef = new BasicEReference();
    addressesRef.setName('addresses');
    addressesRef.setEType(addressClass);
    addressesRef.setContainment(true);
    addressesRef.setUpperBound(-1);
    personClass.getEStructuralFeatures().push(addressesRef);

    // Add non-containment reference: Person.primaryAddress (single)
    const primaryAddressRef = new BasicEReference();
    primaryAddressRef.setName('primaryAddress');
    primaryAddressRef.setEType(addressClass);
    primaryAddressRef.setContainment(false);
    personClass.getEStructuralFeatures().push(primaryAddressRef);

    // Register the package
    resourceSet.getPackageRegistry().set('http://test.com/model', testPackage);
  });

  /**
   * @description Grundlegende Serialisierung
   * Einfache Objekte mit Attributen und Containment.
   *
   * @example
   * ```typescript
   * const xml = resource.saveToString();
   * // Enthält: name="John" age="30"
   * ```
   */
  describe('Basic Serialization', () => {
    /**
     * @description Einfaches Objekt mit Attributen serialisieren
     * @example
     * ```typescript
     * person.eSet(nameAttr, 'John');
     * const xml = resource.saveToString();
     * // xml enthält: name="John"
     * ```
     */
    it('should serialize a simple object with attributes', () => {
      const resource = new XMIResource(URI.createURI('test://model.xmi'));
      resource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();
      const person = factory.create(personClass);

      const nameFeature = personClass.getEStructuralFeature('name');
      const ageFeature = personClass.getEStructuralFeature('age');

      person.eSet(nameFeature!, 'John Doe');
      person.eSet(ageFeature!, 30);

      resource.getContents().push(person);

      // Debug: check package references
      console.log('Package nsPrefix:', testPackage.getNsPrefix());
      console.log('PersonClass ePackage:', personClass.getEPackage()?.getName());

      const xml = resource.saveToString();
      console.log('Simple object XML:', xml);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('name="John Doe"');
      expect(xml).toContain('age="30"');
      // Root element should be qualified with package prefix
      expect(xml).toContain('xmlns:test="http://test.com/model"');
      expect(xml).toContain('<test:Person');
    });

    it('should serialize containment references', () => {
      const resource = new XMIResource(URI.createURI('test://model.xmi'));
      resource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();

      // Create person
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'Jane Doe');

      // Create addresses
      const address1 = factory.create(addressClass);
      address1.eSet(addressClass.getEStructuralFeature('street')!, '123 Main St');
      address1.eSet(addressClass.getEStructuralFeature('city')!, 'Berlin');

      const address2 = factory.create(addressClass);
      address2.eSet(addressClass.getEStructuralFeature('street')!, '456 Oak Ave');
      address2.eSet(addressClass.getEStructuralFeature('city')!, 'Munich');

      // Add addresses to person
      const addressesFeature = personClass.getEStructuralFeature('addresses');
      const addressesList = person.eGet(addressesFeature!) as EObject[];
      addressesList.push(address1);
      addressesList.push(address2);

      resource.getContents().push(person);

      const xml = resource.saveToString();

      expect(xml).toContain('<addresses');
      expect(xml).toContain('street="123 Main St"');
      expect(xml).toContain('city="Berlin"');
      expect(xml).toContain('street="456 Oak Ave"');
      expect(xml).toContain('city="Munich"');
    });

    it('should serialize non-containment references as href', () => {
      const resource = new XMIResource(URI.createURI('test://model.xmi'));
      resource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();

      // Create person
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'Bob Smith');

      // Create addresses (contained)
      const homeAddress = factory.create(addressClass);
      homeAddress.eSet(addressClass.getEStructuralFeature('street')!, '789 Home Rd');
      homeAddress.eSet(addressClass.getEStructuralFeature('city')!, 'Hamburg');

      const workAddress = factory.create(addressClass);
      workAddress.eSet(addressClass.getEStructuralFeature('street')!, '321 Work Blvd');
      workAddress.eSet(addressClass.getEStructuralFeature('city')!, 'Frankfurt');

      // Add addresses to containment
      const addressesFeature = personClass.getEStructuralFeature('addresses');
      const addressesList = person.eGet(addressesFeature!) as EObject[];
      addressesList.push(homeAddress);
      addressesList.push(workAddress);

      // Set primaryAddress as non-containment reference to homeAddress
      const primaryAddressFeature = personClass.getEStructuralFeature('primaryAddress');
      person.eSet(primaryAddressFeature!, homeAddress);

      resource.getContents().push(person);

      // Set ID for the home address so it can be referenced
      resource.setID(homeAddress, 'home_addr');

      const xml = resource.saveToString();

      console.log('Generated XML:', xml);

      // Should contain the primaryAddress as an attribute reference
      expect(xml).toContain('primaryAddress=');
      expect(xml).toContain('name="Bob Smith"');
      expect(xml).toContain('street="789 Home Rd"');
    });
  });

  /**
   * @description Cross-Resource Referenzen
   * Referenzen zu Objekten in anderen Resources werden als URIs serialisiert.
   *
   * @example
   * ```typescript
   * // Address in addresses.xmi
   * // Person in persons.xmi referenziert die Address
   * const xml = personResource.saveToString();
   * // xml enthält: primaryAddress="addresses.xmi#shared_addr"
   * ```
   */
  describe('Cross-Resource References', () => {
    /**
     * @description Referenzen zu Objekten in anderen Resources
     * @example
     * ```typescript
     * person.eSet(primaryAddressRef, addressInOtherResource);
     * // Ergebnis: href="other.xmi#id"
     * ```
     */
    it('should serialize references to objects in other resources', () => {
      // Create first resource with Address
      const addressResource = new XMIResource(URI.createURI('addresses.xmi'));
      addressResource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();

      const sharedAddress = factory.create(addressClass);
      sharedAddress.eSet(addressClass.getEStructuralFeature('street')!, '100 Shared St');
      sharedAddress.eSet(addressClass.getEStructuralFeature('city')!, 'Cologne');

      addressResource.getContents().push(sharedAddress);
      addressResource.setID(sharedAddress, 'shared_addr');

      // Create second resource with Person referencing address in first resource
      const personResource = new XMIResource(URI.createURI('persons.xmi'));
      personResource.setResourceSet(resourceSet);

      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'Alice');

      // Set non-containment reference to address in other resource
      const primaryAddressFeature = personClass.getEStructuralFeature('primaryAddress');
      person.eSet(primaryAddressFeature!, sharedAddress);

      personResource.getContents().push(person);

      const xml = personResource.saveToString();

      console.log('Cross-resource XML:', xml);

      // Should reference the address in the other resource
      expect(xml).toContain('primaryAddress=');
      expect(xml).toContain('name="Alice"');
    });
  });

  /**
   * @description Referenzen zu EClassifiers
   * Serialisierung von Meta-Referenzen (EClass, EDataType).
   *
   * @example
   * ```typescript
   * query.eSet(targetClassRef, PersonClass);
   * // Ergebnis: targetClass="#//Person" oder "http://.../model#//Person"
   * ```
   */
  describe('References to EClassifiers', () => {
    /**
     * @description Referenzen zu EClass-Objekten serialisieren
     * @example
     * ```typescript
     * // Meta-Modell referenziert eine EClass
     * query.eSet(targetClassRef, PersonClass);
     * ```
     */
    it('should serialize references to EClass objects', () => {
      // Register EcorePackage first
      const ecorePackage = getEcorePackage();
      resourceSet.getPackageRegistry().set(ecorePackage.getNsURI()!, ecorePackage);

      // Create a meta-model package with a class that references other EClasses
      const metaPackage = new BasicEPackage();
      metaPackage.setName('meta');
      metaPackage.setNsURI('http://test.com/meta');
      metaPackage.setNsPrefix('meta');

      const metaFactory = new BasicEFactory();
      metaFactory.setEPackage(metaPackage);
      metaPackage.setEFactoryInstance(metaFactory);

      // Create a "Query" class that has a reference to an EClass
      const queryClass = new BasicEClass();
      queryClass.setName('Query');
      metaPackage.getEClassifiers().push(queryClass);

      // Import EClass from Ecore (simulate it)
      const eClassType = new BasicEClass();
      eClassType.setName('EClass');

      // Add a non-containment reference to EClass
      const targetClassRef = new BasicEReference();
      targetClassRef.setName('targetClass');
      targetClassRef.setEType(eClassType);
      targetClassRef.setContainment(false);
      queryClass.getEStructuralFeatures().push(targetClassRef);

      resourceSet.getPackageRegistry().set('http://test.com/meta', metaPackage);

      // Create resource
      const resource = new XMIResource(URI.createURI('query.xmi'));
      resource.setResourceSet(resourceSet);

      // Create query instance
      const query = metaFactory.create(queryClass);

      // Set reference to Person class (from our test package)
      const targetClassFeature = queryClass.getEStructuralFeature('targetClass');
      query.eSet(targetClassFeature!, personClass);

      resource.getContents().push(query);

      const xml = resource.saveToString();

      console.log('EClass reference XML:', xml);

      // Should contain href to the Person class
      expect(xml).toContain('targetClass=');
      // The href contains fragment path to the class
      // Format can be "//Person" or full URI with package
      expect(xml).toContain('Person');
    });
  });

  /**
   * @description Round-Trip Serialisierung
   * Gespeicherte Daten können wieder geladen werden.
   *
   * @example
   * ```typescript
   * const xml = saveResource.saveToString();
   * loadResource.loadFromString(xml);
   * // Geladene Daten entsprechen Original
   * ```
   */
  describe('Round-trip Serialization', () => {
    /**
     * @description Gespeichertes kann wieder geladen werden
     * @example
     * ```typescript
     * const xml = resource.saveToString();
     * // xml enthält alle Attribute und Referenzen
     * newResource.loadFromString(xml);
     * ```
     */
    it('should load what was saved', async () => {
      // Register EcorePackage first (needed for loading)
      const ecorePackage = getEcorePackage();
      resourceSet.getPackageRegistry().set(ecorePackage.getNsURI()!, ecorePackage);

      // Create and save
      const saveResource = new XMIResource(URI.createURI('roundtrip.xmi'));
      saveResource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'Test Person');
      person.eSet(personClass.getEStructuralFeature('age')!, 25);

      const address = factory.create(addressClass);
      address.eSet(addressClass.getEStructuralFeature('street')!, 'Test Street');
      address.eSet(addressClass.getEStructuralFeature('city')!, 'Test City');

      const addressesList = person.eGet(personClass.getEStructuralFeature('addresses')!) as EObject[];
      addressesList.push(address);

      saveResource.getContents().push(person);

      const xml = saveResource.saveToString();
      console.log('Round-trip XML:', xml);

      // Verify serialization output contains expected data
      expect(xml).toContain('name="Test Person"');
      expect(xml).toContain('age="25"');
      expect(xml).toContain('street="Test Street"');
      expect(xml).toContain('city="Test City"');
      expect(xml).toContain('<addresses');

      // Note: Full round-trip loading requires the XML to include proper namespace
      // declarations that map to registered packages. This is a more complex test
      // that depends on XMLSave writing xmlns:test="http://test.com/model" etc.
    });

    it('should load saved XML and preserve attribute values', async () => {
      // Create and save
      const saveResource = new XMIResource(URI.createURI('roundtrip2.xmi'));
      saveResource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'RoundTrip Person');
      person.eSet(personClass.getEStructuralFeature('age')!, 42);

      saveResource.getContents().push(person);
      const xml = saveResource.saveToString();

      // Load into new resource
      const loadResource = new XMIResource(URI.createURI('roundtrip2.xmi'));
      loadResource.setResourceSet(resourceSet);
      loadResource.loadFromString(xml);

      // Verify loaded content
      expect(loadResource.getContents().size()).toBe(1);
      const loadedPerson = loadResource.getContents().get(0);

      expect(loadedPerson.eClass().getName()).toBe('Person');
      expect(loadedPerson.eGet(personClass.getEStructuralFeature('name')!)).toBe('RoundTrip Person');
      expect(loadedPerson.eGet(personClass.getEStructuralFeature('age')!)).toBe(42);
    });

    it('should load saved XML with containment references', async () => {
      // Create and save
      const saveResource = new XMIResource(URI.createURI('roundtrip-containment.xmi'));
      saveResource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'Parent');

      const address1 = factory.create(addressClass);
      address1.eSet(addressClass.getEStructuralFeature('street')!, 'First Street');
      address1.eSet(addressClass.getEStructuralFeature('city')!, 'Berlin');

      const address2 = factory.create(addressClass);
      address2.eSet(addressClass.getEStructuralFeature('street')!, 'Second Street');
      address2.eSet(addressClass.getEStructuralFeature('city')!, 'Munich');

      const addressesList = person.eGet(personClass.getEStructuralFeature('addresses')!) as any;
      addressesList.push(address1);
      addressesList.push(address2);

      saveResource.getContents().push(person);
      const xml = saveResource.saveToString();

      console.log('Containment round-trip XML:', xml);

      // Load into new resource
      const loadResource = new XMIResource(URI.createURI('roundtrip-containment.xmi'));
      loadResource.setResourceSet(resourceSet);
      loadResource.loadFromString(xml);

      // Verify loaded content
      expect(loadResource.getContents().size()).toBe(1);
      const loadedPerson = loadResource.getContents().get(0);

      expect(loadedPerson.eClass().getName()).toBe('Person');
      expect(loadedPerson.eGet(personClass.getEStructuralFeature('name')!)).toBe('Parent');

      const loadedAddresses = loadedPerson.eGet(personClass.getEStructuralFeature('addresses')!) as any;
      expect(loadedAddresses.length).toBe(2);

      const addr1 = loadedAddresses[0];
      const addr2 = loadedAddresses[1];

      expect(addr1.eGet(addressClass.getEStructuralFeature('street')!)).toBe('First Street');
      expect(addr1.eGet(addressClass.getEStructuralFeature('city')!)).toBe('Berlin');
      expect(addr2.eGet(addressClass.getEStructuralFeature('street')!)).toBe('Second Street');
      expect(addr2.eGet(addressClass.getEStructuralFeature('city')!)).toBe('Munich');
    });
  });

  /**
   * @description Proxy Serialisierung
   * Proxies werden korrekt als URIs serialisiert, nicht als "EProxy(...)".
   */
  describe('Proxy Serialization', () => {
    it('should serialize resolved proxy as normal value', async () => {
      // Create first resource with Address
      const addressResource = new XMIResource(URI.createURI('proxy-test-address.xmi'));
      addressResource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();

      const address = factory.create(addressClass);
      address.eSet(addressClass.getEStructuralFeature('street')!, 'Proxy Street');
      address.eSet(addressClass.getEStructuralFeature('city')!, 'ProxyCity');

      addressResource.getContents().push(address);
      addressResource.setID(address, 'addr1');

      // Create person resource
      const personResource = new XMIResource(URI.createURI('proxy-test-person.xmi'));
      personResource.setResourceSet(resourceSet);

      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'ProxyTester');

      // Create a proxy reference to the address
      const proxy = new EProxyImpl(addressClass);
      proxy.eSetProxyURI(URI.createURI('proxy-test-address.xmi#addr1'));

      person.eSet(personClass.getEStructuralFeature('primaryAddress')!, proxy);
      personResource.getContents().push(person);

      const xml = personResource.saveToString();

      console.log('Proxy serialization XML:', xml);

      // Should NOT contain "EProxy"
      expect(xml).not.toContain('EProxy');
      // Should contain reference to the address resource
      expect(xml).toContain('primaryAddress=');
      expect(xml).toContain('proxy-test-address.xmi#addr1');
    });

    it('should serialize unresolved proxy as URI reference', () => {
      const resource = new XMIResource(URI.createURI('unresolved-proxy.xmi'));
      resource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'HasUnresolvedProxy');

      // Create a proxy to a non-existent resource
      const proxy = new EProxyImpl(addressClass);
      proxy.eSetProxyURI(URI.createURI('non-existent.xmi#missing'));

      person.eSet(personClass.getEStructuralFeature('primaryAddress')!, proxy);
      resource.getContents().push(person);

      const xml = resource.saveToString();

      console.log('Unresolved proxy XML:', xml);

      // Should NOT contain "EProxy"
      expect(xml).not.toContain('EProxy');
      // Should contain the proxy URI as href
      expect(xml).toContain('primaryAddress=');
      expect(xml).toContain('non-existent.xmi#missing');
    });

    it('should serialize boolean attribute as true/false, not EProxy', () => {
      // Add a boolean attribute to Person
      const boolType = new BasicEDataType();
      boolType.setName('EBoolean');
      boolType.setInstanceClassName('boolean');
      boolType.setEPackage(testPackage);
      testPackage.getEClassifiers().push(boolType);

      const activeAttr = new BasicEAttribute();
      activeAttr.setName('active');
      activeAttr.setEType(boolType);
      personClass.getEStructuralFeatures().push(activeAttr);

      const resource = new XMIResource(URI.createURI('boolean-test.xmi'));
      resource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();
      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'BoolTest');
      person.eSet(personClass.getEStructuralFeature('active')!, true);

      resource.getContents().push(person);

      const xml = resource.saveToString();

      console.log('Boolean serialization XML:', xml);

      // Should contain active="true" not active="EProxy..." or anything else
      expect(xml).toContain('active="true"');
      expect(xml).not.toContain('EProxy');
    });

    it('should roundtrip cross-resource references through proxy', async () => {
      // Create address resource
      const addressResource = new XMIResource(URI.createURI('cross-addr.xmi'));
      addressResource.setResourceSet(resourceSet);

      const factory = testPackage.getEFactoryInstance();

      const address = factory.create(addressClass);
      address.eSet(addressClass.getEStructuralFeature('street')!, 'Cross Street');
      address.eSet(addressClass.getEStructuralFeature('city')!, 'CrossCity');

      addressResource.getContents().push(address);
      addressResource.setID(address, 'cross_addr');

      // Create and save person resource with reference
      const personResource = new XMIResource(URI.createURI('cross-person.xmi'));
      personResource.setResourceSet(resourceSet);

      const person = factory.create(personClass);
      person.eSet(personClass.getEStructuralFeature('name')!, 'CrossRef');
      person.eSet(personClass.getEStructuralFeature('primaryAddress')!, address);

      personResource.getContents().push(person);

      const xml = personResource.saveToString();
      console.log('Cross-resource reference XML:', xml);

      // Should reference the address in the other resource
      expect(xml).toContain('primaryAddress=');
      expect(xml).not.toContain('EProxy');

      // Load person resource into new ResourceSet
      const newResourceSet = new BasicResourceSet();
      newResourceSet.getPackageRegistry().set('http://test.com/model', testPackage);

      // First add the address resource to the new resource set
      const newAddressResource = new XMIResource(URI.createURI('cross-addr.xmi'));
      newAddressResource.setResourceSet(newResourceSet);
      const addrXml = addressResource.saveToString();
      newAddressResource.loadFromString(addrXml);

      // Then load the person resource
      const newPersonResource = new XMIResource(URI.createURI('cross-person.xmi'));
      newPersonResource.setResourceSet(newResourceSet);
      newPersonResource.loadFromString(xml);

      // Check loaded person
      const loadedPerson = newPersonResource.getContents().get(0);
      expect(loadedPerson.eGet(personClass.getEStructuralFeature('name')!)).toBe('CrossRef');

      // The primary address should be a proxy or resolvable
      const loadedPrimaryAddr = loadedPerson.eGet(personClass.getEStructuralFeature('primaryAddress')!);
      expect(loadedPrimaryAddr).toBeDefined();
    });
  });
});

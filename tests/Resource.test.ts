/**
 * @fileoverview Resource Tests - EMF Ressourcen-Management
 *
 * Resources sind Container für persistierte EMF-Modelle.
 * Sie verwalten:
 * - URI-basierte Identifikation
 * - Lade- und Speicher-Operationen
 * - URI-Fragment-Auflösung für Querverweise
 * - Fehler und Warnungen beim Laden/Speichern
 *
 * @example
 * ```typescript
 * // Resource erstellen
 * const resourceSet = new BasicResourceSet();
 * const resource = resourceSet.createResource(URI.createURI('model.xmi'));
 *
 * // Objekte hinzufügen
 * const book = factory.create(BookClass);
 * resource.getContents().push(book);
 *
 * // Speichern
 * await resource.save();
 *
 * // URI-Fragment auflösen
 * const obj = resource.getEObject('/0'); // Erstes Root-Objekt
 * ```
 *
 * @module tests/Resource
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicResource,
  BasicResourceSet,
  EcoreDataTypes
} from '../src/runtime';
import { URI } from '../src/URI';
import { EPackage } from '../src/EPackage';
import { EClass } from '../src/EClass';
import { Resource } from '../src/Resource';
import { ResourceSet } from '../src/ResourceSet';
import { getEcorePackage } from '../src/ecore/EcorePackage';

/**
 * @description Resource Hauptfunktionalität
 * Eine Resource ist ein Container für persistierte EObjects mit URI-Identifikation.
 *
 * @example
 * ```typescript
 * const resource = new BasicResource(URI.createURI('model.xmi'));
 * resource.getContents().push(myObject);
 * await resource.save();
 * ```
 */
describe('Resource', () => {
  let bookPackage: EPackage;
  let bookClass: EClass;
  let titleAttr: any;
  let isbnAttr: any;
  let authorsRef: any;
  let authorClass: EClass;
  let authorNameAttr: any;

  beforeEach(() => {
    // Create Book metamodel
    bookClass = new BasicEClass();
    bookClass.setName('Book');

    titleAttr = new BasicEAttribute();
    titleAttr.setName('title');
    titleAttr.setEType(EcoreDataTypes.EString);
    (bookClass as any).addFeature(titleAttr);

    isbnAttr = new BasicEAttribute();
    isbnAttr.setName('isbn');
    isbnAttr.setEType(EcoreDataTypes.EString);
    isbnAttr.setID(true);
    (bookClass as any).addFeature(isbnAttr);

    // Create Author metamodel
    authorClass = new BasicEClass();
    authorClass.setName('Author');

    authorNameAttr = new BasicEAttribute();
    authorNameAttr.setName('name');
    authorNameAttr.setEType(EcoreDataTypes.EString);
    (authorClass as any).addFeature(authorNameAttr);

    authorsRef = new BasicEReference();
    authorsRef.setName('authors');
    authorsRef.setEType(authorClass);
    authorsRef.setUpperBound(-1);
    authorsRef.setContainment(true);
    (bookClass as any).addFeature(authorsRef);

    bookPackage = new (class extends BasicEPackage {
      constructor() {
        super();
        this.setName('book');
        this.setNsURI('http://example.com/book');
        this.setNsPrefix('book');
      }
    })();
    bookPackage.getEClassifiers().push(bookClass);
    bookPackage.getEClassifiers().push(authorClass);
  });

  /**
   * @description Grundlegende Resource-Operationen
   * Erstellen, Contents verwalten, Zustand tracken.
   *
   * @example
   * ```typescript
   * const resource = new BasicResource(URI.createURI('file.xmi'));
   * resource.getContents().push(obj);
   * resource.isModified();   // false
   * resource.setModified(true);
   * resource.isModified();   // true
   * ```
   */
  describe('Basic Operations', () => {
    /**
     * @description Resource mit URI erstellen
     * @example
     * ```typescript
     * const uri = URI.createURI('http://example.com/model.xmi');
     * const resource = new BasicResource(uri);
     * resource.getURI().toString(); // 'http://example.com/model.xmi'
     * ```
     */
    it('should create resource with URI', () => {
      const uri = URI.createURI('http://example.com/test.json');
      const resource = new BasicResource(uri);

      expect(resource.getURI()).toBe(uri);
      expect(resource.getURI()?.toString()).toBe('http://example.com/test.json');
    });

    /**
     * @description Contents verwalten
     * @example
     * ```typescript
     * resource.getContents().push(obj);
     * resource.getContents()[0]; // obj
     * ```
     */
    it('should manage contents', () => {
      const resource = new BasicResource();
      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);

      expect(resource.getContents()).toHaveLength(0);

      resource.getContents().push(book);

      expect(resource.getContents()).toHaveLength(1);
      expect(resource.getContents()[0]).toBe(book);
    });

    /**
     * @description Loaded-Status tracken
     * @example
     * ```typescript
     * resource.isLoaded();  // false
     * await resource.load();
     * resource.isLoaded();  // true
     * ```
     */
    it('should track loaded state', async () => {
      const resource = new BasicResource();

      expect(resource.isLoaded()).toBe(false);

      await resource.load();

      expect(resource.isLoaded()).toBe(true);
    });

    /**
     * @description Modified-Status tracken
     * @example
     * ```typescript
     * resource.isModified();       // false
     * resource.setModified(true);
     * resource.isModified();       // true
     * ```
     */
    it('should track modified state', () => {
      const resource = new BasicResource();

      expect(resource.isModified()).toBe(false);

      resource.setModified(true);

      expect(resource.isModified()).toBe(true);
    });

    /**
     * @description Resource entladen
     * @example
     * ```typescript
     * resource.unload();
     * resource.getContents().length; // 0
     * resource.isLoaded();           // false
     * ```
     */
    it('should unload resource', () => {
      const resource = new BasicResource();
      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);

      resource.getContents().push(book);
      resource.setModified(true);

      resource.unload();

      expect(resource.getContents()).toHaveLength(0);
      expect(resource.isLoaded()).toBe(false);
      expect(resource.isModified()).toBe(false);
    });
  });

  /**
   * @description URI-Fragment-Verwaltung
   * Fragmente identifizieren Objekte innerhalb einer Resource.
   * Unterstützt XPath-Style (/0, /0/0) und ID-basierte Lookups.
   *
   * @example
   * ```typescript
   * const fragment = resource.getURIFragment(obj); // '/0'
   * const resolved = resource.getEObject('/0');    // obj
   * ```
   */
  describe('URI Fragments', () => {
    /**
     * @description XPath-Style Fragmente generieren
     * @example
     * ```typescript
     * resource.getURIFragment(rootObj);   // '/0'
     * resource.getURIFragment(childObj);  // '/0/0'
     * ```
     */
    it('should generate XPath-style fragments', () => {
      const resource = new BasicResource();
      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);
      const author1 = factory.create(authorClass);
      const author2 = factory.create(authorClass);

      resource.getContents().push(book);
      const authors = book.eGet(authorsRef) as any[];
      authors.push(author1);
      authors.push(author2);

      expect(resource.getURIFragment(book)).toBe('/0');
      expect(resource.getURIFragment(author1)).toBe('/0/0');
      expect(resource.getURIFragment(author2)).toBe('/0/1');
    });

    /**
     * @description XPath-Style Fragmente auflösen
     * @example
     * ```typescript
     * resource.getEObject('/0');    // Erstes Root-Objekt
     * resource.getEObject('/0/0');  // Erstes Kind des ersten Root-Objekts
     * ```
     */
    it('should resolve XPath-style fragments', () => {
      const resource = new BasicResource();
      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);
      const author = factory.create(authorClass);

      resource.getContents().push(book);
      const authors = book.eGet(authorsRef) as any[];
      authors.push(author);

      expect(resource.getEObject('/0')).toBe(book);
      expect(resource.getEObject('/0/0')).toBe(author);
    });

    /**
     * @description null bei ungültigen Fragmenten
     * @example
     * ```typescript
     * resource.getEObject('/99');    // null (nicht vorhanden)
     * resource.getEObject('/0/99');  // null (Kind nicht vorhanden)
     * ```
     */
    it('should return null for invalid fragments', () => {
      const resource = new BasicResource();

      expect(resource.getEObject('/99')).toBeNull();
      expect(resource.getEObject('/0/99')).toBeNull();
    });

    /**
     * @description Lookup über ID-Attribut
     * Wenn ein Attribut als ID markiert ist, kann das Objekt über dessen Wert gefunden werden.
     * @example
     * ```typescript
     * book.eSet(isbnAttr, '978-0123456789');
     * resource.getEObject('978-0123456789'); // book
     * ```
     */
    it('should lookup by ID attribute', () => {
      const resource = new BasicResource();
      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);
      book.eSet(isbnAttr, '978-0123456789');

      resource.getContents().push(book);

      const found = resource.getEObject('978-0123456789');
      expect(found).toBe(book);
    });

    /**
     * @description EMF-Style //Name Fragmente auflösen
     * Das Pattern #//Name findet benannte Elemente in Ecore-Dateien.
     * @example
     * ```typescript
     * // In einer geladenen .ecore Datei
     * resource.getEObject('//MyClass');    // Die EClass namens 'MyClass'
     * resource.getEObject('//MyEnum');     // Der EEnum namens 'MyEnum'
     * ```
     */
    it('should resolve //Name fragments (EMF-style named element lookup)', () => {
      // This tests the pattern used in Ecore files like #//SortOrder
      // where the fragment //Name means "find element named 'Name' in the root's contents"

      // Initialize EcorePackage (required for eClass() calls)
      getEcorePackage();

      const resource = new BasicResource();

      // Add the package to the resource (simulates loading an .ecore file)
      resource.getContents().push(bookPackage as any);

      // Now test that //Book resolves to the Book classifier within the package
      const foundBook = resource.getEObject('//Book');
      expect(foundBook).toBe(bookClass);

      // Also test //Author
      const foundAuthor = resource.getEObject('//Author');
      expect(foundAuthor).toBe(authorClass);

      // Non-existent should return null
      const notFound = resource.getEObject('//NonExistent');
      expect(notFound).toBeNull();
    });

    /**
     * @description Fallback für /Name Fragmente
     * @example
     * ```typescript
     * resource.getEObject('/Book'); // Auch über einzelnen Slash findbar
     * ```
     */
    it('should resolve single slash name fragments as fallback', () => {
      // Test /Name pattern also works for named elements

      // Initialize EcorePackage (required for eClass() calls)
      getEcorePackage();

      const resource = new BasicResource();
      resource.getContents().push(bookPackage as any);

      // /Book should also find the Book class (fallback search in root's contents)
      const foundBook = resource.getEObject('/Book');
      expect(foundBook).toBe(bookClass);
    });
  });

  /**
   * @description getAllContents() - Alle Objekte iterieren
   * Iterator über alle Objekte in der Resource inklusive verschachtelter.
   *
   * @example
   * ```typescript
   * const iterator = resource.getAllContents();
   * for (const obj of iterator) {
   *   console.log(obj.eClass().getName());
   * }
   * ```
   */
  describe('getAllContents', () => {
    /**
     * @description Tiefensuche über alle Objekte
     * @example
     * ```typescript
     * const all: EObject[] = [];
     * for (const obj of resource.getAllContents()) {
     *   all.push(obj);
     * }
     * // all enthält Root-Objekte und alle enthaltenen Objekte
     * ```
     */
    it('should iterate over all objects', () => {
      const resource = new BasicResource();
      const factory = bookPackage.getEFactoryInstance();
      const book1 = factory.create(bookClass);
      const book2 = factory.create(bookClass);
      const author1 = factory.create(authorClass);
      const author2 = factory.create(authorClass);

      resource.getContents().push(book1);
      resource.getContents().push(book2);

      const authors1 = book1.eGet(authorsRef) as any[];
      authors1.push(author1);

      const authors2 = book2.eGet(authorsRef) as any[];
      authors2.push(author2);

      const allContents: any[] = [];
      const iterator = resource.getAllContents();
      let result = iterator.next();
      while (!result.done) {
        allContents.push(result.value);
        result = iterator.next();
      }

      expect(allContents).toHaveLength(4);
      expect(allContents).toContain(book1);
      expect(allContents).toContain(book2);
      expect(allContents).toContain(author1);
      expect(allContents).toContain(author2);
    });
  });

  /**
   * @description Fehler und Warnungen
   * Resources sammeln Fehler und Warnungen beim Laden/Speichern.
   *
   * @example
   * ```typescript
   * await resource.load();
   * if (resource.getErrors().length > 0) {
   *   console.error('Ladefehler:', resource.getErrors());
   * }
   * ```
   */
  describe('Errors and Warnings', () => {
    /**
     * @description Fehler tracken
     * @example
     * ```typescript
     * resource.getErrors().push({ message: 'Parse error at line 42' });
     * resource.getErrors()[0].message; // 'Parse error at line 42'
     * ```
     */
    it('should track errors', () => {
      const resource = new BasicResource();

      expect(resource.getErrors()).toHaveLength(0);

      resource.getErrors().push({ message: 'Test error' });

      expect(resource.getErrors()).toHaveLength(1);
      expect(resource.getErrors()[0].message).toBe('Test error');
    });

    /**
     * @description Warnungen tracken
     * @example
     * ```typescript
     * resource.getWarnings().push({ message: 'Deprecated feature used' });
     * ```
     */
    it('should track warnings', () => {
      const resource = new BasicResource();

      expect(resource.getWarnings()).toHaveLength(0);

      resource.getWarnings().push({ message: 'Test warning' });

      expect(resource.getWarnings()).toHaveLength(1);
      expect(resource.getWarnings()[0].message).toBe('Test warning');
    });

    /**
     * @description Fehler beim Speichern löschen
     * @example
     * ```typescript
     * resource.getErrors().length; // 1
     * await resource.save();
     * resource.getErrors().length; // 0
     * ```
     */
    it('should clear errors on save', async () => {
      const resource = new BasicResource();
      resource.getErrors().push({ message: 'Old error' });

      await resource.save();

      expect(resource.getErrors()).toHaveLength(0);
    });
  });

  /**
   * @description ResourceSet - Verwaltung mehrerer Resources
   * Ein ResourceSet verwaltet zusammengehörige Resources und die Package-Registry.
   *
   * @example
   * ```typescript
   * const resourceSet = new BasicResourceSet();
   *
   * // Package registrieren
   * resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);
   *
   * // Resources erstellen/laden
   * const res1 = resourceSet.createResource(URI.createURI('model1.xmi'));
   * const res2 = resourceSet.createResource(URI.createURI('model2.xmi'));
   * ```
   */
  describe('ResourceSet', () => {
    /**
     * @description Resources erstellen
     * @example
     * ```typescript
     * const resource = resourceSet.createResource(URI.createURI('model.xmi'));
     * resourceSet.getResources().includes(resource); // true
     * ```
     */
    it('should create resources', () => {
      const resourceSet = new BasicResourceSet();
      const uri = URI.createURI('test://example.json');

      const resource = resourceSet.createResource(uri);

      expect(resource).toBeDefined();
      expect(resource.getURI()).toBe(uri);
      expect(resourceSet.getResources()).toContain(resource);
    });

    /**
     * @description Existierende Resources abrufen
     * @example
     * ```typescript
     * const created = resourceSet.createResource(uri);
     * const found = resourceSet.getResource(uri, false);
     * found === created; // true
     * ```
     */
    it('should retrieve existing resources', () => {
      const resourceSet = new BasicResourceSet();
      const uri = URI.createURI('test://example.json');

      const resource1 = resourceSet.createResource(uri);
      const resource2 = resourceSet.getResource(uri, false);

      expect(resource2).toBe(resource1);
    });

    /**
     * @description null für nicht existierende Resources
     * @example
     * ```typescript
     * resourceSet.getResource(unknownUri, false); // null
     * ```
     */
    it('should return null for non-existing resources', () => {
      const resourceSet = new BasicResourceSet();
      const uri = URI.createURI('test://nonexistent.json');

      const resource = resourceSet.getResource(uri, false);

      expect(resource).toBeNull();
    });

    /**
     * @description Package-Registry verwalten
     * @example
     * ```typescript
     * const registry = resourceSet.getPackageRegistry();
     * registry.set('http://example.com/mymodel', myPackage);
     * registry.get('http://example.com/mymodel'); // myPackage
     * ```
     */
    it('should manage package registry', () => {
      const resourceSet = new BasicResourceSet();
      const registry = resourceSet.getPackageRegistry();

      registry.set(bookPackage.getNsURI()!, bookPackage);

      expect(registry.get(bookPackage.getNsURI()!)).toBe(bookPackage);
    });

    /**
     * @description EObject über URI mit Fragment abrufen
     * @example
     * ```typescript
     * const uri = URI.createURI('model.xmi#/0');
     * const obj = resourceSet.getEObject(uri, false);
     * ```
     */
    it('should get EObject by URI with fragment', () => {
      const resourceSet = new BasicResourceSet();
      resourceSet.getPackageRegistry().set(bookPackage.getNsURI()!, bookPackage);

      const uri = URI.createURI('test://example.json');
      const resource = resourceSet.createResource(uri);

      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);
      resource.getContents().push(book);

      const uriWithFragment = URI.createURI('test://example.json#/0');
      const found = resourceSet.getEObject(uriWithFragment, false);

      expect(found).toBe(book);
    });
  });

  /**
   * @description Speichern und Laden
   * Asynchrone Operationen zum Persistieren und Laden von Modellen.
   *
   * @example
   * ```typescript
   * // Speichern
   * resource.getContents().push(myModel);
   * await resource.save();
   *
   * // Laden
   * const resource2 = resourceSet.createResource(uri);
   * await resource2.load();
   * const loaded = resource2.getContents()[0];
   * ```
   */
  describe('Save and Load', () => {
    /**
     * @description Resource speichern
     * @example
     * ```typescript
     * await resource.save();
     * resource.isModified(); // false nach Speichern
     * ```
     */
    it('should save without errors', async () => {
      const resource = new BasicResource(URI.createURI('test://save.json'));
      const factory = bookPackage.getEFactoryInstance();
      const book = factory.create(bookClass);
      book.eSet(titleAttr, '1984');

      resource.getContents().push(book);

      await expect(resource.save()).resolves.not.toThrow();
      expect(resource.isModified()).toBe(false);
    });

    /**
     * @description Resource laden
     * @example
     * ```typescript
     * await resource.load();
     * resource.isLoaded(); // true
     * ```
     */
    it('should load without errors', async () => {
      const resource = new BasicResource(URI.createURI('test://load.json'));

      await expect(resource.load()).resolves.not.toThrow();
      expect(resource.isLoaded()).toBe(true);
    });
  });
});

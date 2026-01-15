/**
 * @fileoverview EFactory Tests - Instanziierung und Typkonvertierung
 *
 * Die EFactory ist verantwortlich für:
 * - Erstellen von EObject-Instanzen aus EClasses
 * - Konvertierung zwischen Strings und primitiven Typen
 * - Registrierung von Custom Creators für spezielle Instanziierung
 *
 * @example
 * ```typescript
 * // Factory vom Package holen
 * const factory = pkg.getEFactoryInstance();
 *
 * // Instanz erstellen
 * const person = factory.create(PersonClass);
 * person.eSet(nameAttr, 'John');
 *
 * // String zu Typ konvertieren
 * const value = factory.createFromString(EcoreDataTypes.EInt, '42'); // 42
 *
 * // Typ zu String konvertieren
 * const str = factory.convertToString(EcoreDataTypes.EInt, 42); // '42'
 * ```
 *
 * @module tests/Factory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEFactory,
  BasicEDataType,
  EcoreDataTypes
} from '../src/runtime';
import { EPackage } from '../src/EPackage';
import { EClass } from '../src/EClass';
import { EFactory } from '../src/EFactory';
import { EDataType } from '../src/EDataType';

/**
 * @description EFactory Grundfunktionen
 * Die EFactory erstellt Instanzen von EClasses und konvertiert Datentypen.
 *
 * @example
 * ```typescript
 * const factory = pkg.getEFactoryInstance();
 * const obj = factory.create(MyClass);
 * ```
 */
describe('EFactory', () => {
  let testPackage: EPackage;
  let testClass: EClass;
  let testFactory: EFactory;

  beforeEach(() => {
    testClass = new BasicEClass();
    testClass.setName('TestClass');

    testPackage = new (class extends BasicEPackage {
      constructor() {
        super();
        this.setName('test');
        this.setNsURI('http://example.com/test');
        this.setNsPrefix('test');
      }
    })();
    testPackage.getEClassifiers().push(testClass);

    testFactory = testPackage.getEFactoryInstance();
  });

  /**
   * @description create() - Instanziierung von EClasses
   * Erstellt neue EObject-Instanzen basierend auf einer EClass-Definition.
   *
   * @example
   * ```typescript
   * const person = factory.create(PersonClass);
   * person.eClass(); // PersonClass
   * ```
   */
  describe('create', () => {
    /**
     * @description Einfache Instanzerstellung
     * @example
     * ```typescript
     * const obj = factory.create(MyClass);
     * obj.eClass() === MyClass; // true
     * ```
     */
    it('should create instances of EClass', () => {
      const instance = testFactory.create(testClass);

      expect(instance).toBeDefined();
      expect(instance.eClass()).toBe(testClass);
    });

    /**
     * @description Mehrere unabhängige Instanzen erstellen
     * Jeder create()-Aufruf erzeugt ein neues, eigenständiges Objekt.
     * @example
     * ```typescript
     * const obj1 = factory.create(MyClass);
     * const obj2 = factory.create(MyClass);
     * obj1 === obj2; // false (verschiedene Objekte)
     * ```
     */
    it('should create multiple distinct instances', () => {
      const instance1 = testFactory.create(testClass);
      const instance2 = testFactory.create(testClass);

      expect(instance1).not.toBe(instance2);
      expect(instance1.eClass()).toBe(testClass);
      expect(instance2.eClass()).toBe(testClass);
    });

    /**
     * @description Abstrakte Klassen können nicht instanziiert werden
     * @example
     * ```typescript
     * myClass.setAbstract(true);
     * factory.create(myClass); // throws Error
     * ```
     */
    it('should throw for abstract classes', () => {
      testClass.setAbstract(true);

      expect(() => testFactory.create(testClass)).toThrow();
    });

    /**
     * @description Interfaces können nicht instanziiert werden
     * @example
     * ```typescript
     * myClass.setInterface(true);
     * factory.create(myClass); // throws Error
     * ```
     */
    it('should throw for interfaces', () => {
      testClass.setInterface(true);

      expect(() => testFactory.create(testClass)).toThrow();
    });
  });

  /**
   * @description createFromString() - String zu Typ konvertieren
   * Konvertiert String-Repräsentationen in die entsprechenden Datentypen.
   * Wichtig für XML/XMI Deserialisierung.
   *
   * @example
   * ```typescript
   * factory.createFromString(EcoreDataTypes.EInt, '42');    // 42
   * factory.createFromString(EcoreDataTypes.EBoolean, 'true'); // true
   * factory.createFromString(EcoreDataTypes.EFloat, '3.14');   // 3.14
   * ```
   */
  describe('createFromString', () => {
    /**
     * @description String zu Boolean konvertieren
     * @example
     * ```typescript
     * factory.createFromString(EcoreDataTypes.EBoolean, 'true');  // true
     * factory.createFromString(EcoreDataTypes.EBoolean, 'false'); // false
     * ```
     */
    it('should convert string to boolean', () => {
      const result = testFactory.createFromString(EcoreDataTypes.EBoolean, 'true');
      expect(result).toBe(true);

      const result2 = testFactory.createFromString(EcoreDataTypes.EBoolean, 'false');
      expect(result2).toBe(false);
    });

    /**
     * @description String zu Integer konvertieren
     * @example
     * ```typescript
     * factory.createFromString(EcoreDataTypes.EInt, '42'); // 42
     * ```
     */
    it('should convert string to int', () => {
      const result = testFactory.createFromString(EcoreDataTypes.EInt, '42');
      expect(result).toBe(42);
    });

    /**
     * @description String zu Float konvertieren
     * @example
     * ```typescript
     * factory.createFromString(EcoreDataTypes.EFloat, '3.14'); // 3.14
     * ```
     */
    it('should convert string to float', () => {
      const result = testFactory.createFromString(EcoreDataTypes.EFloat, '3.14');
      expect(result).toBe(3.14);
    });

    /**
     * @description String zu Double konvertieren
     * @example
     * ```typescript
     * factory.createFromString(EcoreDataTypes.EDouble, '3.14159'); // 3.14159
     * ```
     */
    it('should convert string to double', () => {
      const result = testFactory.createFromString(EcoreDataTypes.EDouble, '3.14159');
      expect(result).toBe(3.14159);
    });

    /**
     * @description String-Typ durchreichen
     * @example
     * ```typescript
     * factory.createFromString(EcoreDataTypes.EString, 'hello'); // 'hello'
     * ```
     */
    it('should handle string type', () => {
      const result = testFactory.createFromString(EcoreDataTypes.EString, 'hello');
      expect(result).toBe('hello');
    });
  });

  /**
   * @description convertToString() - Typ zu String konvertieren
   * Konvertiert Werte in String-Repräsentationen für Serialisierung.
   *
   * @example
   * ```typescript
   * factory.convertToString(EcoreDataTypes.EInt, 42);      // '42'
   * factory.convertToString(EcoreDataTypes.EBoolean, true); // 'true'
   * ```
   */
  describe('convertToString', () => {
    /**
     * @description Boolean zu String konvertieren
     * @example
     * ```typescript
     * factory.convertToString(EcoreDataTypes.EBoolean, true); // 'true'
     * ```
     */
    it('should convert boolean to string', () => {
      const result = testFactory.convertToString(EcoreDataTypes.EBoolean, true);
      expect(result).toBe('true');
    });

    /**
     * @description Number zu String konvertieren
     * @example
     * ```typescript
     * factory.convertToString(EcoreDataTypes.EInt, 42); // '42'
     * ```
     */
    it('should convert number to string', () => {
      const result = testFactory.convertToString(EcoreDataTypes.EInt, 42);
      expect(result).toBe('42');
    });

    /**
     * @description null-Werte als leeren String
     * @example
     * ```typescript
     * factory.convertToString(EcoreDataTypes.EString, null); // ''
     * ```
     */
    it('should handle null values', () => {
      const result = testFactory.convertToString(EcoreDataTypes.EString, null);
      expect(result).toBe('');
    });

    /**
     * @description undefined-Werte als leeren String
     * @example
     * ```typescript
     * factory.convertToString(EcoreDataTypes.EString, undefined); // ''
     * ```
     */
    it('should handle undefined values', () => {
      const result = testFactory.convertToString(EcoreDataTypes.EString, undefined);
      expect(result).toBe('');
    });
  });

  /**
   * @description registerCreator() - Custom Creator registrieren
   * Erlaubt das Registrieren von eigenen Creator-Funktionen für spezielle
   * Instanziierungslogik.
   *
   * @example
   * ```typescript
   * (factory as BasicEFactory).registerCreator(MyClass, () => {
   *   const obj = new MyCustomEObject();
   *   obj.initialize();
   *   return obj;
   * });
   * ```
   */
  describe('registerCreator', () => {
    /**
     * @description Custom Creator wird verwendet wenn registriert
     * @example
     * ```typescript
     * (factory as BasicEFactory).registerCreator(MyClass, () => {
     *   return new MySpecialInstance();
     * });
     * factory.create(MyClass); // Verwendet Custom Creator
     * ```
     */
    it('should use custom creator when registered', () => {
      let creatorCalled = false;
      const customInstance = testFactory.create(testClass);

      (testFactory as BasicEFactory).registerCreator(testClass, () => {
        creatorCalled = true;
        return customInstance;
      });

      const result = testFactory.create(testClass);
      expect(creatorCalled).toBe(true);
      expect(result).toBe(customInstance);
    });
  });

  /**
   * @description getEPackage() - Zugehöriges Package abrufen
   * @example
   * ```typescript
   * factory.getEPackage(); // Das Package zu dem die Factory gehört
   * ```
   */
  describe('getEPackage', () => {
    /**
     * @description Package-Referenz zurückgeben
     * @example
     * ```typescript
     * const pkg = factory.getEPackage();
     * pkg === myPackage; // true
     * ```
     */
    it('should return associated package', () => {
      expect(testFactory.getEPackage()).toBe(testPackage);
    });
  });
});

/**
 * @description EcoreDataTypes - Vordefinierte EMF-Datentypen
 * EMF stellt standardmäßige Datentypen bereit die Java-Primitiven entsprechen.
 *
 * @example
 * ```typescript
 * // Verfügbare Datentypen
 * EcoreDataTypes.EString   // java.lang.String
 * EcoreDataTypes.EInt      // int
 * EcoreDataTypes.EBoolean  // boolean
 * EcoreDataTypes.EFloat    // float
 * EcoreDataTypes.EDouble   // double
 * EcoreDataTypes.ELong     // long
 *
 * // Default-Werte
 * EcoreDataTypes.EBoolean.getDefaultValue(); // false
 * EcoreDataTypes.EInt.getDefaultValue();     // 0
 * ```
 */
describe('EcoreDataTypes', () => {
  /**
   * @description EString Datentyp
   * @example
   * ```typescript
   * EcoreDataTypes.EString.getName();              // 'EString'
   * EcoreDataTypes.EString.getInstanceClassName(); // 'java.lang.String'
   * ```
   */
  it('should provide EString', () => {
    expect(EcoreDataTypes.EString.getName()).toBe('EString');
    expect(EcoreDataTypes.EString.getInstanceClassName()).toBe('java.lang.String');
  });

  /**
   * @description EInt Datentyp
   * @example
   * ```typescript
   * EcoreDataTypes.EInt.getName();              // 'EInt'
   * EcoreDataTypes.EInt.getInstanceClassName(); // 'int'
   * ```
   */
  it('should provide EInt', () => {
    expect(EcoreDataTypes.EInt.getName()).toBe('EInt');
    expect(EcoreDataTypes.EInt.getInstanceClassName()).toBe('int');
  });

  /**
   * @description EBoolean Datentyp
   * @example
   * ```typescript
   * EcoreDataTypes.EBoolean.getName();              // 'EBoolean'
   * EcoreDataTypes.EBoolean.getInstanceClassName(); // 'boolean'
   * ```
   */
  it('should provide EBoolean', () => {
    expect(EcoreDataTypes.EBoolean.getName()).toBe('EBoolean');
    expect(EcoreDataTypes.EBoolean.getInstanceClassName()).toBe('boolean');
  });

  /**
   * @description EFloat Datentyp
   * @example
   * ```typescript
   * EcoreDataTypes.EFloat.getName();              // 'EFloat'
   * EcoreDataTypes.EFloat.getInstanceClassName(); // 'float'
   * ```
   */
  it('should provide EFloat', () => {
    expect(EcoreDataTypes.EFloat.getName()).toBe('EFloat');
    expect(EcoreDataTypes.EFloat.getInstanceClassName()).toBe('float');
  });

  /**
   * @description EDouble Datentyp
   * @example
   * ```typescript
   * EcoreDataTypes.EDouble.getName();              // 'EDouble'
   * EcoreDataTypes.EDouble.getInstanceClassName(); // 'double'
   * ```
   */
  it('should provide EDouble', () => {
    expect(EcoreDataTypes.EDouble.getName()).toBe('EDouble');
    expect(EcoreDataTypes.EDouble.getInstanceClassName()).toBe('double');
  });

  /**
   * @description ELong Datentyp
   * @example
   * ```typescript
   * EcoreDataTypes.ELong.getName();              // 'ELong'
   * EcoreDataTypes.ELong.getInstanceClassName(); // 'long'
   * ```
   */
  it('should provide ELong', () => {
    expect(EcoreDataTypes.ELong.getName()).toBe('ELong');
    expect(EcoreDataTypes.ELong.getInstanceClassName()).toBe('long');
  });

  /**
   * @description Default-Werte der Datentypen
   * Jeder Datentyp hat einen typischen Default-Wert.
   * @example
   * ```typescript
   * EcoreDataTypes.EBoolean.getDefaultValue(); // false
   * EcoreDataTypes.EInt.getDefaultValue();     // 0
   * EcoreDataTypes.EFloat.getDefaultValue();   // 0.0
   * EcoreDataTypes.EString.getDefaultValue();  // null
   * ```
   */
  it('should provide correct default values', () => {
    expect(EcoreDataTypes.EBoolean.getDefaultValue()).toBe(false);
    expect(EcoreDataTypes.EInt.getDefaultValue()).toBe(0);
    expect(EcoreDataTypes.EFloat.getDefaultValue()).toBe(0.0);
    expect(EcoreDataTypes.EString.getDefaultValue()).toBeNull();
  });
});

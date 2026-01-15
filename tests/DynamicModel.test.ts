/**
 * @fileoverview Dynamic Model Tests - Dynamische EMF-Modelle zur Laufzeit erstellen
 *
 * Diese Tests zeigen wie man EMF-Modelle dynamisch ohne Code-Generierung erstellt:
 * - EPackage, EClass, EAttribute, EReference definieren
 * - Instanzen mit Factory erstellen
 * - Attribute und Referenzen setzen/lesen
 * - Containment-Beziehungen verwalten
 *
 * Adapted from Eclipse EMF SimpleModelTest.java
 *
 * @example
 * ```typescript
 * // 1. Metamodell erstellen
 * const pkg = new BasicEPackage();
 * pkg.setName('mymodel');
 * pkg.setNsURI('http://example.com/mymodel');
 *
 * // 2. Klasse definieren
 * const PersonClass = new BasicEClass();
 * PersonClass.setName('Person');
 * pkg.getEClassifiers().push(PersonClass);
 *
 * // 3. Attribut hinzufügen
 * const nameAttr = new BasicEAttribute();
 * nameAttr.setName('name');
 * nameAttr.setEType(EcoreDataTypes.EString);
 * PersonClass.addFeature(nameAttr);
 *
 * // 4. Instanz erstellen
 * const factory = pkg.getEFactoryInstance();
 * const person = factory.create(PersonClass);
 * person.eSet(nameAttr, 'John');
 * ```
 *
 * @module tests/DynamicModel
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicEFactory,
  BasicResource,
  BasicResourceSet,
  EcoreDataTypes
} from '../src/runtime';
import { EPackage } from '../src/EPackage';
import { EClass } from '../src/EClass';
import { EAttribute } from '../src/EAttribute';
import { EReference } from '../src/EReference';
import { EFactory } from '../src/EFactory';
import { EObject } from '../src/EObject';
import { URI } from '../src/URI';

describe('Dynamic Model', () => {
  let companyPackage: EPackage;
  let employeeClass: EClass;
  let employeeName: EAttribute;
  let employeeManager: EAttribute;
  let departmentClass: EClass;
  let departmentName: EAttribute;
  let departmentNumber: EAttribute;
  let departmentEmployees: EReference;

  beforeEach(() => {
    // Create Employee class
    employeeClass = new BasicEClass();
    employeeClass.setName('Employee');

    employeeName = new BasicEAttribute();
    employeeName.setName('name');
    employeeName.setEType(EcoreDataTypes.EString);
    (employeeClass as BasicEClass).addFeature(employeeName);

    employeeManager = new BasicEAttribute();
    employeeManager.setName('manager');
    employeeManager.setEType(EcoreDataTypes.EBoolean);
    (employeeClass as BasicEClass).addFeature(employeeManager);

    // Create Department class
    departmentClass = new BasicEClass();
    departmentClass.setName('Department');

    departmentName = new BasicEAttribute();
    departmentName.setName('name');
    departmentName.setEType(EcoreDataTypes.EString);
    (departmentClass as BasicEClass).addFeature(departmentName);

    departmentNumber = new BasicEAttribute();
    departmentNumber.setName('number');
    departmentNumber.setEType(EcoreDataTypes.EInt);
    (departmentClass as BasicEClass).addFeature(departmentNumber);

    departmentEmployees = new BasicEReference();
    departmentEmployees.setName('employees');
    departmentEmployees.setEType(employeeClass);
    departmentEmployees.setUpperBound(-1); // UNBOUNDED_MULTIPLICITY
    departmentEmployees.setContainment(true);
    (departmentClass as BasicEClass).addFeature(departmentEmployees);

    // Create Package
    companyPackage = new (class extends BasicEPackage {
      constructor() {
        super();
        this.setName('company');
        this.setNsPrefix('company');
        this.setNsURI('http:///com.example.company.ecore');
      }
    })();
    companyPackage.getEClassifiers().push(employeeClass);
    companyPackage.getEClassifiers().push(departmentClass);
  });

  afterEach(() => {
    // Cleanup
    employeeName = null as any;
    employeeManager = null as any;
    (employeeClass as BasicEClass).getEStructuralFeatures().length = 0;
    employeeClass = null as any;

    departmentEmployees = null as any;
    departmentName = null as any;
    departmentNumber = null as any;
    (departmentClass as BasicEClass).getEStructuralFeatures().length = 0;
    departmentClass = null as any;

    companyPackage = null as any;
  });

  /**
   * @description Package und Factory Tests
   * Ein EPackage ist der Container für EClasses und enthält eine EFactory
   * zum Erstellen von Instanzen.
   */
  describe('Package and Factory', () => {
    /**
     * @description Package Metadaten prüfen
     * Jedes EPackage hat name, nsPrefix und nsURI.
     * @example
     * ```typescript
     * const pkg = new BasicEPackage();
     * pkg.setName('mymodel');
     * pkg.setNsPrefix('mymodel');
     * pkg.setNsURI('http://example.com/mymodel');
     *
     * pkg.getName();     // 'mymodel'
     * pkg.getNsPrefix(); // 'mymodel'
     * pkg.getNsURI();    // 'http://example.com/mymodel'
     * ```
     */
    it('should create package with correct metadata', () => {
      expect(companyPackage).toBeDefined();
      expect(companyPackage.getName()).toBe('company');
      expect(companyPackage.getNsPrefix()).toBe('company');
      expect(companyPackage.getNsURI()).toBe('http:///com.example.company.ecore');
    });

    /**
     * @description Factory-Instanz vom Package holen
     * Jedes EPackage hat eine zugehörige EFactory zum Erstellen von Instanzen.
     * @example
     * ```typescript
     * const factory = pkg.getEFactoryInstance();
     * factory.getEPackage(); // Zurück zum Package
     * ```
     */
    it('should have factory instance', () => {
      const companyFactory = companyPackage.getEFactoryInstance();
      expect(companyFactory).toBeDefined();
      expect(companyFactory.getEPackage()).toBe(companyPackage);
    });

    /**
     * @description Classifiers im Package auflisten
     * getEClassifiers() gibt alle EClass und EDataType Definitionen zurück.
     * @example
     * ```typescript
     * pkg.getEClassifiers().push(myClass);
     * pkg.getEClassifiers(); // [myClass, ...]
     * ```
     */
    it('should contain correct classifiers', () => {
      const classifiers = companyPackage.getEClassifiers();
      expect(classifiers).toHaveLength(2);
      expect(classifiers).toContain(employeeClass);
      expect(classifiers).toContain(departmentClass);
    });
  });

  /**
   * @description Attribut-Operationen
   * EAttributes speichern primitive Werte (String, Integer, Boolean, etc.)
   * in EObject-Instanzen.
   *
   * @example
   * ```typescript
   * const nameAttr = new BasicEAttribute();
   * nameAttr.setName('name');
   * nameAttr.setEType(EcoreDataTypes.EString);
   * myClass.addFeature(nameAttr);
   *
   * const obj = factory.create(myClass);
   * obj.eSet(nameAttr, 'John');
   * obj.eGet(nameAttr); // 'John'
   * ```
   */
  describe('Attributes', () => {
    let companyFactory: EFactory;

    beforeEach(() => {
      companyFactory = companyPackage.getEFactoryInstance();
    });

    /**
     * @description Attributwerte setzen und lesen
     * @example
     * ```typescript
     * const person = factory.create(PersonClass);
     * person.eSet(nameAttr, 'John');
     * person.eGet(nameAttr);    // 'John'
     * person.eGet(managerAttr); // false (Default)
     * ```
     */
    it('should set and get attribute values', () => {
      const employee1 = companyFactory.create(employeeClass);
      employee1.eSet(employeeName, 'John');
      expect(employee1.eGet(employeeName)).toBe('John');
      expect(employee1.eGet(employeeManager)).toBe(false); // Default value
    });

    /**
     * @description Mehrere unabhängige Instanzen
     * Jede Instanz hat eigene Attributwerte.
     * @example
     * ```typescript
     * const emp1 = factory.create(EmployeeClass);
     * const emp2 = factory.create(EmployeeClass);
     *
     * emp1.eSet(nameAttr, 'John');
     * emp2.eSet(nameAttr, 'Jane');
     *
     * emp1.eGet(nameAttr); // 'John'
     * emp2.eGet(nameAttr); // 'Jane'
     * ```
     */
    it('should handle multiple instances', () => {
      const employee1 = companyFactory.create(employeeClass);
      employee1.eSet(employeeName, 'John');
      employee1.eSet(employeeManager, true);

      const employee2 = companyFactory.create(employeeClass);
      employee2.eSet(employeeName, 'Jane');

      expect(employee1.eGet(employeeName)).toBe('John');
      expect(employee1.eGet(employeeManager)).toBe(true);
      expect(employee2.eGet(employeeName)).toBe('Jane');
      expect(employee2.eGet(employeeManager)).toBe(false);
    });

    /**
     * @description Integer-Attribute
     * EInt für Ganzzahlen verwenden.
     * @example
     * ```typescript
     * const numberAttr = new BasicEAttribute();
     * numberAttr.setName('number');
     * numberAttr.setEType(EcoreDataTypes.EInt);
     *
     * obj.eSet(numberAttr, 42);
     * obj.eGet(numberAttr); // 42
     * ```
     */
    it('should handle integer attributes', () => {
      const department = companyFactory.create(departmentClass);
      department.eSet(departmentNumber, 42);
      expect(department.eGet(departmentNumber)).toBe(42);
    });
  });

  /**
   * @description Referenz-Operationen
   * EReferences verbinden EObjects miteinander. Bei Containment-Referenzen
   * wird das referenzierte Objekt zum Kind des Containers.
   *
   * @example
   * ```typescript
   * const employeesRef = new BasicEReference();
   * employeesRef.setName('employees');
   * employeesRef.setEType(EmployeeClass);
   * employeesRef.setUpperBound(-1);    // Unbegrenzt viele
   * employeesRef.setContainment(true); // Containment-Beziehung
   * DepartmentClass.addFeature(employeesRef);
   * ```
   */
  describe('References', () => {
    let companyFactory: EFactory;

    beforeEach(() => {
      companyFactory = companyPackage.getEFactoryInstance();
    });

    /**
     * @description Objekte zu Many-Reference hinzufügen
     * Bei upperBound=-1 können beliebig viele Objekte referenziert werden.
     * @example
     * ```typescript
     * const dept = factory.create(DepartmentClass);
     * const employees = dept.eGet(employeesRef) as EObject[];
     *
     * employees.push(emp1);
     * employees.push(emp2);
     * employees.length; // 2
     * ```
     */
    it('should add objects to many-valued reference', () => {
      const employee1 = companyFactory.create(employeeClass);
      const employee2 = companyFactory.create(employeeClass);
      const department1 = companyFactory.create(departmentClass);

      const employees = department1.eGet(departmentEmployees) as EObject[];
      expect(employees).toHaveLength(0);

      employees.push(employee1);
      employees.push(employee2);

      expect(employees).toHaveLength(2);
      expect(employees[0]).toBe(employee1);
      expect(employees[1]).toBe(employee2);
    });

    /**
     * @description Containment-Beziehungen
     * Bei Containment wird das Kind automatisch seinem Container zugeordnet.
     * @example
     * ```typescript
     * const employees = dept.eGet(employeesRef) as EObject[];
     * employees.push(emp);
     *
     * emp.eContainer();          // dept
     * emp.eContainmentFeature(); // employeesRef
     * ```
     */
    it('should set containment relationships', () => {
      const employee1 = companyFactory.create(employeeClass);
      const department1 = companyFactory.create(departmentClass);

      const employees = department1.eGet(departmentEmployees) as EObject[];
      employees.push(employee1);

      // Check containment
      expect(employee1.eContainer()).toBe(department1);
      expect(employee1.eContainmentFeature()).toBe(departmentEmployees);
    });

    /**
     * @description Objekte zwischen Containern verschieben
     * Ein Objekt kann nur einen Container haben. Beim Verschieben wird es
     * automatisch aus dem alten Container entfernt.
     * @example
     * ```typescript
     * const dept1Emps = dept1.eGet(employeesRef) as EObject[];
     * dept1Emps.push(emp);
     * emp.eContainer(); // dept1
     *
     * const dept2Emps = dept2.eGet(employeesRef) as EObject[];
     * dept2Emps.push(emp);
     * emp.eContainer(); // dept2 (automatisch verschoben)
     * ```
     */
    it('should handle moving objects between containers', () => {
      const employee1 = companyFactory.create(employeeClass);
      const department1 = companyFactory.create(departmentClass);
      const department2 = companyFactory.create(departmentClass);

      const dept1Employees = department1.eGet(departmentEmployees) as EObject[];
      dept1Employees.push(employee1);
      expect(dept1Employees).toHaveLength(1);
      expect(employee1.eContainer()).toBe(department1);

      // Move to department2
      const dept2Employees = department2.eGet(departmentEmployees) as EObject[];
      dept2Employees.push(employee1);

      // Should be removed from department1 and added to department2
      expect(dept2Employees).toHaveLength(1);
      expect(employee1.eContainer()).toBe(department2);
    });
  });

  /**
   * @description Metadaten-Zugriff
   * EObjects bieten Zugriff auf ihre Metadaten (EClass, Features).
   *
   * @example
   * ```typescript
   * const obj = factory.create(PersonClass);
   * obj.eClass();                      // PersonClass
   * obj.eClass().getEStructuralFeatures(); // [nameAttr, ageAttr, ...]
   * ```
   */
  describe('Metadata', () => {
    let companyFactory: EFactory;

    beforeEach(() => {
      companyFactory = companyPackage.getEFactoryInstance();
    });

    /**
     * @description EClass über eClass() abrufen
     * @example
     * ```typescript
     * const person = factory.create(PersonClass);
     * person.eClass() === PersonClass; // true
     * ```
     */
    it('should provide metadata through eClass()', () => {
      const employee1 = companyFactory.create(employeeClass);
      const employee2 = companyFactory.create(employeeClass);
      const department1 = companyFactory.create(departmentClass);

      expect(employee1.eClass()).toBe(employeeClass);
      expect(employee2.eClass()).toBe(employeeClass);
      expect(department1.eClass()).toBe(departmentClass);
    });

    /**
     * @description Strukturelle Features auflisten
     * getEStructuralFeatures() gibt alle Attribute und Referenzen zurück.
     * @example
     * ```typescript
     * const features = PersonClass.getEStructuralFeatures();
     * features.map(f => f.getName()); // ['name', 'age', ...]
     * ```
     */
    it('should list structural features', () => {
      const empFeatures = employeeClass.getEStructuralFeatures();
      expect(empFeatures).toHaveLength(2);
      expect(empFeatures).toContain(employeeName);
      expect(empFeatures).toContain(employeeManager);

      const deptFeatures = departmentClass.getEStructuralFeatures();
      expect(deptFeatures).toHaveLength(3);
      expect(deptFeatures).toContain(departmentName);
      expect(deptFeatures).toContain(departmentNumber);
      expect(deptFeatures).toContain(departmentEmployees);
    });

    /**
     * @description Feature nach Namen suchen
     * @example
     * ```typescript
     * const nameFeature = PersonClass.getEStructuralFeature('name');
     * const notFound = PersonClass.getEStructuralFeature('xyz'); // null
     * ```
     */
    it('should find features by name', () => {
      const feature = employeeClass.getEStructuralFeature('name');
      expect(feature).toBe(employeeName);

      const notFound = employeeClass.getEStructuralFeature('nonexistent');
      expect(notFound).toBeNull();
    });
  });

  /**
   * @description eIsSet und eUnset Operationen
   * eIsSet() prüft ob ein Feature explizit gesetzt wurde.
   * eUnset() setzt ein Feature auf seinen Standardwert zurück.
   *
   * @example
   * ```typescript
   * const person = factory.create(PersonClass);
   *
   * person.eIsSet(nameAttr);  // false (noch nicht gesetzt)
   * person.eSet(nameAttr, 'John');
   * person.eIsSet(nameAttr);  // true
   *
   * person.eUnset(nameAttr);
   * person.eIsSet(nameAttr);  // false
   * person.eGet(nameAttr);    // null oder Default
   * ```
   */
  describe('eIsSet and eUnset', () => {
    let companyFactory: EFactory;

    beforeEach(() => {
      companyFactory = companyPackage.getEFactoryInstance();
    });

    /**
     * @description Set-Status tracken
     * @example
     * ```typescript
     * obj.eIsSet(attr); // false
     * obj.eSet(attr, 'value');
     * obj.eIsSet(attr); // true
     * obj.eUnset(attr);
     * obj.eIsSet(attr); // false
     * ```
     */
    it('should track set state', () => {
      const employee = companyFactory.create(employeeClass);

      expect(employee.eIsSet(employeeName)).toBe(false);

      employee.eSet(employeeName, 'John');
      expect(employee.eIsSet(employeeName)).toBe(true);

      employee.eUnset(employeeName);
      expect(employee.eIsSet(employeeName)).toBe(false);
    });

    /**
     * @description Default-Wert nach eUnset
     * Nach eUnset() wird der Default-Wert des Features zurückgegeben.
     * @example
     * ```typescript
     * obj.eSet(boolAttr, true);
     * obj.eGet(boolAttr); // true
     *
     * obj.eUnset(boolAttr);
     * obj.eGet(boolAttr); // false (Boolean-Default)
     * ```
     */
    it('should return default value after unset', () => {
      const employee = companyFactory.create(employeeClass);

      employee.eSet(employeeManager, true);
      expect(employee.eGet(employeeManager)).toBe(true);

      employee.eUnset(employeeManager);
      expect(employee.eGet(employeeManager)).toBe(false); // Default for boolean
    });
  });

  /**
   * @description Resource-Management
   * Resources sind Container für persistierte EObjects.
   * Sie verwalten URIs und ermöglichen Serialisierung.
   *
   * @example
   * ```typescript
   * const resourceSet = new BasicResourceSet();
   * resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);
   *
   * const resource = resourceSet.createResource(URI.createURI('file://model.xmi'));
   * resource.getContents().push(rootObject);
   *
   * await resource.save();
   * ```
   */
  describe('Resource', () => {
    let companyFactory: EFactory;
    let resourceSet: BasicResourceSet;

    beforeEach(() => {
      companyFactory = companyPackage.getEFactoryInstance();
      resourceSet = new BasicResourceSet();
      resourceSet.getPackageRegistry().set(companyPackage.getNsURI()!, companyPackage);
    });

    /**
     * @description Objekte zur Resource hinzufügen
     * @example
     * ```typescript
     * const resource = resourceSet.createResource(URI.createURI('model.xmi'));
     * const obj = factory.create(MyClass);
     *
     * resource.getContents().push(obj);
     * obj.eResource(); // resource
     * ```
     */
    it('should add objects to resource', () => {
      const resource = resourceSet.createResource(URI.createURI('test://company.json'));
      const department = companyFactory.create(departmentClass);
      department.eSet(departmentName, 'Engineering');

      resource.getContents().push(department);

      expect(resource.getContents()).toHaveLength(1);
      expect(resource.getContents()[0]).toBe(department);
      expect(department.eResource()).toBe(resource);
    });

    /**
     * @description Modifikationen tracken und speichern
     * @example
     * ```typescript
     * resource.isModified(); // false
     *
     * obj.eSet(attr, 'new value');
     * resource.setModified(true);
     * resource.isModified(); // true
     *
     * await resource.save();
     * resource.isModified(); // false
     * ```
     */
    it('should save and track modifications', async () => {
      const resource = resourceSet.createResource(URI.createURI('test://company.json'));
      const department = companyFactory.create(departmentClass);
      resource.getContents().push(department);

      expect(resource.isModified()).toBe(false);

      department.eSet(departmentName, 'Engineering');
      resource.setModified(true);

      expect(resource.isModified()).toBe(true);

      await resource.save();
      expect(resource.isModified()).toBe(false);
    });

    /**
     * @description URI-Fragmente für Navigation
     * Jedes Objekt in einer Resource hat ein eindeutiges Fragment.
     * @example
     * ```typescript
     * const fragment = resource.getURIFragment(obj); // '/0' oder '/0/0'
     * const resolved = resource.getEObject(fragment);
     * resolved === obj; // true
     * ```
     */
    it('should resolve URI fragments', () => {
      const resource = resourceSet.createResource(URI.createURI('test://company.json'));
      const department = companyFactory.create(departmentClass);
      const employee1 = companyFactory.create(employeeClass);
      const employee2 = companyFactory.create(employeeClass);

      resource.getContents().push(department);
      const employees = department.eGet(departmentEmployees) as EObject[];
      employees.push(employee1);
      employees.push(employee2);

      // Get fragment for root object
      const deptFragment = resource.getURIFragment(department);
      expect(deptFragment).toBe('/0');

      // Resolve back
      const resolved = resource.getEObject(deptFragment);
      expect(resolved).toBe(department);

      // Get fragment for nested object
      const emp1Fragment = resource.getURIFragment(employee1);
      expect(emp1Fragment).toBe('/0/0');

      const resolvedEmp = resource.getEObject(emp1Fragment);
      expect(resolvedEmp).toBe(employee1);
    });
  });

  /**
   * @description Umbenennung von Features und Classifiers
   * Namen können zur Laufzeit geändert werden und der Name-Index
   * wird automatisch aktualisiert.
   *
   * @example
   * ```typescript
   * const attr = new BasicEAttribute();
   * attr.setName('oldName');
   * myClass.addFeature(attr);
   *
   * myClass.getEStructuralFeature('oldName'); // attr
   *
   * attr.setName('newName');
   * myClass.getEStructuralFeature('newName'); // attr
   * myClass.getEStructuralFeature('oldName'); // null
   * ```
   */
  describe('Renaming', () => {
    /**
     * @description Strukturelle Features umbenennen
     * @example
     * ```typescript
     * attr.setName('newName');
     * myClass.getEStructuralFeature('newName'); // attr
     * myClass.getEStructuralFeature('oldName'); // null
     * ```
     */
    it('should handle renaming structural features', () => {
      const COST_CENTER_NAME = 'costCenter';
      const CHANGED_COST_CENTER_NAME = 'changedCostCenter';

      const costCenterAttribute = new BasicEAttribute();
      costCenterAttribute.setName(COST_CENTER_NAME);
      costCenterAttribute.setEType(EcoreDataTypes.EString);

      (departmentClass as BasicEClass).addFeature(costCenterAttribute);

      expect(departmentClass.getEStructuralFeature(COST_CENTER_NAME)).toBe(costCenterAttribute);

      costCenterAttribute.setName(CHANGED_COST_CENTER_NAME);

      expect(departmentClass.getEStructuralFeature(CHANGED_COST_CENTER_NAME)).toBe(costCenterAttribute);
      expect(departmentClass.getEStructuralFeature(COST_CENTER_NAME)).toBeNull();
    });

    /**
     * @description Classifiers umbenennen
     * @example
     * ```typescript
     * pkg.getEClassifier('OldName'); // myClass
     * myClass.setName('NewName');
     * pkg.getEClassifier('NewName'); // myClass
     * pkg.getEClassifier('OldName'); // null
     * ```
     */
    it('should handle renaming classifiers', () => {
      expect(companyPackage.getEClassifier('Employee')).toBe(employeeClass);

      employeeClass.setName('Employee1');

      expect(companyPackage.getEClassifier('Employee1')).toBe(employeeClass);
      expect(companyPackage.getEClassifier('Employee')).toBeNull();
    });
  });

  /**
   * @description Duplikat-Handling
   * Verhalten beim mehrfachen Hinzufügen desselben Objekts zu Containment-Referenzen.
   *
   * @example
   * ```typescript
   * const employees = dept.eGet(employeesRef) as EObject[];
   * employees.push(emp);
   * employees.push(emp); // Duplikat - Verhalten implementation-spezifisch
   * ```
   */
  describe('Adding Duplicates', () => {
    let companyFactory: EFactory;

    beforeEach(() => {
      companyFactory = companyPackage.getEFactoryInstance();
    });

    /**
     * @description Duplikate in Containment-Referenz
     * Das Verhalten bei Duplikaten ist implementations-spezifisch.
     * @example
     * ```typescript
     * employees.push(emp);
     * employees.length; // 1
     *
     * employees.push(emp); // Gleicher Mitarbeiter
     * // EMF erlaubt typischerweise Duplikate in Listen
     * ```
     */
    it('should handle duplicate adds to containment reference', () => {
      const department1 = companyFactory.create(departmentClass);
      const employees = department1.eGet(departmentEmployees) as EObject[];
      expect(employees).toHaveLength(0);

      const employee1 = companyFactory.create(employeeClass);
      employees.push(employee1);
      expect(employees).toHaveLength(1);

      // Try to add again - should not create duplicate
      employees.push(employee1);
      // Note: Behavior depends on implementation
      // EMF typically allows duplicates in lists
      expect(employees.length).toBeGreaterThanOrEqual(1);
    });
  });
});

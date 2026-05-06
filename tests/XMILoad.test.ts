/**
 * @fileoverview XMI Load Tests - Laden von XMI-Dateien mit verschachtelten Elementen
 *
 * Testet das Laden von Ecore-Modellen aus XMI:
 * - Einfache Packages
 * - Packages mit EClass, EAttribute, EReference
 * - EAnnotations
 * - EEnums mit Literals
 * - Interne #//Name Referenzen
 *
 * @example
 * ```typescript
 * const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
 * <ecore:EPackage name="mymodel" nsURI="http://example.com/mymodel">
 *   <eClassifiers xsi:type="ecore:EClass" name="Person">
 *     <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
 *         eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
 *   </eClassifiers>
 * </ecore:EPackage>`;
 *
 * const resource = new XMIResource(uri);
 * resource.setResourceSet(resourceSet);
 * resource.loadFromString(ecoreXML);
 *
 * const pkg = resource.getContents()[0];
 * ```
 *
 * @module tests/XMILoad
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XMIResource } from '../src/xmi/XMLResource';
import { URI } from '../src/URI';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { getEcorePackage, ECORE_NS_URI } from '../src/ecore/EcorePackage';
import { EPackageRegistry } from '../src/EPackage';

/**
 * @description XMI Loading mit verschachtelten Elementen
 * Testet das Parsen von komplexen Ecore-Dateien.
 *
 * @example
 * ```typescript
 * resource.loadFromString(ecoreXML);
 * const pkg = resource.getContents()[0];
 * const personClass = pkg.getEClassifiers()[0];
 * ```
 */
describe('XMI Loading with Nested Elements', () => {
  let resourceSet: BasicResourceSet;

  beforeEach(() => {
    // Ensure EcorePackage is initialized and registered
    getEcorePackage();

    resourceSet = new BasicResourceSet();
    resourceSet.getPackageRegistry().set(ECORE_NS_URI, getEcorePackage());
  });

  it('should load a simple ecore package', () => {
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
</ecore:EPackage>`;

    const uri = URI.createURI('test://test.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    expect(resource.getErrors().length).toBe(0);
    expect(resource.getContents().length).toBe(1);

    const pkg = resource.getContents()[0] as any;
    expect(pkg.getName()).toBe('test');
    expect(pkg.getNsURI()).toBe('http://test.example.com');
  });

  it('should load ecore package with EClass', () => {
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EClass" name="Person"/>
</ecore:EPackage>`;

    const uri = URI.createURI('test://test.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Log any errors for debugging
    if (resource.getErrors().length > 0) {
      console.log('Errors:', resource.getErrors().map(e => e.message));
    }

    expect(resource.getErrors().length).toBe(0);
    expect(resource.getContents().length).toBe(1);

    const pkg = resource.getContents()[0] as any;
    expect(pkg.getEClassifiers().length).toBe(1);

    const personClass = pkg.getEClassifiers()[0] as any;
    expect(personClass.getName()).toBe('Person');
  });

  it('should load ecore package with EClass and EAttribute', () => {
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EClass" name="Person">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

    const uri = URI.createURI('test://test.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Log any errors for debugging
    if (resource.getErrors().length > 0) {
      console.log('Errors:', resource.getErrors().map(e => e.message));
    }

    expect(resource.getErrors().length).toBe(0);

    const pkg = resource.getContents()[0] as any;
    const personClass = pkg.getEClassifiers()[0] as any;
    expect(personClass.getEStructuralFeatures().length).toBe(1);

    const nameAttr = personClass.getEStructuralFeatures()[0] as any;
    expect(nameAttr.getName()).toBe('name');
  });

  it('should load ecore package with EAnnotations', () => {
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EClass" name="Person">
    <eAnnotations source="http://example.com/annotation">
      <details key="name" value="PersonClass"/>
      <details key="description" value="Represents a person"/>
    </eAnnotations>
  </eClassifiers>
</ecore:EPackage>`;

    const uri = URI.createURI('test://test.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Log any errors for debugging
    if (resource.getErrors().length > 0) {
      console.log('Errors:', resource.getErrors().map(e => e.message));
    }

    expect(resource.getErrors().length).toBe(0);

    const pkg = resource.getContents()[0] as any;
    const personClass = pkg.getEClassifiers()[0] as any;
    expect(personClass.getEAnnotations().length).toBe(1);

    const annotation = personClass.getEAnnotations()[0];
    const details = annotation.getDetails();

    // Verify EMap list semantics
    expect(details.size()).toBe(2);

    // Verify map access
    expect(details.getByKey('name')).toBe('PersonClass');
    expect(details.getByKey('description')).toBe('Represents a person');

    // Verify toMap()
    const jsMap = details.toMap();
    expect(jsMap.get('name')).toBe('PersonClass');
    expect(jsMap.get('description')).toBe('Represents a person');

    // Verify entry containment
    const entry0 = details.get(0);
    expect(entry0.eContainer()).toBe(annotation);
  });

  it('should load ecore package with EEnum and literals', () => {
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EEnum" name="Color">
    <eLiterals name="RED" value="0"/>
    <eLiterals name="GREEN" value="1"/>
    <eLiterals name="BLUE" value="2"/>
  </eClassifiers>
</ecore:EPackage>`;

    const uri = URI.createURI('test://test.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Log any errors for debugging
    if (resource.getErrors().length > 0) {
      console.log('Errors:', resource.getErrors().map(e => e.message));
    }

    expect(resource.getErrors().length).toBe(0);
  });

  it('should resolve internal #//Name references (like #//SortOrder)', () => {
    // This tests the pattern used in query.ecore where SortEntity references #//SortOrder
    // The reference uses the EMF-style fragment //Name to refer to a sibling element
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="query" nsURI="http://test.example.com/query" nsPrefix="query">
  <eClassifiers xsi:type="ecore:EClass" name="SortEntity">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="sortOrder" lowerBound="1"
        eType="#//SortOrder" defaultValueLiteral="DESC"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EEnum" name="SortOrder">
    <eLiterals name="DESC"/>
    <eLiterals name="ASC" value="1"/>
  </eClassifiers>
</ecore:EPackage>`;

    const uri = URI.createURI('test://query.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Check for errors - the key fix is that #//SortOrder should now resolve correctly
    const errors = resource.getErrors();
    if (errors.length > 0) {
      console.log('Errors:', errors.map(e => e.message));
    }

    // Should have no "Unresolved reference '#//SortOrder'" error
    expect(errors.length).toBe(0);

    // Helper to get name from dynamic object
    const getNameValue = (obj: any) => {
      const nameFeature = obj.eClass?.()?.getEStructuralFeature?.('name');
      return nameFeature ? obj.eGet?.(nameFeature) : obj.getName?.();
    };

    // Verify the structure was loaded correctly
    const pkg = resource.getContents()[0] as any;
    expect(getNameValue(pkg)).toBe('query');
    expect(pkg.getEClassifiers().length).toBe(2);

    const sortEntity = pkg.getEClassifiers()[0] as any;
    expect(getNameValue(sortEntity)).toBe('SortEntity');

    const sortOrder = pkg.getEClassifiers()[1] as any;
    expect(getNameValue(sortOrder)).toBe('SortOrder');

    // Verify the reference was resolved
    const sortOrderAttr = sortEntity.getEStructuralFeatures()[0] as any;
    expect(getNameValue(sortOrderAttr)).toBe('sortOrder');

    // The eType should now point to the SortOrder enum (not null or unresolved)
    const eType = sortOrderAttr.getEType();
    expect(eType).not.toBeNull();
    expect(getNameValue(eType)).toBe('SortOrder');
  });

  it('should resolve //Name fragments via getEObject directly', () => {
    // Direct test of BasicResource.getEObject() with //Name fragments
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EEnum" name="MyEnum">
    <eLiterals name="VALUE1"/>
    <eLiterals name="VALUE2" value="1"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="MyClass"/>
</ecore:EPackage>`;

    const uri = URI.createURI('test://test.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Helper to get name from dynamic object
    const getNameValue = (obj: any) => {
      const nameFeature = obj.eClass?.()?.getEStructuralFeature?.('name');
      return nameFeature ? obj.eGet?.(nameFeature) : obj.getName?.();
    };

    // Test direct fragment resolution
    const myEnum = resource.getEObject('//MyEnum');
    expect(myEnum).not.toBeNull();
    expect(getNameValue(myEnum)).toBe('MyEnum');

    const myClass = resource.getEObject('//MyClass');
    expect(myClass).not.toBeNull();
    expect(getNameValue(myClass)).toBe('MyClass');

    // Non-existent should return null
    const notFound = resource.getEObject('//NonExistent');
    expect(notFound).toBeNull();
  });

  it('should register subpackages when parent package is registered', () => {
    // This tests the fix for GitHub Issue #1:
    // XMI Loader: Support resolving subpackages by nsPrefix
    // When a package with subpackages is registered, the subpackages
    // should also be registered by their nsURI.
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="root" nsURI="http://example.com/root" nsPrefix="root">
  <eSubpackages name="subpkg1" nsURI="http://example.com/subpkg1" nsPrefix="subpkg1">
    <eClassifiers xsi:type="ecore:EClass" name="SubClass1"/>
  </eSubpackages>
  <eSubpackages name="subpkg2" nsURI="http://example.com/subpkg2" nsPrefix="subpkg2">
    <eClassifiers xsi:type="ecore:EClass" name="SubClass2"/>
    <eSubpackages name="nested" nsURI="http://example.com/nested" nsPrefix="nested">
      <eClassifiers xsi:type="ecore:EClass" name="NestedClass"/>
    </eSubpackages>
  </eSubpackages>
</ecore:EPackage>`;

    const uri = URI.createURI('test://root.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    expect(resource.getErrors().length).toBe(0);

    // Get the loaded root package
    const rootPkg = resource.getContents()[0] as any;
    expect(rootPkg.getName()).toBe('root');
    expect(rootPkg.getESubpackages().length).toBe(2);

    // Register the root package
    const registry = resourceSet.getPackageRegistry();
    registry.set('http://example.com/root', rootPkg);

    // Now verify that subpackages are also registered
    const subpkg1 = registry.getEPackage('http://example.com/subpkg1');
    expect(subpkg1).not.toBeNull();
    expect(subpkg1!.getName()).toBe('subpkg1');

    const subpkg2 = registry.getEPackage('http://example.com/subpkg2');
    expect(subpkg2).not.toBeNull();
    expect(subpkg2!.getName()).toBe('subpkg2');

    // Verify deeply nested subpackage is also registered
    const nested = registry.getEPackage('http://example.com/nested');
    expect(nested).not.toBeNull();
    expect(nested!.getName()).toBe('nested');
  });

  it('should resolve forward references using xmi:id (fixes #3)', () => {
    // This tests the fix for GitHub Issue #3:
    // XMI Loader: Unresolved internal cross-references (forward references)
    // When an object references another object that appears later in the document,
    // the reference should be resolved after all objects have been created.
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EClass" xmi:id="class_person" name="Person">
    <eStructuralFeatures xsi:type="ecore:EReference" name="address" eType="#class_address"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" xmi:id="class_address" name="Address">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="street" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

    const uri = URI.createURI('test://forward-ref.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Log any errors for debugging
    const errors = resource.getErrors();
    if (errors.length > 0) {
      console.log('Errors:', errors.map(e => e.message));
    }

    // Should have no unresolved reference errors
    expect(errors.length).toBe(0);

    // Verify the structure
    const pkg = resource.getContents()[0] as any;
    expect(pkg.getName()).toBe('test');
    expect(pkg.getEClassifiers().length).toBe(2);

    const personClass = pkg.getEClassifiers()[0] as any;
    expect(personClass.getName()).toBe('Person');

    const addressClass = pkg.getEClassifiers()[1] as any;
    expect(addressClass.getName()).toBe('Address');

    // Verify the forward reference was resolved
    const addressRef = personClass.getEStructuralFeatures()[0] as any;
    expect(addressRef.getName()).toBe('address');

    // The eType should point to Address class (not null or unresolved)
    const eType = addressRef.getEType();
    expect(eType).not.toBeNull();
    expect(eType.getName()).toBe('Address');
  });

  it('should resolve space-separated IDs in multi-valued references (fixes #4)', () => {
    // This tests the fix for GitHub Issue #4:
    // XMI: Support space-separated ID references in multi-valued attributes
    // For multi-valued references, the value may contain space-separated IDs
    // that should each be resolved individually.
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="test" nsURI="http://test.example.com" nsPrefix="test">
  <eClassifiers xsi:type="ecore:EClass" xmi:id="class_a" name="ClassA"
      eSuperTypes="#class_b #class_c"/>
  <eClassifiers xsi:type="ecore:EClass" xmi:id="class_b" name="ClassB"/>
  <eClassifiers xsi:type="ecore:EClass" xmi:id="class_c" name="ClassC"/>
</ecore:EPackage>`;

    const uri = URI.createURI('test://multi-ref.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    // Log any errors for debugging
    const errors = resource.getErrors();
    if (errors.length > 0) {
      console.log('Errors:', errors.map(e => e.message));
    }

    // Should have no unresolved reference errors
    expect(errors.length).toBe(0);

    // Verify the structure
    const pkg = resource.getContents()[0] as any;
    expect(pkg.getEClassifiers().length).toBe(3);

    const classA = pkg.getEClassifiers()[0] as any;
    expect(classA.getName()).toBe('ClassA');

    const classB = pkg.getEClassifiers()[1] as any;
    expect(classB.getName()).toBe('ClassB');

    const classC = pkg.getEClassifiers()[2] as any;
    expect(classC.getName()).toBe('ClassC');

    // Verify the space-separated super types were resolved
    const superTypes = classA.getESuperTypes();
    expect(superTypes.length).toBe(2);
    expect(superTypes[0].getName()).toBe('ClassB');
    expect(superTypes[1].getName()).toBe('ClassC');
  });

  it('should resolve intra-package cross-references during ecore loading (fixes #6)', () => {
    // This tests the fix for GitHub Issue #6:
    // When loading .ecore files, intra-package cross-references using the nsURI
    // (e.g. eType="http://company.com/c1#//Employee") should be resolved against
    // the current resource's root objects, not just the package registry.
    const ecoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="Company" nsURI="http://company.com/c1" nsPrefix="company">
  <eClassifiers xsi:type="ecore:EClass" name="Division">
    <eStructuralFeatures xsi:type="ecore:EReference" upperBound="-1"
        eType="ecore:EClass http://company.com/c1#//Employee" name="employees"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Employee">
    <eStructuralFeatures xsi:type="ecore:EAttribute"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString" name="name"/>
  </eClassifiers>
</ecore:EPackage>`;

    const uri = URI.createURI('test://company.ecore');
    const resource = new XMIResource(uri);
    resource.setResourceSet(resourceSet);

    resource.loadFromString(ecoreXML);

    const errors = resource.getErrors();
    if (errors.length > 0) {
      console.log('Errors:', errors.map(e => e.message));
    }

    expect(errors.length).toBe(0);

    const pkg = resource.getContents()[0] as any;
    expect(pkg.getName()).toBe('Company');
    expect(pkg.getEClassifiers().length).toBe(2);

    const divisionClass = pkg.getEClassifiers()[0] as any;
    expect(divisionClass.getName()).toBe('Division');

    const employeeClass = pkg.getEClassifiers()[1] as any;
    expect(employeeClass.getName()).toBe('Employee');

    // The key assertion: the eType of the 'employees' reference should be
    // resolved to the Employee EClass, NOT an unresolved proxy
    const employeesRef = divisionClass.getEStructuralFeatures()[0] as any;
    expect(employeesRef.getName()).toBe('employees');

    const eType = employeesRef.getEType();
    expect(eType).not.toBeNull();
    expect(eType.getName()).toBe('Employee');

    // Verify it's the actual class, not a proxy
    expect(typeof eType.eIsProxy !== 'function' || !eType.eIsProxy()).toBe(true);
  });

  it('should resolve cross-package EReference eType via EPackageRegistry (fixes #13)', () => {
    // This tests the fix for GitHub Issue #13:
    // When loading multiple .ecore metamodels that reference each other,
    // cross-package eType references should resolve through EPackageRegistry.

    // Step 1: Define and load the "base" package (e.g. CWM relational)
    const baseEcoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="relational"
    nsURI="http://example.com/relational" nsPrefix="relational">
  <eClassifiers xsi:type="ecore:EClass" name="Table">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Column">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

    const baseUri = URI.createURI('test://relational.ecore');
    const baseResource = new XMIResource(baseUri);
    baseResource.setResourceSet(resourceSet);
    baseResource.loadFromString(baseEcoreXML);

    expect(baseResource.getErrors().length).toBe(0);

    // Step 2: Register the base package in the registry
    const basePkg = baseResource.getContents()[0] as any;
    expect(basePkg.getName()).toBe('relational');
    resourceSet.getPackageRegistry().set('http://example.com/relational', basePkg);
    EPackageRegistry.INSTANCE.set('http://example.com/relational', basePkg);

    // Step 3: Load the "dependent" package that references the base package
    const dependentEcoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="mapping"
    nsURI="http://example.com/mapping" nsPrefix="mapping">
  <eClassifiers xsi:type="ecore:EClass" name="TableSource">
    <eStructuralFeatures xsi:type="ecore:EReference" name="table"
        eType="ecore:EClass http://example.com/relational#//Table"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="columns" upperBound="-1"
        eType="ecore:EClass http://example.com/relational#//Column"/>
  </eClassifiers>
</ecore:EPackage>`;

    const depUri = URI.createURI('test://mapping.ecore');
    const depResource = new XMIResource(depUri);
    depResource.setResourceSet(resourceSet);
    depResource.loadFromString(dependentEcoreXML);

    const depErrors = depResource.getErrors();
    if (depErrors.length > 0) {
      console.log('Errors:', depErrors.map(e => e.message));
    }
    expect(depErrors.length).toBe(0);

    // Step 4: Verify cross-package eType resolution
    const mappingPkg = depResource.getContents()[0] as any;
    const tableSourceClass = mappingPkg.getEClassifiers()[0] as any;
    expect(tableSourceClass.getName()).toBe('TableSource');

    // The 'table' reference should resolve to the Table EClass from the relational package
    const tableRef = tableSourceClass.getEStructuralFeatures()[0] as any;
    expect(tableRef.getName()).toBe('table');

    const tableType = tableRef.getEType();
    expect(tableType).not.toBeNull();
    expect(tableType.getName()).toBe('Table');

    // It must be an EClass (has getESuperTypes), not a generic EClassifier proxy
    expect('getESuperTypes' in tableType).toBe(true);
    expect('getEStructuralFeatures' in tableType).toBe(true);

    // getEReferenceType() must not throw
    const refType = tableRef.getEReferenceType();
    expect(refType).not.toBeNull();
    expect(refType.getName()).toBe('Table');

    // Verify multi-valued cross-package reference too
    const columnsRef = tableSourceClass.getEStructuralFeatures()[1] as any;
    expect(columnsRef.getName()).toBe('columns');

    const columnType = columnsRef.getEType();
    expect(columnType).not.toBeNull();
    expect(columnType.getName()).toBe('Column');
    expect('getESuperTypes' in columnType).toBe(true);

    // Clean up global registry
    EPackageRegistry.INSTANCE.delete('http://example.com/relational');
  });

  it('should lazily resolve cross-package eType when package is registered after loading (fixes #13)', () => {
    // This tests the deferred resolution scenario:
    // The dependent package is loaded BEFORE the base package is registered.
    // Proxy resolution should happen lazily when getEType() is called.

    // Step 1: Load the dependent package FIRST (base package NOT yet registered)
    const dependentEcoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="mapping2"
    nsURI="http://example.com/mapping2" nsPrefix="mapping2">
  <eClassifiers xsi:type="ecore:EClass" name="TableMapping">
    <eStructuralFeatures xsi:type="ecore:EReference" name="sourceTable"
        eType="ecore:EClass http://example.com/base2#//BaseTable"/>
  </eClassifiers>
</ecore:EPackage>`;

    const depUri = URI.createURI('test://mapping2.ecore');
    const depResource = new XMIResource(depUri);
    depResource.setResourceSet(resourceSet);
    depResource.loadFromString(dependentEcoreXML);

    const mappingPkg = depResource.getContents()[0] as any;
    const tableMappingClass = mappingPkg.getEClassifiers()[0] as any;
    const sourceTableRef = tableMappingClass.getEStructuralFeatures()[0] as any;

    // At this point, eType is an unresolved proxy
    // (the base package is not registered yet)

    // Step 2: Now load and register the base package
    const baseEcoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="base2"
    nsURI="http://example.com/base2" nsPrefix="base2">
  <eClassifiers xsi:type="ecore:EClass" name="BaseTable">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="tableName"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

    const baseUri = URI.createURI('test://base2.ecore');
    const baseResource = new XMIResource(baseUri);
    baseResource.setResourceSet(resourceSet);
    baseResource.loadFromString(baseEcoreXML);

    const basePkg = baseResource.getContents()[0] as any;
    // Register AFTER loading both
    EPackageRegistry.INSTANCE.set('http://example.com/base2', basePkg);

    // Step 3: Now getEType() should lazily resolve the proxy
    const eType = sourceTableRef.getEType();
    expect(eType).not.toBeNull();
    expect(eType.getName()).toBe('BaseTable');
    expect('getESuperTypes' in eType).toBe(true);

    // getEReferenceType() should work
    const refType = sourceTableRef.getEReferenceType();
    expect(refType.getName()).toBe('BaseTable');

    // Clean up global registry
    EPackageRegistry.INSTANCE.delete('http://example.com/base2');
  });

  it('should resolve cross-package eType in nested subpackages (fixes #16)', () => {
    // This tests the fix for GitHub Issue #16:
    // Fragment paths like //resource/relational/NamedColumnSet must navigate
    // subpackages before looking up the classifier.

    // Step 1: Load a package with nested subpackages
    const cwmEcoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="cwm"
    nsURI="http://example.com/cwm" nsPrefix="cwm">
  <eSubpackages name="resource" nsURI="http://example.com/cwm/resource" nsPrefix="resource">
    <eSubpackages name="relational" nsURI="http://example.com/cwm/resource/relational" nsPrefix="relational">
      <eClassifiers xsi:type="ecore:EClass" name="NamedColumnSet">
        <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
            eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
      </eClassifiers>
      <eClassifiers xsi:type="ecore:EClass" name="Table" eSuperTypes="#//resource/relational/NamedColumnSet">
        <eStructuralFeatures xsi:type="ecore:EAttribute" name="tableName"
            eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
      </eClassifiers>
    </eSubpackages>
  </eSubpackages>
</ecore:EPackage>`;

    const cwmUri = URI.createURI('test://cwm.ecore');
    const cwmResource = new XMIResource(cwmUri);
    cwmResource.setResourceSet(resourceSet);
    cwmResource.loadFromString(cwmEcoreXML);

    expect(cwmResource.getErrors().length).toBe(0);

    const cwmPkg = cwmResource.getContents()[0] as any;
    expect(cwmPkg.getName()).toBe('cwm');
    resourceSet.getPackageRegistry().set('http://example.com/cwm', cwmPkg);
    EPackageRegistry.INSTANCE.set('http://example.com/cwm', cwmPkg);

    // Verify intra-package subpackage reference resolved (eSuperTypes)
    const resourcePkg = cwmPkg.getESubpackages().get(0) as any;
    const relationalPkg = resourcePkg.getESubpackages().get(0) as any;
    const tableClass = relationalPkg.getEClassifiers()[1] as any;
    expect(tableClass.getName()).toBe('Table');
    const superTypes = tableClass.getESuperTypes();
    expect(superTypes.length).toBe(1);
    expect(superTypes[0].getName()).toBe('NamedColumnSet');

    // Step 2: Load a dependent package referencing a type in the nested subpackage
    const mappingEcoreXML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="rolapmapping"
    nsURI="http://example.com/rolapmapping" nsPrefix="rolapmapping">
  <eClassifiers xsi:type="ecore:EClass" name="TableSource">
    <eStructuralFeatures xsi:type="ecore:EReference" name="table"
        eType="ecore:EClass http://example.com/cwm#//resource/relational/Table"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="columnSet"
        eType="ecore:EClass http://example.com/cwm#//resource/relational/NamedColumnSet"/>
  </eClassifiers>
</ecore:EPackage>`;

    const mappingUri = URI.createURI('test://rolapmapping.ecore');
    const mappingResource = new XMIResource(mappingUri);
    mappingResource.setResourceSet(resourceSet);
    mappingResource.loadFromString(mappingEcoreXML);

    const mappingErrors = mappingResource.getErrors();
    if (mappingErrors.length > 0) {
      console.log('Errors:', mappingErrors.map(e => e.message));
    }
    expect(mappingErrors.length).toBe(0);

    // Step 3: Verify cross-package subpackage eType resolution
    const mappingPkg = mappingResource.getContents()[0] as any;
    const tableSourceClass = mappingPkg.getEClassifiers()[0] as any;

    const tableRef = tableSourceClass.getEStructuralFeatures()[0] as any;
    expect(tableRef.getName()).toBe('table');
    const tableType = tableRef.getEType();
    expect(tableType).not.toBeNull();
    expect(tableType.getName()).toBe('Table');
    expect('getESuperTypes' in tableType).toBe(true);

    // getEReferenceType() must work
    const refType = tableRef.getEReferenceType();
    expect(refType.getName()).toBe('Table');

    const columnSetRef = tableSourceClass.getEStructuralFeatures()[1] as any;
    expect(columnSetRef.getName()).toBe('columnSet');
    const columnSetType = columnSetRef.getEType();
    expect(columnSetType).not.toBeNull();
    expect(columnSetType.getName()).toBe('NamedColumnSet');

    // Clean up global registry
    EPackageRegistry.INSTANCE.delete('http://example.com/cwm');
  });
});

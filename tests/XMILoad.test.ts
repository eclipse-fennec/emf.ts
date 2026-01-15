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
});

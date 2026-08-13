/**
 * @fileoverview Tests for loading nested Ecore metamodel elements (#65, #66)
 *
 * Covers the two reported gaps when reading an .ecore file:
 * - #66: EOperation and EParameter must arrive as typed Basic* objects, not as
 *   DynamicEObject, so that the accessors declared on the interfaces work.
 * - #65: a feature typed via <eGenericType> must end up with an eType.
 *
 * @module tests/EcoreMetamodelLoad
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { BasicEOperation, BasicEParameter, BasicEGenericType } from '../src/runtime/index.js';
import type { EPackage } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { Resource } from '../src/Resource.js';

const ECORE_STRING = 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString';
const ECORE_INT = 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt';

const OPERATIONS_MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="t" nsURI="http://test/ops" nsPrefix="t">
  <eClassifiers xsi:type="ecore:EClass" name="Svc">
    <eOperations name="doIt" eType="${ECORE_STRING}">
      <eAnnotations source="http://example.org/doc">
        <details key="documentation" value="does it"/>
      </eAnnotations>
      <eParameters name="arg" eType="${ECORE_INT}"/>
      <eParameters name="flag" eType="${ECORE_STRING}" upperBound="-1"/>
    </eOperations>
  </eClassifiers>
</ecore:EPackage>`;

const GENERICS_MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="t" nsURI="http://test/generics" nsPrefix="t">
  <eClassifiers xsi:type="ecore:EClass" name="Holder">
    <eStructuralFeatures xsi:type="ecore:EReference" name="label" containment="false">
      <eGenericType eClassifier="http://test/generics#//Box">
        <eTypeArguments eClassifier="${ECORE_STRING}"/>
      </eGenericType>
    </eStructuralFeatures>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="plain" eType="${ECORE_STRING}"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Box">
    <eTypeParameters name="T"/>
  </eClassifiers>
</ecore:EPackage>`;

function load(model: string, fileName: string): Resource {
  const resourceSet = new EResourceSetImpl();
  const resource = resourceSet.createResource(URI.createURI(fileName));
  (resource as any).loadFromString(model);
  return resource;
}

function firstClass(resource: Resource): EClass {
  const pkg = resource.getContents().get(0) as EPackage;
  return pkg.getEClassifiers().get(0) as EClass;
}

describe('Nested model elements are typed (#66)', () => {
  it('should load EOperation as BasicEOperation', () => {
    const svc = firstClass(load(OPERATIONS_MODEL, 'ops.ecore'));
    const operations = svc.getEOperations();

    expect(operations).toHaveLength(1);
    expect(operations[0]).toBeInstanceOf(BasicEOperation);
  });

  it('should expose the typed accessors on a loaded EOperation', () => {
    const svc = firstClass(load(OPERATIONS_MODEL, 'ops.ecore'));
    const operation = svc.getEOperations()[0];

    expect(operation.getName()).toBe('doIt');
    expect(operation.getEType()?.getName()).toBe('EString');
    expect(typeof operation.getEAnnotation).toBe('function');
  });

  it('should load EParameter as BasicEParameter with its attributes', () => {
    const svc = firstClass(load(OPERATIONS_MODEL, 'ops.ecore'));
    const parameters = svc.getEOperations()[0].getEParameters();

    expect(parameters).toHaveLength(2);
    expect(parameters[0]).toBeInstanceOf(BasicEParameter);
    expect(parameters[0].getName()).toBe('arg');
    expect(parameters[0].getEType()?.getName()).toBe('EInt');
    expect(parameters[1].getUpperBound()).toBe(-1);
    expect(parameters[1].isMany()).toBe(true);
  });

  it('should find an annotation on a loaded EOperation', () => {
    // getEAnnotations() used to be a stub returning [], so even a typed
    // EOperation could not resolve its annotations.
    const svc = firstClass(load(OPERATIONS_MODEL, 'ops.ecore'));
    const operation = svc.getEOperations()[0];

    expect(operation.getEAnnotations()).toHaveLength(1);
    expect(operation.getEAnnotation('http://example.org/doc')).not.toBeNull();
    expect(operation.getEAnnotation('http://example.org/missing')).toBeNull();
  });

  it('should load without errors', () => {
    const resource = load(OPERATIONS_MODEL, 'ops.ecore');

    expect(resource.getErrors()).toHaveLength(0);
  });
});

describe('eGenericType provides the feature type (#65)', () => {
  it('should load without errors', () => {
    const resource = load(GENERICS_MODEL, 'generics.ecore');

    expect(resource.getErrors().map(e => String((e as any).message ?? e))).toEqual([]);
  });

  it('should give a feature typed via eGenericType its base type', () => {
    const holder = firstClass(load(GENERICS_MODEL, 'generics.ecore'));
    const label = holder.getEStructuralFeatures().get(0);

    expect(label.getName()).toBe('label');
    expect(label.getEType()?.getName()).toBe('Box');
  });

  it('should keep resolving plain eType attributes', () => {
    const holder = firstClass(load(GENERICS_MODEL, 'generics.ecore'));
    const plain = holder.getEStructuralFeatures().get(1);

    expect(plain.getEType()?.getName()).toBe('EString');
  });

  it('should record the type parameters of a class', () => {
    const resource = load(GENERICS_MODEL, 'generics.ecore');
    const pkg = resource.getContents().get(0) as EPackage;
    const box = pkg.getEClassifiers().get(1) as EClass;

    expect(box.getName()).toBe('Box');
    expect(box.getETypeParameters()).toHaveLength(1);
    expect(box.getETypeParameters()[0].getName()).toBe('T');
  });

  it('should keep the generic type structure including its type arguments', () => {
    // The issue would have accepted dropping the type arguments; they survive.
    const holder = firstClass(load(GENERICS_MODEL, 'generics.ecore'));
    const label = holder.getEStructuralFeatures().get(0) as any;
    const genericType = label.getEGenericType();

    expect(genericType).toBeInstanceOf(BasicEGenericType);
    expect(genericType.getEClassifier()?.getName()).toBe('Box');
    expect(genericType.getETypeArguments()).toHaveLength(1);
    expect(genericType.getETypeArguments()[0].getEClassifier()?.getName()).toBe('EString');
  });

  it('should serialize eGenericType back out and survive a round trip', () => {
    const saved = (load(GENERICS_MODEL, 'generics.ecore') as any).saveToString();

    expect(saved).toContain('<eGenericType eClassifier="#//Box">');
    expect(saved).toContain('<eTypeArguments');
    expect(saved).toContain('<eTypeParameters name="T"/>');

    // Reloading the serialized form yields the same type again.
    const reloaded = firstClass(load(saved, 'generics-2.ecore'));
    expect(reloaded.getEStructuralFeatures().get(0).getEType()?.getName()).toBe('Box');
  });
});

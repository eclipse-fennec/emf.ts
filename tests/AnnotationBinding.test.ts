/**
 * @fileoverview Tests that typed and reflective access share one list (#86)
 *
 * The XMI loader writes through eGet()/eSet(). When a class declares a typed
 * field for a feature without binding it in eGet()/eSet(), the two sides end up
 * holding separate state: the loader fills the generic settings map while the
 * typed getter keeps reading the field, so getEAnnotations() came back empty
 * for a package whose annotation is right there in the file.
 *
 * BasicEPackage, BasicEAnnotation and BasicEFactory were missing that binding.
 * The other seven Basic* classes have it, and these tests pin all of them so
 * the two paths cannot drift apart again.
 *
 * @module tests/AnnotationBinding
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EResourceSetImpl, getEcorePackage } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { BasicEFactory } from '../src/runtime/index.js';
import type { EPackage } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EObject } from '../src/EObject.js';
import type { EStructuralFeature } from '../src/EStructuralFeature.js';
import type { EAnnotation } from '../src/EAnnotation.js';
import type { EList } from '../src/EList.js';

const GENMODEL = 'http://www.eclipse.org/emf/2002/GenModel';

const MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="probe" nsURI="http://test.annotation/probe" nsPrefix="probe">
  <eAnnotations source="${GENMODEL}">
    <details key="documentation" value="Paket-Doku."/>
  </eAnnotations>
  <eClassifiers xsi:type="ecore:EClass" name="Ding">
    <eAnnotations source="${GENMODEL}">
      <details key="documentation" value="Klassen-Doku."/>
    </eAnnotations>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="wert"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString">
      <eAnnotations source="${GENMODEL}">
        <details key="documentation" value="Attribut-Doku."/>
      </eAnnotations>
    </eStructuralFeatures>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EEnum" name="Art">
    <eAnnotations source="${GENMODEL}">
      <details key="documentation" value="Enum-Doku."/>
    </eAnnotations>
    <eLiterals name="A" value="0"/>
  </eClassifiers>
</ecore:EPackage>`;

/** The eAnnotations feature as declared on the given Ecore metaclass. */
function annotationsFeature(metaClassName: string): EStructuralFeature {
  const metaClass = getEcorePackage().getEClassifier(metaClassName) as EClass;
  return metaClass.getEStructuralFeature('eAnnotations')!;
}

describe('Typed and reflective annotation access agree (#86)', () => {
  let pkg: EPackage;
  let ding: EClass;

  beforeEach(() => {
    const resourceSet = new EResourceSetImpl();
    const resource = resourceSet.createResource(URI.createURI('annotations.ecore'));
    (resource as any).loadFromString(MODEL);
    pkg = resource.getContents().get(0) as EPackage;
    ding = pkg.getEClassifier('Ding') as EClass;
  });

  it('should return the loaded annotation from the typed getter on a package', () => {
    // The reported symptom: the annotation is in the file but not in the list.
    expect(pkg.getEAnnotations().size()).toBe(1);
  });

  it('should hand out the identical list through both paths', () => {
    const typed = pkg.getEAnnotations();
    const reflective = pkg.eGet(annotationsFeature('EPackage'));

    expect(typed).toBe(reflective);
  });

  it('should resolve getEAnnotation by source on a package', () => {
    const annotation = pkg.getEAnnotation(GENMODEL);

    expect(annotation).not.toBeNull();
    expect(annotation!.getDetails().getByKey('documentation')).toBe('Paket-Doku.');
  });

  it('should return null for a source that is not there', () => {
    expect(pkg.getEAnnotation('http://example.org/absent')).toBeNull();
  });

  it.each([
    ['class', () => ding as unknown as EObject, 'Klassen-Doku.'],
    ['attribute', () => ding.getEStructuralFeature('wert')! as unknown as EObject, 'Attribut-Doku.'],
    ['enum', () => pkg.getEClassifier('Art') as unknown as EObject, 'Enum-Doku.'],
  ])('should keep working for a %s', (_label, pick, expected) => {
    const element = pick() as any;

    expect(element.getEAnnotations().size()).toBe(1);
    expect(element.getEAnnotation(GENMODEL).getDetails().getByKey('documentation')).toBe(expected);
  });

  it('should still serialize the annotation', () => {
    // The round trip never showed the problem, because saving reads the
    // reflective side. It has to keep working now that both are one list.
    const resourceSet = new EResourceSetImpl();
    const resource = resourceSet.createResource(URI.createURI('rt.ecore'));
    (resource as any).loadFromString(MODEL);
    const xmi = (resource as any).saveToString();

    expect(xmi).toContain('Paket-Doku.');
    expect(xmi).toContain('Klassen-Doku.');
  });
});

describe('Annotations on an annotation and on a factory (#86)', () => {
  it('should share one list on BasicEAnnotation', () => {
    const resourceSet = new EResourceSetImpl();
    const resource = resourceSet.createResource(URI.createURI('nested.ecore'));
    (resource as any).loadFromString(MODEL);
    const pkg = resource.getContents().get(0) as EPackage;
    const annotation = pkg.getEAnnotations().get(0) as any;

    expect(annotation.getEAnnotations()).toBe(annotation.eGet(annotationsFeature('EAnnotation')));
  });

  it('should share one list on BasicEFactory', () => {
    // eGet() returned null for everything here, so the reflective side held no
    // state at all.
    const factory: any = new BasicEFactory();
    const feature = annotationsFeature('EFactory');

    expect(factory.eGet(feature)).toBe(factory.getEAnnotations());
    expect(factory.eIsSet(feature)).toBe(false);
  });

  it('should find an annotation added to a factory', () => {
    const resourceSet = new EResourceSetImpl();
    const resource = resourceSet.createResource(URI.createURI('fac.ecore'));
    (resource as any).loadFromString(MODEL);
    const pkg = resource.getContents().get(0) as EPackage;
    const factory: any = pkg.getEFactoryInstance();
    const annotation = pkg.getEAnnotations().get(0);

    (factory.getEAnnotations() as EList<EAnnotation>).add(annotation);

    expect(factory.getEAnnotation(GENMODEL)).toBe(annotation);
  });
});

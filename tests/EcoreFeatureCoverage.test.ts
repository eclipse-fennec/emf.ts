/**
 * @fileoverview Ecore features that a document carries (#102)
 *
 * Five features Ecore persists were missing from the metamodel this library
 * builds: EAnnotation.contents and references, EOperation.eExceptions and
 * eGenericExceptions, and EReference.eKeys. The loader found no feature for
 * them and dropped the attribute or element, so a .ecore file lost that
 * information on load and on every save afterwards - annotation contents being
 * the worst of them, since that is where EMF embeds GenModel, OCL and
 * documentation payloads.
 *
 * The accessors and the eGet()/eSet() bindings were already there in the
 * Basic* classes; nothing ever reached them.
 *
 * @module tests/EcoreFeatureCoverage
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { EList } from '../src/EList.js';

const ECORE_NS = 'http://www.eclipse.org/emf/2002/Ecore';

/**
 * The features Ecore.ecore declares without derived, transient or volatile -
 * the ones that end up in a file. Derived features (eAllAttributes, many,
 * required, eRawType, ...) and container back-references are computed or set
 * from the other side, so they are deliberately not listed.
 */
const PERSISTED: Record<string, string[]> = {
  EAttribute: ['iD'],
  EAnnotation: ['source', 'details', 'contents', 'references'],
  EClass: ['abstract', 'interface', 'eSuperTypes', 'eOperations', 'eStructuralFeatures', 'eGenericSuperTypes'],
  EClassifier: ['eTypeParameters'],
  EDataType: ['serializable'],
  EEnum: ['eLiterals'],
  EEnumLiteral: ['value', 'literal'],
  EModelElement: ['eAnnotations'],
  ENamedElement: ['name'],
  EOperation: ['eTypeParameters', 'eParameters', 'eExceptions', 'eGenericExceptions'],
  EPackage: ['nsURI', 'nsPrefix', 'eClassifiers', 'eSubpackages'],
  EReference: ['containment', 'resolveProxies', 'eOpposite', 'eKeys'],
  EStructuralFeature: ['changeable', 'volatile', 'transient', 'defaultValueLiteral', 'unsettable', 'derived'],
  ETypedElement: ['ordered', 'unique', 'lowerBound', 'upperBound'],
  EStringToStringMapEntry: ['key', 'value'],
  EGenericType: ['eUpperBound', 'eTypeArguments', 'eLowerBound', 'eTypeParameter', 'eClassifier'],
  ETypeParameter: ['eBounds'],
};

const MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="m" nsURI="http://test.coverage/m" nsPrefix="m">
  <eClassifiers xsi:type="ecore:EClass" name="Ex1"/>
  <eClassifiers xsi:type="ecore:EClass" name="Key">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="id" iD="true"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Svc">
    <eAnnotations source="http://example.org/doc">
      <contents xsi:type="ecore:EClass" name="Eingebettet"/>
      <references href="#//Ex1"/>
    </eAnnotations>
    <eOperations name="call" eExceptions="#//Ex1">
      <eGenericExceptions eClassifier="#//Ex1"/>
    </eOperations>
    <eStructuralFeatures xsi:type="ecore:EReference" name="keyed" upperBound="-1"
        eType="#//Key" eKeys="#//Key/id"/>
  </eClassifiers>
</ecore:EPackage>`;

/** Loads the model above and hands out the pieces the tests look at. */
function load(testId: string) {
  const resourceSet = new EResourceSetImpl();
  const resource = resourceSet.createResource(URI.createURI(`${testId}.ecore`));
  (resource as any).loadFromString(MODEL);

  const pkg = resource.getContents().get(0) as EPackage;
  const svc = pkg.getEClassifier('Svc') as EClass;

  return {
    resource,
    pkg,
    svc,
    annotation: svc.getEAnnotations().get(0) as any,
    operation: svc.getEOperations().get(0) as any,
    keyed: svc.getEStructuralFeature('keyed') as any,
    save: () => (resource as any).saveToString(),
  };
}

/** The names behind a multi-valued feature. */
function names(list: EList<any> | undefined): string[] {
  return [...(list ?? [])].map(entry => entry?.getName?.() ?? String(entry));
}

describe('Features a .ecore file carries are read (#102)', () => {
  it('should read EOperation.eExceptions', () => {
    const m = load('exceptions');

    expect(names(m.operation.getEExceptions())).toEqual(['Ex1']);
  });

  it('should read EOperation.eGenericExceptions', () => {
    const m = load('genericexceptions');

    expect(m.operation.getEGenericExceptions().size()).toBe(1);
  });

  it('should read EAnnotation.contents', () => {
    // This is where EMF embeds GenModel, OCL and documentation payloads.
    const m = load('contents');

    expect(names(m.annotation.getContents())).toEqual(['Eingebettet']);
  });

  it('should read EAnnotation.references', () => {
    const m = load('references');

    expect(names(m.annotation.getReferences())).toEqual(['Ex1']);
  });

  it('should read EReference.eKeys', () => {
    const m = load('ekeys');

    expect(names(m.keyed.getEKeys())).toEqual(['id']);
  });

  it('should report no errors', () => {
    const m = load('errors');

    expect(m.resource.getErrors()).toHaveLength(0);
  });
});

describe('They survive a save (#102)', () => {
  it.each([
    ['eExceptions', /eExceptions="[^"]*#\/\/Ex1"/],
    ['contents', /<contents[^>]*name="Eingebettet"/],
    ['references', /references="[^"]*#\/\/Ex1"/],
    ['eKeys', /eKeys="[^"]*#\/\/Key\/id"/],
    ['eGenericExceptions', /<eGenericExceptions/],
  ])('%s', (_label, pattern) => {
    expect(load(`save-${_label}`).save()).toMatch(pattern);
  });

  it('should still hold everything after a round trip', () => {
    const m = load('roundtrip');
    const again = new EResourceSetImpl().createResource(URI.createURI('roundtrip-2.ecore'));
    (again as any).loadFromString(m.save());

    const pkg = again.getContents().get(0) as EPackage;
    const svc = pkg.getEClassifier('Svc') as EClass;

    expect(names((svc.getEOperations().get(0) as any).getEExceptions())).toEqual(['Ex1']);
    expect(names((svc.getEAnnotations().get(0) as any).getContents())).toEqual(['Eingebettet']);
    expect(names((svc.getEStructuralFeature('keyed') as any).getEKeys())).toEqual(['id']);
  });
});

describe('The metamodel declares every persisted Ecore feature (#102)', () => {
  /**
   * The check that found these five. It runs over the whole table, so a
   * feature dropped or forgotten later fails here rather than in a user's file.
   */
  it('should have no gaps left', () => {
    const resourceSet = new EResourceSetImpl();
    const ecore = resourceSet.getPackageRegistry().getEPackage(ECORE_NS) as EPackage;
    const gaps: string[] = [];

    for (const [className, expected] of Object.entries(PERSISTED)) {
      const eClass = ecore?.getEClassifier(className) as EClass | null;
      if (!eClass || typeof (eClass as any).getEAllStructuralFeatures !== 'function') {
        gaps.push(`${className}: class missing`);
        continue;
      }
      const have = new Set([...eClass.getEAllStructuralFeatures()].map(f => f.getName()));
      const missing = expected.filter(name => !have.has(name));
      if (missing.length) {
        gaps.push(`${className}: ${missing.join(', ')}`);
      }
    }

    expect(gaps).toEqual([]);
  });
});

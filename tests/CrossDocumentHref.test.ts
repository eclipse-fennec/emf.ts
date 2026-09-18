/**
 * @fileoverview Cross-document references and their namespaces (#85, #87)
 *
 * EMF decides the serialized form of a non-containment reference by where the
 * target is, not by the cardinality of the feature: a target in another
 * document becomes an href child element, one in this document an attribute.
 * Single-valued references always took the attribute branch, so the same target
 * was written two different ways depending on the feature (#85).
 *
 * The type of the target travels as xsi:type on that element. It used to be a
 * prefix inside the attribute value, where the prefix was never declared,
 * because namespaces were collected from contained objects only (#87).
 *
 * @module tests/CrossDocumentHref
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { EObject } from '../src/EObject.js';
import type { EList } from '../src/EList.js';

const NS_URI = 'http://test.crossdoc/probe';

/**
 * `one` and `many` have the same declared type and will point at the same
 * target, so any difference in output comes from the cardinality alone.
 * The declared type (EClassifier) differs from the actual one (EClass), which
 * is what puts a type into the output.
 */
const MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="p" nsURI="${NS_URI}" nsPrefix="p">
  <eClassifiers xsi:type="ecore:EClass" name="Holder">
    <eStructuralFeatures xsi:type="ecore:EReference" name="one"
        eType="ecore:EClass http://www.eclipse.org/emf/2002/Ecore#//EClassifier"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="many" upperBound="-1"
        eType="ecore:EClass http://www.eclipse.org/emf/2002/Ecore#//EClassifier"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Ziel"/>
</ecore:EPackage>`;

describe('Cross-document references (#85)', () => {
  let resourceSet: EResourceSetImpl;
  let pkg: EPackage;
  let holder: EObject;
  let xmi: string;

  const feature = (name: string) => (pkg.getEClassifier('Holder') as EClass).getEStructuralFeature(name)!;

  beforeEach(() => {
    resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI('probe.ecore'));
    (metaResource as any).loadFromString(MODEL);
    pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(NS_URI, pkg);
    resourceSet.getPackageRegistry().set(NS_URI, pkg);

    // The target lives in probe.ecore, the instance in another resource.
    const target = pkg.getEClassifier('Ziel') as EObject;
    holder = pkg.getEFactoryInstance().create(pkg.getEClassifier('Holder') as EClass);
    holder.eSet(feature('one'), target);
    (holder.eGet(feature('many')) as EList<EObject>).add(target);

    const instance = resourceSet.createResource(URI.createURI('instance.xmi'));
    instance.getContents().add(holder);
    xmi = (instance as any).saveToString();
  });

  it('should write a single-valued cross-document reference as an href element', () => {
    // Asserting the element form, not the address inside it: whether the href
    // reads #//Ziel or a path fragment depends on whether the target has a
    // container, which is a separate concern (#80).
    expect(xmi).toMatch(/<one[^>]*href="/);
    expect(xmi).not.toMatch(/\sone="/);
  });

  it('should write the multi-valued one the same way', () => {
    expect(xmi).toMatch(/<many[^>]*href="/);
  });

  it('should treat both cardinalities alike for the same target', () => {
    // The point of the report: the form followed the feature, not the target.
    const oneHref = xmi.match(/<one[^>]*href="([^"]*)"/)?.[1];
    const manyHref = xmi.match(/<many[^>]*href="([^"]*)"/)?.[1];

    expect(oneHref).toBe(manyHref);
  });

  it('should round-trip both references', () => {
    const back = resourceSet.createResource(URI.createURI('instance-in.xmi'));
    (back as any).loadFromString(xmi);

    expect(back.getErrors()).toHaveLength(0);
    const reloaded = back.getContents().get(0);
    expect((reloaded.eGet(feature('one')) as any).getName()).toBe('Ziel');
    expect(((reloaded.eGet(feature('many')) as EList<any>).get(0)).getName()).toBe('Ziel');
  });

  it('should keep same-document references in the attribute', () => {
    // Only cross-document targets move to an element; an intra-document one
    // stays where it was, which is what the loader and other tests expect.
    const other = resourceSet.createResource(URI.createURI('same.xmi'));
    const a = pkg.getEFactoryInstance().create(pkg.getEClassifier('Holder') as EClass);
    const b = pkg.getEFactoryInstance().create(pkg.getEClassifier('Holder') as EClass);
    other.getContents().add(a);
    other.getContents().add(b);
    a.eSet(feature('one'), b);

    const sameDocXmi = (other as any).saveToString();

    expect(sameDocXmi).toMatch(/\sone="/);
  });
});

describe('Namespaces for types used in references (#87)', () => {
  let xmi: string;

  beforeEach(() => {
    const resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI('ns.ecore'));
    (metaResource as any).loadFromString(MODEL.replace(NS_URI, `${NS_URI}/ns`));
    const pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(`${NS_URI}/ns`, pkg);
    resourceSet.getPackageRegistry().set(`${NS_URI}/ns`, pkg);

    const holderClass = pkg.getEClassifier('Holder') as EClass;
    const holder = pkg.getEFactoryInstance().create(holderClass);
    holder.eSet(holderClass.getEStructuralFeature('one')!, pkg.getEClassifier('Ziel') as EObject);

    const instance = resourceSet.createResource(URI.createURI('ns-instance.xmi'));
    instance.getContents().add(holder);
    xmi = (instance as any).saveToString();
  });

  it('should declare every prefix it uses', () => {
    const used = [...xmi.matchAll(/xsi:type="([\w.-]+):/g)].map(m => m[1]);
    const declared = [...xmi.matchAll(/xmlns:([\w.-]+)=/g)].map(m => m[1]);

    expect(used.length).toBeGreaterThan(0);
    for (const prefix of used) {
      expect(declared).toContain(prefix);
    }
  });

  it('should carry the type as xsi:type rather than inside the value', () => {
    // The prefix used to sit in the attribute value, where writeNamespaces()
    // never saw it because it only counted types of contained objects.
    expect(xmi).toContain('xsi:type="ecore:EClass"');
    expect(xmi).not.toMatch(/="ecore:\w+ /);
    expect(xmi).toContain('xmlns:ecore=');
  });

  it('should stay loadable', () => {
    const resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI('ns2.ecore'));
    (metaResource as any).loadFromString(MODEL.replace(NS_URI, `${NS_URI}/ns`));
    const pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(`${NS_URI}/ns`, pkg);
    resourceSet.getPackageRegistry().set(`${NS_URI}/ns`, pkg);

    const back = resourceSet.createResource(URI.createURI('ns-in.xmi'));
    (back as any).loadFromString(xmi);

    expect(back.getErrors()).toHaveLength(0);
    expect(back.getContents().size()).toBe(1);
  });
});

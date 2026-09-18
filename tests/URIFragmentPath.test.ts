/**
 * @fileoverview Tests for the path fragment format of getURIFragment (#89)
 *
 * EMF addresses an object inside a document by root index followed by one
 * segment per containment step naming the feature: `/1/@operations.0`, and
 * `/@feature` without an index for a single-valued containment.
 *
 * A bare index path such as `/1/0` is unresolvable in Java EMF, whose
 * eObjectForURIFragmentSegment() requires the `@` form. It is also ambiguous on
 * its own terms: the number counted across all containment children rather than
 * within one feature, so a class with two containment features produced an index
 * that meant something different on each side.
 *
 * @module tests/URIFragmentPath
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { EObject } from '../src/EObject.js';
import type { Resource } from '../src/Resource.js';
import type { EList } from '../src/EList.js';

const NS_URI = 'http://test.urifragment/services';

/**
 * Interface has two containment features holding the same type, so an index
 * counted across all children differs from the index within one feature.
 */
const MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="s" nsURI="${NS_URI}" nsPrefix="s">
  <eClassifiers xsi:type="ecore:EClass" name="Parameter">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Operation">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="parameters" upperBound="-1"
        containment="true" eType="#//Parameter"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Interface">
    <eStructuralFeatures xsi:type="ecore:EReference" name="docs" upperBound="-1"
        containment="true" eType="#//Operation"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="operations" upperBound="-1"
        containment="true" eType="#//Operation"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="main"
        containment="true" eType="#//Operation"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Provider">
    <eStructuralFeatures xsi:type="ecore:EReference" name="uses" eType="#//Operation"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="usesParameter" eType="#//Parameter"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="usesMain" eType="#//Operation"/>
  </eClassifiers>
</ecore:EPackage>`;

describe('Path fragments name the containment feature (#89)', () => {
  let resourceSet: EResourceSetImpl;
  let pkg: EPackage;
  let resource: Resource;
  let provider: EObject;
  let iface: EObject;
  let operation: EObject;
  let parameter: EObject;
  let mainOperation: EObject;

  const classifier = (name: string) => pkg.getEClassifier(name) as EClass;
  const feature = (className: string, featureName: string) =>
    classifier(className).getEStructuralFeature(featureName)!;

  beforeEach(() => {
    resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI('services.ecore'));
    (metaResource as any).loadFromString(MODEL);
    pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(NS_URI, pkg);
    resourceSet.getPackageRegistry().set(NS_URI, pkg);

    const factory = pkg.getEFactoryInstance();
    iface = factory.create(classifier('Interface'));

    // A child in the other containment feature first, so that an index across
    // all children would differ from the index within 'operations'.
    const doc = factory.create(classifier('Operation'));
    (iface.eGet(feature('Interface', 'docs')) as EList<EObject>).add(doc);

    operation = factory.create(classifier('Operation'));
    operation.eSet(feature('Operation', 'name'), 'charge');
    (iface.eGet(feature('Interface', 'operations')) as EList<EObject>).add(operation);

    parameter = factory.create(classifier('Parameter'));
    parameter.eSet(feature('Parameter', 'name'), 'amount');
    (operation.eGet(feature('Operation', 'parameters')) as EList<EObject>).add(parameter);

    mainOperation = factory.create(classifier('Operation'));
    iface.eSet(feature('Interface', 'main'), mainOperation);

    provider = factory.create(classifier('Provider'));
    provider.eSet(feature('Provider', 'uses'), operation);
    provider.eSet(feature('Provider', 'usesParameter'), parameter);
    provider.eSet(feature('Provider', 'usesMain'), mainOperation);

    resource = resourceSet.createResource(URI.createURI('model.xmi'));
    resource.getContents().add(provider);
    resource.getContents().add(iface);
  });

  describe('getURIFragment', () => {
    it('should address a root by its index', () => {
      expect(resource.getURIFragment(provider)).toBe('/0');
      expect(resource.getURIFragment(iface)).toBe('/1');
    });

    it('should name the feature and index within it', () => {
      // The index counts within 'operations'; across all children it would be 1,
      // because the doc child comes first.
      expect(resource.getURIFragment(operation)).toBe('/1/@operations.0');
    });

    it('should chain one segment per containment step', () => {
      expect(resource.getURIFragment(parameter)).toBe('/1/@operations.0/@parameters.0');
    });

    it('should omit the index for a single-valued containment', () => {
      expect(resource.getURIFragment(mainOperation)).toBe('/1/@main');
    });
  });

  describe('serialization', () => {
    it('should write the feature-qualified path into the document', () => {
      const xmi = (resource as any).saveToString();

      expect(xmi).toContain('uses="/1/@operations.0"');
      expect(xmi).toContain('usesParameter="/1/@operations.0/@parameters.0"');
      expect(xmi).toContain('usesMain="/1/@main"');
    });

    it('should round-trip every reference', () => {
      const xmi = (resource as any).saveToString();
      const back = resourceSet.createResource(URI.createURI('model-in.xmi'));
      (back as any).loadFromString(xmi);

      expect(back.getErrors()).toHaveLength(0);
      const reloaded = back.getContents().get(0);
      const usedOperation = reloaded.eGet(feature('Provider', 'uses')) as EObject;
      const usedParameter = reloaded.eGet(feature('Provider', 'usesParameter')) as EObject;

      expect(usedOperation.eGet(feature('Operation', 'name'))).toBe('charge');
      expect(usedParameter.eGet(feature('Parameter', 'name'))).toBe('amount');
      expect(reloaded.eGet(feature('Provider', 'usesMain'))).not.toBeNull();
    });
  });

  describe('getEObject resolves what getURIFragment produced', () => {
    it.each([
      ['root', () => provider],
      ['nested in a multi-valued feature', () => operation],
      ['two levels deep', () => parameter],
      ['single-valued containment', () => mainOperation],
    ])('should resolve the fragment of %s', (_label, pick) => {
      const object = pick();
      const fragment = resource.getURIFragment(object);

      expect(resource.getEObject(fragment)).toBe(object);
    });
  });

  describe('backwards compatibility', () => {
    it('should still resolve a bare index path written by an older version', () => {
      // Documents produced before this change use /1/0; they stay readable.
      expect(resource.getEObject('/1/0')).not.toBeNull();
    });
  });
});

/**
 * Ecore addresses its own elements by name, not by feature and index:
 * EModelElementImpl.eURIFragmentSegment() returns the name of an ENamedElement
 * and the source of an EAnnotation. And a resource holding a single root
 * leaves the root segment empty, which is why EMF's own files carry
 * `href="other.xmi#/"` and `exceptions="//@exceptions.0"`.
 */
describe('Metamodel elements are addressed by name', () => {
  const NS = 'http://test.fragment/named';

  const ECORE = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="named" nsURI="${NS}" nsPrefix="n">
  <eClassifiers xsi:type="ecore:EClass" name="Erste"/>
  <eClassifiers xsi:type="ecore:EClass" name="Ziel">
    <eAnnotations source="http://example.org/doc"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="wert"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
    <eOperations name="tu"/>
  </eClassifiers>
</ecore:EPackage>`;

  function metamodel() {
    const resourceSet = new EResourceSetImpl();
    const resource = resourceSet.createResource(URI.createURI('named.ecore'));
    (resource as any).loadFromString(ECORE);
    const pkg = resource.getContents().get(0) as any;
    return { resource, pkg };
  }

  it.each([
    ['a classifier', (pkg: any) => pkg.getEClassifier('Ziel'), '//Ziel'],
    [
      'a structural feature',
      (pkg: any) => pkg.getEClassifier('Ziel').getEStructuralFeature('wert'),
      '//Ziel/wert',
    ],
    [
      'an operation',
      (pkg: any) => pkg.getEClassifier('Ziel').getEOperations().get(0),
      '//Ziel/tu',
    ],
    [
      // The source, encoded as BasicEObjectImpl.eEncodeValue() does (#98).
      'an annotation, by its source',
      (pkg: any) => pkg.getEClassifier('Ziel').getEAnnotations().get(0),
      '//Ziel/http%3A%2F%2Fexample.org%2Fdoc',
    ],
  ])('should address %s by name', (_label, pick, expected) => {
    const { resource, pkg } = metamodel();

    expect(resource.getURIFragment(pick(pkg))).toBe(expected);
  });

  it('should resolve a named fragment back to the same object', () => {
    const { resource, pkg } = metamodel();
    const feature = pkg.getEClassifier('Ziel').getEStructuralFeature('wert');

    expect(resource.getEObject(resource.getURIFragment(feature))).toBe(feature);
  });

  it('should leave the root segment empty for a single root', () => {
    const { resource, pkg } = metamodel();

    expect(resource.getURIFragment(pkg)).toBe('/');
  });

  it('should number the root where the resource holds several', () => {
    const { resource, pkg } = metamodel();
    const second = resource.getResourceSet()!.createResource(URI.createURI('second.ecore'));
    (second as any).loadFromString(ECORE.replace(NS, `${NS}/2`));
    resource.getContents().add(second.getContents().get(0));

    expect(resource.getURIFragment(pkg)).toBe('/0');
    expect(resource.getURIFragment(resource.getContents().get(1))).toBe('/1');
  });

  it('should keep the feature form for instance models', () => {
    // Only metamodel elements are addressed by name; an ordinary EObject is
    // still @feature.index, which is what BasicEObjectImpl does in Java.
    const { pkg } = metamodel();
    const resourceSet = new EResourceSetImpl();
    EPackageRegistry.INSTANCE.set(NS, pkg);
    resourceSet.getPackageRegistry().set(NS, pkg);
    const instance = resourceSet.createResource(URI.createURI('instance.xmi'));
    const object = pkg.getEFactoryInstance().create(pkg.getEClassifier('Ziel'));
    instance.getContents().add(object);

    expect(instance.getURIFragment(object)).toBe('/');
  });
});

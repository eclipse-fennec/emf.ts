/**
 * @fileoverview ExtendedMetaData Tests
 *
 * Tests EMD annotation support for XSD-derived models:
 * - Simple content (kind="simple", name=":0")
 * - Namespace-based element feature resolution
 * - Namespace-based attribute feature resolution
 * - Round-trip serialization with EMD
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XMIResource } from '../src/xmi/XMLResource';
import { OPTION_EXTENDED_META_DATA } from '../src/xmi/XMLHelper';
import { ExtendedMetaData, ANNOTATION_URI, SIMPLE_CONTENT, ELEMENT_FEATURE, ATTRIBUTE_FEATURE } from '../src/xmi/ExtendedMetaData';
import { URI } from '../src/URI';
import { BasicEPackage } from '../src/runtime/BasicEPackage';
import { BasicEClass } from '../src/runtime/BasicEClass';
import { BasicEFactory } from '../src/runtime/BasicEFactory';
import { BasicEAttribute } from '../src/runtime/BasicEAttribute';
import { BasicEReference } from '../src/runtime/BasicEReference';
import { BasicEDataType } from '../src/runtime/BasicEDataType';
import { BasicEAnnotation } from '../src/runtime/BasicEAnnotation';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { getEcorePackage } from '../src/ecore/EcorePackage';

/**
 * Helper: add an ExtendedMetaData annotation to a model element
 */
function addEMDAnnotation(element: any, details: Record<string, string>): void {
  const annotation = new BasicEAnnotation();
  annotation.setSource(ANNOTATION_URI);
  const detailsMap = annotation.getDetails();
  for (const [key, value] of Object.entries(details)) {
    detailsMap.putByKey(key, value);
  }
  element.getEAnnotations().push(annotation);
}

describe('ExtendedMetaData', () => {
  let resourceSet: BasicResourceSet;
  let emd: ExtendedMetaData;

  beforeEach(() => {
    resourceSet = new BasicResourceSet();
    const ecorePackage = getEcorePackage();
    resourceSet.getPackageRegistry().set(ecorePackage.getNsURI()!, ecorePackage);
    emd = new ExtendedMetaData();
  });

  describe('ExtendedMetaData utility', () => {
    it('should read content kind from class annotation', () => {
      const cls = new BasicEClass();
      cls.setName('PlainLiteral');
      addEMDAnnotation(cls, { kind: 'simple' });

      expect(emd.getContentKind(cls)).toBe(SIMPLE_CONTENT);
    });

    it('should find simple content feature (name=":0")', () => {
      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const cls = new BasicEClass();
      cls.setName('PlainLiteral');
      addEMDAnnotation(cls, { kind: 'simple' });

      const valueAttr = new BasicEAttribute();
      valueAttr.setName('value');
      valueAttr.setEType(stringType);
      addEMDAnnotation(valueAttr, { name: ':0', kind: 'simple' });
      cls.getEStructuralFeatures().push(valueAttr);

      const langAttr = new BasicEAttribute();
      langAttr.setName('lang');
      langAttr.setEType(stringType);
      addEMDAnnotation(langAttr, { kind: 'attribute', name: 'lang', namespace: 'http://www.w3.org/XML/1998/namespace' });
      cls.getEStructuralFeatures().push(langAttr);

      const simpleFeature = emd.getSimpleContentFeature(cls);
      expect(simpleFeature).toBe(valueAttr);
    });

    it('should find attribute feature by namespace', () => {
      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const cls = new BasicEClass();
      cls.setName('PlainLiteral');

      const langAttr = new BasicEAttribute();
      langAttr.setName('lang');
      langAttr.setEType(stringType);
      addEMDAnnotation(langAttr, { kind: 'attribute', name: 'lang', namespace: 'http://www.w3.org/XML/1998/namespace' });
      cls.getEStructuralFeatures().push(langAttr);

      const found = emd.getAttributeFeature(cls, 'http://www.w3.org/XML/1998/namespace', 'lang');
      expect(found).toBe(langAttr);
    });

    it('should find element feature by namespace', () => {
      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const cls = new BasicEClass();
      cls.setName('Dataset');

      const titleAttr = new BasicEAttribute();
      titleAttr.setName('title');
      titleAttr.setEType(stringType);
      addEMDAnnotation(titleAttr, { kind: 'element', name: 'title', namespace: 'http://purl.org/dc/terms/' });
      cls.getEStructuralFeatures().push(titleAttr);

      const found = emd.getElementFeature(cls, 'http://purl.org/dc/terms/', 'title');
      expect(found).toBe(titleAttr);
    });

    it('should resolve ##targetNamespace to owning package nsURI', () => {
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://www.w3.org/ns/dcat#');
      pkg.setNsPrefix('dcat');

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const containerClass = new BasicEClass();
      containerClass.setName('DatasetContainer');
      containerClass.setEPackage(pkg);
      pkg.getEClassifiers().push(containerClass);

      const datasetRef = new BasicEReference();
      datasetRef.setName('dataset');
      datasetRef.setContainment(true);
      addEMDAnnotation(datasetRef, { kind: 'element', name: 'Dataset', namespace: '##targetNamespace' });
      containerClass.getEStructuralFeatures().push(datasetRef);

      // ##targetNamespace should resolve to http://www.w3.org/ns/dcat#
      const ns = emd.getNamespace(datasetRef);
      expect(ns).toBe('http://www.w3.org/ns/dcat#');

      // Feature should be found by the resolved namespace
      const found = emd.getElementFeature(containerClass, 'http://www.w3.org/ns/dcat#', 'Dataset');
      expect(found).toBe(datasetRef);
    });

    it('should resolve ##local to null namespace', () => {
      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const cls = new BasicEClass();
      cls.setName('Foo');

      const attr = new BasicEAttribute();
      attr.setName('bar');
      attr.setEType(stringType);
      addEMDAnnotation(attr, { kind: 'attribute', name: 'bar', namespace: '##local' });
      cls.getEStructuralFeatures().push(attr);

      expect(emd.getNamespace(attr)).toBeNull();
    });

    it('should load XML with ##targetNamespace feature', () => {
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://www.w3.org/ns/dcat#');
      pkg.setNsPrefix('dcat');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const titleAttr = new BasicEAttribute();
      titleAttr.setName('title');
      titleAttr.setEType(stringType);
      datasetClass.getEStructuralFeatures().push(titleAttr);

      const containerClass = new BasicEClass();
      containerClass.setName('DatasetContainer');
      containerClass.setEPackage(pkg);
      pkg.getEClassifiers().push(containerClass);

      const datasetRef = new BasicEReference();
      datasetRef.setName('dataset');
      datasetRef.setEType(datasetClass);
      datasetRef.setContainment(true);
      addEMDAnnotation(datasetRef, { kind: 'element', name: 'Dataset', namespace: '##targetNamespace' });
      containerClass.getEStructuralFeatures().push(datasetRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dcat:DatasetContainer xmlns:dcat="http://www.w3.org/ns/dcat#">
  <dcat:Dataset title="My Dataset"/>
</dcat:DatasetContainer>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const contents = resource.getContents();
      expect(contents.length).toBe(1);

      const container = contents.get(0);
      expect(container.eClass().getName()).toBe('DatasetContainer');

      const dataset = container.eGet(datasetRef);
      expect(dataset).not.toBeNull();
      expect(dataset.eClass().getName()).toBe('Dataset');
      expect(dataset.eGet(titleAttr)).toBe('My Dataset');
    });
  });

  describe('Simple content loading', () => {
    it('should map text content to :0 feature for kind="simple" class', () => {
      // Build a model with a PlainLiteral class (kind="simple")
      const pkg = new BasicEPackage();
      pkg.setName('rdf');
      pkg.setNsURI('http://test.com/rdf');
      pkg.setNsPrefix('rdf');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const plainLiteralClass = new BasicEClass();
      plainLiteralClass.setName('PlainLiteral');
      plainLiteralClass.setEPackage(pkg);
      addEMDAnnotation(plainLiteralClass, { kind: 'simple' });
      pkg.getEClassifiers().push(plainLiteralClass);

      const valueAttr = new BasicEAttribute();
      valueAttr.setName('value');
      valueAttr.setEType(stringType);
      addEMDAnnotation(valueAttr, { name: ':0', kind: 'simple' });
      plainLiteralClass.getEStructuralFeatures().push(valueAttr);

      const langAttr = new BasicEAttribute();
      langAttr.setName('lang');
      langAttr.setEType(stringType);
      addEMDAnnotation(langAttr, { kind: 'attribute', name: 'lang', namespace: 'http://www.w3.org/XML/1998/namespace' });
      plainLiteralClass.getEStructuralFeatures().push(langAttr);

      // Container class
      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const titleRef = new BasicEReference();
      titleRef.setName('title');
      titleRef.setEType(plainLiteralClass);
      titleRef.setContainment(true);
      datasetClass.getEStructuralFeatures().push(titleRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:Dataset xmlns:rdf="http://test.com/rdf" xml:lang="en">
  <title xml:lang="de">Open Data Portal</title>
</rdf:Dataset>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const contents = resource.getContents();
      expect(contents.length).toBe(1);

      const dataset = contents.get(0);
      expect(dataset.eClass().getName()).toBe('Dataset');

      const title = dataset.eGet(titleRef);
      expect(title).not.toBeNull();
      expect(title.eClass().getName()).toBe('PlainLiteral');

      // Verify simple content was mapped
      expect(title.eGet(valueAttr)).toBe('Open Data Portal');
      // Verify namespace-qualified attribute was mapped
      expect(title.eGet(langAttr)).toBe('de');
    });
  });

  describe('Simple content saving', () => {
    it('should write :0 feature as text content', () => {
      const pkg = new BasicEPackage();
      pkg.setName('rdf');
      pkg.setNsURI('http://test.com/rdf');
      pkg.setNsPrefix('rdf');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const plainLiteralClass = new BasicEClass();
      plainLiteralClass.setName('PlainLiteral');
      plainLiteralClass.setEPackage(pkg);
      addEMDAnnotation(plainLiteralClass, { kind: 'simple' });
      pkg.getEClassifiers().push(plainLiteralClass);

      const valueAttr = new BasicEAttribute();
      valueAttr.setName('value');
      valueAttr.setEType(stringType);
      addEMDAnnotation(valueAttr, { name: ':0', kind: 'simple' });
      plainLiteralClass.getEStructuralFeatures().push(valueAttr);

      const langAttr = new BasicEAttribute();
      langAttr.setName('lang');
      langAttr.setEType(stringType);
      addEMDAnnotation(langAttr, { kind: 'attribute', name: 'lang', namespace: 'http://www.w3.org/XML/1998/namespace' });
      plainLiteralClass.getEStructuralFeatures().push(langAttr);

      // Container class
      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const titleRef = new BasicEReference();
      titleRef.setName('title');
      titleRef.setEType(plainLiteralClass);
      titleRef.setContainment(true);
      datasetClass.getEStructuralFeatures().push(titleRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      // Create instances
      const dataset = factory.create(datasetClass);
      const literal = factory.create(plainLiteralClass);
      literal.eSet(valueAttr, 'Open Data Portal');
      literal.eSet(langAttr, 'de');
      dataset.eSet(titleRef, literal);

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(dataset);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      const xml = resource.saveToString(options);

      console.log('Simple content save XML:', xml);

      // Text content should appear between tags, not as attribute
      expect(xml).toContain('>Open Data Portal</title>');
      // xml:lang should use the xml namespace prefix
      expect(xml).toContain('xml:lang="de"');
      // value should NOT appear as an attribute
      expect(xml).not.toContain('value="Open Data Portal"');
    });
  });

  describe('Namespace-based element features', () => {
    it('should resolve elements by namespace in loading', () => {
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://test.com/dcat');
      pkg.setNsPrefix('dcat');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      // title is an EAttribute but serialized as element with namespace
      const titleAttr = new BasicEAttribute();
      titleAttr.setName('title');
      titleAttr.setEType(stringType);
      addEMDAnnotation(titleAttr, { kind: 'element', name: 'title', namespace: 'http://purl.org/dc/terms/' });
      datasetClass.getEStructuralFeatures().push(titleAttr);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dcat:Dataset xmlns:dcat="http://test.com/dcat" xmlns:terms="http://purl.org/dc/terms/">
  <terms:title>My Dataset</terms:title>
</dcat:Dataset>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const contents = resource.getContents();
      expect(contents.length).toBe(1);

      const dataset = contents.get(0);
      expect(dataset.eGet(titleAttr)).toBe('My Dataset');
    });

    it('should serialize element features with namespace prefix', () => {
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://test.com/dcat');
      pkg.setNsPrefix('dcat');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const titleAttr = new BasicEAttribute();
      titleAttr.setName('title');
      titleAttr.setEType(stringType);
      addEMDAnnotation(titleAttr, { kind: 'element', name: 'title', namespace: 'http://purl.org/dc/terms/' });
      datasetClass.getEStructuralFeatures().push(titleAttr);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const dataset = factory.create(datasetClass);
      dataset.eSet(titleAttr, 'My Dataset');

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(dataset);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      const xml = resource.saveToString(options);

      console.log('EMD element save XML:', xml);

      // Should be written as an element, not as attribute
      expect(xml).not.toContain('title="My Dataset"');
      // Should contain the element with text content
      expect(xml).toContain('>My Dataset</');
      // Should declare the namespace
      expect(xml).toContain('http://purl.org/dc/terms/');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip simple content model', () => {
      const pkg = new BasicEPackage();
      pkg.setName('rdf');
      pkg.setNsURI('http://test.com/rdf');
      pkg.setNsPrefix('rdf');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const plainLiteralClass = new BasicEClass();
      plainLiteralClass.setName('PlainLiteral');
      plainLiteralClass.setEPackage(pkg);
      addEMDAnnotation(plainLiteralClass, { kind: 'simple' });
      pkg.getEClassifiers().push(plainLiteralClass);

      const valueAttr = new BasicEAttribute();
      valueAttr.setName('value');
      valueAttr.setEType(stringType);
      addEMDAnnotation(valueAttr, { name: ':0', kind: 'simple' });
      plainLiteralClass.getEStructuralFeatures().push(valueAttr);

      const langAttr = new BasicEAttribute();
      langAttr.setName('lang');
      langAttr.setEType(stringType);
      addEMDAnnotation(langAttr, { kind: 'attribute', name: 'lang', namespace: 'http://www.w3.org/XML/1998/namespace' });
      plainLiteralClass.getEStructuralFeatures().push(langAttr);

      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const titleRef = new BasicEReference();
      titleRef.setName('title');
      titleRef.setEType(plainLiteralClass);
      titleRef.setContainment(true);
      datasetClass.getEStructuralFeatures().push(titleRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      // Create → Save
      const dataset = factory.create(datasetClass);
      const literal = factory.create(plainLiteralClass);
      literal.eSet(valueAttr, 'Test Title');
      literal.eSet(langAttr, 'en');
      dataset.eSet(titleRef, literal);

      const resource1 = new XMIResource(URI.createURI('test.xmi'));
      resource1.setResourceSet(resourceSet);
      resource1.getContents().push(dataset);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      const xml = resource1.saveToString(options);

      console.log('Round-trip XML:', xml);

      // Load → Verify
      const resource2 = new XMIResource(URI.createURI('test2.xmi'));
      resource2.setResourceSet(resourceSet);
      resource2.loadFromString(xml, options);

      const loaded = resource2.getContents().get(0);
      expect(loaded.eClass().getName()).toBe('Dataset');

      const loadedTitle = loaded.eGet(titleRef);
      expect(loadedTitle).not.toBeNull();
      expect(loadedTitle.eGet(valueAttr)).toBe('Test Title');
      expect(loadedTitle.eGet(langAttr)).toBe('en');
    });
  });

  describe('RDF/XML element wrapping pattern (#51)', () => {
    it('should resolve inner element as concrete type when feature type is abstract', () => {
      // Build model: Dataset.distribution: Resource (abstract), Distribution extends Resource
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://www.w3.org/ns/dcat#');
      pkg.setNsPrefix('dcat');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      // Abstract base type
      const resourceClass = new BasicEClass();
      resourceClass.setName('Resource');
      resourceClass.setAbstract(true);
      resourceClass.setEPackage(pkg);
      pkg.getEClassifiers().push(resourceClass);

      // Concrete subtype
      const distributionClass = new BasicEClass();
      distributionClass.setName('Distribution');
      distributionClass.setEPackage(pkg);
      distributionClass.getESuperTypes().push(resourceClass);
      pkg.getEClassifiers().push(distributionClass);

      const mediaTypeAttr = new BasicEAttribute();
      mediaTypeAttr.setName('mediaType');
      mediaTypeAttr.setEType(stringType);
      distributionClass.getEStructuralFeatures().push(mediaTypeAttr);

      // Dataset class with containment to abstract Resource
      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const titleAttr = new BasicEAttribute();
      titleAttr.setName('title');
      titleAttr.setEType(stringType);
      datasetClass.getEStructuralFeatures().push(titleAttr);

      const distributionRef = new BasicEReference();
      distributionRef.setName('distribution');
      distributionRef.setEType(resourceClass); // abstract type!
      distributionRef.setContainment(true);
      distributionRef.setUpperBound(-1);
      addEMDAnnotation(distributionRef, { kind: 'element', name: 'distribution', namespace: '##targetNamespace' });
      datasetClass.getEStructuralFeatures().push(distributionRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dcat:Dataset xmlns:dcat="http://www.w3.org/ns/dcat#" title="My Dataset">
  <dcat:distribution>
    <dcat:Distribution mediaType="text/csv"/>
  </dcat:distribution>
</dcat:Dataset>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const contents = resource.getContents();
      expect(contents.length).toBe(1);

      const dataset = contents.get(0);
      expect(dataset.eClass().getName()).toBe('Dataset');
      expect(dataset.eGet(titleAttr)).toBe('My Dataset');

      // Check the distribution was created as Distribution (concrete), not Resource (abstract)
      const distributions = dataset.eGet(distributionRef) as any[];
      expect(distributions).not.toBeNull();
      expect(distributions.length).toBe(1);

      const dist = distributions[0];
      expect(dist.eClass().getName()).toBe('Distribution');
      expect(dist.eGet(mediaTypeAttr)).toBe('text/csv');
    });

    it('should handle multiple wrapped elements', () => {
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://www.w3.org/ns/dcat#');
      pkg.setNsPrefix('dcat');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const resourceClass = new BasicEClass();
      resourceClass.setName('Resource');
      resourceClass.setAbstract(true);
      resourceClass.setEPackage(pkg);
      pkg.getEClassifiers().push(resourceClass);

      const distributionClass = new BasicEClass();
      distributionClass.setName('Distribution');
      distributionClass.setEPackage(pkg);
      distributionClass.getESuperTypes().push(resourceClass);
      pkg.getEClassifiers().push(distributionClass);

      const mediaTypeAttr = new BasicEAttribute();
      mediaTypeAttr.setName('mediaType');
      mediaTypeAttr.setEType(stringType);
      distributionClass.getEStructuralFeatures().push(mediaTypeAttr);

      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const distributionRef = new BasicEReference();
      distributionRef.setName('distribution');
      distributionRef.setEType(resourceClass);
      distributionRef.setContainment(true);
      distributionRef.setUpperBound(-1);
      addEMDAnnotation(distributionRef, { kind: 'element', name: 'distribution', namespace: '##targetNamespace' });
      datasetClass.getEStructuralFeatures().push(distributionRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dcat:Dataset xmlns:dcat="http://www.w3.org/ns/dcat#">
  <dcat:distribution>
    <dcat:Distribution mediaType="text/csv"/>
  </dcat:distribution>
  <dcat:distribution>
    <dcat:Distribution mediaType="application/json"/>
  </dcat:distribution>
</dcat:Dataset>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const dataset = resource.getContents().get(0);
      const distributions = dataset.eGet(distributionRef) as any[];
      expect(distributions.length).toBe(2);
      expect(distributions[0].eGet(mediaTypeAttr)).toBe('text/csv');
      expect(distributions[1].eGet(mediaTypeAttr)).toBe('application/json');
    });

    it('should handle wrapper with nested content elements', () => {
      // Tests: <dcat:distribution><dcat:Distribution><dcat:mediaType>text/csv</dcat:mediaType></dcat:Distribution></dcat:distribution>
      const pkg = new BasicEPackage();
      pkg.setName('dcat');
      pkg.setNsURI('http://www.w3.org/ns/dcat#');
      pkg.setNsPrefix('dcat');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const resourceClass = new BasicEClass();
      resourceClass.setName('Resource');
      resourceClass.setAbstract(true);
      resourceClass.setEPackage(pkg);
      pkg.getEClassifiers().push(resourceClass);

      const distributionClass = new BasicEClass();
      distributionClass.setName('Distribution');
      distributionClass.setEPackage(pkg);
      distributionClass.getESuperTypes().push(resourceClass);
      pkg.getEClassifiers().push(distributionClass);

      const mediaTypeAttr = new BasicEAttribute();
      mediaTypeAttr.setName('mediaType');
      mediaTypeAttr.setEType(stringType);
      addEMDAnnotation(mediaTypeAttr, { kind: 'element', name: 'mediaType', namespace: '##targetNamespace' });
      distributionClass.getEStructuralFeatures().push(mediaTypeAttr);

      const datasetClass = new BasicEClass();
      datasetClass.setName('Dataset');
      datasetClass.setEPackage(pkg);
      pkg.getEClassifiers().push(datasetClass);

      const distributionRef = new BasicEReference();
      distributionRef.setName('distribution');
      distributionRef.setEType(resourceClass);
      distributionRef.setContainment(true);
      distributionRef.setUpperBound(-1);
      addEMDAnnotation(distributionRef, { kind: 'element', name: 'distribution', namespace: '##targetNamespace' });
      datasetClass.getEStructuralFeatures().push(distributionRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dcat:Dataset xmlns:dcat="http://www.w3.org/ns/dcat#">
  <dcat:distribution>
    <dcat:Distribution>
      <dcat:mediaType>text/csv</dcat:mediaType>
    </dcat:Distribution>
  </dcat:distribution>
</dcat:Dataset>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const dataset = resource.getContents().get(0);
      const distributions = dataset.eGet(distributionRef) as any[];
      expect(distributions.length).toBe(1);
      expect(distributions[0].eClass().getName()).toBe('Distribution');
      expect(distributions[0].eGet(mediaTypeAttr)).toBe('text/csv');
    });
  });

  describe('RDF/XML wrapper type replacement (#53)', () => {
    it('should replace concrete parent with more specific subtype', () => {
      // Agent (concrete) → AgentImpl (subtype with extra features)
      const pkg = new BasicEPackage();
      pkg.setName('foaf');
      pkg.setNsURI('http://xmlns.com/foaf/0.1/');
      pkg.setNsPrefix('foaf');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      // Concrete base type with name attribute
      const agentClass = new BasicEClass();
      agentClass.setName('Agent');
      agentClass.setEPackage(pkg);
      pkg.getEClassifiers().push(agentClass);

      const nameAttr = new BasicEAttribute();
      nameAttr.setName('name');
      nameAttr.setEType(stringType);
      agentClass.getEStructuralFeatures().push(nameAttr);

      // Concrete subtype with extra feature
      const organizationClass = new BasicEClass();
      organizationClass.setName('Organization');
      organizationClass.setEPackage(pkg);
      organizationClass.getESuperTypes().push(agentClass);
      pkg.getEClassifiers().push(organizationClass);

      const homepageAttr = new BasicEAttribute();
      homepageAttr.setName('homepage');
      homepageAttr.setEType(stringType);
      organizationClass.getEStructuralFeatures().push(homepageAttr);

      // Container with feature typed as Agent (concrete)
      const catalogClass = new BasicEClass();
      catalogClass.setName('Catalog');
      catalogClass.setEPackage(pkg);
      pkg.getEClassifiers().push(catalogClass);

      const publisherRef = new BasicEReference();
      publisherRef.setName('publisher');
      publisherRef.setEType(agentClass); // concrete type
      publisherRef.setContainment(true);
      catalogClass.getEStructuralFeatures().push(publisherRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<foaf:Catalog xmlns:foaf="http://xmlns.com/foaf/0.1/">
  <publisher>
    <foaf:Organization name="ACME" homepage="https://acme.org"/>
  </publisher>
</foaf:Catalog>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const catalog = resource.getContents().get(0);
      expect(catalog.eClass().getName()).toBe('Catalog');

      const publisher = catalog.eGet(publisherRef);
      expect(publisher).not.toBeNull();
      // Must be Organization, not Agent
      expect(publisher.eClass().getName()).toBe('Organization');
      expect(publisher.eGet(nameAttr)).toBe('ACME');
      expect(publisher.eGet(homepageAttr)).toBe('https://acme.org');
    });

    it('should preserve attributes set on general type before replacement', () => {
      const pkg = new BasicEPackage();
      pkg.setName('foaf');
      pkg.setNsURI('http://xmlns.com/foaf/0.1/');
      pkg.setNsPrefix('foaf');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      const agentClass = new BasicEClass();
      agentClass.setName('Agent');
      agentClass.setEPackage(pkg);
      pkg.getEClassifiers().push(agentClass);

      const idAttr = new BasicEAttribute();
      idAttr.setName('id');
      idAttr.setEType(stringType);
      agentClass.getEStructuralFeatures().push(idAttr);

      const organizationClass = new BasicEClass();
      organizationClass.setName('Organization');
      organizationClass.setEPackage(pkg);
      organizationClass.getESuperTypes().push(agentClass);
      pkg.getEClassifiers().push(organizationClass);

      const mboxAttr = new BasicEAttribute();
      mboxAttr.setName('mbox');
      mboxAttr.setEType(stringType);
      organizationClass.getEStructuralFeatures().push(mboxAttr);

      const catalogClass = new BasicEClass();
      catalogClass.setName('Catalog');
      catalogClass.setEPackage(pkg);
      pkg.getEClassifiers().push(catalogClass);

      const publisherRef = new BasicEReference();
      publisherRef.setName('publisher');
      publisherRef.setEType(agentClass);
      publisherRef.setContainment(true);
      catalogClass.getEStructuralFeatures().push(publisherRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      // The outer <publisher> creates an Agent with id="42",
      // then <foaf:Organization> replaces it — id should be preserved
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<foaf:Catalog xmlns:foaf="http://xmlns.com/foaf/0.1/">
  <publisher id="42">
    <foaf:Organization mbox="info@acme.org"/>
  </publisher>
</foaf:Catalog>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const catalog = resource.getContents().get(0);
      const publisher = catalog.eGet(publisherRef);
      expect(publisher.eClass().getName()).toBe('Organization');
      // id from the old Agent should be preserved
      expect(publisher.eGet(idAttr)).toBe('42');
      // mbox from the Organization element
      expect(publisher.eGet(mboxAttr)).toBe('info@acme.org');
    });
  });

  describe('Cross-ecore proxy resolution (#54)', () => {
    it('should resolve cross-file eType proxy through ResourceSet', () => {
      // Load foaf.ecore
      const foafXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="foaf" nsURI="http://xmlns.com/foaf/0.1/" nsPrefix="foaf">
  <eClassifiers xsi:type="ecore:EClass" name="Agent">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

      const foafRes = new XMIResource(URI.createURI('foaf.ecore'));
      foafRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(foafRes);
      foafRes.loadFromString(foafXml);
      const foafPkg = foafRes.getContents().get(0) as any;
      resourceSet.getPackageRegistry().set(foafPkg.getNsURI(), foafPkg);

      // Load dcat.ecore that references foaf.ecore#//Agent
      const dcatXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="dcat" nsURI="http://www.w3.org/ns/dcat#" nsPrefix="dcat">
  <eClassifiers xsi:type="ecore:EClass" name="Dataset">
    <eStructuralFeatures xsi:type="ecore:EReference" name="publisher" eType="ecore:EClass foaf.ecore#//Agent" containment="true"/>
  </eClassifiers>
</ecore:EPackage>`;

      const dcatRes = new XMIResource(URI.createURI('dcat.ecore'));
      dcatRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(dcatRes);
      dcatRes.loadFromString(dcatXml);
      const dcatPkg = dcatRes.getContents().get(0) as any;

      const dataset = dcatPkg.getEClassifier('Dataset');
      expect(dataset).not.toBeNull();

      const publisherF = dataset.getEStructuralFeature('publisher');
      expect(publisherF).not.toBeNull();

      const pubType = publisherF.getEType();
      console.log('pubType:', pubType?.constructor?.name, 'name:', pubType?.getName?.(), 'isProxy:', pubType?.eIsProxy?.());

      // Should resolve to real Agent class, not a proxy
      expect(pubType).not.toBeNull();
      expect(pubType.getName()).toBe('Agent');
      if (typeof pubType.eIsProxy === 'function') {
        expect(pubType.eIsProxy()).toBe(false);
      }

      // Also verify getEAllStructuralFeatures works on resolved type
      expect(pubType.getEAllStructuralFeatures().length).toBeGreaterThan(0);
    });

    it('should resolve cross-ecore eSuperTypes proxy', () => {
      // rdf.ecore has Resource (abstract)
      const rdfXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="rdf" nsURI="http://www.w3.org/1999/02/22-rdf-syntax-ns#" nsPrefix="rdf">
  <eClassifiers xsi:type="ecore:EClass" name="Resource" abstract="true">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="about" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

      const rdfRes = new XMIResource(URI.createURI('rdf.ecore'));
      rdfRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(rdfRes);
      rdfRes.loadFromString(rdfXml);
      const rdfPkg = rdfRes.getContents().get(0) as any;
      resourceSet.getPackageRegistry().set(rdfPkg.getNsURI(), rdfPkg);

      // dcat.ecore has Distribution extends rdf:Resource
      const dcatXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="dcat" nsURI="http://www.w3.org/ns/dcat#" nsPrefix="dcat">
  <eClassifiers xsi:type="ecore:EClass" name="Distribution">
    <eSuperTypes href="rdf.ecore#//Resource"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="mediaType" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

      const dcatRes = new XMIResource(URI.createURI('dcat.ecore'));
      dcatRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(dcatRes);
      dcatRes.loadFromString(dcatXml);
      const dcatPkg = dcatRes.getContents().get(0) as any;

      const distribution = dcatPkg.getEClassifier('Distribution');
      expect(distribution).not.toBeNull();

      // eSuperTypes should resolve — Distribution should have 'about' from Resource
      const allFeatures = distribution.getEAllStructuralFeatures();
      const featureNames = allFeatures.map((f: any) => f.getName());
      console.log('Distribution features:', featureNames);

      expect(featureNames).toContain('mediaType');
      expect(featureNames).toContain('about'); // inherited from Resource
    });
  });

  describe('EMD feature lookup priority over classifier match (#55)', () => {
    it('should prefer EMD feature over classifier when names match', () => {
      // foaf:Agent wrapper class has feature "agent" with EMD name="Agent"
      const pkg = new BasicEPackage();
      pkg.setName('foaf');
      pkg.setNsURI('http://xmlns.com/foaf/0.1/');
      pkg.setNsPrefix('foaf');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      // AgentType — the concrete inner type
      const agentTypeClass = new BasicEClass();
      agentTypeClass.setName('AgentType');
      agentTypeClass.setEPackage(pkg);
      pkg.getEClassifiers().push(agentTypeClass);

      const nameAttr = new BasicEAttribute();
      nameAttr.setName('name');
      nameAttr.setEType(stringType);
      agentTypeClass.getEStructuralFeatures().push(nameAttr);

      // Agent — the wrapper class
      const agentClass = new BasicEClass();
      agentClass.setName('Agent');
      agentClass.setEPackage(pkg);
      pkg.getEClassifiers().push(agentClass);

      // Feature "agent" with EMD name="Agent" (same as class name!)
      const agentRef = new BasicEReference();
      agentRef.setName('agent');
      agentRef.setEType(agentTypeClass);
      agentRef.setContainment(true);
      addEMDAnnotation(agentRef, { kind: 'element', name: 'Agent', namespace: '##targetNamespace' });
      agentClass.getEStructuralFeatures().push(agentRef);

      // Container class
      const catalogClass = new BasicEClass();
      catalogClass.setName('Catalog');
      catalogClass.setEPackage(pkg);
      pkg.getEClassifiers().push(catalogClass);

      const publisherRef = new BasicEReference();
      publisherRef.setName('publisher');
      publisherRef.setEType(agentClass);
      publisherRef.setContainment(true);
      catalogClass.getEStructuralFeatures().push(publisherRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<foaf:Catalog xmlns:foaf="http://xmlns.com/foaf/0.1/">
  <publisher>
    <foaf:Agent>
      <foaf:name>Amt für Statistik</foaf:name>
    </foaf:Agent>
  </publisher>
</foaf:Catalog>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const catalog = resource.getContents().get(0);
      expect(catalog.eClass().getName()).toBe('Catalog');

      const publisher = catalog.eGet(publisherRef);
      expect(publisher).not.toBeNull();
      expect(publisher.eClass().getName()).toBe('Agent');

      // The inner <foaf:Agent> should have created an AgentType via the "agent" feature,
      // NOT replaced the Agent wrapper with another Agent
      const innerAgent = publisher.eGet(agentRef);
      expect(innerAgent).not.toBeNull();
      expect(innerAgent.eClass().getName()).toBe('AgentType');
      expect(innerAgent.eGet(nameAttr)).toBe('Amt für Statistik');
    });
  });

  describe('Cross-ecore proxy resolution with empty resource (#54)', () => {
    it('should resolve proxy when package is registered but resource contents are empty', () => {
      // Load foaf.ecore, register package, then CLEAR resource contents
      const foafXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="foaf" nsURI="http://xmlns.com/foaf/0.1/" nsPrefix="foaf">
  <eClassifiers xsi:type="ecore:EClass" name="Agent">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

      const foafRes = new XMIResource(URI.createURI('foaf.ecore'));
      foafRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(foafRes);
      foafRes.loadFromString(foafXml);

      // Register the package
      const foafPkg = foafRes.getContents().get(0) as any;
      resourceSet.getPackageRegistry().set(foafPkg.getNsURI(), foafPkg);

      // Simulate: clear resource contents (package is only in registry now)
      foafRes.getContents().clear();
      expect(foafRes.getContents().length).toBe(0);

      // Load dcat.ecore that references foaf.ecore#//Agent
      const dcatXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="dcat" nsURI="http://www.w3.org/ns/dcat#" nsPrefix="dcat">
  <eClassifiers xsi:type="ecore:EClass" name="Dataset">
    <eStructuralFeatures xsi:type="ecore:EReference" name="publisher" eType="ecore:EClass foaf.ecore#//Agent" containment="true"/>
  </eClassifiers>
</ecore:EPackage>`;

      const dcatRes = new XMIResource(URI.createURI('dcat.ecore'));
      dcatRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(dcatRes);
      dcatRes.loadFromString(dcatXml);
      const dcatPkg = dcatRes.getContents().get(0) as any;

      const dataset = dcatPkg.getEClassifier('Dataset');
      const publisherF = dataset.getEStructuralFeature('publisher');
      const pubType = publisherF.getEType();

      console.log('Empty resource proxy test - pubType:', pubType?.constructor?.name, 'name:', pubType?.getName?.());

      // Should resolve via package registry fallback
      expect(pubType).not.toBeNull();
      expect(pubType.getName()).toBe('Agent');
      if (typeof pubType.eIsProxy === 'function') {
        expect(pubType.eIsProxy()).toBe(false);
      }
      expect(pubType.getEAllStructuralFeatures().length).toBeGreaterThan(0);
    });
  });

  describe('##targetNamespace caching bug (#56)', () => {
    it('should not cache null when getEContainingClass is not yet set', () => {
      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const emd = new ExtendedMetaData();

      // Create feature with ##targetNamespace BEFORE setting containing class
      const conceptSchemeRef = new BasicEReference();
      conceptSchemeRef.setName('conceptScheme');
      conceptSchemeRef.setContainment(true);
      addEMDAnnotation(conceptSchemeRef, { kind: 'element', name: 'ConceptScheme', namespace: '##targetNamespace' });

      // Query namespace BEFORE eContainingClass is set
      const nsBefore = emd.getNamespace(conceptSchemeRef);
      expect(nsBefore).toBeNull(); // Can't resolve yet

      // Now set containing class and package
      const pkg = new BasicEPackage();
      pkg.setName('skos');
      pkg.setNsURI('http://www.w3.org/2004/02/skos/core#');
      pkg.setNsPrefix('skos');

      const wrapperClass = new BasicEClass();
      wrapperClass.setName('ConceptScheme');
      wrapperClass.setEPackage(pkg);
      wrapperClass.getEStructuralFeatures().push(conceptSchemeRef);

      // Query namespace AFTER eContainingClass is set — must NOT return cached null
      const nsAfter = emd.getNamespace(conceptSchemeRef);
      expect(nsAfter).toBe('http://www.w3.org/2004/02/skos/core#');
    });

    it('should load ConceptScheme wrapper pattern correctly', () => {
      const pkg = new BasicEPackage();
      pkg.setName('skos');
      pkg.setNsURI('http://www.w3.org/2004/02/skos/core#');
      pkg.setNsPrefix('skos');

      const factory = new BasicEFactory();
      factory.setEPackage(pkg);
      pkg.setEFactoryInstance(factory);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');
      stringType.setEPackage(pkg);
      pkg.getEClassifiers().push(stringType);

      // ConceptSchemeType (concrete inner type)
      const conceptSchemeTypeClass = new BasicEClass();
      conceptSchemeTypeClass.setName('ConceptSchemeType');
      conceptSchemeTypeClass.setEPackage(pkg);
      pkg.getEClassifiers().push(conceptSchemeTypeClass);

      const prefLabelAttr = new BasicEAttribute();
      prefLabelAttr.setName('prefLabel');
      prefLabelAttr.setEType(stringType);
      conceptSchemeTypeClass.getEStructuralFeatures().push(prefLabelAttr);

      // ConceptScheme (wrapper class)
      const conceptSchemeClass = new BasicEClass();
      conceptSchemeClass.setName('ConceptScheme');
      conceptSchemeClass.setEPackage(pkg);
      pkg.getEClassifiers().push(conceptSchemeClass);

      const csRef = new BasicEReference();
      csRef.setName('conceptScheme');
      csRef.setEType(conceptSchemeTypeClass);
      csRef.setContainment(true);
      addEMDAnnotation(csRef, { kind: 'element', name: 'ConceptScheme', namespace: '##targetNamespace' });
      conceptSchemeClass.getEStructuralFeatures().push(csRef);

      // Container
      const catalogClass = new BasicEClass();
      catalogClass.setName('Catalog');
      catalogClass.setEPackage(pkg);
      pkg.getEClassifiers().push(catalogClass);

      const taxonomyRef = new BasicEReference();
      taxonomyRef.setName('themeTaxonomy');
      taxonomyRef.setEType(conceptSchemeClass);
      taxonomyRef.setContainment(true);
      catalogClass.getEStructuralFeatures().push(taxonomyRef);

      resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<skos:Catalog xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <themeTaxonomy>
    <skos:ConceptScheme prefLabel="EU Data Theme"/>
  </themeTaxonomy>
</skos:Catalog>`;

      const resource = new XMIResource(URI.createURI('test.xmi'));
      resource.setResourceSet(resourceSet);

      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      resource.loadFromString(xml, options);

      const catalog = resource.getContents().get(0);
      const taxonomy = catalog.eGet(taxonomyRef);
      expect(taxonomy).not.toBeNull();
      expect(taxonomy.eClass().getName()).toBe('ConceptScheme');

      // Inner <skos:ConceptScheme> should have created a ConceptSchemeType
      const inner = taxonomy.eGet(csRef);
      expect(inner).not.toBeNull();
      expect(inner.eClass().getName()).toBe('ConceptSchemeType');
      expect(inner.eGet(prefLabelAttr)).toBe('EU Data Theme');
    });

    it('should work when model is loaded from ecore XML (not manually constructed)', () => {
      // Load the skos.ecore model from XML (simulating real-world usage)
      const skosEcoreXml = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="skos" nsURI="http://www.w3.org/2004/02/skos/core#" nsPrefix="skos">
  <eClassifiers xsi:type="ecore:EClass" name="ConceptSchemeType">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="prefLabel"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString">
      <eAnnotations source="http:///org/eclipse/emf/ecore/util/ExtendedMetaData">
        <details key="kind" value="element"/>
        <details key="name" value="prefLabel"/>
        <details key="namespace" value="##targetNamespace"/>
      </eAnnotations>
    </eStructuralFeatures>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="ConceptScheme">
    <eStructuralFeatures xsi:type="ecore:EReference" name="conceptScheme"
        eType="#//ConceptSchemeType" containment="true">
      <eAnnotations source="http:///org/eclipse/emf/ecore/util/ExtendedMetaData">
        <details key="kind" value="element"/>
        <details key="name" value="ConceptScheme"/>
        <details key="namespace" value="##targetNamespace"/>
      </eAnnotations>
    </eStructuralFeatures>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Catalog">
    <eStructuralFeatures xsi:type="ecore:EReference" name="themeTaxonomy"
        eType="#//ConceptScheme" containment="true"/>
  </eClassifiers>
</ecore:EPackage>`;

      const skosRes = new XMIResource(URI.createURI('skos.ecore'));
      skosRes.setResourceSet(resourceSet);
      (resourceSet.getResources() as any).push(skosRes);
      skosRes.loadFromString(skosEcoreXml);

      const skosPkg = skosRes.getContents().get(0) as any;
      resourceSet.getPackageRegistry().set(skosPkg.getNsURI(), skosPkg);

      // Verify model loaded correctly
      const csTypeClass = skosPkg.getEClassifier('ConceptSchemeType');
      const csClass = skosPkg.getEClassifier('ConceptScheme');
      const catalogClass = skosPkg.getEClassifier('Catalog');
      expect(csTypeClass).not.toBeNull();
      expect(csClass).not.toBeNull();
      expect(catalogClass).not.toBeNull();

      // Verify EMD annotations loaded
      const csRef = csClass.getEStructuralFeature('conceptScheme');
      expect(csRef).not.toBeNull();
      const loadedEmd = new ExtendedMetaData();
      const emdName = loadedEmd.getName(csRef);
      const emdNs = loadedEmd.getNamespace(csRef);

      // Now load instance XML
      const instanceXml = `<?xml version="1.0" encoding="UTF-8"?>
<skos:Catalog xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <themeTaxonomy>
    <skos:ConceptScheme>
      <skos:prefLabel>EU Data Theme</skos:prefLabel>
    </skos:ConceptScheme>
  </themeTaxonomy>
</skos:Catalog>`;

      const instanceRes = new XMIResource(URI.createURI('test-instance.xmi'));
      instanceRes.setResourceSet(resourceSet);
      const options = new Map<string, any>();
      options.set(OPTION_EXTENDED_META_DATA, true);
      instanceRes.loadFromString(instanceXml, options);

      const errors = instanceRes.getErrors();
      expect(errors.length).toBe(0);

      const catalog = instanceRes.getContents().get(0);
      expect(catalog).not.toBeNull();
      expect(catalog.eClass().getName()).toBe('Catalog');

      // Access features by name on dynamic instances (loaded feature objects differ from ecore model objects)
      const taxFeature = catalog.eClass().getEStructuralFeature('themeTaxonomy');
      const taxonomy = catalog.eGet(taxFeature!);
      expect(taxonomy).not.toBeNull();
      expect(taxonomy.eClass().getName()).toBe('ConceptScheme');

      // Critical: inner <skos:ConceptScheme> must create ConceptSchemeType via EMD wrapper
      const csFeature = taxonomy.eClass().getEStructuralFeature('conceptScheme');
      expect(csFeature).not.toBeNull();
      const inner = taxonomy.eGet(csFeature!);
      expect(inner).not.toBeNull();
      expect(inner.eClass().getName()).toBe('ConceptSchemeType');

      // prefLabel should be set on the ConceptSchemeType
      const prefLabelFeature = inner.eClass().getEStructuralFeature('prefLabel');
      expect(prefLabelFeature).not.toBeNull();
      expect(inner.eGet(prefLabelFeature!)).toBe('EU Data Theme');
    });
  });
});

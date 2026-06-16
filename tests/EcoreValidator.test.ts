import { describe, it, expect, beforeEach } from 'vitest';
import { BasicEPackage } from '../src/runtime/BasicEPackage';
import { BasicEClass } from '../src/runtime/BasicEClass';
import { BasicEFactory } from '../src/runtime/BasicEFactory';
import { BasicEAttribute } from '../src/runtime/BasicEAttribute';
import { BasicEDataType } from '../src/runtime/BasicEDataType';
import { BasicEReference } from '../src/runtime/BasicEReference';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { EcoreValidator } from '../src/ecore/EcoreValidator';
import { Diagnostician, EValidatorRegistry } from '../src/util/EValidator';
import { DiagnosticSeverity } from '../src/util/Diagnostic';
import { getEcorePackage, ECORE_NS_URI } from '../src/ecore/EcorePackage';
import { XMIResource } from '../src/xmi/XMLResource';
import { URI } from '../src/URI';

describe('EcoreValidator', () => {
  let resourceSet: BasicResourceSet;

  beforeEach(() => {
    resourceSet = new BasicResourceSet();
    const ecorePackage = getEcorePackage();
    resourceSet.getPackageRegistry().set(ecorePackage.getNsURI()!, ecorePackage);
    EValidatorRegistry.INSTANCE.setValidator(ECORE_NS_URI, EcoreValidator.INSTANCE);
  });

  describe('ConsistentOpposite', () => {
    it('should report error when both sides of eOpposite are containment', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const parentClass = new BasicEClass();
      parentClass.setName('Parent');
      pkg.getEClassifiers().push(parentClass);

      const childClass = new BasicEClass();
      childClass.setName('Child');
      pkg.getEClassifiers().push(childClass);

      const childrenRef = new BasicEReference();
      childrenRef.setName('children');
      childrenRef.setEType(childClass);
      childrenRef.setContainment(true);
      childrenRef.setUpperBound(-1);
      parentClass.getEStructuralFeatures().push(childrenRef);

      const parentRef = new BasicEReference();
      parentRef.setName('parent');
      parentRef.setEType(parentClass);
      parentRef.setContainment(true); // ERROR: both sides containment
      childClass.getEStructuralFeatures().push(parentRef);

      childrenRef.setEOpposite(parentRef);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes('opposite') && m.includes('containment'))).toBe(true);
    });

    it('should pass when opposite is not containment', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const parentClass = new BasicEClass();
      parentClass.setName('Parent');
      pkg.getEClassifiers().push(parentClass);

      const childClass = new BasicEClass();
      childClass.setName('Child');
      pkg.getEClassifiers().push(childClass);

      const childrenRef = new BasicEReference();
      childrenRef.setName('children');
      childrenRef.setEType(childClass);
      childrenRef.setContainment(true);
      childrenRef.setUpperBound(-1);
      parentClass.getEStructuralFeatures().push(childrenRef);

      const parentRef = new BasicEReference();
      parentRef.setName('parent');
      parentRef.setEType(parentClass);
      parentRef.setContainment(false); // correct
      childClass.getEStructuralFeatures().push(parentRef);

      childrenRef.setEOpposite(parentRef);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);
      const errors = flattenMessages(diagnostic).filter(m => m.includes('containment'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('UniqueFeatureNames', () => {
    it('should report error for duplicate feature names', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const cls = new BasicEClass();
      cls.setName('MyClass');
      pkg.getEClassifiers().push(cls);

      const stringType = new BasicEDataType();
      stringType.setName('EString');
      stringType.setInstanceClassName('string');

      const attr1 = new BasicEAttribute();
      attr1.setName('name');
      attr1.setEType(stringType);
      cls.getEStructuralFeatures().push(attr1);

      const attr2 = new BasicEAttribute();
      attr2.setName('name'); // duplicate
      attr2.setEType(stringType);
      cls.getEStructuralFeatures().push(attr2);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes("'name'") && m.includes('not unique'))).toBe(true);
    });
  });

  describe('UniqueClassifierNames', () => {
    it('should report error for duplicate classifier names in a package', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const cls1 = new BasicEClass();
      cls1.setName('Foo');
      pkg.getEClassifiers().push(cls1);

      const cls2 = new BasicEClass();
      cls2.setName('Foo'); // duplicate
      pkg.getEClassifiers().push(cls2);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes("'Foo'") && m.includes('not unique'))).toBe(true);
    });
  });

  describe('NoCircularSuperTypes', () => {
    it('should report error for circular inheritance', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const classA = new BasicEClass();
      classA.setName('A');
      pkg.getEClassifiers().push(classA);

      const classB = new BasicEClass();
      classB.setName('B');
      pkg.getEClassifiers().push(classB);

      classA.getESuperTypes().push(classB);
      classB.getESuperTypes().push(classA); // circular

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes('circular'))).toBe(true);
    });
  });

  describe('WellFormedNsURI', () => {
    it('should report error for empty nsURI', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('');
      pkg.setNsPrefix('test');

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes('nsURI') && m.includes('empty'))).toBe(true);
    });
  });

  describe('WellFormedNsPrefix', () => {
    it('should report error for nsPrefix containing colon', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('my:prefix');

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes("':'"))).toBe(true);
    });
  });

  describe('ConsistentBounds', () => {
    it('should report error when lowerBound > upperBound', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const cls = new BasicEClass();
      cls.setName('MyClass');
      pkg.getEClassifiers().push(cls);

      const stringType = new BasicEDataType();
      stringType.setName('EString');

      const attr = new BasicEAttribute();
      attr.setName('bad');
      attr.setEType(stringType);
      attr.setLowerBound(5);
      attr.setUpperBound(2); // lower > upper
      cls.getEStructuralFeatures().push(attr);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes('lower bound') && m.includes('upper bound'))).toBe(true);
    });

    it('should accept upperBound -1 (unbounded)', () => {
      const pkg = new BasicEPackage();
      pkg.setName('test');
      pkg.setNsURI('http://test');
      pkg.setNsPrefix('test');

      const cls = new BasicEClass();
      cls.setName('MyClass');
      pkg.getEClassifiers().push(cls);

      const stringType = new BasicEDataType();
      stringType.setName('EString');

      const attr = new BasicEAttribute();
      attr.setName('items');
      attr.setEType(stringType);
      attr.setLowerBound(1);
      attr.setUpperBound(-1); // unbounded — valid
      cls.getEStructuralFeatures().push(attr);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(pkg);

      const diagnostic = Diagnostician.INSTANCE.validate(pkg);

      const errors = flattenMessages(diagnostic).filter(m => m.includes('bound'));
      expect(errors).toHaveLength(0);
    });
  });

  describe('Diagnostician traversal', () => {
    it('should validate nested subpackages', () => {
      const rootPkg = new BasicEPackage();
      rootPkg.setName('root');
      rootPkg.setNsURI('http://root');
      rootPkg.setNsPrefix('root');

      const subPkg = new BasicEPackage();
      subPkg.setName('sub');
      subPkg.setNsURI(''); // invalid
      subPkg.setNsPrefix('sub');
      rootPkg.getESubpackages().push(subPkg);

      const resource = new XMIResource(URI.createURI('test.ecore'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(rootPkg);

      const diagnostic = Diagnostician.INSTANCE.validate(rootPkg);

      expect(diagnostic.getSeverity()).toBe(DiagnosticSeverity.ERROR);
      const allMessages = flattenMessages(diagnostic);
      expect(allMessages.some(m => m.includes("'sub'") && m.includes('nsURI'))).toBe(true);
    });
  });
});

function flattenMessages(diagnostic: { getMessage(): string; getChildren(): any[] }): string[] {
  const messages: string[] = [diagnostic.getMessage()];
  for (const child of diagnostic.getChildren()) {
    messages.push(...flattenMessages(child));
  }
  return messages;
}

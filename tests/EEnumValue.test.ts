/**
 * @fileoverview EEnum Value Tests - Enum-Werte in Instanzdaten (Issue #70)
 *
 * Testet, dass Enum-Attribute beim Laden zu EEnumLiteral aufgeloest und beim
 * Speichern als Literal-String geschrieben werden - konform zu Java EMF
 * (EFactoryImpl.createFromString / EEnumLiteralImpl.getLiteral).
 *
 * @module tests/EEnumValue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XMIResource } from '../src/xmi/XMLResource';
import { URI } from '../src/URI';
import { BasicResourceSet } from '../src/runtime/BasicResourceSet';
import { getEcorePackage, ECORE_NS_URI } from '../src/ecore/EcorePackage';
import { EPackage } from '../src/EPackage';
import { EClass } from '../src/EClass';
import { EEnum } from '../src/EEnum';
import { EObject } from '../src/EObject';

const NS = 'http://example.com/mymodel';

/**
 * Ecore mit einem EEnum, dessen zweites Literal ein vom Namen abweichendes
 * `literal` traegt - genau der Fall, den der getName()-Fallback falsch macht.
 */
const ECORE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" xmi:version="2.0"
    name="mymodel" nsURI="${NS}" nsPrefix="my">
  <eClassifiers xsi:type="ecore:EEnum" name="Color">
    <eLiterals name="RED"/>
    <eLiterals name="GREEN" value="1" literal="green_literal"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Item">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="color" eType="#//Color"/>
  </eClassifiers>
</ecore:EPackage>`;

describe('EEnum values in instance data (Issue #70)', () => {
  let resourceSet: BasicResourceSet;
  let modelPackage: EPackage;
  let itemClass: EClass;
  let colorEnum: EEnum;

  beforeEach(async () => {
    getEcorePackage();
    resourceSet = new BasicResourceSet();
    resourceSet.getPackageRegistry().set(ECORE_NS_URI, getEcorePackage());

    const ecoreResource = new XMIResource(URI.createURI('test://model.ecore'));
    ecoreResource.setResourceSet(resourceSet);
    await ecoreResource.loadFromString(ECORE_XML);

    modelPackage = ecoreResource.getContents()[0] as EPackage;
    resourceSet.getPackageRegistry().set(NS, modelPackage);

    itemClass = modelPackage.getEClassifier('Item') as EClass;
    colorEnum = modelPackage.getEClassifier('Color') as EEnum;
  });

  /**
   * Laedt eine Instanz mit dem gegebenen color-Wert.
   */
  async function loadResource(colorValue: string): Promise<XMIResource> {
    const resource = new XMIResource(URI.createURI('test://inst.xmi'));
    resource.setResourceSet(resourceSet);
    await resource.loadFromString(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<my:Item xmlns:xmi="http://www.omg.org/XMI" xmlns:my="${NS}" ` +
        `xmi:version="2.0" color="${colorValue}"/>`
    );
    return resource;
  }

  async function loadItem(colorValue: string): Promise<EObject> {
    return (await loadResource(colorValue)).getContents()[0];
  }

  function getColor(item: EObject): any {
    return item.eGet(item.eClass().getEStructuralFeature('color')!);
  }

  describe('getLiteral() name fallback', () => {
    it('falls back to the name when no literal attribute is set', () => {
      const red = colorEnum.getEEnumLiteral('RED')!;
      expect(red.getLiteral()).toBe('RED');
    });

    it('keeps an explicit literal that differs from the name', () => {
      const green = colorEnum.getEEnumLiteral('GREEN')!;
      expect(green.getName()).toBe('GREEN');
      expect(green.getLiteral()).toBe('green_literal');
    });

    it('resolves both literals via getEEnumLiteralByLiteral', () => {
      expect(colorEnum.getEEnumLiteralByLiteral('RED')?.getName()).toBe('RED');
      expect(colorEnum.getEEnumLiteralByLiteral('green_literal')?.getName()).toBe('GREEN');
    });
  });

  describe('load', () => {
    it('resolves a literal without an explicit literal attribute', async () => {
      const value = getColor(await loadItem('RED'));
      expect(typeof value).toBe('object');
      expect(value.getName()).toBe('RED');
      expect(value.getValue()).toBe(0);
    });

    it('resolves an explicit literal to its EEnumLiteral', async () => {
      const value = getColor(await loadItem('green_literal'));
      expect(typeof value).toBe('object');
      expect(value.getName()).toBe('GREEN');
      expect(value.getValue()).toBe(1);
    });

    it('accepts the name when the enum declares a different literal', async () => {
      const value = getColor(await loadItem('GREEN'));
      expect(value.getName()).toBe('GREEN');
      expect(value.getValue()).toBe(1);
    });

    it('accepts an ordinal value', async () => {
      const value = getColor(await loadItem('1'));
      expect(value.getName()).toBe('GREEN');
      expect(value.getValue()).toBe(1);
    });

    it('rejects an ordinal outside the enum', async () => {
      const resource = await loadResource('7');
      expect(getColor(resource.getContents()[0]) ?? null).toBeNull();
      expect(resource.getErrors()).toHaveLength(1);
    });

    it('reports an unknown value instead of accepting it silently', async () => {
      const resource = await loadResource('PURPLE');
      const errors = resource.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(
        /The value 'PURPLE' is not a valid enumerator of 'Color'/
      );
    });

    it('keeps loading after an invalid value, leaving the feature unset', async () => {
      const resource = await loadResource('PURPLE');
      const item = resource.getContents()[0];
      expect(item).toBeDefined();
      expect(item.eClass().getName()).toBe('Item');
      expect(getColor(item) ?? null).toBeNull();
    });
  });

  describe('save', () => {
    /**
     * Speichert eine frisch erzeugte Item-Instanz mit dem gegebenen Farbwert.
     */
    async function saveWithColor(colorValue: any): Promise<string> {
      const factory = modelPackage.getEFactoryInstance()!;
      const item = factory.create(itemClass);
      item.eSet(itemClass.getEStructuralFeature('color')!, colorValue);

      const resource = new XMIResource(URI.createURI('test://out.xmi'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(item);
      return resource.saveToString();
    }

    it('writes the literal, not the name', async () => {
      const green = colorEnum.getEEnumLiteral('GREEN')!;
      const xml = await saveWithColor(green);
      expect(xml).toContain('color="green_literal"');
      expect(xml).not.toContain('color="GREEN"');
    });

    it('writes the name when it doubles as the literal', async () => {
      const red = colorEnum.getEEnumLiteral('RED')!;
      const xml = await saveWithColor(red);
      expect(xml).toContain('color="RED"');
    });
  });

  describe('round-trip', () => {
    it('preserves an explicit literal through load and save', async () => {
      const item = await loadItem('green_literal');

      const resource = new XMIResource(URI.createURI('test://roundtrip.xmi'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(item);
      const xml = await resource.saveToString();

      expect(xml).toContain('color="green_literal"');
    });

    it('normalizes an ordinal to the literal on save', async () => {
      const item = await loadItem('1');

      const resource = new XMIResource(URI.createURI('test://roundtrip.xmi'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(item);
      const xml = await resource.saveToString();

      expect(xml).toContain('color="green_literal"');
      expect(xml).not.toContain('color="1"');
    });

    it('preserves a name-only literal through load and save', async () => {
      const item = await loadItem('RED');

      const resource = new XMIResource(URI.createURI('test://roundtrip.xmi'));
      resource.setResourceSet(resourceSet);
      resource.getContents().push(item);
      const xml = await resource.saveToString();

      expect(xml).toContain('color="RED"');
    });
  });
});

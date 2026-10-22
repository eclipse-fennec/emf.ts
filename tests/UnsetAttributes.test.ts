/**
 * @fileoverview Attributes that were never set stay out of the document (#123)
 *
 * The counterpart to #95. That fix stopped the serializer from dropping
 * explicitly set defaults, by comparing the value against the default before
 * asking eIsSet(). The comparison was a workaround for the Ecore metaclasses,
 * whose eIsSet() reported false for a name assigned through setName() - and it
 * made every other object write attributes nobody had set: rows="4" because
 * the generated field and getDefaultValue() disagreed on the type, name=""
 * because a generated EString field starts empty, and an enum value because
 * BasicEEnum had no default at all.
 *
 * shouldSaveAttribute() follows Java now (eIsSet || keepDefaults && literal),
 * which only works because the metaclasses answer eIsSet() themselves.
 *
 * @module tests/UnsetAttributes
 */
import { describe, it, expect } from 'vitest';
import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEEnum,
  BasicEEnumLiteral,
  EcoreDataTypes,
} from '../src';
import { BasicEObject } from '../src/runtime/BasicEObject.js';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { OPTION_KEEP_DEFAULT_CONTENT } from '../src/xmi/index.js';
import type { EStructuralFeature } from '../src/EStructuralFeature.js';

/**
 * Stands in for generated code: typed fields that start at their initializer,
 * and an eIsSet() that reports what was actually assigned - exactly what
 * emfts-codegen emits.
 */
class WidgetImpl extends BasicEObject {
  private rows = 4;
  private label = '';
  private layout: unknown = 'VERTICAL';
  private assigned = new Set<string>();

  constructor(private readonly klass: BasicEClass) {
    super();
  }

  override eClass(): any {
    return this.klass;
  }

  override eGet(feature: EStructuralFeature): any {
    switch (feature.getName()) {
      case 'rows':
        return this.rows;
      case 'label':
        return this.label;
      case 'layout':
        return this.layout;
    }
    return super.eGet(feature);
  }

  override eSet(feature: EStructuralFeature, value: any): void {
    const name = feature.getName()!;
    switch (name) {
      case 'rows':
        this.rows = value;
        break;
      case 'label':
        this.label = value;
        break;
      case 'layout':
        this.layout = value;
        break;
      default:
        super.eSet(feature, value);
        return;
    }
    this.assigned.add(name);
  }

  override eIsSet(feature: EStructuralFeature): boolean {
    const name = feature.getName()!;
    if (name === 'rows' || name === 'label' || name === 'layout') {
      return this.assigned.has(name);
    }
    return super.eIsSet(feature);
  }
}

/** A package with an enum and a widget class, plus a resource to save into. */
function fixture(testId: string) {
  const pkg = new BasicEPackage();
  pkg.setName('ui');
  pkg.setNsURI(`http://test.unset/${testId}`);
  pkg.setNsPrefix('ui');

  const layoutType = new BasicEEnum();
  layoutType.setName('LayoutType');
  ['VERTICAL', 'HORIZONTAL'].forEach((name, index) => {
    const literal = new BasicEEnumLiteral();
    literal.setName(name);
    literal.setValue(index);
    layoutType.getELiterals().add(literal);
  });
  pkg.getEClassifiers().add(layoutType);

  const widget = new BasicEClass();
  widget.setName('Widget');
  const attribute = (name: string, type: any, literal?: string) => {
    const attr = new BasicEAttribute();
    attr.setName(name);
    attr.setEType(type);
    if (literal !== undefined) {
      attr.setDefaultValueLiteral(literal);
    }
    widget.getEStructuralFeatures().add(attr);
    return attr;
  };
  const features = {
    rows: attribute('rows', EcoreDataTypes.EInt, '4'),
    label: attribute('label', EcoreDataTypes.EString),
    layout: attribute('layout', layoutType),
  };
  pkg.getEClassifiers().add(widget);

  const resourceSet = new EResourceSetImpl();
  resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

  let counter = 0;
  return {
    pkg,
    layoutType,
    widget,
    features,
    /** Saves one widget and returns the element line. */
    save(build: (obj: WidgetImpl) => void = () => {}, options?: Map<string, any>) {
      const obj = new WidgetImpl(widget);
      build(obj);
      const resource = resourceSet.createResource(URI.createURI(`${testId}-${counter++}.xmi`));
      resource.getContents().add(obj);
      const xmi = (resource as any).saveToString(options);
      return xmi.split('\n').find((line: string) => line.includes('Widget')) ?? '';
    },
  };
}

describe('Nothing set, nothing written (#123)', () => {
  it.each([
    ['a numeric attribute with a default literal', 'rows'],
    ['a string attribute, initialized empty', 'label'],
    ['an enum attribute', 'layout'],
  ])('should not write %s', (_label, name) => {
    const line = fixture(`none-${name}`).save();

    expect(line).not.toContain(`${name}=`);
  });

  it('should write the element with no attributes at all', () => {
    const line = fixture('empty').save();

    expect(line).toMatch(/<ui:Widget[^>]*\/>/);
    expect(line).not.toContain('rows=');
    expect(line).not.toContain('label=');
    expect(line).not.toContain('layout=');
  });
});

describe('Explicitly set values still survive (#95 must keep holding)', () => {
  it.each([
    ['a value equal to the default literal', (f: any, obj: any) => obj.eSet(f.features.rows, 4), 'rows="4"'],
    ['an empty string', (f: any, obj: any) => obj.eSet(f.features.label, ''), 'label=""'],
    ['the first enum literal', (f: any, obj: any) => obj.eSet(f.features.layout, 'VERTICAL'), 'layout="VERTICAL"'],
    ['a non-default value', (f: any, obj: any) => obj.eSet(f.features.rows, 7), 'rows="7"'],
  ])('should write %s', (_label, build, expected) => {
    const f = fixture(`set-${expected.replace(/\W/g, '')}`);

    expect(f.save(obj => build(f, obj))).toContain(expected);
  });

  it('should still honour OPTION_KEEP_DEFAULT_CONTENT', () => {
    const f = fixture('keep');
    const options = new Map<string, any>([[OPTION_KEEP_DEFAULT_CONTENT, true]]);

    expect(f.save(() => {}, options)).toContain('rows="4"');
  });
});

describe('The Ecore metaclasses answer eIsSet themselves (#123)', () => {
  /**
   * The reason the value comparison was in front of eIsSet(). Without an
   * eIsSet() of their own these classes lose everything assigned through a
   * typed setter - and no test covered it, which is how #95 shipped.
   */
  it('should keep name, nsURI and abstract of a hand-built metamodel', () => {
    const pkg = new BasicEPackage();
    pkg.setName('p');
    pkg.setNsURI('http://test.unset/meta');
    pkg.setNsPrefix('p');
    const eClass = new BasicEClass();
    eClass.setName('Thing');
    eClass.setAbstract(true);
    const attr = new BasicEAttribute();
    attr.setName('wert');
    attr.setEType(EcoreDataTypes.EString);
    eClass.getEStructuralFeatures().add(attr);
    pkg.getEClassifiers().add(eClass);

    const resource = new EResourceSetImpl().createResource(URI.createURI('meta.ecore'));
    resource.getContents().add(pkg);
    const xmi = (resource as any).saveToString();

    expect(xmi).toContain('nsURI="http://test.unset/meta"');
    expect(xmi).toContain('name="Thing"');
    expect(xmi).toContain('abstract="true"');
    expect(xmi).toContain('name="wert"');
  });

  it.each([
    ['an assigned name', (c: BasicEClass) => c.setName('Thing'), 'name', true],
    ['a name never assigned', () => {}, 'name', false],
    ['abstract set to true', (c: BasicEClass) => c.setAbstract(true), 'abstract', true],
    ['abstract left at its default', (c: BasicEClass) => c.setAbstract(false), 'abstract', false],
  ])('should report %s', (_label, build, feature, expected) => {
    const eClass = new BasicEClass();
    build(eClass);

    expect(eClass.eIsSet(eClass.eClass().getEStructuralFeature(feature)!)).toBe(expected);
  });

  it('should report a list as set only while it holds something', () => {
    const eClass = new BasicEClass();
    const feature = eClass.eClass().getEStructuralFeature('eStructuralFeatures')!;
    expect(eClass.eIsSet(feature)).toBe(false);

    const attr = new BasicEAttribute();
    attr.setName('wert');
    eClass.getEStructuralFeatures().add(attr);

    expect(eClass.eIsSet(feature)).toBe(true);
  });
});

describe('BasicEEnum has a default value (#123)', () => {
  it('should return the first literal', () => {
    const f = fixture('enumdefault');

    expect(String(f.layoutType.getDefaultValue())).toBe('VERTICAL');
  });

  it('should return null for an enum without literals', () => {
    const empty = new BasicEEnum();
    empty.setName('Leer');

    expect(empty.getDefaultValue()).toBeNull();
  });

  it('should make an enum attribute report that default', () => {
    const f = fixture('enumattr');

    expect(String(f.features.layout.getDefaultValue())).toBe('VERTICAL');
  });
});

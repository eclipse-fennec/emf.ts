/**
 * @fileoverview Relative cross-document references (#93)
 *
 * A reference may name its target relative to the document it appears in
 * (`payment.xmi#/`), which only means something together with that document's
 * own URI. resolveReference() handed the base part to the ResourceSet unchanged,
 * so the lookup missed the resource held under its absolute URI and - with
 * loadOnDemand - created an empty one under the relative name. The reference
 * then did not fail: it came back pointing at the wrong object, and saving wrote
 * that state into the file.
 *
 * Writing deresolves against the current document for the same reason: an
 * absolute URI in the output would carry the author's filesystem path.
 *
 * @module tests/RelativeHref
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { Resource } from '../src/Resource.js';
import type { EList } from '../src/EList.js';
import type { EObject } from '../src/EObject.js';

const NS_URI = 'http://test.relhref/model';
const BASE = '/virtual/relhref/';

const MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="m" nsURI="${NS_URI}" nsPrefix="m">
  <eClassifiers xsi:type="ecore:EClass" name="Target">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Binding">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="name"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="targets" upperBound="-1"
        eType="#//Target"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="single" eType="#//Target"/>
  </eClassifiers>
</ecore:EPackage>`;

const TARGET_A = `<?xml version="1.0" encoding="UTF-8"?>
<m:Target xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:m="${NS_URI}" name="Alpha"/>`;

const TARGET_B = `<?xml version="1.0" encoding="UTF-8"?>
<m:Target xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:m="${NS_URI}" name="Beta"/>`;

/** References both targets by relative file name, as EMF writes them. */
const BINDING = `<?xml version="1.0" encoding="UTF-8"?>
<m:Binding xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:m="${NS_URI}" name="TheBinding">
  <targets href="a.xmi#/"/>
  <targets href="b.xmi#/"/>
  <single href="a.xmi#/"/>
</m:Binding>`;

describe('Relative cross-document references (#93)', () => {
  let resourceSet: EResourceSetImpl;
  let pkg: EPackage;
  let binding: Resource;

  const feature = (name: string) =>
    (pkg.getEClassifier('Binding') as EClass).getEStructuralFeature(name)!;
  const nameOf = (object: EObject) =>
    object.eGet((pkg.getEClassifier('Target') as EClass).getEStructuralFeature('name')!);

  beforeEach(() => {
    resourceSet = new EResourceSetImpl();
    const metaResource = resourceSet.createResource(URI.createURI(BASE + 'model.ecore'));
    (metaResource as any).loadFromString(MODEL);
    pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(NS_URI, pkg);
    resourceSet.getPackageRegistry().set(NS_URI, pkg);

    const a = resourceSet.createResource(URI.createURI(BASE + 'a.xmi'));
    (a as any).loadFromString(TARGET_A);
    const b = resourceSet.createResource(URI.createURI(BASE + 'b.xmi'));
    (b as any).loadFromString(TARGET_B);

    binding = resourceSet.createResource(URI.createURI(BASE + 'binding.xmi'));
    (binding as any).loadFromString(BINDING);
  });

  describe('loading', () => {
    it('should resolve a multi-valued reference to the right documents', () => {
      // Previously both came back as the binding's own root.
      const targets = binding.getContents().get(0).eGet(feature('targets')) as EList<EObject>;

      expect(targets.size()).toBe(2);
      expect(nameOf(targets.get(0))).toBe('Alpha');
      expect(nameOf(targets.get(1))).toBe('Beta');
    });

    it('should resolve a single-valued reference too', () => {
      const single = binding.getContents().get(0).eGet(feature('single')) as EObject;

      expect(nameOf(single)).toBe('Alpha');
    });

    it('should not point at something inside the referencing document', () => {
      // The failure mode was silent: a plausible object, but the wrong one.
      const targets = binding.getContents().get(0).eGet(feature('targets')) as EList<EObject>;

      expect(targets.get(0)).not.toBe(binding.getContents().get(0));
      expect(targets.get(1)).not.toBe(binding.getContents().get(0));
    });

    it('should load without errors', () => {
      expect(binding.getErrors()).toHaveLength(0);
    });
  });

  describe('writing', () => {
    it('should write the reference relative, not as an absolute path', () => {
      const xmi = (binding as any).saveToString();

      expect(xmi).not.toContain(BASE);
      expect(xmi).toMatch(/href="a\.xmi#/);
      expect(xmi).toMatch(/href="b\.xmi#/);
    });

    it('should survive a round trip with the targets intact', () => {
      const xmi = (binding as any).saveToString();
      const reloaded = resourceSet.createResource(URI.createURI(BASE + 'binding-2.xmi'));
      (reloaded as any).loadFromString(xmi);

      expect(reloaded.getErrors()).toHaveLength(0);
      const targets = reloaded.getContents().get(0).eGet(feature('targets')) as EList<EObject>;
      expect(targets.map(t => nameOf(t))).toEqual(['Alpha', 'Beta']);
    });
  });

  describe('absolute references keep working', () => {
    it('should resolve a reference that carries a full URI', () => {
      const absolute = resourceSet.createResource(URI.createURI(BASE + 'absolute.xmi'));
      (absolute as any).loadFromString(`<?xml version="1.0" encoding="UTF-8"?>
<m:Binding xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:m="${NS_URI}" name="Abs">
  <single href="${BASE}a.xmi#/"/>
</m:Binding>`);

      const single = absolute.getContents().get(0).eGet(feature('single')) as EObject;

      expect(nameOf(single)).toBe('Alpha');
    });
  });
});

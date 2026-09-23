/**
 * @fileoverview Multi-valued reference attributes in "Type URI" form (#101)
 *
 * EMF writes a reference attribute whose target needs a type as
 * `Type URI Type URI ...`. Splitting that on whitespace alone turns every type
 * token into a reference of its own, and since it carries no `#` it ends up as
 * a proxy into this very resource: a plausible-looking entry pointing nowhere,
 * which saving then writes back into the file.
 *
 * XMLHandler.setValueFromId() in Java EMF reads the tokens pairwise - a token
 * with a `:` and no `#` names the type of the token after it. The single-valued
 * path never had the problem, because createProxy() cuts the type off itself.
 *
 * @module tests/TypedMultiReference
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EObject } from '../src/EObject.js';
import type { EPackage } from '../src/EPackage.js';
import type { EList } from '../src/EList.js';

const DOMAIN = 'http://test.typedref/domain';
const MAPPING = 'http://test.typedref/mapping';

const DOMAIN_ECORE = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="domain" nsURI="${DOMAIN}" nsPrefix="d">
  <eClassifiers xsi:type="ecore:EClass" name="WaterQuality">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="ph"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EDouble"/>
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="temp"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EDouble"/>
  </eClassifiers>
</ecore:EPackage>`;

const MAPPING_ECORE = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="mapping" nsURI="${MAPPING}" nsPrefix="m">
  <eClassifiers xsi:type="ecore:EClass" name="Mapping">
    <eStructuralFeatures xsi:type="ecore:EReference" name="resources" upperBound="-1"
        containment="true" eType="#//Res"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Res">
    <eStructuralFeatures xsi:type="ecore:EReference" name="valueFeature" upperBound="-1"
        eType="ecore:EClass http://www.eclipse.org/emf/2002/Ecore#//EStructuralFeature"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="single"
        eType="ecore:EClass http://www.eclipse.org/emf/2002/Ecore#//EStructuralFeature"/>
  </eClassifiers>
</ecore:EPackage>`;

interface Fixture {
  /** Loads one <resources/> element with the given attributes and returns it. */
  load(attributes: string): { resource: any; res: EObject };
  /** Reads a document back into the same resource set, where the metamodels are. */
  reload(xmi: string): EObject;
}

function fixture(testId: string): Fixture {
  const resourceSet = new EResourceSetImpl();
  for (const [uri, source] of [
    [`${testId}-domain.ecore`, DOMAIN_ECORE],
    [`${testId}-mapping.ecore`, MAPPING_ECORE],
  ] as const) {
    const metaResource = resourceSet.createResource(URI.createURI(uri));
    (metaResource as any).loadFromString(source);
    const pkg = metaResource.getContents().get(0) as EPackage;
    EPackageRegistry.INSTANCE.set(pkg.getNsURI()!, pkg);
    resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);
  }

  let counter = 0;
  return {
    load(attributes: string) {
      const resource = resourceSet.createResource(
        URI.createURI(`${testId}-${counter++}.xmi`)
      );
      (resource as any).loadFromString(`<?xml version="1.0" encoding="UTF-8"?>
<m:Mapping xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0" xmlns:m="${MAPPING}"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore">
  <resources ${attributes}/>
</m:Mapping>`);
      const root = resource.getContents().get(0);
      const resources = root.eGet(root.eClass().getEStructuralFeature('resources')!) as EList<EObject>;
      return { resource, res: resources.get(0) };
    },
    reload(xmi: string) {
      const resource = resourceSet.createResource(
        URI.createURI(`${testId}-back-${counter++}.xmi`)
      );
      (resource as any).loadFromString(xmi);
      const root = resource.getContents().get(0);
      const resources = root.eGet(root.eClass().getEStructuralFeature('resources')!) as EList<EObject>;
      return resources.get(0);
    },
  };
}

/** The names of what a multi-valued feature holds, proxies marked as such. */
function names(res: EObject, featureName: string): string[] {
  const value = res.eGet(res.eClass().getEStructuralFeature(featureName)!) as EList<any>;
  return [...value].map(entry =>
    entry?.eIsProxy?.() ? `PROXY(${entry.eProxyURI?.()})` : entry?.getName?.()
  );
}

describe('A typed multi-valued reference attribute (#101)', () => {
  it('should read one type/URI pair as one reference', () => {
    const { res } = fixture('one').load(
      `valueFeature="ecore:EAttribute ${DOMAIN}#//WaterQuality/ph"`
    );

    expect(names(res, 'valueFeature')).toEqual(['ph']);
  });

  it('should read several pairs in order', () => {
    const { res } = fixture('several').load(
      `valueFeature="ecore:EAttribute ${DOMAIN}#//WaterQuality/ph ecore:EAttribute ${DOMAIN}#//WaterQuality/temp"`
    );

    expect(names(res, 'valueFeature')).toEqual(['ph', 'temp']);
  });

  it('should not invent a reference into its own resource', () => {
    // The type token used to become `<this-resource>#ecore:EAttribute`.
    const { res } = fixture('noself').load(
      `valueFeature="ecore:EAttribute ${DOMAIN}#//WaterQuality/ph"`
    );

    expect(names(res, 'valueFeature').some(name => String(name).startsWith('PROXY'))).toBe(false);
  });

  it('should report no errors', () => {
    const { resource } = fixture('errors').load(
      `valueFeature="ecore:EAttribute ${DOMAIN}#//WaterQuality/ph"`
    );

    expect(resource.getErrors()).toHaveLength(0);
  });

  it('should leave the single-valued form working', () => {
    const { res } = fixture('single').load(
      `single="ecore:EAttribute ${DOMAIN}#//WaterQuality/ph"`
    );
    const value = res.eGet(res.eClass().getEStructuralFeature('single')!) as any;

    expect(value?.getName?.()).toBe('ph');
  });
});

describe('Forms without a type token are unchanged (#101)', () => {
  it('should read plain URIs', () => {
    const { res } = fixture('plain').load(
      `valueFeature="${DOMAIN}#//WaterQuality/ph ${DOMAIN}#//WaterQuality/temp"`
    );

    expect(names(res, 'valueFeature')).toEqual(['ph', 'temp']);
  });

  it('should read a mix of typed and untyped entries', () => {
    const { res } = fixture('mixed').load(
      `valueFeature="${DOMAIN}#//WaterQuality/ph ecore:EAttribute ${DOMAIN}#//WaterQuality/temp"`
    );

    expect(names(res, 'valueFeature')).toEqual(['ph', 'temp']);
  });
});

describe('The document survives a round trip (#101)', () => {
  it('should write one href element per reference and read them back', () => {
    const f = fixture('roundtrip');
    const { resource } = f.load(
      `valueFeature="ecore:EAttribute ${DOMAIN}#//WaterQuality/ph ecore:EAttribute ${DOMAIN}#//WaterQuality/temp"`
    );

    const xmi = (resource as any).saveToString();

    expect(xmi.match(/<valueFeature /g) ?? []).toHaveLength(2);
    expect(xmi).not.toContain('#ecore:EAttribute');

    expect(names(f.reload(xmi), 'valueFeature')).toEqual(['ph', 'temp']);
  });
});

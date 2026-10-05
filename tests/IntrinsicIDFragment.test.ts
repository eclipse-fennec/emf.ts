/**
 * @fileoverview References through an ID attribute (#117, #84)
 *
 * An `iD="true"` attribute declares the lasting name of an object. EMF writes
 * a same-resource reference as that ID; this port always wrote the containment
 * path, so a reference pointed at a position rather than at an object.
 *
 * That breaks silently: insert an element and the old path still loads, now
 * naming something else. It also makes diffs unreadable, which is half the
 * reason for declaring an ID.
 *
 * ResourceImpl.getURIFragment() asks EcoreUtil.getID() before it builds any
 * path, and with supportIDRelativeURIFragmentPaths() the path may be anchored
 * at the nearest container that has one: /?<id>/@feature.0
 *
 * @module tests/IntrinsicIDFragment
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { EPackageRegistry } from '../src/EPackage.js';
import type { EClass } from '../src/EClass.js';
import type { EPackage } from '../src/EPackage.js';
import type { EObject } from '../src/EObject.js';
import type { EList } from '../src/EList.js';

const ECORE_TYPE = 'ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#/';

/** A model with an ID-carrying Asset, a Port without one, and a numeric-ID Tag. */
function metamodel(nsURI: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="inv" nsURI="${nsURI}" nsPrefix="inv">
  <eClassifiers xsi:type="ecore:EClass" name="Port">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="nr" eType="${ECORE_TYPE}/EInt"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Tag">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="nr" iD="true" eType="${ECORE_TYPE}/EInt"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Asset">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="id" iD="true" eType="${ECORE_TYPE}/EString"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="ports" upperBound="-1"
        containment="true" eType="#//Port"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="dependsOn" eType="#//Asset"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="viaPort" eType="#//Port"/>
  </eClassifiers>
  <eClassifiers xsi:type="ecore:EClass" name="Inventory">
    <eStructuralFeatures xsi:type="ecore:EReference" name="assets" upperBound="-1"
        containment="true" eType="#//Asset"/>
    <eStructuralFeatures xsi:type="ecore:EReference" name="tags" upperBound="-1"
        containment="true" eType="#//Tag"/>
  </eClassifiers>
</ecore:EPackage>`;
}

function fixture(testId: string) {
  const nsURI = `http://test.intrinsicid/${testId}`;
  const resourceSet = new EResourceSetImpl();
  const metaResource = resourceSet.createResource(URI.createURI(`${testId}.ecore`));
  (metaResource as any).loadFromString(metamodel(nsURI));

  const pkg = metaResource.getContents().get(0) as EPackage;
  EPackageRegistry.INSTANCE.set(nsURI, pkg);
  resourceSet.getPackageRegistry().set(nsURI, pkg);

  const classOf = (name: string) => pkg.getEClassifier(name) as EClass;
  const factory = pkg.getEFactoryInstance();
  const feature = (eClass: string, name: string) => classOf(eClass).getEStructuralFeature(name)!;

  const inventory = factory.create(classOf('Inventory'));
  const resource = resourceSet.createResource(URI.createURI(`${testId}.xmi`));
  resource.getContents().add(inventory);

  /** Adds an asset with the given id, in order. */
  const addAsset = (id: string | null) => {
    const asset = factory.create(classOf('Asset'));
    if (id !== null) {
      asset.eSet(feature('Asset', 'id'), id);
    }
    (inventory.eGet(feature('Inventory', 'assets')) as EList<EObject>).add(asset);
    return asset;
  };

  const addPort = (asset: EObject, nr: number) => {
    const port = factory.create(classOf('Port'));
    port.eSet(feature('Port', 'nr'), nr);
    (asset.eGet(feature('Asset', 'ports')) as EList<EObject>).add(port);
    return port;
  };

  const addTag = (nr: number) => {
    const tag = factory.create(classOf('Tag'));
    tag.eSet(feature('Tag', 'nr'), nr);
    (inventory.eGet(feature('Inventory', 'tags')) as EList<EObject>).add(tag);
    return tag;
  };

  return { resourceSet, resource: resource as any, inventory, feature, addAsset, addPort, addTag };
}

describe('An object with an ID is addressed by it (#117)', () => {
  it('should use the ID as the fragment', () => {
    const f = fixture('fragment');
    const db = f.addAsset('mac-postgres');

    expect(f.resource.getURIFragment(db)).toBe('mac-postgres');
  });

  it('should write a reference as that ID', () => {
    const f = fixture('reference');
    const db = f.addAsset('mac-postgres');
    const app = f.addAsset('mac-apisix');
    app.eSet(f.feature('Asset', 'dependsOn'), db);

    expect(f.resource.saveToString()).toContain('dependsOn="mac-postgres"');
  });

  it('should convert a non-string ID', () => {
    const f = fixture('numeric');
    const tag = f.addTag(42);

    expect(f.resource.getURIFragment(tag)).toBe('42');
  });

  it('should read the ID form back', () => {
    const f = fixture('roundtrip');
    const db = f.addAsset('mac-postgres');
    const app = f.addAsset('mac-apisix');
    app.eSet(f.feature('Asset', 'dependsOn'), db);

    const back = f.resourceSet.createResource(URI.createURI('roundtrip-back.xmi'));
    (back as any).loadFromString(f.resource.saveToString());
    const assets = back.getContents().get(0).eGet(f.feature('Inventory', 'assets')) as EList<EObject>;
    const target = assets.get(1).eGet(f.feature('Asset', 'dependsOn')) as EObject;

    expect(back.getErrors()).toHaveLength(0);
    expect(target.eGet(f.feature('Asset', 'id'))).toBe('mac-postgres');
  });

  it('should keep pointing at the same object after an insertion', () => {
    // The point of the whole issue: a positional path names something else
    // once the list changes, and does so without any error.
    const first = fixture('stable-1');
    const db = first.addAsset('db');
    const app = first.addAsset('app');
    app.eSet(first.feature('Asset', 'dependsOn'), db);
    const reference = first.resource.saveToString().match(/dependsOn="([^"]*)"/)![1];

    const second = fixture('stable-2');
    second.addAsset('cache'); // inserted ahead of everything
    second.addAsset('db');
    second.addAsset('app');
    const document = second.resource
      .saveToString()
      .replace(/dependsOn="[^"]*"/, `dependsOn="${reference}"`)
      .replace('<assets id="app"/>', `<assets id="app" dependsOn="${reference}"/>`);

    const back = second.resourceSet.createResource(URI.createURI('stable-back.xmi'));
    (back as any).loadFromString(document);
    const assets = back.getContents().get(0).eGet(second.feature('Inventory', 'assets')) as EList<EObject>;
    const target = assets.get(2).eGet(second.feature('Asset', 'dependsOn')) as EObject;

    expect(reference).toBe('db');
    expect(target?.eGet(second.feature('Asset', 'id'))).toBe('db');
  });
});

describe('Without an ID the path is unchanged (#117)', () => {
  it('should build a path for a class that declares no ID attribute', () => {
    const f = fixture('noid');
    const db = f.addAsset('mac-postgres');
    const port = f.addPort(db, 5432);

    expect(f.resource.getURIFragment(port)).toBe('//@assets.0/@ports.0');
  });

  it('should build a path where the ID attribute is unset', () => {
    const f = fixture('unset');
    const asset = f.addAsset(null);

    expect(f.resource.getURIFragment(asset)).toBe('//@assets.0');
  });

  it('should build a path where the ID is the empty string', () => {
    const f = fixture('empty');
    const asset = f.addAsset('');

    expect(f.resource.getURIFragment(asset)).toBe('//@assets.0');
  });

  it('should leave a metamodel resource alone', () => {
    // Ecore classes declare no ID attribute, so nothing changes for .ecore files.
    const f = fixture('metamodel');
    const pkg = f.resourceSet.getResources().get(0).getContents().get(0) as EPackage;
    const metaResource = f.resourceSet.getResources().get(0);

    expect(metaResource.getURIFragment(pkg.getEClassifier('Asset')!)).toBe('//Asset');
  });
});

describe('ID-relative fragment paths (#117)', () => {
  it('should anchor at the nearest container with an ID when enabled', () => {
    const f = fixture('relative');
    const db = f.addAsset('mac-postgres');
    const port = f.addPort(db, 5432);
    f.resource.setSupportIDRelativeURIFragmentPaths(true);

    expect(f.resource.getURIFragment(port)).toBe('/?mac-postgres/@ports.0');
  });

  it('should be off by default, as in ResourceImpl', () => {
    const f = fixture('default-off');
    const db = f.addAsset('mac-postgres');
    const port = f.addPort(db, 5432);

    expect(f.resource.getURIFragment(port)).toBe('//@assets.0/@ports.0');
  });

  it('should fall back to the root path where no container has an ID', () => {
    const f = fixture('no-anchor');
    const asset = f.addAsset(null);
    const port = f.addPort(asset, 5432);
    f.resource.setSupportIDRelativeURIFragmentPaths(true);

    expect(f.resource.getURIFragment(port)).toBe('//@assets.0/@ports.0');
  });

  it('should resolve an ID-relative path back to the same object', () => {
    const f = fixture('relative-roundtrip');
    const db = f.addAsset('mac-postgres');
    const port = f.addPort(db, 5432);
    const app = f.addAsset('mac-apisix');
    app.eSet(f.feature('Asset', 'viaPort'), port);
    f.resource.setSupportIDRelativeURIFragmentPaths(true);

    const xmi = f.resource.saveToString();
    expect(xmi).toContain('viaPort="/?mac-postgres/@ports.0"');

    const back = f.resourceSet.createResource(URI.createURI('relative-back.xmi'));
    (back as any).loadFromString(xmi);
    const assets = back.getContents().get(0).eGet(f.feature('Inventory', 'assets')) as EList<EObject>;
    const target = assets.get(1).eGet(f.feature('Asset', 'viaPort')) as EObject;

    expect(back.getErrors()).toHaveLength(0);
    expect(target?.eGet(f.feature('Port', 'nr'))).toBe(5432);
  });
});

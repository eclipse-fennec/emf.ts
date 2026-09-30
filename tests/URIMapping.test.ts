/**
 * @fileoverview The URI converter in resource lookup (#110)
 *
 * getResource() compared URIs raw, so a URI map only ever affected loading
 * through createInputStream(). A resource held under its logical URI was not
 * findable by its physical one, and since getEObject() goes through
 * getResource(), neither was anything inside it.
 *
 * Worse with loadOnDemand: not finding the resource meant creating a second,
 * empty one and handing that back - the failure mode of #93, reached from a
 * different direction.
 *
 * ResourceSetImpl.getResource() normalizes both sides before comparing and
 * keeps the result in uriResourceMap. The cache is kept in step here, which
 * Java does not do - the reason it leaves it off by default.
 *
 * @module tests/URIMapping
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { XMIResource } from '../src/xmi/index.js';
import type { Resource } from '../src/Resource.js';

const LOGICAL = 'http://example.org/shop';
const PHYSICAL = 'model/shop.ecore';

const ECORE = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="shop" nsURI="${LOGICAL}" nsPrefix="s">
  <eClassifiers xsi:type="ecore:EClass" name="Artikel"/>
</ecore:EPackage>`;

/**
 * A resource set holding the model under `resourceURI`, with `from` mapped to
 * `to`. Built directly, since a logical URI has no file extension and the
 * factory registry would hand out a plain BasicResource for it.
 */
function fixture(resourceURI: string, from?: string, to?: string) {
  const resourceSet = new EResourceSetImpl();
  const converter = resourceSet.getURIConverter() as any;
  if (from && to) {
    converter.getURIMap().set(URI.createURI(from), URI.createURI(to));
  }

  const resource = new XMIResource(URI.createURI(resourceURI));
  resource.setResourceSet(resourceSet);
  resourceSet.getResources().add(resource);
  resource.loadFromString(ECORE);

  return { resourceSet, resource, converter };
}

/** The name of what the fragment resolves to, or null. */
function resolve(resourceSet: EResourceSetImpl, uri: string): string | null {
  const found = resourceSet.getEObject(URI.createURI(uri), false) as any;
  return found?.getName?.() ?? null;
}

describe('A mapped URI finds the resource (#110)', () => {
  it('should find a resource held under its logical URI by the physical one', () => {
    const f = fixture(LOGICAL, PHYSICAL, LOGICAL);

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false) === f.resource).toBe(true);
  });

  it('should find a resource held under its physical URI by the logical one', () => {
    // The direction Java maps in: logical -> physical, resource on disk.
    const f = fixture(PHYSICAL, LOGICAL, PHYSICAL);

    expect(f.resourceSet.getResource(URI.createURI(LOGICAL), false) === f.resource).toBe(true);
  });

  it.each([
    ['logical to physical', PHYSICAL, LOGICAL, PHYSICAL, `${LOGICAL}#//Artikel`],
    ['physical to logical', LOGICAL, PHYSICAL, LOGICAL, `${PHYSICAL}#//Artikel`],
  ])('should resolve a fragment across the mapping, %s', (_label, held, from, to, ask) => {
    const f = fixture(held, from, to);

    expect(resolve(f.resourceSet, ask)).toBe('Artikel');
  });

  it('should still find a resource by its own URI without any mapping', () => {
    const f = fixture(LOGICAL);

    expect(f.resourceSet.getResource(URI.createURI(LOGICAL), false) === f.resource).toBe(true);
    expect(resolve(f.resourceSet, `${LOGICAL}#//Artikel`)).toBe('Artikel');
  });

  it('should not match an unrelated URI', () => {
    const f = fixture(LOGICAL, PHYSICAL, LOGICAL);

    expect(f.resourceSet.getResource(URI.createURI('other/thing.ecore'), false)).toBeNull();
  });
});

describe('loadOnDemand no longer creates a duplicate (#110)', () => {
  it('should hand back the loaded resource rather than a second, empty one', () => {
    const f = fixture(LOGICAL, PHYSICAL, LOGICAL);
    const before = f.resourceSet.getResources().size();

    const found = f.resourceSet.getResource(URI.createURI(PHYSICAL), true);

    expect(found === f.resource).toBe(true);
    expect(f.resourceSet.getResources().size()).toBe(before);
  });

  it('should do the same on the async path', async () => {
    const f = fixture(LOGICAL, PHYSICAL, LOGICAL);
    const before = f.resourceSet.getResources().size();

    const found = await (f.resourceSet as any).getResourceAsync(URI.createURI(PHYSICAL), true);

    expect(found === f.resource).toBe(true);
    expect(f.resourceSet.getResources().size()).toBe(before);
  });
});

describe('The lookup cache stays in step (#110)', () => {
  /** Looks the resource up once, so the cache holds an entry for it. */
  function warmed() {
    const f = fixture(LOGICAL, PHYSICAL, LOGICAL);
    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false) === f.resource).toBe(true);
    return f;
  }

  it('should answer a repeated lookup with the same resource', () => {
    const f = warmed();

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false) === f.resource).toBe(true);
  });

  it('should forget a resource that was removed', () => {
    const f = warmed();

    f.resourceSet.getResources().remove(f.resource as Resource);

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false)).toBeNull();
  });

  it('should forget everything when the resource list is cleared', () => {
    const f = warmed();

    f.resourceSet.getResources().clear();

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false)).toBeNull();
  });

  it('should notice a mapping that was withdrawn', () => {
    // No hook can announce this, so the cached entry is checked against the
    // current normalization on every hit.
    const f = warmed();

    f.converter.getURIMap().clear();

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false)).toBeNull();
  });

  it('should notice a resource whose URI changed', () => {
    const f = warmed();

    f.resource.setURI(URI.createURI('http://example.org/elsewhere'));

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false)).toBeNull();
  });

  it('should start over when the URI converter is replaced', () => {
    const f = warmed();

    f.resourceSet.setURIConverter({
      ...f.converter,
      normalize: (uri: URI) => uri,
    } as any);

    expect(f.resourceSet.getResource(URI.createURI(PHYSICAL), false)).toBeNull();
    expect(f.resourceSet.getResource(URI.createURI(LOGICAL), false) === f.resource).toBe(true);
  });
});

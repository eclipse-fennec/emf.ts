/**
 * @fileoverview Resolving a namespace URI to its package (#88)
 *
 * The loader looked the nsURI up in the package registry and gave up if it was
 * not there - with an error naming only the prefix, so nothing could be done
 * about it. Two ways Java EMF has in XMLHandler.getPackageForURI() were
 * missing: the xsi:schemaLocation map, which was filled but never read, and
 * the nsURI as an ordinary resource URI the resource set and its URI converter
 * can answer.
 *
 * Java loads such a package in the middle of the parse, which blocking IO
 * allows. Here createInputStream() is asynchronous, so the parse records what
 * it could not resolve and loadFromStringAsync() fetches those packages and
 * parses again.
 *
 * @module tests/PackageForURI
 */
import { describe, it, expect } from 'vitest';
import { EResourceSetImpl } from '../src/ecore/index.js';
import { URI } from '../src/URI.js';
import { Resource } from '../src/Resource.js';
import { XMIResource, XMIResourceFactory } from '../src/xmi/index.js';
import type { URIConverter } from '../src/ResourceSet.js';
import type { EPackage } from '../src/EPackage.js';

const NS = 'https://example.org/person/1.0.0';

const METAMODEL = `<?xml version="1.0" encoding="UTF-8"?>
<ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmi:version="2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore"
    name="person" nsURI="${NS}" nsPrefix="person">
  <eClassifiers xsi:type="ecore:EClass" name="Person">
    <eStructuralFeatures xsi:type="ecore:EAttribute" name="firstName"
        eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
  </eClassifiers>
</ecore:EPackage>`;

/** The instance document, optionally pointing at the metamodel per xsi:schemaLocation. */
function instance(schemaLocation?: string): string {
  const attr = schemaLocation ? ` xsi:schemaLocation="${NS} ${schemaLocation}"` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<person:Person xmlns:person="${NS}" xmlns:xmi="http://www.omg.org/XMI"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmi:version="2.0"${attr} firstName="Ada"/>`;
}

/** A resource set whose registry is empty - nothing is pre-registered. */
function emptyResourceSet(): EResourceSetImpl {
  const resourceSet = new EResourceSetImpl();
  resourceSet.getPackageRegistry().delete?.(NS);
  return resourceSet;
}

/** Loads the metamodel into the resource set under the given URI, unregistered. */
function metamodelAt(resourceSet: EResourceSetImpl, uri: string): void {
  // Built directly: a namespace URI has no file extension, so the factory
  // registry would hand out a plain BasicResource for it.
  const resource = new XMIResource(URI.createURI(uri));
  resource.setResourceSet(resourceSet);
  resourceSet.getResources().add(resource);
  resource.loadFromString(METAMODEL);
  // Deliberately not registered: the point is that the loader finds it anyway.
  expect(resourceSet.getPackageRegistry().getEPackage(NS)).toBeFalsy();
}

/** A URI converter that serves the given documents and nothing else. */
function converterFor(documents: Record<string, string>): URIConverter {
  return {
    normalize: (uri: URI) => uri,
    async createInputStream(uri: URI): Promise<ReadableStream> {
      const content = documents[uri.toString()];
      if (content === undefined) {
        throw new Error(`no such URI: ${uri}`);
      }
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content));
          controller.close();
        },
      });
    },
    async createOutputStream(): Promise<WritableStream> {
      throw new Error('read only');
    },
    async exists(uri: URI) {
      return documents[uri.toString()] !== undefined;
    },
    async delete() {},
  } as URIConverter;
}

/** Reads the one root object's firstName, to prove the parse produced a model. */
function firstName(resource: Resource): unknown {
  const root = resource.getContents().get(0);
  const feature = root.eClass().getEStructuralFeature('firstName')!;
  return root.eGet(feature);
}

describe('A namespace URI resolves through the resource set (#88)', () => {
  it('should follow xsi:schemaLocation to a loaded resource', () => {
    const resourceSet = emptyResourceSet();
    metamodelAt(resourceSet, 'person.ecore');

    const resource = resourceSet.createResource(URI.createURI('persons.xmi'));
    (resource as any).loadFromString(instance('person.ecore'));

    expect(resource.getErrors()).toHaveLength(0);
    expect(firstName(resource)).toBe('Ada');
  });

  it('should treat the nsURI itself as a resource URI', () => {
    const resourceSet = emptyResourceSet();
    metamodelAt(resourceSet, NS);

    const resource = resourceSet.createResource(URI.createURI('persons.xmi'));
    (resource as any).loadFromString(instance());

    expect(resource.getErrors()).toHaveLength(0);
    expect(firstName(resource)).toBe('Ada');
  });

  it('should put the package it found into the registry', () => {
    const resourceSet = emptyResourceSet();
    metamodelAt(resourceSet, NS);

    const resource = resourceSet.createResource(URI.createURI('persons.xmi'));
    (resource as any).loadFromString(instance());

    expect(resourceSet.getPackageRegistry().getEPackage(NS)).toBeTruthy();
  });

  it('should ask the URI converter to normalize an unknown location', () => {
    const resourceSet = emptyResourceSet();
    metamodelAt(resourceSet, 'file:/models/person.ecore');
    const converter = resourceSet.getURIConverter();
    resourceSet.setURIConverter({
      ...converter,
      normalize: (uri: URI) =>
        uri.toString() === NS ? URI.createURI('file:/models/person.ecore') : uri,
    } as URIConverter);

    const resource = resourceSet.createResource(URI.createURI('persons.xmi'));
    (resource as any).loadFromString(instance());

    expect(resource.getErrors()).toHaveLength(0);
    expect(firstName(resource)).toBe('Ada');
  });
});

describe('Unresolved namespace URIs are reported usefully (#88)', () => {
  it('should name the nsURI in the error, not just the prefix', () => {
    const resourceSet = emptyResourceSet();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi'));

    (resource as any).loadFromString(instance());

    const messages = resource.getErrors().map(e => e.message).join('\n');
    expect(messages).toContain(NS);
  });

  it('should list what it could not resolve', () => {
    const resourceSet = emptyResourceSet();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    (resource as any).loadFromString(instance('person.ecore'));

    expect(resource.getMissingPackages()).toEqual([{ nsURI: NS, location: 'person.ecore' }]);
  });

  it('should fall back to the nsURI as location where no schemaLocation is given', () => {
    const resourceSet = emptyResourceSet();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    (resource as any).loadFromString(instance());

    expect(resource.getMissingPackages()).toEqual([{ nsURI: NS, location: NS }]);
  });

  it('should report nothing once the package resolves', () => {
    const resourceSet = emptyResourceSet();
    metamodelAt(resourceSet, NS);
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    (resource as any).loadFromString(instance());

    expect(resource.getMissingPackages()).toHaveLength(0);
  });
});

describe('Packages are fetched through the URI converter (#88)', () => {
  /** Serves the metamodel under its nsURI, as a model server would. */
  function servingResourceSet(): EResourceSetImpl {
    const resourceSet = emptyResourceSet();
    resourceSet.setURIConverter(converterFor({ [NS]: METAMODEL }));
    resourceSet.getResourceFactoryRegistry()
      .getExtensionToFactoryMap()
      .set(Resource.DEFAULT_EXTENSION, new XMIResourceFactory());
    return resourceSet;
  }

  it('should load the metamodel and parse again', async () => {
    const resourceSet = servingResourceSet();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.loadFromStringAsync(instance());

    expect(resource.getErrors()).toHaveLength(0);
    expect(firstName(resource)).toBe('Ada');
  });

  it('should register what it fetched', async () => {
    const resourceSet = servingResourceSet();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.loadFromStringAsync(instance());

    const ePackage = resourceSet.getPackageRegistry().getEPackage(NS) as EPackage;
    expect(ePackage?.getName()).toBe('person');
  });

  it('should leave one root object, not two, after parsing twice', async () => {
    const resourceSet = servingResourceSet();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.loadFromStringAsync(instance());

    expect(resource.getContents().size()).toBe(1);
  });

  it('should follow xsi:schemaLocation when fetching', async () => {
    const resourceSet = emptyResourceSet();
    resourceSet.setURIConverter(converterFor({ 'https://models.example.org/person.ecore': METAMODEL }));
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.loadFromStringAsync(instance('https://models.example.org/person.ecore'));

    expect(resource.getErrors()).toHaveLength(0);
    expect(firstName(resource)).toBe('Ada');
  });

  it('should go through load() as well', async () => {
    const resourceSet = servingResourceSet();
    resourceSet.setURIConverter(converterFor({ [NS]: METAMODEL, 'persons.xmi': instance() }));
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.load();

    expect(firstName(resource)).toBe('Ada');
  });

  it('should survive a URI converter that cannot answer', async () => {
    const resourceSet = emptyResourceSet();
    resourceSet.setURIConverter(converterFor({}));
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.loadFromStringAsync(instance());

    expect(resource.getErrors().length).toBeGreaterThan(0);
    expect(resource.getContents().size()).toBe(0);
  });

  it('should leave no empty resource behind when nothing could be loaded', async () => {
    const resourceSet = emptyResourceSet();
    resourceSet.setURIConverter(converterFor({}));
    const before = resourceSet.getResources().size();
    const resource = resourceSet.createResource(URI.createURI('persons.xmi')) as XMIResource;

    await resource.loadFromStringAsync(instance());

    // Only the document itself was added.
    expect(resourceSet.getResources().size()).toBe(before + 1);
  });
});

describe('handleMissingPackage is the last hook (#88)', () => {
  it('should let a subclass supply the package', () => {
    const resourceSet = emptyResourceSet();
    const carrier = resourceSet.createResource(URI.createURI('carrier.ecore'));
    (carrier as any).loadFromString(METAMODEL);
    const ePackage = carrier.getContents().get(0) as EPackage;

    class HookedResource extends XMIResource {
      protected createXMLLoad(): any {
        const load = super.createXMLLoad();
        const makeDefaultHandler = (load as any).makeDefaultHandler.bind(load);
        (load as any).makeDefaultHandler = (res: Resource, options: Map<string, any>) => {
          const handler = makeDefaultHandler(res, options);
          (handler as any).handleMissingPackage = (uriString: string) =>
            uriString === NS ? ePackage : null;
          return handler;
        };
        return load;
      }
    }

    const resource = new HookedResource(URI.createURI('persons.xmi'));
    resource.setResourceSet(resourceSet);
    resource.loadFromString(instance());

    expect(resource.getErrors()).toHaveLength(0);
    expect(firstName(resource)).toBe('Ada');
  });
});

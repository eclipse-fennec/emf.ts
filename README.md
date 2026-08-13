# EMFTS - Eclipse Modeling Framework for TypeScript

A TypeScript implementation of Eclipse EMF Core — interfaces *and* runtime.

## Overview

This package provides a TypeScript implementation of the Eclipse Modeling Framework (EMF) Core metamodel — both the interface definitions and a working runtime: dynamic model objects with a reflective API, factories, the package registry, change notification, and JSON/XMI persistence. It enables type-safe modeling in TypeScript/JavaScript environments.

The Ecore metamodel aligns with the OMG [Meta Object Facility (MOF)](https://www.omg.org/spec/MOF/) — specifically EMOF (Essential MOF).

## Installation

```bash
npm install @emfts/core@next
```

> **Use the `next` tag for now.** The `latest` tag still points at `0.1.0`, which
> predates a substantial part of the runtime. In particular the `@masagroup/ecore`
> compatibility layer under `src/ecore/` — `EResourceSetImpl` with the XMI factory
> pre-registered for `.ecore`, `getEcorePackage()`, the package registries — exists
> only in `next`. If you are migrating from `@masagroup/ecore`, that layer is what
> you want, and `npm install @emfts/core` alone will not give it to you.

## Core Interfaces

### Metamodel Hierarchy

```
EObject (root of all model objects)
  └─ EModelElement (has annotations)
      └─ ENamedElement (has name)
          ├─ EClassifier (abstract)
          │   ├─ EClass (modeled class)
          │   └─ EDataType (primitive/data types)
          ├─ EStructuralFeature (abstract)
          │   ├─ EAttribute (data-valued features)
          │   └─ EReference (object-valued features)
          ├─ EPackage (package container)
          └─ EOperation (class operation)
```

### Key Concepts

- **EObject**: Base interface for all model objects, provides reflective API
- **EClass**: Metamodel representation of a class (like `java.lang.Class`)
- **EPackage**: Container for classifiers, identified by namespace URI
- **EFactory**: Creates instances of EClasses
- **Resource**: Persistent document containing model objects
- **ResourceSet**: Collection of related resources

## Usage Example

```typescript
import { EPackage, EClass, EFactory, EObject } from '@emfts/core';

// Access package from registry
const pkg: EPackage = EPackage.Registry.INSTANCE.getEPackage('http://example.com/mymodel');

// Get classifier
const personClass: EClass = pkg.getEClassifier('Person') as EClass;

// Create instance
const factory: EFactory = pkg.getEFactoryInstance();
const person: EObject = factory.create(personClass);

// Set value reflectively
const nameAttr = personClass.getEStructuralFeature('name');
person.eSet(nameAttr, 'John Doe');

// Get value reflectively
const name = person.eGet(nameAttr);
console.log(name); // 'John Doe'
```

## Features

- ✅ Full EMF Core metamodel interfaces
- ✅ Type-safe reflective API
- ✅ Resource and ResourceSet management
- ✅ URI handling
- ✅ Package registry pattern
- ✅ Factory pattern for object creation

## Documentation

- [Collections: EList, EMap and arrays](./docs/collections.md) — which accessors
  return an `EList` and which return a plain array, and why `Array.isArray()` is
  `false` on an `EList`
- [Examples](./docs/examples/index.md) — dynamic models, factories, notifications,
  XMI/JSON persistence

## Architecture

The interfaces follow the same design as Eclipse EMF:

1. **Metamodel Layer**: EClass, EAttribute, EReference (describe structure)
2. **Model Layer**: EObject instances (actual data)
3. **Persistence Layer**: Resource, ResourceSet (load/save)
4. **Registry Layer**: EPackage.Registry (global package lookup)

## Building

```bash
npm install
npm run build
```

## Deployment & Artifacts

| | |
|---|---|
| Registry | [npmjs.com](https://www.npmjs.com/package/@emfts/core) |
| Package | [`@emfts/core`](https://www.npmjs.com/package/@emfts/core) (public) |
| Install | `npm install @emfts/core@next` (see [Installation](#installation)) |
| Dist-tags | `next` — current development line · `latest` — `0.1.0`, predates the `@masagroup/ecore` compatibility layer |
| Build output | `dist/` (ESM, `tsc`) — only `dist` is published (see `files` in `package.json`) |
| Source | <https://github.com/eclipse-fennec/emf.ts> (default branch `snapshot`) |
| Project | [Eclipse Fennec](https://projects.eclipse.org/projects/modeling.fennec) |

Releases are published to the npm registry under the `@emfts` scope.

## License

[EPL-2.0](https://www.eclipse.org/legal/epl-2.0/) — see [`LICENSE`](./LICENSE).

## Original Source

These interfaces are TypeScript conversions of:
- Eclipse EMF Core: https://github.com/eclipse-emf/org.eclipse.emf
- Package: `org.eclipse.emf.ecore`

## Notes

- Ships interfaces and their runtime implementations (dynamic EObjects, EList/EMap, factories, registry, notifications, JSON/XMI resources)
- Designed for building EMF-compatible tools in TypeScript
- Suitable for code generators, model validators, and runtime frameworks

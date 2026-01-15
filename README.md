# EMFTS - Eclipse Modeling Framework for TypeScript

TypeScript interfaces converted from Eclipse EMF Core.

## Overview

This package provides TypeScript interface definitions for the Eclipse Modeling Framework (EMF) Core metamodel. These interfaces enable type-safe modeling in TypeScript/JavaScript environments.

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
import { EPackage, EClass, EFactory, EObject } from 'emfts';

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

## License

Eclipse Public License 2.0 (EPL-2.0)

## Original Source

These interfaces are TypeScript conversions of:
- Eclipse EMF Core: https://github.com/eclipse-emf/org.eclipse.emf
- Package: `org.eclipse.emf.ecore`

## Notes

- This is a pure interface package - no implementations included
- Designed for building EMF-compatible tools in TypeScript
- Suitable for code generators, model validators, and runtime frameworks

# Changelog

All notable changes to the `emfts` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1-next.17] - 2026-08-14

### Added

- Generics support when loading `.ecore` files ([#65](https://github.com/eclipse-fennec/emf.ts/issues/65)). `ETypedElement.eGenericType`, `EClassifier.eTypeParameters`, `EClass.eGenericSuperTypes`, `EOperation.eTypeParameters`, `ETypeParameter.eBounds` and the full `EGenericType` structure are part of the Ecore metamodel now, with `BasicEGenericType` and `BasicETypeParameter` implementations. A feature typed via `<eGenericType>` gets its type from the raw type of the generic type instead of ending up untyped, keeps its type arguments, and survives a save/load round trip.
- `BasicEParameter`, and `EOperation`/`EParameter` are created through `EcoreFactory` ([#66](https://github.com/eclipse-fennec/emf.ts/issues/66)). Nested model elements arrive as typed objects rather than `DynamicEObject`, so the accessors declared on the interfaces work.
- `registerPackage(pkg)` is part of the `EPackageRegistry` interface ([#67](https://github.com/eclipse-fennec/emf.ts/issues/67)). Previously only the registries from `src/ecore/index.ts` offered it, so registering on a `ResourceSet`'s registry meant reading the nsURI off the package by hand.
- Array-compatible API on `EList` ([#68](https://github.com/eclipse-fennec/emf.ts/issues/68)): index signature with `list[i]` on every list however constructed, plus `concat`, `sort`, `reverse`, `join`, `at`, `lastIndexOf`, `flatMap` and `toJSON`. Index writes route through `set()`/`add()` and `sort()`/`reverse()` reorder through `move()`, so notifications are still emitted.
- [`docs/collections.md`](./docs/collections.md) documenting which accessors return an `EList` and which a plain array, and why `Array.isArray()` on an `EList` is `false` by design.

### Fixed

- `BasicEOperation.getEAnnotations()` returned a hardcoded `[]` and `getEAnnotation()` always returned `null`, so annotations on an operation were unreachable.
- `getETypeParameters()` on `BasicEClass` and `BasicEDataType` returned a hardcoded `[]`.
- `createPackageRegistry().set()` was the only registry implementation that did not register subpackages recursively.
- `JSON.stringify()` on an `EList` exposed the internal `data`/`owner`/`feature` fields and pulled the owning object into the output.

### Changed

- `registerPackage()` throws for a package without an nsURI instead of silently dropping it; the entry could never be looked up afterwards.
- `getPackageRegistry()` returns the global registry instance directly instead of a spread copy.
- README recommends `npm install @emfts/core@next`, since `latest` is still `0.1.0` and predates the `@masagroup/ecore` compatibility layer.

### Notes

- The accessors that return plain arrays (`getEOperations()`, `getESuperTypes()`, `getEAll*()`, `getEAnnotations()`) are **not** unified onto `EList` in this release. That changes public return types and is planned for a major version; the additions above are the groundwork.

## [1.0.1] - 2026-02-20

### Fixed

- Intra-package cross-references not resolved during ecore loading ([#6](https://github.com/eclipse-fennec/emf.ts/issues/6)). When loading `.ecore` files, references using the package's own nsURI (e.g. `eType="http://company.com/c1#//Employee"`) were not resolved because the package was still being loaded and not yet registered in the package registry. The XMLHandler now searches the current resource's root objects before falling back to the ResourceSet.

## [1.0.0] - 2026-02-08

### Added

- Core EMF type system: EClass, EAttribute, EReference, EDataType, EEnum, EPackage
- EObject reflection API: eGet, eSet, eClass, eIsSet
- EList with notification support
- XMI loading and saving (XMIResource)
- JSON serialization support
- EContentAdapter and notification system
- BasicResourceSet with package registry
- EcorePackage with built-in Ecore data types

### Fixed

- XMI Loader: Support resolving subpackages by nsPrefix ([#1](https://github.com/eclipse-fennec/emf.ts/issues/1))
- XMI Loader: Unresolved internal cross-references / forward references ([#3](https://github.com/eclipse-fennec/emf.ts/issues/3))
- XMI: Support space-separated ID references in multi-valued attributes ([#4](https://github.com/eclipse-fennec/emf.ts/issues/4))

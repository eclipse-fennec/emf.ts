# Changelog

All notable changes to the `emfts` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-next.1] - 2026-08-14

### Changed — BREAKING

- **Every multi-valued accessor returns `EList<T>` instead of `T[]`** ([#68](https://github.com/eclipse-fennec/emf.ts/issues/68)). Java EMF returns an `EList` throughout; the mixed returns were a conformance gap and, per the report, the single most frequent porting mistake. Affects 21 accessors across 10 interfaces: `EClass` (`getESuperTypes`, `getEAllSuperTypes`, `getEAllStructuralFeatures`, `getEAttributes`, `getEAllAttributes`, `getEReferences`, `getEAllReferences`, `getEAllContainments`, `getEOperations`, `getEAllOperations`), `EOperation` (`getEParameters`, `getEExceptions`), `EAnnotation` (`getContents`, `getReferences`), `EModelElement` (`getEAnnotations`), `EEnum` (`getELiterals`), `EClassifier` (`getETypeParameters`), `ETypeParameter` (`getEBounds`), `EGenericType` (`getETypeArguments`), `EReference` (`getEKeys`), `ResourceSet` (`getResources`).

  Most consumer code keeps working, because `EList` carries the array API: `length`, `list[i]`, `map`/`filter`/`find`/`some`/`every`/`reduce`, `push`/`pop`/`splice`, `sort`/`reverse`, spread, destructuring and `for...of`. Two things need attention:

  - `Array.isArray(result)` is now `false`. The normalizing idiom `Array.isArray(v) ? v : [v]` takes the wrong branch — use the exported `isListValue(v)` / `toArray(v)` instead.
  - Passing a result where a real array is required needs `Array.from(result)`.

  See [docs/collections.md](./docs/collections.md) for the full migration notes.

- **Derived accessors are read-only.** `getEAll*()`, `getEAttributes()`, `getEReferences()` and `getEAllContainments()` assemble their result from the class and its supertypes, so writing into it could never have an effect. Mutating methods now throw an `Error` naming the accessor, mirroring `EcoreEList.UnmodifiableEList` in Java EMF, which throws `UnsupportedOperationException`. Previously such a write appeared to succeed and was silently lost.

### Added

- Derived lists are cached and invalidated by a metamodel revision counter. Measured on a five-level hierarchy with 50 features: `getEAllStructuralFeatures()` drops from 3.4 µs to 0.31 µs per call, and repeated calls return the identical list object while the model is unchanged, as they do in Java EMF. Invalidation is transitive — adding a feature to a grandparent class refreshes its descendants' lists.
- `UnmodifiableEList`, `MetamodelEList`, `createUnmodifiableEList()`, `createMetamodelEList()`, `isListValue()`, `toArray()`, `replaceListContents()`, `bumpMetamodelRevision()`, `currentMetamodelRevision()`, `cachedDerivedList()`.

### Fixed

- `getEAnnotations()` on `BasicEPackage`, `BasicEFactory` and `BasicEAnnotation` returned a hardcoded `[]`, so annotations on packages, factories and annotations themselves were unreachable — the same stub pattern that [#66](https://github.com/eclipse-fennec/emf.ts/issues/66) uncovered on `BasicEOperation`.
- `filter`, `find`, `findIndex`, `some` and `every` on `EList` accept a predicate returning `unknown` rather than `boolean`, matching how TypeScript types `Array.prototype`. Callbacks of the form `x && y` type-check again.

## [0.1.1-next.18] - 2026-08-14

### Fixed

- EEnum values in instance data are loaded as `EEnumLiteral` instead of raw strings ([#70](https://github.com/eclipse-fennec/emf.ts/issues/70)). `EFactory.createFromString()` had no EEnum branch, so an enum attribute ended up as the string from the file and an invalid value was accepted silently. The value is now resolved against the enum — by literal first, then by name, then by ordinal — and a value that matches none of them is reported in `resource.getErrors()` and leaves the feature unset, rather than being accepted or aborting the load.
- `BasicEEnumLiteral.getLiteral()` falls back to the name when the `.ecore` declares no explicit `literal`, matching `EEnumLiteralImpl.getLiteral()` in Java EMF. Without the fallback a lookup by literal could not resolve anything for the majority of real `.ecore` files, where the attribute is omitted.
- Enum attributes are serialized as their literal, not their name. `XMLSave` reached the generic EObject fallback and wrote `getName()`, which silently produced the wrong string whenever the literal differed from the name. Enum values now go through the factory, so a load/save cycle also normalizes a name or ordinal in the source file to the literal.

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

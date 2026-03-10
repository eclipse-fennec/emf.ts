# Changelog

All notable changes to the `emfts` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

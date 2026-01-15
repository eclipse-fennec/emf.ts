# XMI

## XMI Loading

XMI Loading Grundfunktionen XMIResource und zugehörige Utilities.

```typescript
const resource = new XMIResource(URI.createURI('model.xmi'));
resource.getContents().push(obj);
```

## XMIResource

XMIResource Erstellung

```typescript
const uri = URI.createURI('model.xmi');
const resource = new XMIResource(uri);
```

### should create an XMI resource

XMI Resource erstellen

```typescript
const resource = new XMIResource(URI.createURI('model.xmi'));
resource.getContents(); // []
```

## ID Handling

ID-Handling für Querverweise XMIResource verwaltet IDs für Objekte.

```typescript
resource.setID(obj, 'unique_id');
resource.getID(obj);         // 'unique_id'
resource.getEObject('unique_id'); // obj
```

### should track object IDs

Objekt-IDs verfolgen

```typescript
resource.setID(obj, 'id1');
resource.getID(obj); // 'id1'
resource.getEObject('id1'); // obj
```

## Type Guards

Type Guards für EMF-Typen Hilfsfunktionen zur Typerkennung.

```typescript
import { isEClass, isEAttribute } from '../src/util/TypeGuards';

if (isEClass(classifier)) {
  classifier.getEStructuralFeatures();
}
```

### should correctly identify EClass

EClass erkennen

```typescript
isEClass(myClass);     // true
isEDataType(myClass);  // false
```

## ResourceSet with Package Registry

ResourceSet mit Package-Registry Packages werden im ResourceSet registriert für XMI-Loading.

```typescript
const resourceSet = new BasicResourceSet();
resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

const resource = resourceSet.createResource(uri);
// Kann jetzt Instanzen des registrierten Packages laden
```


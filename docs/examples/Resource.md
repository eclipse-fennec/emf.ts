# Resource

## Resource

Resource Hauptfunktionalität Eine Resource ist ein Container für persistierte EObjects mit URI-Identifikation.

```typescript
const resource = new BasicResource(URI.createURI('model.xmi'));
resource.getContents().push(myObject);
await resource.save();
```

## Basic Operations

Grundlegende Resource-Operationen Erstellen, Contents verwalten, Zustand tracken.

```typescript
const resource = new BasicResource(URI.createURI('file.xmi'));
resource.getContents().push(obj);
resource.isModified();   // false
resource.setModified(true);
resource.isModified();   // true
```

### should create resource with URI

Resource mit URI erstellen

```typescript
const uri = URI.createURI('http://example.com/model.xmi');
const resource = new BasicResource(uri);
resource.getURI().toString(); // 'http://example.com/model.xmi'
```

### should manage contents

Contents verwalten

```typescript
resource.getContents().push(obj);
resource.getContents()[0]; // obj
```

### should track loaded state

Loaded-Status tracken

```typescript
resource.isLoaded();  // false
await resource.load();
resource.isLoaded();  // true
```

### should track modified state

Modified-Status tracken

```typescript
resource.isModified();       // false
resource.setModified(true);
resource.isModified();       // true
```

### should unload resource

Resource entladen

```typescript
resource.unload();
resource.getContents().length; // 0
resource.isLoaded();           // false
```

## URI Fragments

URI-Fragment-Verwaltung Fragmente identifizieren Objekte innerhalb einer Resource. Unterstützt XPath-Style (/0, /0/0) und ID-basierte Lookups.

```typescript
const fragment = resource.getURIFragment(obj); // '/0'
const resolved = resource.getEObject('/0');    // obj
```

### should generate XPath-style fragments

XPath-Style Fragmente generieren

```typescript
resource.getURIFragment(rootObj);   // '/0'
resource.getURIFragment(childObj);  // '/0/0'
```

### should resolve XPath-style fragments

XPath-Style Fragmente auflösen

```typescript
resource.getEObject('/0');    // Erstes Root-Objekt
resource.getEObject('/0/0');  // Erstes Kind des ersten Root-Objekts
```

### should return null for invalid fragments

null bei ungültigen Fragmenten

```typescript
resource.getEObject('/99');    // null (nicht vorhanden)
resource.getEObject('/0/99');  // null (Kind nicht vorhanden)
```

### should lookup by ID attribute

Lookup über ID-Attribut Wenn ein Attribut als ID markiert ist, kann das Objekt über dessen Wert gefunden werden.

```typescript
book.eSet(isbnAttr, '978-0123456789');
resource.getEObject('978-0123456789'); // book
```

### should resolve //Name fragments (EMF-style named element lookup)

EMF-Style //Name Fragmente auflösen Das Pattern #//Name findet benannte Elemente in Ecore-Dateien.

```typescript
// In einer geladenen .ecore Datei
resource.getEObject('//MyClass');    // Die EClass namens 'MyClass'
resource.getEObject('//MyEnum');     // Der EEnum namens 'MyEnum'
```

### should resolve single slash name fragments as fallback

Fallback für /Name Fragmente

```typescript
resource.getEObject('/Book'); // Auch über einzelnen Slash findbar
```

## getAllContents

getAllContents() - Alle Objekte iterieren Iterator über alle Objekte in der Resource inklusive verschachtelter.

```typescript
const iterator = resource.getAllContents();
for (const obj of iterator) {
  console.log(obj.eClass().getName());
}
```

### should iterate over all objects

Tiefensuche über alle Objekte

```typescript
const all: EObject[] = [];
for (const obj of resource.getAllContents()) {
  all.push(obj);
}
// all enthält Root-Objekte und alle enthaltenen Objekte
```

## Errors and Warnings

Fehler und Warnungen Resources sammeln Fehler und Warnungen beim Laden/Speichern.

```typescript
await resource.load();
if (resource.getErrors().length > 0) {
  console.error('Ladefehler:', resource.getErrors());
}
```

### should track errors

Fehler tracken

```typescript
resource.getErrors().push({ message: 'Parse error at line 42' });
resource.getErrors()[0].message; // 'Parse error at line 42'
```

### should track warnings

Warnungen tracken

```typescript
resource.getWarnings().push({ message: 'Deprecated feature used' });
```

### should clear errors on save

Fehler beim Speichern löschen

```typescript
resource.getErrors().length; // 1
await resource.save();
resource.getErrors().length; // 0
```

## ResourceSet

ResourceSet - Verwaltung mehrerer Resources Ein ResourceSet verwaltet zusammengehörige Resources und die Package-Registry.

```typescript
const resourceSet = new BasicResourceSet();

// Package registrieren
resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

// Resources erstellen/laden
const res1 = resourceSet.createResource(URI.createURI('model1.xmi'));
const res2 = resourceSet.createResource(URI.createURI('model2.xmi'));
```

### should create resources

Resources erstellen

```typescript
const resource = resourceSet.createResource(URI.createURI('model.xmi'));
resourceSet.getResources().includes(resource); // true
```

### should retrieve existing resources

Existierende Resources abrufen

```typescript
const created = resourceSet.createResource(uri);
const found = resourceSet.getResource(uri, false);
found === created; // true
```

### should return null for non-existing resources

null für nicht existierende Resources

```typescript
resourceSet.getResource(unknownUri, false); // null
```

### should manage package registry

Package-Registry verwalten

```typescript
const registry = resourceSet.getPackageRegistry();
registry.set('http://example.com/mymodel', myPackage);
registry.get('http://example.com/mymodel'); // myPackage
```

### should get EObject by URI with fragment

EObject über URI mit Fragment abrufen

```typescript
const uri = URI.createURI('model.xmi#/0');
const obj = resourceSet.getEObject(uri, false);
```

## Save and Load

Speichern und Laden Asynchrone Operationen zum Persistieren und Laden von Modellen.

```typescript
// Speichern
resource.getContents().push(myModel);
await resource.save();

// Laden
const resource2 = resourceSet.createResource(uri);
await resource2.load();
const loaded = resource2.getContents()[0];
```

### should save without errors

Resource speichern

```typescript
await resource.save();
resource.isModified(); // false nach Speichern
```

### should load without errors

Resource laden

```typescript
await resource.load();
resource.isLoaded(); // true
```


# Persistence

## Persistence

Persistenz-Tests für EMF-Modelle Testet XMI Serialisierung/Deserialisierung mit verschiedenen Szenarien.

```typescript
// Setup: Package und ResourceSet erstellen
const resourceSet = new BasicResourceSet();
resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

// Resource erstellen und füllen
const resource = new XMIResource(URI.createURI('model.xmi'));
resource.setResourceSet(resourceSet);
resource.getContents().push(rootObject);

// Speichern
const xml = resource.saveToString();
```

## Single Resource Tests

Single Resource Tests Alle Objekte in einer einzigen Resource.

```typescript
const resource = new XMIResource(uri);
resource.getContents().push(john);
resource.getContents().push(mary);
const xml = resource.saveToString();
```

### should save and serialize a model with containment and references

Modell mit Containment und Referenzen speichern

```typescript
const xml = resource.saveToString();
// XML enthält verschachtelte Objekte und Referenzen
```

### should load a saved model correctly

Gespeichertes Modell korrekt laden

```typescript
const loadedResource = new XMIResource(uri);
loadedResource.loadFromString(xml);
const loadedJohn = loadedResource.getContents()[0];
loadedJohn.eGet(nameAttr); // 'John'
```

## Two Resource Tests

Two Resource Tests - Cross-Resource Referenzen Objekte in verschiedenen Resources mit Querverweisen.

```typescript
// John in Resource A, Mary in Resource B
johnResource.getContents().push(john);
maryResource.getContents().push(mary);

// john.children verweist auf mary via URI
const xml = johnResource.saveToString();
// XML enthält href="mary.xmi#..."
```

### should save cross-resource references correctly

Cross-Resource Referenzen korrekt speichern

```typescript
// Referenz zu Objekt in anderer Resource
const xml = johnResource.saveToString();
// xml enthält: <children href="mary.xmi#/0">
```

## Bidirectional References

Bidirektionale Referenzen Opposites werden automatisch synchron gehalten.

```typescript
// children <-> father sind bidirektional
john.children.push(mary);
mary.eGet(fatherRef); // john (automatisch gesetzt)
```

### should maintain bidirectional consistency on set

Bidirektionale Konsistenz bei set()

```typescript
johnChildren.push(mary);
mary.eGet(fatherRef); // sollte john sein
```

## Containment Hierarchy

Containment-Hierarchie Enthaltene Objekte kennen ihren Container.

```typescript
// herbie ist in john.cars (Containment)
herbie.eContainer(); // john
herbie.eContainmentFeature(); // carsRef
```

### should set eContainer for contained objects

eContainer für enthaltene Objekte

```typescript
const container = herbie.eContainer();
// container === john
```

## ID-based References

ID-basierte Referenzen Objekte können über explizite IDs referenziert werden.

```typescript
resource.setID(john, 'john_id');
resource.setID(mary, 'mary_id');
// Referenzen verwenden nun IDs statt Pfade
```

### should use IDs for references when set

IDs für Referenzen verwenden

```typescript
resource.setID(obj, 'my_id');
const xml = resource.saveToString();
// xml enthält Referenzen mit #my_id
```

## Empty and Null Values

Leere und Null-Werte Korrektes Handling von leeren Listen und null-Referenzen.

```typescript
// Objekt ohne Kinder
const alone = factory.create(PersonClass);
alone.eSet(nameAttr, 'Alone');
// XML enthält keine leeren children/cars Elemente
```

### should handle empty lists correctly

Leere Listen korrekt behandeln

```typescript
const xml = resource.saveToString();
// Keine leeren <children/> oder <cars/> Elemente
```

## Round-trip Integrity

Round-Trip Integrität Daten bleiben beim Speichern und erneuten Laden erhalten.

```typescript
const xml1 = resource.saveToString();
loadedResource.loadFromString(xml1);
const xml2 = loadedResource.saveToString();
// xml1 und xml2 sind funktional äquivalent
```

### should preserve all data through save/load cycle

Alle Daten durch Save/Load-Zyklus erhalten

```typescript
// Original speichern
const xml = resource.saveToString();
// In neue Resource laden
newResource.loadFromString(xml);
// Wieder speichern - sollte gleich sein
const xml2 = newResource.saveToString();
```

## Proxy Resolution

Proxy-Auflösung Referenzen zu nicht geladenen Objekten werden als Proxies dargestellt und können später aufgelöst werden.

```typescript
// Nur john's Resource laden (nicht mary's)
johnResource.loadFromString(johnXml);

// Referenz zu Mary ist ein Proxy
const child = john.eGet(childrenRef)[0];
child.eIsProxy(); // true
child.eProxyURI(); // 'mary.xmi#...'

// Nach Laden von mary's Resource auflösen
maryResource.loadFromString(maryXml);
const resolved = EcoreUtil.resolve(child, john);
resolved.eGet(nameAttr); // 'Mary'
```

### should create proxies for unresolved references

Proxies für unaufgelöste Referenzen erstellen

```typescript
const child = john.eGet(childrenRef)[0];
child.eIsProxy(); // true
child.eProxyURI().toString(); // 'mary.xmi#/0'
```


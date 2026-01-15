# XMISave

## XMI Serialization

XMI Serialisierung Konvertiert EMF-Modelle in XMI-XML Format.

```typescript
const xml = resource.saveToString();
// <?xml version="1.0"?>
// <test:Person name="John"...>
//   <addresses street="123 Main St"/>
// </test:Person>
```

## Basic Serialization

Grundlegende Serialisierung Einfache Objekte mit Attributen und Containment.

```typescript
const xml = resource.saveToString();
// Enthält: name="John" age="30"
```

### should serialize a simple object with attributes

Einfaches Objekt mit Attributen serialisieren

```typescript
person.eSet(nameAttr, 'John');
const xml = resource.saveToString();
// xml enthält: name="John"
```

## Cross-Resource References

Cross-Resource Referenzen Referenzen zu Objekten in anderen Resources werden als URIs serialisiert.

```typescript
// Address in addresses.xmi
// Person in persons.xmi referenziert die Address
const xml = personResource.saveToString();
// xml enthält: primaryAddress="addresses.xmi#shared_addr"
```

### should serialize references to objects in other resources

Referenzen zu Objekten in anderen Resources

```typescript
person.eSet(primaryAddressRef, addressInOtherResource);
// Ergebnis: href="other.xmi#id"
```

## References to EClassifiers

Referenzen zu EClassifiers Serialisierung von Meta-Referenzen (EClass, EDataType).

```typescript
query.eSet(targetClassRef, PersonClass);
// Ergebnis: targetClass="#//Person" oder "http://.../model#//Person"
```

### should serialize references to EClass objects

Referenzen zu EClass-Objekten serialisieren

```typescript
// Meta-Modell referenziert eine EClass
query.eSet(targetClassRef, PersonClass);
```

## Round-trip Serialization

Round-Trip Serialisierung Gespeicherte Daten können wieder geladen werden.

```typescript
const xml = saveResource.saveToString();
loadResource.loadFromString(xml);
// Geladene Daten entsprechen Original
```

### should load what was saved

Gespeichertes kann wieder geladen werden

```typescript
const xml = resource.saveToString();
// xml enthält alle Attribute und Referenzen
newResource.loadFromString(xml);
```


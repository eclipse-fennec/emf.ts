# Factory

## EFactory

EFactory Grundfunktionen Die EFactory erstellt Instanzen von EClasses und konvertiert Datentypen.

```typescript
const factory = pkg.getEFactoryInstance();
const obj = factory.create(MyClass);
```

## create

create() - Instanziierung von EClasses Erstellt neue EObject-Instanzen basierend auf einer EClass-Definition.

```typescript
const person = factory.create(PersonClass);
person.eClass(); // PersonClass
```

### should create instances of EClass

Einfache Instanzerstellung

```typescript
const obj = factory.create(MyClass);
obj.eClass() === MyClass; // true
```

### should create multiple distinct instances

Mehrere unabhängige Instanzen erstellen Jeder create()-Aufruf erzeugt ein neues, eigenständiges Objekt.

```typescript
const obj1 = factory.create(MyClass);
const obj2 = factory.create(MyClass);
obj1 === obj2; // false (verschiedene Objekte)
```

### should throw for abstract classes

Abstrakte Klassen können nicht instanziiert werden

```typescript
myClass.setAbstract(true);
factory.create(myClass); // throws Error
```

### should throw for interfaces

Interfaces können nicht instanziiert werden

```typescript
myClass.setInterface(true);
factory.create(myClass); // throws Error
```

## createFromString

createFromString() - String zu Typ konvertieren Konvertiert String-Repräsentationen in die entsprechenden Datentypen. Wichtig für XML/XMI Deserialisierung.

```typescript
factory.createFromString(EcoreDataTypes.EInt, '42');    // 42
factory.createFromString(EcoreDataTypes.EBoolean, 'true'); // true
factory.createFromString(EcoreDataTypes.EFloat, '3.14');   // 3.14
```

### should convert string to boolean

String zu Boolean konvertieren

```typescript
factory.createFromString(EcoreDataTypes.EBoolean, 'true');  // true
factory.createFromString(EcoreDataTypes.EBoolean, 'false'); // false
```

### should convert string to int

String zu Integer konvertieren

```typescript
factory.createFromString(EcoreDataTypes.EInt, '42'); // 42
```

### should convert string to float

String zu Float konvertieren

```typescript
factory.createFromString(EcoreDataTypes.EFloat, '3.14'); // 3.14
```

### should convert string to double

String zu Double konvertieren

```typescript
factory.createFromString(EcoreDataTypes.EDouble, '3.14159'); // 3.14159
```

### should handle string type

String-Typ durchreichen

```typescript
factory.createFromString(EcoreDataTypes.EString, 'hello'); // 'hello'
```

## convertToString

convertToString() - Typ zu String konvertieren Konvertiert Werte in String-Repräsentationen für Serialisierung.

```typescript
factory.convertToString(EcoreDataTypes.EInt, 42);      // '42'
factory.convertToString(EcoreDataTypes.EBoolean, true); // 'true'
```

### should convert boolean to string

Boolean zu String konvertieren

```typescript
factory.convertToString(EcoreDataTypes.EBoolean, true); // 'true'
```

### should convert number to string

Number zu String konvertieren

```typescript
factory.convertToString(EcoreDataTypes.EInt, 42); // '42'
```

### should handle null values

null-Werte als leeren String

```typescript
factory.convertToString(EcoreDataTypes.EString, null); // ''
```

### should handle undefined values

undefined-Werte als leeren String

```typescript
factory.convertToString(EcoreDataTypes.EString, undefined); // ''
```

## registerCreator

registerCreator() - Custom Creator registrieren Erlaubt das Registrieren von eigenen Creator-Funktionen für spezielle Instanziierungslogik.

```typescript
(factory as BasicEFactory).registerCreator(MyClass, () => {
  const obj = new MyCustomEObject();
  obj.initialize();
  return obj;
});
```

### should use custom creator when registered

Custom Creator wird verwendet wenn registriert

```typescript
(factory as BasicEFactory).registerCreator(MyClass, () => {
  return new MySpecialInstance();
});
factory.create(MyClass); // Verwendet Custom Creator
```

## getEPackage

getEPackage() - Zugehöriges Package abrufen

```typescript
factory.getEPackage(); // Das Package zu dem die Factory gehört
```

### should return associated package

Package-Referenz zurückgeben

```typescript
const pkg = factory.getEPackage();
pkg === myPackage; // true
```

## EcoreDataTypes

EcoreDataTypes - Vordefinierte EMF-Datentypen EMF stellt standardmäßige Datentypen bereit die Java-Primitiven entsprechen.

```typescript
// Verfügbare Datentypen
EcoreDataTypes.EString   // java.lang.String
EcoreDataTypes.EInt      // int
EcoreDataTypes.EBoolean  // boolean
EcoreDataTypes.EFloat    // float
EcoreDataTypes.EDouble   // double
EcoreDataTypes.ELong     // long

// Default-Werte
EcoreDataTypes.EBoolean.getDefaultValue(); // false
EcoreDataTypes.EInt.getDefaultValue();     // 0
```

### should provide EString

EString Datentyp

```typescript
EcoreDataTypes.EString.getName();              // 'EString'
EcoreDataTypes.EString.getInstanceClassName(); // 'java.lang.String'
```

### should provide EInt

EInt Datentyp

```typescript
EcoreDataTypes.EInt.getName();              // 'EInt'
EcoreDataTypes.EInt.getInstanceClassName(); // 'int'
```

### should provide EBoolean

EBoolean Datentyp

```typescript
EcoreDataTypes.EBoolean.getName();              // 'EBoolean'
EcoreDataTypes.EBoolean.getInstanceClassName(); // 'boolean'
```

### should provide EFloat

EFloat Datentyp

```typescript
EcoreDataTypes.EFloat.getName();              // 'EFloat'
EcoreDataTypes.EFloat.getInstanceClassName(); // 'float'
```

### should provide EDouble

EDouble Datentyp

```typescript
EcoreDataTypes.EDouble.getName();              // 'EDouble'
EcoreDataTypes.EDouble.getInstanceClassName(); // 'double'
```

### should provide ELong

ELong Datentyp

```typescript
EcoreDataTypes.ELong.getName();              // 'ELong'
EcoreDataTypes.ELong.getInstanceClassName(); // 'long'
```

### should provide correct default values

Default-Werte der Datentypen Jeder Datentyp hat einen typischen Default-Wert.

```typescript
EcoreDataTypes.EBoolean.getDefaultValue(); // false
EcoreDataTypes.EInt.getDefaultValue();     // 0
EcoreDataTypes.EFloat.getDefaultValue();   // 0.0
EcoreDataTypes.EString.getDefaultValue();  // null
```


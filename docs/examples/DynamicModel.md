# DynamicModel

## Package and Factory

Package und Factory Tests Ein EPackage ist der Container für EClasses und enthält eine EFactory zum Erstellen von Instanzen.

### should create package with correct metadata

Package Metadaten prüfen Jedes EPackage hat name, nsPrefix und nsURI.

```typescript
const pkg = new BasicEPackage();
pkg.setName('mymodel');
pkg.setNsPrefix('mymodel');
pkg.setNsURI('http://example.com/mymodel');

pkg.getName();     // 'mymodel'
pkg.getNsPrefix(); // 'mymodel'
pkg.getNsURI();    // 'http://example.com/mymodel'
```

### should have factory instance

Factory-Instanz vom Package holen Jedes EPackage hat eine zugehörige EFactory zum Erstellen von Instanzen.

```typescript
const factory = pkg.getEFactoryInstance();
factory.getEPackage(); // Zurück zum Package
```

### should contain correct classifiers

Classifiers im Package auflisten getEClassifiers() gibt alle EClass und EDataType Definitionen zurück.

```typescript
pkg.getEClassifiers().push(myClass);
pkg.getEClassifiers(); // [myClass, ...]
```

## Attributes

Attribut-Operationen EAttributes speichern primitive Werte (String, Integer, Boolean, etc.) in EObject-Instanzen.

```typescript
const nameAttr = new BasicEAttribute();
nameAttr.setName('name');
nameAttr.setEType(EcoreDataTypes.EString);
myClass.addFeature(nameAttr);

const obj = factory.create(myClass);
obj.eSet(nameAttr, 'John');
obj.eGet(nameAttr); // 'John'
```

### should set and get attribute values

Attributwerte setzen und lesen

```typescript
const person = factory.create(PersonClass);
person.eSet(nameAttr, 'John');
person.eGet(nameAttr);    // 'John'
person.eGet(managerAttr); // false (Default)
```

### should handle multiple instances

Mehrere unabhängige Instanzen Jede Instanz hat eigene Attributwerte.

```typescript
const emp1 = factory.create(EmployeeClass);
const emp2 = factory.create(EmployeeClass);

emp1.eSet(nameAttr, 'John');
emp2.eSet(nameAttr, 'Jane');

emp1.eGet(nameAttr); // 'John'
emp2.eGet(nameAttr); // 'Jane'
```

### should handle integer attributes

Integer-Attribute EInt für Ganzzahlen verwenden.

```typescript
const numberAttr = new BasicEAttribute();
numberAttr.setName('number');
numberAttr.setEType(EcoreDataTypes.EInt);

obj.eSet(numberAttr, 42);
obj.eGet(numberAttr); // 42
```

## References

Referenz-Operationen EReferences verbinden EObjects miteinander. Bei Containment-Referenzen wird das referenzierte Objekt zum Kind des Containers.

```typescript
const employeesRef = new BasicEReference();
employeesRef.setName('employees');
employeesRef.setEType(EmployeeClass);
employeesRef.setUpperBound(-1);    // Unbegrenzt viele
employeesRef.setContainment(true); // Containment-Beziehung
DepartmentClass.addFeature(employeesRef);
```

### should add objects to many-valued reference

Objekte zu Many-Reference hinzufügen Bei upperBound=-1 können beliebig viele Objekte referenziert werden.

```typescript
const dept = factory.create(DepartmentClass);
const employees = dept.eGet(employeesRef) as EObject[];

employees.push(emp1);
employees.push(emp2);
employees.length; // 2
```

### should set containment relationships

Containment-Beziehungen Bei Containment wird das Kind automatisch seinem Container zugeordnet.

```typescript
const employees = dept.eGet(employeesRef) as EObject[];
employees.push(emp);

emp.eContainer();          // dept
emp.eContainmentFeature(); // employeesRef
```

### should handle moving objects between containers

Objekte zwischen Containern verschieben Ein Objekt kann nur einen Container haben. Beim Verschieben wird es automatisch aus dem alten Container entfernt.

```typescript
const dept1Emps = dept1.eGet(employeesRef) as EObject[];
dept1Emps.push(emp);
emp.eContainer(); // dept1

const dept2Emps = dept2.eGet(employeesRef) as EObject[];
dept2Emps.push(emp);
emp.eContainer(); // dept2 (automatisch verschoben)
```

## Metadata

Metadaten-Zugriff EObjects bieten Zugriff auf ihre Metadaten (EClass, Features).

```typescript
const obj = factory.create(PersonClass);
obj.eClass();                      // PersonClass
obj.eClass().getEStructuralFeatures(); // [nameAttr, ageAttr, ...]
```

### should provide metadata through eClass()

EClass über eClass() abrufen

```typescript
const person = factory.create(PersonClass);
person.eClass() === PersonClass; // true
```

### should list structural features

Strukturelle Features auflisten getEStructuralFeatures() gibt alle Attribute und Referenzen zurück.

```typescript
const features = PersonClass.getEStructuralFeatures();
features.map(f => f.getName()); // ['name', 'age', ...]
```

### should find features by name

Feature nach Namen suchen

```typescript
const nameFeature = PersonClass.getEStructuralFeature('name');
const notFound = PersonClass.getEStructuralFeature('xyz'); // null
```

## eIsSet and eUnset

eIsSet und eUnset Operationen eIsSet() prüft ob ein Feature explizit gesetzt wurde. eUnset() setzt ein Feature auf seinen Standardwert zurück.

```typescript
const person = factory.create(PersonClass);

person.eIsSet(nameAttr);  // false (noch nicht gesetzt)
person.eSet(nameAttr, 'John');
person.eIsSet(nameAttr);  // true

person.eUnset(nameAttr);
person.eIsSet(nameAttr);  // false
person.eGet(nameAttr);    // null oder Default
```

### should track set state

Set-Status tracken

```typescript
obj.eIsSet(attr); // false
obj.eSet(attr, 'value');
obj.eIsSet(attr); // true
obj.eUnset(attr);
obj.eIsSet(attr); // false
```

### should return default value after unset

Default-Wert nach eUnset Nach eUnset() wird der Default-Wert des Features zurückgegeben.

```typescript
obj.eSet(boolAttr, true);
obj.eGet(boolAttr); // true

obj.eUnset(boolAttr);
obj.eGet(boolAttr); // false (Boolean-Default)
```

## Resource

Resource-Management Resources sind Container für persistierte EObjects. Sie verwalten URIs und ermöglichen Serialisierung.

```typescript
const resourceSet = new BasicResourceSet();
resourceSet.getPackageRegistry().set(pkg.getNsURI()!, pkg);

const resource = resourceSet.createResource(URI.createURI('file://model.xmi'));
resource.getContents().push(rootObject);

await resource.save();
```

### should add objects to resource

Objekte zur Resource hinzufügen

```typescript
const resource = resourceSet.createResource(URI.createURI('model.xmi'));
const obj = factory.create(MyClass);

resource.getContents().push(obj);
obj.eResource(); // resource
```

### should save and track modifications

Modifikationen tracken und speichern

```typescript
resource.isModified(); // false

obj.eSet(attr, 'new value');
resource.setModified(true);
resource.isModified(); // true

await resource.save();
resource.isModified(); // false
```

### should resolve URI fragments

URI-Fragmente für Navigation Jedes Objekt in einer Resource hat ein eindeutiges Fragment.

```typescript
const fragment = resource.getURIFragment(obj); // '/0' oder '/0/0'
const resolved = resource.getEObject(fragment);
resolved === obj; // true
```

## Renaming

Umbenennung von Features und Classifiers Namen können zur Laufzeit geändert werden und der Name-Index wird automatisch aktualisiert.

```typescript
const attr = new BasicEAttribute();
attr.setName('oldName');
myClass.addFeature(attr);

myClass.getEStructuralFeature('oldName'); // attr

attr.setName('newName');
myClass.getEStructuralFeature('newName'); // attr
myClass.getEStructuralFeature('oldName'); // null
```

### should handle renaming structural features

Strukturelle Features umbenennen

```typescript
attr.setName('newName');
myClass.getEStructuralFeature('newName'); // attr
myClass.getEStructuralFeature('oldName'); // null
```

### should handle renaming classifiers

Classifiers umbenennen

```typescript
pkg.getEClassifier('OldName'); // myClass
myClass.setName('NewName');
pkg.getEClassifier('NewName'); // myClass
pkg.getEClassifier('OldName'); // null
```

## Adding Duplicates

Duplikat-Handling Verhalten beim mehrfachen Hinzufügen desselben Objekts zu Containment-Referenzen.

```typescript
const employees = dept.eGet(employeesRef) as EObject[];
employees.push(emp);
employees.push(emp); // Duplikat - Verhalten implementation-spezifisch
```

### should handle duplicate adds to containment reference

Duplikate in Containment-Referenz Das Verhalten bei Duplikaten ist implementations-spezifisch.

```typescript
employees.push(emp);
employees.length; // 1

employees.push(emp); // Gleicher Mitarbeiter
// EMF erlaubt typischerweise Duplikate in Listen
```


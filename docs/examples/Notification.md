# Notification

## Notification System

Tests für das EMF Notification System  Das Notification System besteht aus drei Hauptkomponenten: 1.  Notification  - Beschreibt eine Änderung (eventType, feature, oldValue, newValue) 2.  Adapter  - Empfängt Notifications via `notifyChanged()` 3.  Notifier  - Sendet Notifications an registrierte Adapter

## NotificationImpl

Tests für NotificationImpl  Eine Notification enthält alle Informationen über eine Modelländerung: - `notifier` - Das geänderte Objekt - `eventType` - Art der Änderung (SET, UNSET, ADD, REMOVE, etc.) - `feature` - Das geänderte Feature - `oldValue` / `newValue` - Werte vor/nach der Änderung - `position` - Index bei Listen-Operationen

### should create notification with correct properties

Notification mit allen Properties erstellen

```typescript
const notification = new NotificationImpl(
  notifier,              // Das geänderte Objekt
  NotificationType.SET,  // Event-Typ
  feature,               // Das Feature
  'oldValue',            // Alter Wert
  'newValue'             // Neuer Wert
);
```

### should detect touch (old == new)

Touch-Detection: oldValue === newValue  Ein "Touch" ist eine Notification bei der sich der Wert nicht ändert. Nützlich um unnötige Updates zu vermeiden.

```typescript
if (notification.isTouch()) {
  return; // Keine echte Änderung, ignorieren
}
```

### should detect reset when new value equals default

Reset-Detection: newValue === defaultValue  `isReset()` prüft ob ein Feature auf seinen Standardwert zurückgesetzt wurde.

```typescript
if (notification.isReset()) {
  console.log('Feature wurde auf Standardwert zurückgesetzt');
}
```

### should store position for list operations

Position für Listen-Operationen (ADD, REMOVE, MOVE)  Bei Listen-Operationen enthält `position` den Index.

```typescript
const notification = new NotificationImpl(
  list, NotificationType.ADD, feature, null, newItem, 5
);
notification.getPosition(); // 5
```

## BasicNotifier

Tests für BasicNotifier  Ein Notifier verwaltet eine Liste von Adaptern und sendet Notifications.  Methoden: - `eAdapters()` - Liste aller registrierten Adapter - `eAdapterAdd(adapter)` - Adapter hinzufügen - `eAdapterRemove(adapter)` - Adapter entfernen - `eNotify(notification)` - Notification an alle Adapter senden - `eDeliver()` / `eSetDeliver(boolean)` - Delivery steuern

### should add adapters

Adapter zum Notifier hinzufügen

```typescript
const notifier = new BasicNotifier();
const adapter = new MyAdapter();
notifier.eAdapterAdd(adapter);

// Adapter ist registriert und target gesetzt
notifier.eAdapters().includes(adapter); // true
adapter.getTarget() === notifier;       // true
```

### should remove adapters

Adapter vom Notifier entfernen

```typescript
notifier.eAdapterRemove(adapter); // returns true if found
```

### should notify adapters

Notifications an alle Adapter senden

```typescript
const notification = new NotificationImpl(
  notifier, NotificationType.SET, feature, 'old', 'new'
);
notifier.eNotify(notification);
// Alle registrierten Adapter erhalten die Notification
```

### should respect eDeliver setting

eDeliver steuert ob Notifications gesendet werden  Nützlich für Batch-Updates ohne viele Notifications.

```typescript
notifier.eSetDeliver(false);
// Änderungen ohne Notifications...
object.eSet(attr1, val1);
object.eSet(attr2, val2);
notifier.eSetDeliver(true);
```

## BasicEObject Notifications

Tests für EObject Notifications  EObjects senden automatisch Notifications bei `eSet()` und `eUnset()`.

```typescript
const person = factory.create(PersonClass);
(person as any).eAdapterAdd(new MyAdapter());

person.eSet(nameAttr, 'John'); // Sendet SET Notification
person.eUnset(nameAttr);       // Sendet UNSET Notification
```

### should send SET notification on eSet

SET Notification bei eSet()

```typescript
person.eSet(nameAttr, 'John');
// Notification: { eventType: SET, feature: nameAttr, newValue: 'John' }
```

### should send SET notification with old value

SET Notification enthält alten und neuen Wert

```typescript
person.eSet(nameAttr, 'John');
person.eSet(nameAttr, 'Jane');
// Notification: { oldValue: 'John', newValue: 'Jane' }
```

### should send UNSET notification on eUnset

UNSET Notification bei eUnset()

```typescript
person.eSet(nameAttr, 'John');
person.eUnset(nameAttr);
// Notification: { eventType: UNSET, oldValue: 'John' }
```

### should not send notification when delivery is disabled

Delivery deaktivieren für Batch-Updates

```typescript
(person as any).eSetDeliver(false);
person.eSet(attr1, val1); // Keine Notification
person.eSet(attr2, val2); // Keine Notification
(person as any).eSetDeliver(true);
```

## EContentAdapter

Tests für EContentAdapter  Der EContentAdapter folgt automatisch der Containment-Hierarchie und registriert sich bei allen enthaltenen Objekten. Perfekt für: - Model-weites Change-Tracking - Dirty-State Management - Validierung bei Änderungen

```typescript
class ModelWatcher extends EContentAdapter {
  notifyChanged(notification: Notification): void {
    console.log('Änderung im Model:', notification);
    super.notifyChanged(notification); // WICHTIG!
  }
}

(rootObject as any).eAdapterAdd(new ModelWatcher());
// Jetzt werden alle Änderungen im gesamten Baum getrackt
```

### should automatically attach to contained objects

Automatische Registrierung bei Containment  Wenn ein EContentAdapter zu einem Objekt hinzugefügt wird, registriert er sich automatisch bei allen enthaltenen Objekten.

```typescript
// Hierarchie: parent -> child
const adapter = new MyContentAdapter();
(parent as any).eAdapterAdd(adapter);

// Adapter ist auf BEIDEN Objekten!
(parent as any).eAdapters().includes(adapter); // true
(child as any).eAdapters().includes(adapter);  // true
```

### should attach to newly added contained objects

Neue Objekte werden automatisch getrackt  Wenn ein neues Objekt zur Containment-Hierarchie hinzugefügt wird, registriert sich der EContentAdapter automatisch.

```typescript
(parent as any).eAdapterAdd(new MyContentAdapter());

// Neues Kind hinzufügen
const newChild = factory.create(PersonClass);
children.push(newChild);

// Adapter ist automatisch auch auf newChild!
```

### should receive notifications from contained objects

Notifications von allen Objekten empfangen  Der EContentAdapter empfängt Notifications von ALLEN Objekten in der Containment-Hierarchie.

```typescript
(parent as any).eAdapterAdd(adapter);

// Änderung am KIND
child.eSet(nameAttr, 'NewName');

// Adapter empfängt die Notification!
adapter.notifications[0].getNotifier() === child; // true
```

### should handle deeply nested containment

Tief verschachtelte Containment-Hierarchien  Der EContentAdapter folgt der gesamten Hierarchie, egal wie tief.

```typescript
// Hierarchie: grandparent -> parent -> child
(grandparent as any).eAdapterAdd(adapter);

// Adapter ist auf ALLEN Ebenen
(grandparent as any).eAdapters().includes(adapter); // true
(parent as any).eAdapters().includes(adapter);      // true
(child as any).eAdapters().includes(adapter);       // true
```

## Adapter isAdapterForType

Tests für Adapter.isAdapterForType()  `isAdapterForType()` ermöglicht das Finden von Adaptern nach Typ. Standardmäßig gibt `AdapterImpl.isAdapterForType()` immer `false` zurück.

```typescript
const MY_TYPE = Symbol('MyAdapter');

class TypedAdapter extends AdapterImpl {
  isAdapterForType(type: any): boolean {
    return type === MY_TYPE;
  }
}

// Adapter nach Typ finden
const adapter = eAdapters.find(a => a.isAdapterForType(MY_TYPE));
```


/**
 * @fileoverview Tests for EMF Notification System
 *
 * Das EMF Notification System ermöglicht das Tracking von Modelländerungen.
 * Diese Tests demonstrieren die Verwendung von:
 * - {@link Notification} - Beschreibt eine Änderung an einem Feature
 * - {@link Adapter} - Empfängt Benachrichtigungen von Notifiern
 * - {@link Notifier} - Sendet Benachrichtigungen an registrierte Adapter
 * - {@link EContentAdapter} - Adapter der automatisch Containment-Hierarchien folgt
 *
 * @example
 * ```typescript
 * // Adapter erstellen und registrieren
 * const adapter = new MyAdapter();
 * (eObject as any).eAdapterAdd(adapter);
 *
 * // Bei Änderungen wird adapter.notifyChanged() aufgerufen
 * eObject.eSet(feature, newValue);
 * ```
 *
 * @module tests/Notification
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  Notification,
  NotificationImpl,
  NotificationType,
  Adapter,
  AdapterImpl,
  Notifier,
  BasicNotifier,
  EContentAdapter,
} from '../src/notify';
import {
  EClass,
  EAttribute,
  EReference,
  EPackage,
  EFactory,
  EObject,
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicEPackage,
  EcoreDataTypes,
} from '../src';

/**
 * Ein Test-Adapter der alle empfangenen Notifications aufzeichnet.
 *
 * @example
 * ```typescript
 * const adapter = new RecordingAdapter();
 * notifier.eAdapterAdd(adapter);
 *
 * // Nach Änderungen:
 * console.log(adapter.notifications); // Alle Notifications
 * ```
 */
class RecordingAdapter extends AdapterImpl {
  /** Liste aller empfangenen Notifications */
  public notifications: Notification[] = [];

  /**
   * Wird bei jeder Änderung aufgerufen.
   * @param notification - Die Benachrichtigung über die Änderung
   */
  notifyChanged(notification: Notification): void {
    this.notifications.push(notification);
  }

  /** Löscht alle aufgezeichneten Notifications */
  clear(): void {
    this.notifications = [];
  }
}

/**
 * Ein EContentAdapter der Notifications und Target-Änderungen aufzeichnet.
 *
 * Der EContentAdapter folgt automatisch der Containment-Hierarchie und
 * registriert sich bei allen enthaltenen Objekten.
 *
 * @example
 * ```typescript
 * const adapter = new RecordingContentAdapter();
 * (parent as any).eAdapterAdd(adapter);
 *
 * // Adapter ist jetzt auch auf allen Kindern registriert
 * console.log(adapter.targetsAdded); // [parent, child1, child2, ...]
 * ```
 */
class RecordingContentAdapter extends EContentAdapter {
  /** Liste aller empfangenen Notifications */
  public notifications: Notification[] = [];
  /** Liste aller Objekte zu denen der Adapter hinzugefügt wurde */
  public targetsAdded: any[] = [];
  /** Liste aller Objekte von denen der Adapter entfernt wurde */
  public targetsRemoved: any[] = [];

  /**
   * Wird bei jeder Änderung aufgerufen.
   * WICHTIG: super.notifyChanged() muss aufgerufen werden für Containment-Tracking!
   * @param notification - Die Benachrichtigung über die Änderung
   */
  notifyChanged(notification: Notification): void {
    this.notifications.push(notification);
    super.notifyChanged(notification);
  }

  /**
   * Wird aufgerufen wenn der Adapter zu einem Notifier hinzugefügt wird.
   * @param notifier - Das Objekt zu dem der Adapter hinzugefügt wird
   */
  protected addAdapter(notifier: Notifier): void {
    this.targetsAdded.push(notifier);
    super.addAdapter(notifier);
  }

  /**
   * Wird aufgerufen wenn der Adapter von einem Notifier entfernt wird.
   * @param notifier - Das Objekt von dem der Adapter entfernt wird
   */
  protected removeAdapter(notifier: Notifier): void {
    this.targetsRemoved.push(notifier);
    super.removeAdapter(notifier);
  }

  /** Löscht alle aufgezeichneten Daten */
  clear(): void {
    this.notifications = [];
    this.targetsAdded = [];
    this.targetsRemoved = [];
  }
}

/**
 * Erstellt ein Test-Metamodell mit einer Person-Klasse.
 *
 * Das Metamodell enthält:
 * - **Person** Klasse mit:
 *   - `name: EString` - Name der Person
 *   - `age: EInt` - Alter der Person
 *   - `children: Person[*]` - Containment-Referenz zu Kindern
 *   - `father: Person` - Bidirektionale Referenz zum Vater
 *
 * @example
 * ```typescript
 * const { factory, PersonClass, nameAttr } = createTestPackage();
 * const person = factory.create(PersonClass);
 * person.eSet(nameAttr, 'John');
 * ```
 *
 * @returns Das Package mit Factory und allen Metamodell-Elementen
 */
function createTestPackage(): {
  /** Das EPackage */
  pkg: EPackage;
  /** Die Factory zum Erstellen von Instanzen */
  factory: EFactory;
  /** Die Person EClass */
  PersonClass: EClass;
  /** Das name Attribut (EString) */
  nameAttr: EAttribute;
  /** Das age Attribut (EInt) */
  ageAttr: EAttribute;
  /** Die children Containment-Referenz (many) */
  childrenRef: EReference;
  /** Die father Referenz (bidirektional zu children) */
  fatherRef: EReference;
} {
  const pkg = new BasicEPackage();
  pkg.setName('testpkg');
  pkg.setNsURI('http://test.notify');
  pkg.setNsPrefix('test');

  const PersonClass = new BasicEClass();
  PersonClass.setName('Person');
  pkg.getEClassifiers().push(PersonClass);

  const nameAttr = new BasicEAttribute();
  nameAttr.setName('name');
  nameAttr.setEType(EcoreDataTypes.EString);
  (PersonClass as BasicEClass).addFeature(nameAttr);

  const ageAttr = new BasicEAttribute();
  ageAttr.setName('age');
  ageAttr.setEType(EcoreDataTypes.EInt);
  (PersonClass as BasicEClass).addFeature(ageAttr);

  const childrenRef = new BasicEReference();
  childrenRef.setName('children');
  childrenRef.setEType(PersonClass);
  childrenRef.setContainment(true);
  childrenRef.setUpperBound(-1);
  (PersonClass as BasicEClass).addFeature(childrenRef);

  const fatherRef = new BasicEReference();
  fatherRef.setName('father');
  fatherRef.setEType(PersonClass);
  fatherRef.setContainment(false);
  fatherRef.setEOpposite(childrenRef);
  (PersonClass as BasicEClass).addFeature(fatherRef);

  childrenRef.setEOpposite(fatherRef);

  const factory = pkg.getEFactoryInstance();

  return { pkg, factory, PersonClass, nameAttr, ageAttr, childrenRef, fatherRef };
}

/**
 * @description Tests für das EMF Notification System
 *
 * Das Notification System besteht aus drei Hauptkomponenten:
 * 1. **Notification** - Beschreibt eine Änderung (eventType, feature, oldValue, newValue)
 * 2. **Adapter** - Empfängt Notifications via `notifyChanged()`
 * 3. **Notifier** - Sendet Notifications an registrierte Adapter
 */
describe('Notification System', () => {
  /**
   * @description Tests für NotificationImpl
   *
   * Eine Notification enthält alle Informationen über eine Modelländerung:
   * - `notifier` - Das geänderte Objekt
   * - `eventType` - Art der Änderung (SET, UNSET, ADD, REMOVE, etc.)
   * - `feature` - Das geänderte Feature
   * - `oldValue` / `newValue` - Werte vor/nach der Änderung
   * - `position` - Index bei Listen-Operationen
   */
  describe('NotificationImpl', () => {
    /**
     * @description Notification mit allen Properties erstellen
     *
     * @example
     * ```typescript
     * const notification = new NotificationImpl(
     *   notifier,              // Das geänderte Objekt
     *   NotificationType.SET,  // Event-Typ
     *   feature,               // Das Feature
     *   'oldValue',            // Alter Wert
     *   'newValue'             // Neuer Wert
     * );
     * ```
     */
    it('should create notification with correct properties', () => {
      const notifier = {};
      const feature = new BasicEAttribute();
      feature.setName('testFeature');

      const notification = new NotificationImpl(
        notifier,
        NotificationType.SET,
        feature,
        'old',
        'new'
      );

      expect(notification.getNotifier()).toBe(notifier);
      expect(notification.getEventType()).toBe(NotificationType.SET);
      expect(notification.getFeature()).toBe(feature);
      expect(notification.getOldValue()).toBe('old');
      expect(notification.getNewValue()).toBe('new');
      expect(notification.getPosition()).toBe(-1);
    });

    /**
     * @description Touch-Detection: oldValue === newValue
     *
     * Ein "Touch" ist eine Notification bei der sich der Wert nicht ändert.
     * Nützlich um unnötige Updates zu vermeiden.
     *
     * @example
     * ```typescript
     * if (notification.isTouch()) {
     *   return; // Keine echte Änderung, ignorieren
     * }
     * ```
     */
    it('should detect touch (old == new)', () => {
      const notification = new NotificationImpl(
        {},
        NotificationType.SET,
        null,
        'same',
        'same'
      );
      expect(notification.isTouch()).toBe(true);

      const notification2 = new NotificationImpl(
        {},
        NotificationType.SET,
        null,
        'old',
        'new'
      );
      expect(notification2.isTouch()).toBe(false);
    });

    /**
     * @description Reset-Detection: newValue === defaultValue
     *
     * `isReset()` prüft ob ein Feature auf seinen Standardwert zurückgesetzt wurde.
     *
     * @example
     * ```typescript
     * if (notification.isReset()) {
     *   console.log('Feature wurde auf Standardwert zurückgesetzt');
     * }
     * ```
     */
    it('should detect reset when new value equals default', () => {
      // Create feature with EString type which has null default
      const feature = new BasicEAttribute();
      feature.setName('test');
      feature.setEType(EcoreDataTypes.EString);

      // isReset is true when newValue equals the feature's default (null for EString)
      const resetNotification = new NotificationImpl(
        {},
        NotificationType.SET,
        feature,
        'old',
        null
      );
      expect(resetNotification.isReset()).toBe(true);

      // When newValue doesn't match default, isReset is false
      const notResetNotification = new NotificationImpl(
        {},
        NotificationType.SET,
        feature,
        'old',
        'otherValue'
      );
      expect(notResetNotification.isReset()).toBe(false);

      // Without a feature, isReset is always false
      const noFeatureNotification = new NotificationImpl(
        {},
        NotificationType.SET,
        null,
        'old',
        'new'
      );
      expect(noFeatureNotification.isReset()).toBe(false);
    });

    /**
     * @description Position für Listen-Operationen (ADD, REMOVE, MOVE)
     *
     * Bei Listen-Operationen enthält `position` den Index.
     *
     * @example
     * ```typescript
     * const notification = new NotificationImpl(
     *   list, NotificationType.ADD, feature, null, newItem, 5
     * );
     * notification.getPosition(); // 5
     * ```
     */
    it('should store position for list operations', () => {
      const notification = new NotificationImpl(
        {},
        NotificationType.ADD,
        null,
        null,
        'newItem',
        5
      );
      expect(notification.getPosition()).toBe(5);
    });
  });

  /**
   * @description Tests für BasicNotifier
   *
   * Ein Notifier verwaltet eine Liste von Adaptern und sendet Notifications.
   *
   * Methoden:
   * - `eAdapters()` - Liste aller registrierten Adapter
   * - `eAdapterAdd(adapter)` - Adapter hinzufügen
   * - `eAdapterRemove(adapter)` - Adapter entfernen
   * - `eNotify(notification)` - Notification an alle Adapter senden
   * - `eDeliver()` / `eSetDeliver(boolean)` - Delivery steuern
   */
  describe('BasicNotifier', () => {
    /**
     * @description Adapter zum Notifier hinzufügen
     *
     * @example
     * ```typescript
     * const notifier = new BasicNotifier();
     * const adapter = new MyAdapter();
     * notifier.eAdapterAdd(adapter);
     *
     * // Adapter ist registriert und target gesetzt
     * notifier.eAdapters().includes(adapter); // true
     * adapter.getTarget() === notifier;       // true
     * ```
     */
    it('should add adapters', () => {
      const notifier = new BasicNotifier();
      const adapter = new RecordingAdapter();

      notifier.eAdapterAdd(adapter);

      expect(notifier.eAdapters()).toContain(adapter);
      expect(adapter.getTarget()).toBe(notifier);
    });

    /**
     * @description Adapter vom Notifier entfernen
     *
     * @example
     * ```typescript
     * notifier.eAdapterRemove(adapter); // returns true if found
     * ```
     */
    it('should remove adapters', () => {
      const notifier = new BasicNotifier();
      const adapter = new RecordingAdapter();

      notifier.eAdapterAdd(adapter);
      const removed = notifier.eAdapterRemove(adapter);

      expect(removed).toBe(true);
      expect(notifier.eAdapters()).not.toContain(adapter);
    });

    /**
     * @description Notifications an alle Adapter senden
     *
     * @example
     * ```typescript
     * const notification = new NotificationImpl(
     *   notifier, NotificationType.SET, feature, 'old', 'new'
     * );
     * notifier.eNotify(notification);
     * // Alle registrierten Adapter erhalten die Notification
     * ```
     */
    it('should notify adapters', () => {
      const notifier = new BasicNotifier();
      const adapter = new RecordingAdapter();

      notifier.eAdapterAdd(adapter);

      const notification = new NotificationImpl(
        notifier,
        NotificationType.SET,
        null,
        'old',
        'new'
      );
      notifier.eNotify(notification);

      expect(adapter.notifications).toHaveLength(1);
      expect(adapter.notifications[0]).toBe(notification);
    });

    /**
     * @description eDeliver steuert ob Notifications gesendet werden
     *
     * Nützlich für Batch-Updates ohne viele Notifications.
     *
     * @example
     * ```typescript
     * notifier.eSetDeliver(false);
     * // Änderungen ohne Notifications...
     * object.eSet(attr1, val1);
     * object.eSet(attr2, val2);
     * notifier.eSetDeliver(true);
     * ```
     */
    it('should respect eDeliver setting', () => {
      const notifier = new BasicNotifier();
      const adapter = new RecordingAdapter();

      notifier.eAdapterAdd(adapter);
      notifier.eSetDeliver(false);

      const notification = new NotificationImpl(
        notifier,
        NotificationType.SET,
        null,
        'old',
        'new'
      );
      notifier.eNotify(notification);

      expect(adapter.notifications).toHaveLength(0);
    });

    /**
     * @description REMOVING_ADAPTER Notification beim Entfernen
     *
     * Wenn ein Adapter entfernt wird, erhält er eine letzte Notification
     * mit eventType REMOVING_ADAPTER.
     */
    it('should send REMOVING_ADAPTER notification when removing adapter', () => {
      const notifier = new BasicNotifier();
      const adapter = new RecordingAdapter();

      notifier.eAdapterAdd(adapter);
      notifier.eAdapterRemove(adapter);

      expect(adapter.notifications).toHaveLength(1);
      expect(adapter.notifications[0].getEventType()).toBe(NotificationType.REMOVING_ADAPTER);
    });
  });

  /**
   * @description Tests für EObject Notifications
   *
   * EObjects senden automatisch Notifications bei `eSet()` und `eUnset()`.
   *
   * @example
   * ```typescript
   * const person = factory.create(PersonClass);
   * (person as any).eAdapterAdd(new MyAdapter());
   *
   * person.eSet(nameAttr, 'John'); // Sendet SET Notification
   * person.eUnset(nameAttr);       // Sendet UNSET Notification
   * ```
   */
  describe('BasicEObject Notifications', () => {
    let pkg: EPackage;
    let factory: EFactory;
    let PersonClass: EClass;
    let nameAttr: EAttribute;
    let ageAttr: EAttribute;
    let childrenRef: EReference;

    beforeEach(() => {
      const testModel = createTestPackage();
      pkg = testModel.pkg;
      factory = testModel.factory;
      PersonClass = testModel.PersonClass;
      nameAttr = testModel.nameAttr;
      ageAttr = testModel.ageAttr;
      childrenRef = testModel.childrenRef;
    });

    /**
     * @description SET Notification bei eSet()
     *
     * @example
     * ```typescript
     * person.eSet(nameAttr, 'John');
     * // Notification: { eventType: SET, feature: nameAttr, newValue: 'John' }
     * ```
     */
    it('should send SET notification on eSet', () => {
      const person = factory.create(PersonClass);
      const adapter = new RecordingAdapter();

      (person as any).eAdapterAdd(adapter);
      person.eSet(nameAttr, 'John');

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.SET);
      expect(notification.getFeature()).toBe(nameAttr);
      expect(notification.getOldValue()).toBeUndefined();
      expect(notification.getNewValue()).toBe('John');
    });

    /**
     * @description SET Notification enthält alten und neuen Wert
     *
     * @example
     * ```typescript
     * person.eSet(nameAttr, 'John');
     * person.eSet(nameAttr, 'Jane');
     * // Notification: { oldValue: 'John', newValue: 'Jane' }
     * ```
     */
    it('should send SET notification with old value', () => {
      const person = factory.create(PersonClass);
      person.eSet(nameAttr, 'John');

      const adapter = new RecordingAdapter();
      (person as any).eAdapterAdd(adapter);
      person.eSet(nameAttr, 'Jane');

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getOldValue()).toBe('John');
      expect(notification.getNewValue()).toBe('Jane');
    });

    /**
     * @description UNSET Notification bei eUnset()
     *
     * @example
     * ```typescript
     * person.eSet(nameAttr, 'John');
     * person.eUnset(nameAttr);
     * // Notification: { eventType: UNSET, oldValue: 'John' }
     * ```
     */
    it('should send UNSET notification on eUnset', () => {
      const person = factory.create(PersonClass);
      person.eSet(nameAttr, 'John');

      const adapter = new RecordingAdapter();
      (person as any).eAdapterAdd(adapter);
      person.eUnset(nameAttr);

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.UNSET);
      expect(notification.getFeature()).toBe(nameAttr);
      expect(notification.getOldValue()).toBe('John');
    });

    /**
     * @description Delivery deaktivieren für Batch-Updates
     *
     * @example
     * ```typescript
     * (person as any).eSetDeliver(false);
     * person.eSet(attr1, val1); // Keine Notification
     * person.eSet(attr2, val2); // Keine Notification
     * (person as any).eSetDeliver(true);
     * ```
     */
    it('should not send notification when delivery is disabled', () => {
      const person = factory.create(PersonClass);
      const adapter = new RecordingAdapter();

      (person as any).eAdapterAdd(adapter);
      (person as any).eSetDeliver(false);
      person.eSet(nameAttr, 'John');

      expect(adapter.notifications).toHaveLength(0);
    });

    /**
     * @description EObjects implementieren das Notifier Interface
     *
     * Verfügbare Methoden:
     * - `eAdapters()` - Liste der Adapter
     * - `eDeliver()` - Ist Delivery aktiv?
     * - `eSetDeliver(boolean)` - Delivery steuern
     * - `eNotify(notification)` - Notification senden
     */
    it('should implement Notifier interface', () => {
      const person = factory.create(PersonClass);

      expect((person as any).eAdapters()).toBeDefined();
      expect((person as any).eDeliver()).toBe(true);
      expect(typeof (person as any).eNotify).toBe('function');
      expect(typeof (person as any).eSetDeliver).toBe('function');
    });
  });

  /**
   * @description Tests für EContentAdapter
   *
   * Der EContentAdapter folgt automatisch der Containment-Hierarchie und
   * registriert sich bei allen enthaltenen Objekten. Perfekt für:
   * - Model-weites Change-Tracking
   * - Dirty-State Management
   * - Validierung bei Änderungen
   *
   * @example
   * ```typescript
   * class ModelWatcher extends EContentAdapter {
   *   notifyChanged(notification: Notification): void {
   *     console.log('Änderung im Model:', notification);
   *     super.notifyChanged(notification); // WICHTIG!
   *   }
   * }
   *
   * (rootObject as any).eAdapterAdd(new ModelWatcher());
   * // Jetzt werden alle Änderungen im gesamten Baum getrackt
   * ```
   */
  describe('EContentAdapter', () => {
    let pkg: EPackage;
    let factory: EFactory;
    let PersonClass: EClass;
    let nameAttr: EAttribute;
    let childrenRef: EReference;

    beforeEach(() => {
      const testModel = createTestPackage();
      pkg = testModel.pkg;
      factory = testModel.factory;
      PersonClass = testModel.PersonClass;
      nameAttr = testModel.nameAttr;
      childrenRef = testModel.childrenRef;
    });

    /**
     * @description Automatische Registrierung bei Containment
     *
     * Wenn ein EContentAdapter zu einem Objekt hinzugefügt wird,
     * registriert er sich automatisch bei allen enthaltenen Objekten.
     *
     * @example
     * ```typescript
     * // Hierarchie: parent -> child
     * const adapter = new MyContentAdapter();
     * (parent as any).eAdapterAdd(adapter);
     *
     * // Adapter ist auf BEIDEN Objekten!
     * (parent as any).eAdapters().includes(adapter); // true
     * (child as any).eAdapters().includes(adapter);  // true
     * ```
     */
    it('should automatically attach to contained objects', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);
      parent.eSet(nameAttr, 'Parent');
      child.eSet(nameAttr, 'Child');

      // Add child to parent first
      const children = parent.eGet(childrenRef) as EObject[];
      children.push(child);

      // Now add content adapter to parent
      const adapter = new RecordingContentAdapter();
      (parent as any).eAdapterAdd(adapter);

      // Adapter should be on both parent and child
      expect((parent as any).eAdapters()).toContain(adapter);
      expect((child as any).eAdapters()).toContain(adapter);
    });

    /**
     * @description Neue Objekte werden automatisch getrackt
     *
     * Wenn ein neues Objekt zur Containment-Hierarchie hinzugefügt wird,
     * registriert sich der EContentAdapter automatisch.
     *
     * @example
     * ```typescript
     * (parent as any).eAdapterAdd(new MyContentAdapter());
     *
     * // Neues Kind hinzufügen
     * const newChild = factory.create(PersonClass);
     * children.push(newChild);
     *
     * // Adapter ist automatisch auch auf newChild!
     * ```
     */
    it('should attach to newly added contained objects', () => {
      const parent = factory.create(PersonClass);
      parent.eSet(nameAttr, 'Parent');

      const adapter = new RecordingContentAdapter();
      (parent as any).eAdapterAdd(adapter);
      adapter.clear();

      // Add a new child
      const child = factory.create(PersonClass);
      child.eSet(nameAttr, 'Child');

      const children = parent.eGet(childrenRef) as EObject[];
      children.push(child);

      // Trigger notification manually (in real impl this would be automatic)
      const notification = new NotificationImpl(
        parent,
        NotificationType.ADD,
        childrenRef,
        null,
        child
      );
      (parent as any).eNotify(notification);

      // Adapter should now be on child
      expect(adapter.targetsAdded).toContain(child);
    });

    /**
     * @description Notifications von allen Objekten empfangen
     *
     * Der EContentAdapter empfängt Notifications von ALLEN Objekten
     * in der Containment-Hierarchie.
     *
     * @example
     * ```typescript
     * (parent as any).eAdapterAdd(adapter);
     *
     * // Änderung am KIND
     * child.eSet(nameAttr, 'NewName');
     *
     * // Adapter empfängt die Notification!
     * adapter.notifications[0].getNotifier() === child; // true
     * ```
     */
    it('should receive notifications from contained objects', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);
      parent.eSet(nameAttr, 'Parent');

      const children = parent.eGet(childrenRef) as EObject[];
      children.push(child);

      const adapter = new RecordingContentAdapter();
      (parent as any).eAdapterAdd(adapter);
      adapter.clear();

      // Change child's name
      child.eSet(nameAttr, 'ChildName');

      // Adapter should have received notification
      expect(adapter.notifications).toHaveLength(1);
      expect(adapter.notifications[0].getNotifier()).toBe(child);
      expect(adapter.notifications[0].getNewValue()).toBe('ChildName');
    });

    /**
     * @description Tief verschachtelte Containment-Hierarchien
     *
     * Der EContentAdapter folgt der gesamten Hierarchie, egal wie tief.
     *
     * @example
     * ```typescript
     * // Hierarchie: grandparent -> parent -> child
     * (grandparent as any).eAdapterAdd(adapter);
     *
     * // Adapter ist auf ALLEN Ebenen
     * (grandparent as any).eAdapters().includes(adapter); // true
     * (parent as any).eAdapters().includes(adapter);      // true
     * (child as any).eAdapters().includes(adapter);       // true
     * ```
     */
    it('should handle deeply nested containment', () => {
      const grandparent = factory.create(PersonClass);
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      grandparent.eSet(nameAttr, 'Grandparent');
      parent.eSet(nameAttr, 'Parent');
      child.eSet(nameAttr, 'Child');

      // Build hierarchy
      const gpChildren = grandparent.eGet(childrenRef) as EObject[];
      gpChildren.push(parent);

      const pChildren = parent.eGet(childrenRef) as EObject[];
      pChildren.push(child);

      // Add adapter to grandparent
      const adapter = new RecordingContentAdapter();
      (grandparent as any).eAdapterAdd(adapter);

      // Adapter should be on all three
      expect((grandparent as any).eAdapters()).toContain(adapter);
      expect((parent as any).eAdapters()).toContain(adapter);
      expect((child as any).eAdapters()).toContain(adapter);
    });
  });

  /**
   * @description Tests für Adapter.isAdapterForType()
   *
   * `isAdapterForType()` ermöglicht das Finden von Adaptern nach Typ.
   * Standardmäßig gibt `AdapterImpl.isAdapterForType()` immer `false` zurück.
   *
   * @example
   * ```typescript
   * const MY_TYPE = Symbol('MyAdapter');
   *
   * class TypedAdapter extends AdapterImpl {
   *   isAdapterForType(type: any): boolean {
   *     return type === MY_TYPE;
   *   }
   * }
   *
   * // Adapter nach Typ finden
   * const adapter = eAdapters.find(a => a.isAdapterForType(MY_TYPE));
   * ```
   */
  describe('Adapter isAdapterForType', () => {
    /**
     * @description Standard-Implementierung gibt false zurück
     */
    it('should return false by default', () => {
      const adapter = new RecordingAdapter();
      expect(adapter.isAdapterForType('someType')).toBe(false);
      expect(adapter.isAdapterForType(123)).toBe(false);
    });
  });
});

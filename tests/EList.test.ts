/**
 * @fileoverview Tests for EList - Notifying Collections
 *
 * EList is a collection that sends notifications when elements are added, removed, or modified.
 * This mirrors Java EMF's EList behavior where:
 * - add() sends ADD notification
 * - remove() sends REMOVE notification
 * - addAll() sends ADD_MANY notification
 * - clear() sends REMOVE_MANY notification
 * - set() sends SET notification
 * - move() sends MOVE notification
 *
 * @module tests/EList
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  Notification,
  NotificationImpl,
  NotificationType,
  Adapter,
  AdapterImpl,
  EContentAdapter,
  Notifier,
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
  EList,
  isEList,
  BasicEList,
  createIndexedProxy,
} from '../src';

/**
 * A test adapter that records all received notifications.
 */
class RecordingAdapter extends AdapterImpl {
  public notifications: Notification[] = [];

  notifyChanged(notification: Notification): void {
    this.notifications.push(notification);
  }

  clear(): void {
    this.notifications = [];
  }
}

/**
 * An EContentAdapter that records notifications and target changes.
 */
class RecordingContentAdapter extends EContentAdapter {
  public notifications: Notification[] = [];
  public targetsAdded: any[] = [];
  public targetsRemoved: any[] = [];

  notifyChanged(notification: Notification): void {
    this.notifications.push(notification);
    super.notifyChanged(notification);
  }

  protected addAdapter(notifier: Notifier): void {
    this.targetsAdded.push(notifier);
    super.addAdapter(notifier);
  }

  protected removeAdapter(notifier: Notifier): void {
    this.targetsRemoved.push(notifier);
    super.removeAdapter(notifier);
  }

  clear(): void {
    this.notifications = [];
    this.targetsAdded = [];
    this.targetsRemoved = [];
  }
}

/**
 * Creates a test metamodel with a Person class.
 *
 * The metamodel contains:
 * - **Person** class with:
 *   - `name: EString` - Name of the person
 *   - `age: EInt` - Age of the person
 *   - `children: Person[*]` - Containment reference to children
 *   - `friends: Person[*]` - Non-containment reference to friends
 */
function createTestPackage(): {
  pkg: EPackage;
  factory: EFactory;
  PersonClass: EClass;
  nameAttr: EAttribute;
  ageAttr: EAttribute;
  childrenRef: EReference;
  friendsRef: EReference;
} {
  const pkg = new BasicEPackage();
  pkg.setName('testpkg');
  pkg.setNsURI('http://test.elist');
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

  const friendsRef = new BasicEReference();
  friendsRef.setName('friends');
  friendsRef.setEType(PersonClass);
  friendsRef.setContainment(false);
  friendsRef.setUpperBound(-1);
  (PersonClass as BasicEClass).addFeature(friendsRef);

  const factory = pkg.getEFactoryInstance();

  return { pkg, factory, PersonClass, nameAttr, ageAttr, childrenRef, friendsRef };
}

describe('EList', () => {
  let pkg: EPackage;
  let factory: EFactory;
  let PersonClass: EClass;
  let nameAttr: EAttribute;
  let childrenRef: EReference;
  let friendsRef: EReference;

  beforeEach(() => {
    const testModel = createTestPackage();
    pkg = testModel.pkg;
    factory = testModel.factory;
    PersonClass = testModel.PersonClass;
    nameAttr = testModel.nameAttr;
    childrenRef = testModel.childrenRef;
    friendsRef = testModel.friendsRef;
  });

  describe('Basic EList Operations', () => {
    it('should return an EList for multi-valued features', () => {
      const person = factory.create(PersonClass);
      const children = person.eGet(childrenRef);

      expect(isEList(children)).toBe(true);
      expect(children.size()).toBe(0);
    });

    it('should add elements with add()', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      expect(children.size()).toBe(1);
      expect(children.get(0)).toBe(child);
    });

    it('should remove elements with remove()', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);
      const removed = children.remove(child);

      expect(removed).toBe(true);
      expect(children.size()).toBe(0);
    });

    it('should support addAt() for insertion at specific index', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);
      const child3 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child3);
      children.addAt(1, child2);

      expect(children.size()).toBe(3);
      expect(children.get(0)).toBe(child1);
      expect(children.get(1)).toBe(child2);
      expect(children.get(2)).toBe(child3);
    });

    it('should support set() to replace elements', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      const old = children.set(0, child2);

      expect(old).toBe(child1);
      expect(children.get(0)).toBe(child2);
    });

    it('should support move() to reorder elements', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);
      const child3 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);
      children.add(child3);

      // Move child3 from index 2 to index 0
      children.move(0, 2);

      expect(children.get(0)).toBe(child3);
      expect(children.get(1)).toBe(child1);
      expect(children.get(2)).toBe(child2);
    });

    it('should support clear() to remove all elements', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);
      children.clear();

      expect(children.size()).toBe(0);
      expect(children.isEmpty()).toBe(true);
    });

    it('should support iteration with for...of', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);

      const collected: EObject[] = [];
      for (const child of children) {
        collected.push(child);
      }

      expect(collected).toEqual([child1, child2]);
    });

    it('should support toArray()', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);

      const array = children.toArray();
      expect(array).toEqual([child1, child2]);
    });
  });

  describe('EList Notifications', () => {
    it('should send ADD notification when adding element', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.ADD);
      expect(notification.getFeature()).toBe(childrenRef);
      expect(notification.getNewValue()).toBe(child);
      expect(notification.getOldValue()).toBeNull();
      expect(notification.getPosition()).toBe(0);
    });

    it('should send ADD notification with correct position', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.add(child2);

      expect(adapter.notifications).toHaveLength(1);
      expect(adapter.notifications[0].getPosition()).toBe(1);
    });

    it('should send REMOVE notification when removing element', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.remove(child);

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.REMOVE);
      expect(notification.getFeature()).toBe(childrenRef);
      expect(notification.getOldValue()).toBe(child);
      expect(notification.getNewValue()).toBeNull();
      expect(notification.getPosition()).toBe(0);
    });

    it('should send ADD_MANY notification when adding multiple elements', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);
      const child3 = factory.create(PersonClass);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.addAll([child1, child2, child3]);

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.ADD_MANY);
      expect(notification.getNewValue()).toEqual([child1, child2, child3]);
      expect(notification.getPosition()).toBe(0);
    });

    it('should send REMOVE_MANY notification when clearing list with multiple elements', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.clear();

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.REMOVE_MANY);
      expect(notification.getOldValue()).toEqual([child1, child2]);
    });

    it('should send REMOVE notification when clearing list with single element', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.clear();

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.REMOVE);
      expect(notification.getOldValue()).toBe(child);
    });

    it('should send SET notification when replacing element', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.set(0, child2);

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.SET);
      expect(notification.getOldValue()).toBe(child1);
      expect(notification.getNewValue()).toBe(child2);
      expect(notification.getPosition()).toBe(0);
    });

    it('should send MOVE notification when moving element', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);
      const child3 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);
      children.add(child3);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      // Move from index 2 to index 0
      children.move(0, 2);

      expect(adapter.notifications).toHaveLength(1);
      const notification = adapter.notifications[0];
      expect(notification.getEventType()).toBe(NotificationType.MOVE);
      expect(notification.getNewValue()).toBe(child3);
      expect(notification.getOldValue()).toBe(2); // Old position
      expect(notification.getPosition()).toBe(0); // New position
    });

    it('should not send notifications when delivery is disabled', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);
      (parent as any).eSetDeliver(false);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      expect(adapter.notifications).toHaveLength(0);
    });
  });

  describe('EList Containment Management', () => {
    it('should set container when adding to containment list', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      expect(child.eContainer()).toBe(parent);
      expect(child.eContainmentFeature()).toBe(childrenRef);
    });

    it('should clear container when removing from containment list', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);
      children.remove(child);

      expect(child.eContainer()).toBeNull();
    });

    it('should move element from old container when adding to new container', () => {
      const parent1 = factory.create(PersonClass);
      const parent2 = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children1 = parent1.eGet(childrenRef) as EList<EObject>;
      const children2 = parent2.eGet(childrenRef) as EList<EObject>;

      children1.add(child);
      expect(children1.size()).toBe(1);
      expect(child.eContainer()).toBe(parent1);

      // Adding to parent2 should remove from parent1
      children2.add(child);

      expect(children1.size()).toBe(0);
      expect(children2.size()).toBe(1);
      expect(child.eContainer()).toBe(parent2);
    });

    it('should update container when replacing element with set()', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);

      expect(child1.eContainer()).toBe(parent);

      children.set(0, child2);

      expect(child1.eContainer()).toBeNull();
      expect(child2.eContainer()).toBe(parent);
    });

    it('should clear all containers when calling clear()', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);
      children.add(child2);
      children.clear();

      expect(child1.eContainer()).toBeNull();
      expect(child2.eContainer()).toBeNull();
    });
  });

  describe('EContentAdapter with EList', () => {
    it('should receive notifications when elements are added to EList', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const adapter = new RecordingContentAdapter();
      (parent as any).eAdapterAdd(adapter);
      adapter.clear();

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      // Should have received ADD notification
      expect(adapter.notifications.length).toBeGreaterThanOrEqual(1);
      const addNotification = adapter.notifications.find(
        n => n.getEventType() === NotificationType.ADD
      );
      expect(addNotification).toBeDefined();
      expect(addNotification!.getNewValue()).toBe(child);
    });

    it('should attach to newly added contained objects via EList', () => {
      const parent = factory.create(PersonClass);

      const adapter = new RecordingContentAdapter();
      (parent as any).eAdapterAdd(adapter);
      adapter.clear();

      const child = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      // EContentAdapter should have attached to child
      expect(adapter.targetsAdded).toContain(child);
      expect((child as any).eAdapters()).toContain(adapter);
    });

    it('should receive notifications from deeply nested objects added via EList', () => {
      const grandparent = factory.create(PersonClass);

      const adapter = new RecordingContentAdapter();
      (grandparent as any).eAdapterAdd(adapter);
      adapter.clear();

      // Add parent to grandparent
      const parent = factory.create(PersonClass);
      const gpChildren = grandparent.eGet(childrenRef) as EList<EObject>;
      gpChildren.add(parent);

      // Add child to parent
      const child = factory.create(PersonClass);
      const pChildren = parent.eGet(childrenRef) as EList<EObject>;
      pChildren.add(child);

      adapter.clear();

      // Change child's name
      child.eSet(nameAttr, 'TestName');

      // Adapter should have received notification from child
      expect(adapter.notifications.length).toBe(1);
      expect(adapter.notifications[0].getNotifier()).toBe(child);
      expect(adapter.notifications[0].getNewValue()).toBe('TestName');
    });

    it('should detach from removed contained objects via EList', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      const adapter = new RecordingContentAdapter();
      (parent as any).eAdapterAdd(adapter);

      // Verify adapter is on child
      expect((child as any).eAdapters()).toContain(adapter);

      adapter.clear();
      children.remove(child);

      // Adapter should have been removed from child
      expect(adapter.targetsRemoved).toContain(child);
      expect((child as any).eAdapters()).not.toContain(adapter);
    });
  });

  describe('Non-Containment EList', () => {
    it('should not set container for non-containment references', () => {
      const person1 = factory.create(PersonClass);
      const person2 = factory.create(PersonClass);

      const friends = person1.eGet(friendsRef) as EList<EObject>;
      friends.add(person2);

      // person2 should NOT have person1 as container (friends is non-containment)
      expect(person2.eContainer()).toBeNull();
    });

    it('should send notifications for non-containment references', () => {
      const person1 = factory.create(PersonClass);
      const person2 = factory.create(PersonClass);

      const adapter = new RecordingAdapter();
      (person1 as any).eAdapterAdd(adapter);

      const friends = person1.eGet(friendsRef) as EList<EObject>;
      friends.add(person2);

      expect(adapter.notifications).toHaveLength(1);
      expect(adapter.notifications[0].getEventType()).toBe(NotificationType.ADD);
      expect(adapter.notifications[0].getNewValue()).toBe(person2);
    });
  });

  describe('Edge Cases', () => {
    it('should throw RangeError for invalid index in get()', () => {
      const parent = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;

      expect(() => children.get(0)).toThrow(RangeError);
      expect(() => children.get(-1)).toThrow(RangeError);
    });

    it('should throw RangeError for invalid index in set()', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;

      expect(() => children.set(0, child)).toThrow(RangeError);
    });

    it('should throw RangeError for invalid index in addAt()', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;

      expect(() => children.addAt(-1, child)).toThrow(RangeError);
      expect(() => children.addAt(5, child)).toThrow(RangeError);
    });

    it('should return false when removing non-existent element', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;

      expect(children.remove(child)).toBe(false);
    });

    it('should not send notification when clearing empty list', () => {
      const parent = factory.create(PersonClass);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.clear();

      expect(adapter.notifications).toHaveLength(0);
    });

    it('should not send notification when addAll with empty array', () => {
      const parent = factory.create(PersonClass);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      const result = children.addAll([]);

      expect(result).toBe(false);
      expect(adapter.notifications).toHaveLength(0);
    });

    it('should not send MOVE notification when moving to same position', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.move(0, 0);

      expect(adapter.notifications).toHaveLength(0);
    });

    it('should not send SET notification when setting same element', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);

      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children.set(0, child);

      expect(adapter.notifications).toHaveLength(0);
    });
  });

  /**
   * Array compatibility (#68).
   *
   * An EList is indexable and iterable but deliberately not an Array - see the
   * contract documented on the EList interface. These tests pin both halves:
   * what an EList does provide, and the one thing it must keep refusing.
   */
  describe('Array compatibility (#68)', () => {
    it('should support index reads on a directly constructed list', () => {
      const list = new BasicEList<string>();
      list.add('a');
      list.add('b');

      expect(list[0]).toBe('a');
      expect(list[1]).toBe('b');
      expect(list[2]).toBeUndefined();
    });

    it('should route index writes through set() so notifications are sent', () => {
      const parent = factory.create(PersonClass);
      const child1 = factory.create(PersonClass);
      const child2 = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(child1);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children[0] = child2;

      expect(children.get(0)).toBe(child2);
      expect(adapter.notifications).toHaveLength(1);
      expect(adapter.notifications[0].getEventType()).toBe(NotificationType.SET);
    });

    it('should append when assigning at list[length]', () => {
      const parent = factory.create(PersonClass);
      const child = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      children[0] = child;

      expect(children.size()).toBe(1);
      expect(adapter.notifications[0].getEventType()).toBe(NotificationType.ADD);
    });

    it('should reject sparse assignment beyond the end', () => {
      const list = new BasicEList<string>();
      list.add('a');

      expect(() => {
        list[5] = 'x';
      }).toThrow(RangeError);
    });

    it('should clear the list when length is set to 0', () => {
      const parent = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;
      children.add(factory.create(PersonClass));
      children.add(factory.create(PersonClass));

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      (children as any).length = 0;

      expect(children.size()).toBe(0);
      expect(adapter.notifications.length).toBeGreaterThan(0);
    });

    it('should truncate the tail when length is reduced', () => {
      const list = new BasicEList<string>();
      list.addAll(['a', 'b', 'c']);

      (list as any).length = 1;

      expect(list.toArray()).toEqual(['a']);
    });

    it('should report the index via the in operator', () => {
      const list = new BasicEList<string>();
      list.add('a');

      expect(0 in list).toBe(true);
      expect(1 in list).toBe(false);
    });

    it('should serialize as a plain array', () => {
      const list = new BasicEList<string>();
      list.addAll(['a', 'b']);

      expect(JSON.stringify(list)).toBe('["a","b"]');
    });

    it('should not serialize the internal owner and feature fields', () => {
      // Without toJSON() this produced {"data":[...],"owner":...,"feature":...}
      // and dragged the owning EObject into the output. Note that a list of
      // EObjects can still not be stringified - EObjects are cyclic themselves
      // via _eContainer, which is outside the scope of this list contract.
      const person = factory.create(PersonClass);
      const list = new BasicEList<string>(person, nameAttr);
      list.addAll(['a', 'b']);

      expect(JSON.stringify(list)).toBe('["a","b"]');
      expect(list.toJSON()).toEqual(['a', 'b']);
      expect(Array.isArray(list.toJSON())).toBe(true);
    });

    it('should concat values, arrays and other ELists', () => {
      const list = new BasicEList<string>();
      list.add('a');
      const other = new BasicEList<string>();
      other.add('d');

      expect(list.concat('b', ['c'], other)).toEqual(['a', 'b', 'c', 'd']);
      expect(list.toArray()).toEqual(['a']);
    });

    it('should sort in place and emit MOVE notifications', () => {
      const parent = factory.create(PersonClass);
      const children = parent.eGet(childrenRef) as EList<EObject>;
      const c1 = factory.create(PersonClass);
      const c2 = factory.create(PersonClass);
      c1.eSet(nameAttr, 'B');
      c2.eSet(nameAttr, 'A');
      children.addAll([c1, c2]);

      const adapter = new RecordingAdapter();
      (parent as any).eAdapterAdd(adapter);

      const result = children.sort((a, b) =>
        String(a.eGet(nameAttr)).localeCompare(String(b.eGet(nameAttr)))
      );

      expect(result).toBe(children);
      expect(children.get(0)).toBe(c2);
      expect(adapter.notifications.some(n => n.getEventType() === NotificationType.MOVE)).toBe(true);
    });

    it('should reverse in place', () => {
      const list = new BasicEList<string>();
      list.addAll(['a', 'b', 'c']);

      expect(list.reverse().toArray()).toEqual(['c', 'b', 'a']);
    });

    it('should provide join, at and lastIndexOf', () => {
      const list = new BasicEList<string>();
      list.addAll(['a', 'b', 'a']);

      expect(list.join('-')).toBe('a-b-a');
      expect(list.at(0)).toBe('a');
      expect(list.at(-1)).toBe('a');
      expect(list.at(3)).toBeUndefined();
      expect(list.lastIndexOf('a')).toBe(2);
    });

    it('should provide flatMap', () => {
      const list = new BasicEList<string>();
      list.addAll(['a', 'b']);

      expect(list.flatMap(v => [v, v.toUpperCase()])).toEqual(['a', 'A', 'b', 'B']);
    });

    it('should NOT be an Array', () => {
      // Deliberate: inheriting from Array would expose the length setter and raw
      // index assignment, both of which bypass notifications. Array.from() is
      // the documented way to obtain a real array.
      const list = new BasicEList<string>();
      list.add('a');

      expect(Array.isArray(list)).toBe(false);
      expect(Array.from(list)).toEqual(['a']);
      expect([...list]).toEqual(['a']);
    });

    it('should not stack a second proxy in createIndexedProxy', () => {
      const list = new BasicEList<string>();

      expect(createIndexedProxy(list)).toBe(list);
    });
  });
});
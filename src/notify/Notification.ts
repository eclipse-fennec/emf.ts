/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EStructuralFeature } from '../EStructuralFeature';

/**
 * Event type constants for notifications
 */
export const NotificationType = {
  /** A feature has been set */
  SET: 1,
  /** A feature has been unset */
  UNSET: 2,
  /** A value has been added to a list */
  ADD: 3,
  /** A value has been removed from a list */
  REMOVE: 4,
  /** Multiple values have been added to a list */
  ADD_MANY: 5,
  /** Multiple values have been removed from a list */
  REMOVE_MANY: 6,
  /** A value has been moved within a list */
  MOVE: 7,
  /** An adapter is being removed */
  REMOVING_ADAPTER: 8,
  /** A proxy has been resolved */
  RESOLVE: 9,
} as const;

export type NotificationEventType = typeof NotificationType[keyof typeof NotificationType];

/** Indicates no position information is applicable */
export const NO_INDEX = -1;

/** Indicates no feature ID information is applicable */
export const NO_FEATURE_ID = -1;

/**
 * A description of a feature change that has occurred for some notifier.
 */
export interface Notification {
  /**
   * Returns the object affected by the change.
   */
  getNotifier(): any;

  /**
   * Returns the type of change that has occurred.
   */
  getEventType(): NotificationEventType;

  /**
   * Returns the object representing the feature that has changed.
   */
  getFeature(): EStructuralFeature | null;

  /**
   * Returns the numeric ID of the feature, or NO_FEATURE_ID when not applicable.
   */
  getFeatureID(): number;

  /**
   * Returns the value before the change occurred.
   * For a list-based feature, this represents a value or list of values removed.
   * For a move, this represents the old position.
   */
  getOldValue(): any;

  /**
   * Returns the value after the change occurred.
   * For a list-based feature, this represents a value or list of values added.
   */
  getNewValue(): any;

  /**
   * Returns whether the feature was considered set before the change occurred.
   */
  wasSet(): boolean;

  /**
   * Returns true if this notification represents an event that did not change state.
   */
  isTouch(): boolean;

  /**
   * Returns true if the feature has been set to its default value.
   */
  isReset(): boolean;

  /**
   * Returns the position within a list at which the change occurred.
   * Returns NO_INDEX when not applicable.
   */
  getPosition(): number;

  /**
   * Merges another notification with this one if possible.
   * Returns true if the merge was successful.
   */
  merge(notification: Notification): boolean;
}

/**
 * Basic implementation of Notification
 */
export class NotificationImpl implements Notification {
  private notifier: any;
  private eventType: NotificationEventType;
  private feature: EStructuralFeature | null;
  private featureID: number;
  private oldValue: any;
  private newValue: any;
  private position: number;
  private wasSetFlag: boolean;

  constructor(
    notifier: any,
    eventType: NotificationEventType,
    feature: EStructuralFeature | null,
    oldValue: any,
    newValue: any,
    position: number = NO_INDEX,
    wasSet: boolean = true
  ) {
    this.notifier = notifier;
    this.eventType = eventType;
    this.feature = feature;
    this.featureID = NO_FEATURE_ID;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.position = position;
    this.wasSetFlag = wasSet;
  }

  getNotifier(): any {
    return this.notifier;
  }

  getEventType(): NotificationEventType {
    return this.eventType;
  }

  getFeature(): EStructuralFeature | null {
    return this.feature;
  }

  getFeatureID(): number {
    return this.featureID;
  }

  getOldValue(): any {
    return this.oldValue;
  }

  getNewValue(): any {
    return this.newValue;
  }

  wasSet(): boolean {
    return this.wasSetFlag;
  }

  isTouch(): boolean {
    switch (this.eventType) {
      case NotificationType.RESOLVE:
      case NotificationType.REMOVING_ADAPTER:
        return true;
      case NotificationType.ADD:
      case NotificationType.ADD_MANY:
      case NotificationType.REMOVE:
      case NotificationType.REMOVE_MANY:
      case NotificationType.MOVE:
        return false;
      case NotificationType.SET:
      case NotificationType.UNSET:
        // Touch if old and new values are equal
        if (this.oldValue === this.newValue) {
          return true;
        }
        if (this.oldValue === null || this.newValue === null) {
          return false;
        }
        return this.oldValue === this.newValue;
      default:
        return false;
    }
  }

  isReset(): boolean {
    if (this.feature) {
      const defaultValue = this.feature.getDefaultValue();
      return this.newValue === defaultValue;
    }
    return false;
  }

  getPosition(): number {
    return this.position;
  }

  merge(notification: Notification): boolean {
    // Default implementation doesn't merge
    return false;
  }

  toString(): string {
    const eventNames: { [key: number]: string } = {
      [NotificationType.SET]: 'SET',
      [NotificationType.UNSET]: 'UNSET',
      [NotificationType.ADD]: 'ADD',
      [NotificationType.REMOVE]: 'REMOVE',
      [NotificationType.ADD_MANY]: 'ADD_MANY',
      [NotificationType.REMOVE_MANY]: 'REMOVE_MANY',
      [NotificationType.MOVE]: 'MOVE',
      [NotificationType.REMOVING_ADAPTER]: 'REMOVING_ADAPTER',
      [NotificationType.RESOLVE]: 'RESOLVE',
    };

    const featureName = this.feature?.getName() || 'unknown';
    return `Notification(${eventNames[this.eventType]}, feature=${featureName}, old=${this.oldValue}, new=${this.newValue})`;
  }
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Notification } from './Notification';
import { Notifier } from './Notifier';

/**
 * A receiver of notifications.
 * An adapter is typically associated with a Notifier.
 */
export interface Adapter {
  /**
   * Notifies that a change to some feature has occurred.
   * @param notification a description of the change
   */
  notifyChanged(notification: Notification): void;

  /**
   * Returns the target from which the adapter receives notification.
   * In general, an adapter may be shared by more than one notifier.
   */
  getTarget(): Notifier | null;

  /**
   * Sets the target from which the adapter will receive notification.
   * This method is only to be called by a notifier when this adapter
   * is added to or removed from its adapter list.
   */
  setTarget(newTarget: Notifier | null): void;

  /**
   * Returns whether the adapter is of the given type.
   * In general, an adapter may be the adapter for many types.
   */
  isAdapterForType(type: any): boolean;
}

/**
 * Internal adapter interface that allows being notified when removed from a notifier.
 */
export interface AdapterInternal extends Adapter {
  /**
   * Unsets the target from which the adapter will receive notification.
   * Called when this adapter is removed from a notifier's adapter list.
   */
  unsetTarget(oldTarget: Notifier): void;
}

/**
 * Check if an adapter implements AdapterInternal
 */
export function isAdapterInternal(adapter: Adapter): adapter is AdapterInternal {
  return 'unsetTarget' in adapter && typeof (adapter as any).unsetTarget === 'function';
}

/**
 * Base implementation of Adapter
 */
export abstract class AdapterImpl implements Adapter {
  protected target: Notifier | null = null;

  abstract notifyChanged(notification: Notification): void;

  getTarget(): Notifier | null {
    return this.target;
  }

  setTarget(newTarget: Notifier | null): void {
    this.target = newTarget;
  }

  isAdapterForType(type: any): boolean {
    return false;
  }
}

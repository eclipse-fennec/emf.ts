/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Adapter, isAdapterInternal } from './Adapter';
import { Notification, NotificationImpl, NotificationType } from './Notification';

/**
 * A source of notification delivery.
 * Since all modeled objects will be notifiers,
 * the method names start with "e" to distinguish the EMF methods
 * from the client's methods.
 */
export interface Notifier {
  /**
   * Returns list of the adapters associated with this notifier.
   */
  eAdapters(): Adapter[];

  /**
   * Returns whether this notifier will deliver notifications to the adapters.
   */
  eDeliver(): boolean;

  /**
   * Sets whether this notifier will deliver notifications to the adapters.
   */
  eSetDeliver(deliver: boolean): void;

  /**
   * Notifies a change to a feature of this notifier as described by the notification.
   * The notifications will generally be delivered to the adapters via Adapter.notifyChanged.
   */
  eNotify(notification: Notification): void;
}

/**
 * Basic implementation of Notifier
 */
export class BasicNotifier implements Notifier {
  protected _eAdapters: Adapter[] = [];
  protected _eDeliver: boolean = true;

  eAdapters(): Adapter[] {
    return this._eAdapters;
  }

  eDeliver(): boolean {
    return this._eDeliver;
  }

  eSetDeliver(deliver: boolean): void {
    this._eDeliver = deliver;
  }

  eNotify(notification: Notification): void {
    if (this._eDeliver && this._eAdapters.length > 0) {
      for (const adapter of this._eAdapters) {
        adapter.notifyChanged(notification);
      }
    }
  }

  /**
   * Adds an adapter to this notifier.
   * The adapter's setTarget will be called.
   */
  eAdapterAdd(adapter: Adapter): void {
    this._eAdapters.push(adapter);
    adapter.setTarget(this);
  }

  /**
   * Removes an adapter from this notifier.
   * The adapter will be notified via REMOVING_ADAPTER event.
   */
  eAdapterRemove(adapter: Adapter): boolean {
    const index = this._eAdapters.indexOf(adapter);
    if (index !== -1) {
      // Notify adapter it's being removed
      if (this._eDeliver) {
        const notification = new NotificationImpl(
          this,
          NotificationType.REMOVING_ADAPTER,
          null,
          adapter,
          null
        );
        adapter.notifyChanged(notification);
      }

      this._eAdapters.splice(index, 1);

      // Unset target for internal adapters
      if (isAdapterInternal(adapter)) {
        adapter.unsetTarget(this);
      } else {
        adapter.setTarget(null);
      }

      return true;
    }
    return false;
  }
}

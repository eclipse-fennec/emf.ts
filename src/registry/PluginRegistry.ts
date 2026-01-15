/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

/**
 * Extension Point definition - like .exsd schema
 */
export interface ExtensionPoint<T = any> {
  readonly id: string;
  readonly name: string;
  readonly schema?: ExtensionSchema;
}

/**
 * Schema definition for validation
 */
export interface ExtensionSchema {
  required?: string[];
  properties?: Record<string, SchemaProperty>;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'class';
  required?: boolean;
  description?: string;
}

/**
 * Extension instance - like <extension> in plugin.xml
 */
export interface Extension<T = any> {
  readonly point: string;
  readonly id?: string;
  readonly plugin: string;
  readonly contribution: T;
  readonly metadata?: Record<string, any>;
}

/**
 * Plugin descriptor - like MANIFEST.MF
 */
export interface PluginDescriptor {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly activator?: () => Promise<void>;
  readonly extensions?: ExtensionConfiguration[];
}

export interface ExtensionConfiguration {
  point: string;
  contribution: any;
  metadata?: Record<string, any>;
}

/**
 * Central Plugin Registry - like Platform.getExtensionRegistry()
 */
export class PluginRegistry {
  private static instance: PluginRegistry;

  private extensionPoints = new Map<string, ExtensionPoint>();
  private extensions = new Map<string, Extension[]>();
  private plugins = new Map<string, PluginDescriptor>();
  private listeners = new Map<string, Set<ExtensionListener>>();

  private constructor() {}

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Define a new extension point
   * Like: <extension-point id="..." schema="..."/>
   */
  defineExtensionPoint<T = any>(point: ExtensionPoint<T>): void {
    if (this.extensionPoints.has(point.id)) {
      throw new Error(`Extension point '${point.id}' already defined`);
    }

    this.extensionPoints.set(point.id, point);
    this.extensions.set(point.id, []);
    console.log(`[PluginRegistry] Defined extension point: ${point.id}`);
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: PluginDescriptor): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin '${plugin.id}' already registered`);
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRegistry] Registered plugin: ${plugin.id} v${plugin.version}`);

    // Process extensions
    if (plugin.extensions) {
      for (const extConfig of plugin.extensions) {
        this.addExtension({
          point: extConfig.point,
          plugin: plugin.id,
          contribution: extConfig.contribution,
          metadata: extConfig.metadata
        });
      }
    }

    // Activate plugin
    if (plugin.activator) {
      await plugin.activator();
    }
  }

  /**
   * Add an extension to an extension point
   * Like: <extension point="..."><package .../></extension>
   */
  addExtension<T = any>(extension: Extension<T>): void {
    const point = this.extensionPoints.get(extension.point);
    if (!point) {
      throw new Error(`Extension point '${extension.point}' not defined`);
    }

    // Validate against schema
    if (point.schema) {
      this.validateExtension(extension, point.schema);
    }

    const extensions = this.extensions.get(extension.point)!;
    extensions.push(extension);

    // Notify listeners
    const listeners = this.listeners.get(extension.point);
    if (listeners) {
      listeners.forEach(listener => listener.onExtensionAdded(extension));
    }

    console.log(`[PluginRegistry] Added extension to ${extension.point} from ${extension.plugin}`);
  }

  /**
   * Remove an extension
   */
  removeExtension(point: string, plugin: string): void {
    const extensions = this.extensions.get(point);
    if (!extensions) return;

    const index = extensions.findIndex(ext => ext.plugin === plugin);
    if (index >= 0) {
      const removed = extensions.splice(index, 1)[0];

      // Notify listeners
      const listeners = this.listeners.get(point);
      if (listeners) {
        listeners.forEach(listener => listener.onExtensionRemoved(removed));
      }

      console.log(`[PluginRegistry] Removed extension from ${point} by ${plugin}`);
    }
  }

  /**
   * Get all extensions for a point
   */
  getExtensions<T = any>(pointId: string): Extension<T>[] {
    return (this.extensions.get(pointId) || []) as Extension<T>[];
  }

  /**
   * Get extension contributions (unwrapped)
   */
  getContributions<T = any>(pointId: string): T[] {
    return this.getExtensions<T>(pointId).map(ext => ext.contribution);
  }

  /**
   * Listen for extension changes
   */
  addExtensionListener(pointId: string, listener: ExtensionListener): void {
    if (!this.listeners.has(pointId)) {
      this.listeners.set(pointId, new Set());
    }
    this.listeners.get(pointId)!.add(listener);
  }

  /**
   * Remove listener
   */
  removeExtensionListener(pointId: string, listener: ExtensionListener): void {
    const listeners = this.listeners.get(pointId);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Validate extension against schema
   */
  private validateExtension(extension: Extension, schema: ExtensionSchema): void {
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in extension.contribution)) {
          throw new Error(
            `Extension to '${extension.point}' missing required field '${field}'`
          );
        }
      }
    }

    // TODO: More validation based on schema.properties
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginDescriptor[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get extension point definition
   */
  getExtensionPoint(pointId: string): ExtensionPoint | undefined {
    return this.extensionPoints.get(pointId);
  }

  /**
   * Get all extension points
   */
  getExtensionPoints(): ExtensionPoint[] {
    return Array.from(this.extensionPoints.values());
  }
}

/**
 * Listener for extension changes
 */
export interface ExtensionListener {
  onExtensionAdded(extension: Extension): void;
  onExtensionRemoved(extension: Extension): void;
}

/**
 * Singleton instance
 */
export const Registry = PluginRegistry.getInstance();

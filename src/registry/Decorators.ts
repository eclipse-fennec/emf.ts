/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Registry, PluginDescriptor, ExtensionConfiguration } from './PluginRegistry';
import { ExtensionPoints } from './ExtensionPoints';

/**
 * Metadata storage for decorators
 */
const pluginMetadata = new Map<Function, Partial<PluginDescriptor>>();
const extensionMetadata = new Map<Function, ExtensionConfiguration[]>();

/**
 * @EMFPlugin decorator - marks a class as an EMF plugin
 *
 * @example
 * @EMFPlugin({
 *   id: 'com.example.myplugin',
 *   name: 'My Plugin',
 *   version: '1.0.0'
 * })
 * class MyPlugin { }
 */
export function EMFPlugin(config: {
  id: string;
  name: string;
  version: string;
}): ClassDecorator {
  return function (target: Function) {
    pluginMetadata.set(target, config);
    console.log(`[Decorator] @EMFPlugin: ${config.id}`);
  };
}

/**
 * @RegisterPackage decorator - registers a generated package
 * Like: <extension point="org.eclipse.emf.ecore.generated_package">
 *
 * @example
 * @RegisterPackage({
 *   uri: 'http://example.com/mymodel',
 *   genModel: 'model/mymodel.genmodel'
 * })
 * class MyPackage { }
 */
export function RegisterPackage(config: {
  uri: string;
  genModel?: string;
}): ClassDecorator {
  return function (target: Function) {
    addExtension(target, {
      point: ExtensionPoints.GENERATED_PACKAGE,
      contribution: {
        uri: config.uri,
        packageClass: async () => {
          const instance = new (target as any)();
          return instance;
        },
        genModel: config.genModel
      }
    });
    console.log(`[Decorator] @RegisterPackage: ${config.uri}`);
  };
}

/**
 * @DynamicPackage decorator - registers a dynamic package
 * Like: <extension point="org.eclipse.emf.ecore.dynamic_package">
 *
 * @example
 * @DynamicPackage({
 *   uri: 'http://example.com/dynamic',
 *   location: 'model/dynamic.ecore'
 * })
 * class DynamicLoader { }
 */
export function DynamicPackage(config: {
  uri: string;
  location: string;
}): ClassDecorator {
  return function (target: Function) {
    addExtension(target, {
      point: ExtensionPoints.DYNAMIC_PACKAGE,
      contribution: config
    });
    console.log(`[Decorator] @DynamicPackage: ${config.uri}`);
  };
}

/**
 * @RegisterFactory decorator - registers a resource factory
 * Like: <extension point="org.eclipse.emf.ecore.factory_override">
 *
 * @example
 * @RegisterFactory({ uri: '*.xmi' })
 * class XMIResourceFactory { }
 */
export function RegisterFactory(config: { uri: string }): ClassDecorator {
  return function (target: Function) {
    addExtension(target, {
      point: ExtensionPoints.FACTORY_OVERRIDE,
      contribution: {
        uri: config.uri,
        factory: async () => new (target as any)()
      }
    });
    console.log(`[Decorator] @RegisterFactory: ${config.uri}`);
  };
}

/**
 * @URIMapping decorator - registers a URI mapping
 * Like: <extension point="org.eclipse.emf.ecore.uri_mapping">
 *
 * @example
 * @URIMapping({
 *   source: 'platform:/resource',
 *   target: 'file:///workspace'
 * })
 * class MyURIMapper { }
 */
export function URIMapping(config: {
  source: string;
  target: string;
}): ClassDecorator {
  return function (target: Function) {
    addExtension(target, {
      point: ExtensionPoints.URI_MAPPING,
      contribution: config
    });
    console.log(`[Decorator] @URIMapping: ${config.source} -> ${config.target}`);
  };
}

/**
 * @ValidationDelegate decorator
 *
 * @example
 * @ValidationDelegate({ uri: 'http://example.com/validation' })
 * class MyValidator {
 *   validate(value: any): boolean { return true; }
 * }
 */
export function ValidationDelegate(config: { uri: string }): ClassDecorator {
  return function (target: Function) {
    addExtension(target, {
      point: ExtensionPoints.VALIDATION_DELEGATE,
      contribution: {
        uri: config.uri,
        validator: (value: any, context?: any) => {
          const instance = new (target as any)();
          return instance.validate(value, context);
        }
      }
    });
    console.log(`[Decorator] @ValidationDelegate: ${config.uri}`);
  };
}

/**
 * Helper to add extension metadata
 */
function addExtension(target: Function, extension: ExtensionConfiguration): void {
  const existing = extensionMetadata.get(target) || [];
  existing.push(extension);
  extensionMetadata.set(target, existing);
}

/**
 * Auto-register all decorated classes
 * Call this at application startup
 */
export async function scanAndRegisterPlugins(classes: Function[]): Promise<void> {
  console.log(`[PluginScanner] Scanning ${classes.length} classes...`);

  for (const cls of classes) {
    const plugin = pluginMetadata.get(cls);
    const extensions = extensionMetadata.get(cls);

    if (plugin || extensions) {
      await Registry.registerPlugin({
        id: plugin?.id || `auto.${cls.name}`,
        name: plugin?.name || cls.name,
        version: plugin?.version || '1.0.0',
        extensions: extensions,
        activator: async () => {
          console.log(`[PluginScanner] Activated plugin: ${cls.name}`);
        }
      });
    }
  }

  console.log('[PluginScanner] All plugins registered');
}

/**
 * Decorator for marking plugin activators
 * Like: Bundle-Activator in MANIFEST.MF
 *
 * @example
 * @Activator
 * class MyActivator {
 *   async start() { }
 *   async stop() { }
 * }
 */
export function Activator(target: Function): void {
  const metadata = pluginMetadata.get(target) || {};
  const activator = async () => {
    const instance = new (target as any)();
    if (instance.start) {
      await instance.start();
    }
  };
  pluginMetadata.set(target, { ...metadata, activator });
  console.log(`[Decorator] @Activator: ${target.name}`);
}

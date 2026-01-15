/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { ExtensionPoint } from './PluginRegistry';
import { EPackage } from '../EPackage';
import { EFactory } from '../EFactory';
import { Resource } from '../Resource';
import { URI } from '../URI';

/**
 * Extension Point IDs (like in plugin.xml)
 */
export const ExtensionPoints = {
  GENERATED_PACKAGE: 'org.eclipse.emf.ecore.generated_package',
  DYNAMIC_PACKAGE: 'org.eclipse.emf.ecore.dynamic_package',
  FACTORY_OVERRIDE: 'org.eclipse.emf.ecore.factory_override',
  EXTENSION_PARSER: 'org.eclipse.emf.ecore.extension_parser',
  PROTOCOL_PARSER: 'org.eclipse.emf.ecore.protocol_parser',
  CONTENT_PARSER: 'org.eclipse.emf.ecore.content_parser',
  URI_MAPPING: 'org.eclipse.emf.ecore.uri_mapping',
  VALIDATION_DELEGATE: 'org.eclipse.emf.ecore.validation_delegate',
  SETTING_DELEGATE: 'org.eclipse.emf.ecore.setting_delegate',
  INVOCATION_DELEGATE: 'org.eclipse.emf.ecore.invocation_delegate'
} as const;

/**
 * Generated Package Extension
 * Like: <package uri="..." class="..." genModel="..."/>
 */
export interface GeneratedPackageExtension {
  uri: string;
  packageClass: () => EPackage | Promise<EPackage>;
  genModel?: string;
}

export const GENERATED_PACKAGE_POINT: ExtensionPoint<GeneratedPackageExtension> = {
  id: ExtensionPoints.GENERATED_PACKAGE,
  name: 'Ecore Package Registry for Generated Packages',
  schema: {
    required: ['uri', 'packageClass'],
    properties: {
      uri: { type: 'string', required: true, description: 'Namespace URI' },
      packageClass: { type: 'class', required: true, description: 'EPackage class' },
      genModel: { type: 'string', description: 'Path to .genmodel file' }
    }
  }
};

/**
 * Dynamic Package Extension
 * Like: <resource uri="..." location="..."/>
 */
export interface DynamicPackageExtension {
  uri: string;
  location: string;
}

export const DYNAMIC_PACKAGE_POINT: ExtensionPoint<DynamicPackageExtension> = {
  id: ExtensionPoints.DYNAMIC_PACKAGE,
  name: 'Ecore Package Registry for Dynamic Packages',
  schema: {
    required: ['uri', 'location'],
    properties: {
      uri: { type: 'string', required: true, description: 'Namespace URI' },
      location: { type: 'string', required: true, description: 'Path to .ecore file' }
    }
  }
};

/**
 * Factory Override Extension
 * Like: <factory uri="..." class="..."/>
 */
export interface FactoryOverrideExtension {
  uri: string;
  factory: () => Resource.Factory | Promise<Resource.Factory>;
}

export const FACTORY_OVERRIDE_POINT: ExtensionPoint<FactoryOverrideExtension> = {
  id: ExtensionPoints.FACTORY_OVERRIDE,
  name: 'Factory Override Registry',
  schema: {
    required: ['uri', 'factory'],
    properties: {
      uri: { type: 'string', required: true },
      factory: { type: 'class', required: true }
    }
  }
};

/**
 * URI Parser Extension
 */
export interface URIParserExtension {
  pattern: string;
  parser: (uri: URI) => Resource.Factory | null;
}

export const EXTENSION_PARSER_POINT: ExtensionPoint<URIParserExtension> = {
  id: ExtensionPoints.EXTENSION_PARSER,
  name: 'URI Extension Parser Registry'
};

export const PROTOCOL_PARSER_POINT: ExtensionPoint<URIParserExtension> = {
  id: ExtensionPoints.PROTOCOL_PARSER,
  name: 'URI Protocol Parser Registry'
};

export const CONTENT_PARSER_POINT: ExtensionPoint<URIParserExtension> = {
  id: ExtensionPoints.CONTENT_PARSER,
  name: 'URI Content Parser Registry'
};

/**
 * URI Mapping Extension
 * Like: <mapping source="..." target="..."/>
 */
export interface URIMappingExtension {
  source: string;
  target: string;
}

export const URI_MAPPING_POINT: ExtensionPoint<URIMappingExtension> = {
  id: ExtensionPoints.URI_MAPPING,
  name: 'URI Mapping Registry',
  schema: {
    required: ['source', 'target']
  }
};

/**
 * Validation Delegate Extension
 */
export interface ValidationDelegateExtension {
  uri: string;
  validator: (value: any, context?: any) => boolean;
}

export const VALIDATION_DELEGATE_POINT: ExtensionPoint<ValidationDelegateExtension> = {
  id: ExtensionPoints.VALIDATION_DELEGATE,
  name: 'Validation Delegate Registry'
};

/**
 * Setting Delegate Extension (computed properties)
 */
export interface SettingDelegateExtension {
  uri: string;
  getter: (context: any) => any;
  setter?: (context: any, value: any) => void;
}

export const SETTING_DELEGATE_POINT: ExtensionPoint<SettingDelegateExtension> = {
  id: ExtensionPoints.SETTING_DELEGATE,
  name: 'Setting Delegate Registry'
};

/**
 * Invocation Delegate Extension (operation implementation)
 */
export interface InvocationDelegateExtension {
  uri: string;
  invoke: (target: any, args: any[]) => any;
}

export const INVOCATION_DELEGATE_POINT: ExtensionPoint<InvocationDelegateExtension> = {
  id: ExtensionPoints.INVOCATION_DELEGATE,
  name: 'Invocation Delegate Registry'
};

/**
 * Initialize all standard extension points
 */
export function initializeStandardExtensionPoints(registry: import('./PluginRegistry').PluginRegistry): void {
  registry.defineExtensionPoint(GENERATED_PACKAGE_POINT);
  registry.defineExtensionPoint(DYNAMIC_PACKAGE_POINT);
  registry.defineExtensionPoint(FACTORY_OVERRIDE_POINT);
  registry.defineExtensionPoint(EXTENSION_PARSER_POINT);
  registry.defineExtensionPoint(PROTOCOL_PARSER_POINT);
  registry.defineExtensionPoint(CONTENT_PARSER_POINT);
  registry.defineExtensionPoint(URI_MAPPING_POINT);
  registry.defineExtensionPoint(VALIDATION_DELEGATE_POINT);
  registry.defineExtensionPoint(SETTING_DELEGATE_POINT);
  registry.defineExtensionPoint(INVOCATION_DELEGATE_POINT);

  console.log('[ExtensionPoints] Initialized 10 standard extension points');
}

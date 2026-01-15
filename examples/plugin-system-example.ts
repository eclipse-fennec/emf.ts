/**
 * Example: Using the EMFTS Plugin System
 * Demonstrates TypeScript decorators as replacement for Eclipse Extension Points
 */

import {
  EMFPlugin,
  RegisterPackage,
  DynamicPackage,
  RegisterFactory,
  URIMapping,
  ValidationDelegate,
  Activator,
  scanAndRegisterPlugins
} from '../src/registry/Decorators';
import { Registry } from '../src/registry/PluginRegistry';
import { initializeStandardExtensionPoints, ExtensionPoints } from '../src/registry/ExtensionPoints';
import { createExtensionAwareRegistry } from '../src/registry/PackageRegistry';
import { EPackage } from '../src/EPackage';
import { Resource } from '../src/Resource';

// ============================================================================
// Example 1: Simple Package Registration with Decorator
// ============================================================================

@RegisterPackage({
  uri: 'http://gecko.org/example/model/manual/1.0',
  genModel: 'model/manual.genmodel'
})
class ManualPackage implements EPackage {
  getName(): string { return 'manual'; }
  getNsURI(): string { return 'http://gecko.org/example/model/manual/1.0'; }
  getNsPrefix(): string { return 'manual'; }

  // ... other EPackage methods
  getEFactoryInstance(): any { return null; }
  setEFactoryInstance(value: any): void {}
  getEClassifiers(): any[] { return []; }
  getESubpackages(): any[] { return []; }
  getESuperPackage(): any { return null; }
  getEClassifier(name: string): any { return null; }
  getEAnnotations(): any[] { return []; }
  getEAnnotation(source: string): any { return null; }
  eClass(): any { return null; }
  eResource(): any { return null; }
  eContainer(): any { return null; }
  eContainingFeature(): any { return null; }
  eContainmentFeature(): any { return null; }
  eContents(): any[] { return []; }
  eAllContents(): any { return [][Symbol.iterator](); }
  eIsProxy(): boolean { return false; }
  eCrossReferences(): any[] { return []; }
  eGet(feature: any): any { return null; }
  eSet(feature: any, newValue: any): void {}
  eIsSet(feature: any): boolean { return false; }
  eUnset(feature: any): void {}
  eInvoke(operation: any, arguments_: any[]): any { return null; }
  setName(value: string | null): void {}
  setNsURI(value: string | null): void {}
  setNsPrefix(value: string | null): void {}
}

// ============================================================================
// Example 2: Full Plugin with Activator
// ============================================================================

@EMFPlugin({
  id: 'com.example.myplugin',
  name: 'My Example Plugin',
  version: '1.0.0'
})
@Activator
class MyPlugin {
  async start(): Promise<void> {
    console.log('[MyPlugin] Starting plugin...');
    // Initialize resources, register listeners, etc.
  }

  async stop(): Promise<void> {
    console.log('[MyPlugin] Stopping plugin...');
    // Clean up resources
  }
}

// ============================================================================
// Example 3: Resource Factory Registration
// ============================================================================

@RegisterFactory({ uri: '*.myext' })
class MyResourceFactory implements Resource.Factory {
  createResource(uri: any): Resource {
    console.log(`[MyResourceFactory] Creating resource for ${uri}`);
    return null as any; // Implementation here
  }
}

// ============================================================================
// Example 4: URI Mapping
// ============================================================================

@URIMapping({
  source: 'platform:/resource',
  target: 'file:///workspace'
})
class PlatformURIMapper {}

// ============================================================================
// Example 5: Custom Validator
// ============================================================================

@ValidationDelegate({ uri: 'http://example.com/validation/required' })
class RequiredValidator {
  validate(value: any, context?: any): boolean {
    console.log('[RequiredValidator] Validating:', value);
    return value !== null && value !== undefined && value !== '';
  }
}

// ============================================================================
// Example 6: Dynamic Package from .ecore file
// ============================================================================

@DynamicPackage({
  uri: 'http://example.com/dynamic',
  location: 'model/dynamic.ecore'
})
class DynamicPackageLoader {}

// ============================================================================
// Example 7: Programmatic Registration (without decorators)
// ============================================================================

async function programmaticRegistration() {
  await Registry.registerPlugin({
    id: 'com.example.programmatic',
    name: 'Programmatic Plugin',
    version: '1.0.0',
    extensions: [
      {
        point: ExtensionPoints.GENERATED_PACKAGE,
        contribution: {
          uri: 'http://example.com/programmatic',
          packageClass: async () => {
            // Dynamically import package (commented out - example only)
            // const { MyPackageClass } = await import('./my-package');
            // return new MyPackageClass();
            throw new Error('Example only - implement package creation here');
          }
        }
      }
    ],
    activator: async () => {
      console.log('[Programmatic] Plugin activated');
    }
  });
}

// ============================================================================
// Example 8: Query Extensions at Runtime
// ============================================================================

function queryExtensions() {
  // Get all registered packages
  const packages = Registry.getExtensions(ExtensionPoints.GENERATED_PACKAGE);
  console.log(`\nRegistered Packages (${packages.length}):`);
  packages.forEach(ext => {
    console.log(`  - ${ext.contribution.uri} from ${ext.plugin}`);
  });

  // Get all resource factories
  const factories = Registry.getExtensions(ExtensionPoints.FACTORY_OVERRIDE);
  console.log(`\nRegistered Factories (${factories.length}):`);
  factories.forEach(ext => {
    console.log(`  - ${ext.contribution.uri} from ${ext.plugin}`);
  });

  // Get all URI mappings
  const mappings = Registry.getExtensions(ExtensionPoints.URI_MAPPING);
  console.log(`\nURI Mappings (${mappings.length}):`);
  mappings.forEach(ext => {
    console.log(`  - ${ext.contribution.source} -> ${ext.contribution.target}`);
  });
}

// ============================================================================
// Example 9: Extension Listener
// ============================================================================

function setupExtensionListener() {
  Registry.addExtensionListener(
    ExtensionPoints.GENERATED_PACKAGE,
    {
      onExtensionAdded: (extension) => {
        console.log(`[Listener] Package registered: ${extension.contribution.uri}`);
        // React to new package, e.g., update UI, reload resources, etc.
      },
      onExtensionRemoved: (extension) => {
        console.log(`[Listener] Package unregistered: ${extension.contribution.uri}`);
        // Clean up references to removed package
      }
    }
  );
}

// ============================================================================
// Example 10: Integration with EPackage.Registry
// ============================================================================

async function integrationExample() {
  // Create extension-aware registry
  const packageRegistry = createExtensionAwareRegistry();

  // Now packages registered via decorators are automatically available
  const manualPkg = await packageRegistry.getEPackage(
    'http://gecko.org/example/model/manual/1.0'
  );

  if (manualPkg) {
    console.log(`\n[Integration] Found package: ${manualPkg.getName()}`);
    console.log(`  NS URI: ${manualPkg.getNsURI()}`);
    console.log(`  NS Prefix: ${manualPkg.getNsPrefix()}`);
  }

  // List all available packages
  const allURIs = (packageRegistry as any).getAllURIs?.() || [];
  console.log(`\nAll available packages: ${allURIs.length}`);
  allURIs.forEach((uri: string) => console.log(`  - ${uri}`));
}

// ============================================================================
// Main: Initialize and Run Examples
// ============================================================================

async function main() {
  console.log('=== EMFTS Plugin System Example ===\n');

  // 1. Initialize extension points
  initializeStandardExtensionPoints(Registry);

  // 2. Scan and register all decorated classes
  await scanAndRegisterPlugins([
    ManualPackage,
    MyPlugin,
    MyResourceFactory,
    PlatformURIMapper,
    RequiredValidator,
    DynamicPackageLoader
  ]);

  // 3. Programmatic registration example
  // await programmaticRegistration();

  // 4. Query registered extensions
  queryExtensions();

  // 5. Setup listener for dynamic changes
  setupExtensionListener();

  // 6. Integration with EPackage.Registry
  await integrationExample();

  console.log('\n=== All Examples Complete ===');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };

"use strict";
/**
 * Example: Using the EMFTS Plugin System
 * Demonstrates TypeScript decorators as replacement for Eclipse Extension Points
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const Decorators_1 = require("../src/registry/Decorators");
const PluginRegistry_1 = require("../src/registry/PluginRegistry");
const ExtensionPoints_1 = require("../src/registry/ExtensionPoints");
const PackageRegistry_1 = require("../src/registry/PackageRegistry");
// ============================================================================
// Example 1: Simple Package Registration with Decorator
// ============================================================================
let ManualPackage = class ManualPackage {
    getName() { return 'manual'; }
    getNsURI() { return 'http://gecko.org/example/model/manual/1.0'; }
    getNsPrefix() { return 'manual'; }
    // ... other EPackage methods
    getEFactoryInstance() { return null; }
    setEFactoryInstance(value) { }
    getEClassifiers() { return []; }
    getESubpackages() { return []; }
    getESuperPackage() { return null; }
    getEClassifier(name) { return null; }
    getEAnnotations() { return []; }
    getEAnnotation(source) { return null; }
    eClass() { return null; }
    eResource() { return null; }
    eContainer() { return null; }
    eContainingFeature() { return null; }
    eContainmentFeature() { return null; }
    eContents() { return []; }
    eAllContents() { return [][Symbol.iterator](); }
    eIsProxy() { return false; }
    eCrossReferences() { return []; }
    eGet(feature) { return null; }
    eSet(feature, newValue) { }
    eIsSet(feature) { return false; }
    eUnset(feature) { }
    eInvoke(operation, arguments_) { return null; }
    setName(value) { }
    setNsURI(value) { }
    setNsPrefix(value) { }
};
ManualPackage = __decorate([
    (0, Decorators_1.RegisterPackage)({
        uri: 'http://gecko.org/example/model/manual/1.0',
        genModel: 'model/manual.genmodel'
    })
], ManualPackage);
// ============================================================================
// Example 2: Full Plugin with Activator
// ============================================================================
let MyPlugin = class MyPlugin {
    async start() {
        console.log('[MyPlugin] Starting plugin...');
        // Initialize resources, register listeners, etc.
    }
    async stop() {
        console.log('[MyPlugin] Stopping plugin...');
        // Clean up resources
    }
};
MyPlugin = __decorate([
    (0, Decorators_1.EMFPlugin)({
        id: 'com.example.myplugin',
        name: 'My Example Plugin',
        version: '1.0.0'
    }),
    Decorators_1.Activator
], MyPlugin);
// ============================================================================
// Example 3: Resource Factory Registration
// ============================================================================
let MyResourceFactory = class MyResourceFactory {
    createResource(uri) {
        console.log(`[MyResourceFactory] Creating resource for ${uri}`);
        return null; // Implementation here
    }
};
MyResourceFactory = __decorate([
    (0, Decorators_1.RegisterFactory)({ uri: '*.myext' })
], MyResourceFactory);
// ============================================================================
// Example 4: URI Mapping
// ============================================================================
let PlatformURIMapper = class PlatformURIMapper {
};
PlatformURIMapper = __decorate([
    (0, Decorators_1.URIMapping)({
        source: 'platform:/resource',
        target: 'file:///workspace'
    })
], PlatformURIMapper);
// ============================================================================
// Example 5: Custom Validator
// ============================================================================
let RequiredValidator = class RequiredValidator {
    validate(value, context) {
        console.log('[RequiredValidator] Validating:', value);
        return value !== null && value !== undefined && value !== '';
    }
};
RequiredValidator = __decorate([
    (0, Decorators_1.ValidationDelegate)({ uri: 'http://example.com/validation/required' })
], RequiredValidator);
// ============================================================================
// Example 6: Dynamic Package from .ecore file
// ============================================================================
let DynamicPackageLoader = class DynamicPackageLoader {
};
DynamicPackageLoader = __decorate([
    (0, Decorators_1.DynamicPackage)({
        uri: 'http://example.com/dynamic',
        location: 'model/dynamic.ecore'
    })
], DynamicPackageLoader);
// ============================================================================
// Example 7: Programmatic Registration (without decorators)
// ============================================================================
async function programmaticRegistration() {
    await PluginRegistry_1.Registry.registerPlugin({
        id: 'com.example.programmatic',
        name: 'Programmatic Plugin',
        version: '1.0.0',
        extensions: [
            {
                point: ExtensionPoints_1.ExtensionPoints.GENERATED_PACKAGE,
                contribution: {
                    uri: 'http://example.com/programmatic',
                    packageClass: async () => {
                        // Dynamically import package
                        const { MyPackageClass } = await Promise.resolve().then(() => __importStar(require('./my-package')));
                        return new MyPackageClass();
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
    const packages = PluginRegistry_1.Registry.getExtensions(ExtensionPoints_1.ExtensionPoints.GENERATED_PACKAGE);
    console.log(`\nRegistered Packages (${packages.length}):`);
    packages.forEach(ext => {
        console.log(`  - ${ext.contribution.uri} from ${ext.plugin}`);
    });
    // Get all resource factories
    const factories = PluginRegistry_1.Registry.getExtensions(ExtensionPoints_1.ExtensionPoints.FACTORY_OVERRIDE);
    console.log(`\nRegistered Factories (${factories.length}):`);
    factories.forEach(ext => {
        console.log(`  - ${ext.contribution.uri} from ${ext.plugin}`);
    });
    // Get all URI mappings
    const mappings = PluginRegistry_1.Registry.getExtensions(ExtensionPoints_1.ExtensionPoints.URI_MAPPING);
    console.log(`\nURI Mappings (${mappings.length}):`);
    mappings.forEach(ext => {
        console.log(`  - ${ext.contribution.source} -> ${ext.contribution.target}`);
    });
}
// ============================================================================
// Example 9: Extension Listener
// ============================================================================
function setupExtensionListener() {
    PluginRegistry_1.Registry.addExtensionListener(ExtensionPoints_1.ExtensionPoints.GENERATED_PACKAGE, {
        onExtensionAdded: (extension) => {
            console.log(`[Listener] Package registered: ${extension.contribution.uri}`);
            // React to new package, e.g., update UI, reload resources, etc.
        },
        onExtensionRemoved: (extension) => {
            console.log(`[Listener] Package unregistered: ${extension.contribution.uri}`);
            // Clean up references to removed package
        }
    });
}
// ============================================================================
// Example 10: Integration with EPackage.Registry
// ============================================================================
async function integrationExample() {
    // Create extension-aware registry
    const packageRegistry = (0, PackageRegistry_1.createExtensionAwareRegistry)();
    // Now packages registered via decorators are automatically available
    const manualPkg = await packageRegistry.getEPackage('http://gecko.org/example/model/manual/1.0');
    if (manualPkg) {
        console.log(`\n[Integration] Found package: ${manualPkg.getName()}`);
        console.log(`  NS URI: ${manualPkg.getNsURI()}`);
        console.log(`  NS Prefix: ${manualPkg.getNsPrefix()}`);
    }
    // List all available packages
    const allURIs = packageRegistry.getAllURIs?.() || [];
    console.log(`\nAll available packages: ${allURIs.length}`);
    allURIs.forEach(uri => console.log(`  - ${uri}`));
}
// ============================================================================
// Main: Initialize and Run Examples
// ============================================================================
async function main() {
    console.log('=== EMFTS Plugin System Example ===\n');
    // 1. Initialize extension points
    (0, ExtensionPoints_1.initializeStandardExtensionPoints)(PluginRegistry_1.Registry);
    // 2. Scan and register all decorated classes
    await (0, Decorators_1.scanAndRegisterPlugins)([
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
exports.main = main;
// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

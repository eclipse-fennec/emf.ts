# EMFTS Plugin System

TypeScript implementation of Eclipse Extension Points using modern decorators.

## Overview

Eclipse EMF uses **Extension Points** (XML-based) for plugin architecture. EMFTS provides a TypeScript-native alternative using **Decorators** and a **Plugin Registry**.

## Architecture Comparison

### Eclipse EMF (XML-based)

```xml
<!-- plugin.xml -->
<extension point="org.eclipse.emf.ecore.generated_package">
  <package
    uri="http://example.com/mymodel"
    class="com.example.MyPackage"
    genModel="model/mymodel.genmodel"/>
</extension>
```

### EMFTS (TypeScript Decorators)

```typescript
@RegisterPackage({
  uri: 'http://example.com/mymodel',
  genModel: 'model/mymodel.genmodel'
})
class MyPackage implements EPackage {
  // Implementation
}
```

## Core Components

### 1. PluginRegistry (`src/registry/PluginRegistry.ts`)

Central registry managing all plugins and extensions.

```typescript
import { Registry } from './registry/PluginRegistry';

// Define extension point
Registry.defineExtensionPoint({
  id: 'my.extension.point',
  name: 'My Extension Point'
});

// Add extension
Registry.addExtension({
  point: 'my.extension.point',
  plugin: 'my.plugin',
  contribution: { /* data */ }
});

// Get all extensions
const extensions = Registry.getExtensions('my.extension.point');
```

### 2. Extension Points (`src/registry/ExtensionPoints.ts`)

10 standard extension points matching Eclipse EMF:

| Extension Point | Purpose | Eclipse Equivalent |
|----------------|---------|-------------------|
| `GENERATED_PACKAGE` | Register generated EPackages | `org.eclipse.emf.ecore.generated_package` |
| `DYNAMIC_PACKAGE` | Register .ecore files | `org.eclipse.emf.ecore.dynamic_package` |
| `FACTORY_OVERRIDE` | Register Resource Factories | `org.eclipse.emf.ecore.factory_override` |
| `EXTENSION_PARSER` | Parse by file extension | `org.eclipse.emf.ecore.extension_parser` |
| `PROTOCOL_PARSER` | Parse by URI protocol | `org.eclipse.emf.ecore.protocol_parser` |
| `CONTENT_PARSER` | Parse by content type | `org.eclipse.emf.ecore.content_parser` |
| `URI_MAPPING` | Map logical to physical URIs | `org.eclipse.emf.ecore.uri_mapping` |
| `VALIDATION_DELEGATE` | Custom validators | `org.eclipse.emf.ecore.validation_delegate` |
| `SETTING_DELEGATE` | Computed properties | `org.eclipse.emf.ecore.setting_delegate` |
| `INVOCATION_DELEGATE` | Operation implementations | `org.eclipse.emf.ecore.invocation_delegate` |

### 3. Decorators (`src/registry/Decorators.ts`)

Modern TypeScript decorators for plugin registration.

#### @RegisterPackage

```typescript
@RegisterPackage({
  uri: 'http://gecko.org/example/model/manual/1.0',
  genModel: 'model/manual.genmodel'
})
class ManualPackage implements EPackage {
  getName(): string { return 'manual'; }
  getNsURI(): string { return 'http://gecko.org/example/model/manual/1.0'; }
  // ...
}
```

#### @DynamicPackage

```typescript
@DynamicPackage({
  uri: 'http://example.com/dynamic',
  location: 'model/dynamic.ecore'
})
class DynamicLoader {}
```

#### @RegisterFactory

```typescript
@RegisterFactory({ uri: '*.xmi' })
class XMIResourceFactory implements Resource.Factory {
  createResource(uri: URI): Resource {
    // Implementation
  }
}
```

#### @EMFPlugin + @Activator

```typescript
@EMFPlugin({
  id: 'com.example.myplugin',
  name: 'My Plugin',
  version: '1.0.0'
})
@Activator
class MyPlugin {
  async start() {
    console.log('Plugin starting...');
  }

  async stop() {
    console.log('Plugin stopping...');
  }
}
```

#### @URIMapping

```typescript
@URIMapping({
  source: 'platform:/resource',
  target: 'file:///workspace'
})
class PlatformMapper {}
```

#### @ValidationDelegate

```typescript
@ValidationDelegate({ uri: 'http://example.com/validation' })
class MyValidator {
  validate(value: any, context?: any): boolean {
    return value !== null;
  }
}
```

### 4. Extension-Aware Package Registry

Bridges plugin system with `EPackage.Registry`:

```typescript
import { createExtensionAwareRegistry } from './registry/PackageRegistry';

const packageRegistry = createExtensionAwareRegistry();

// Automatically finds packages registered via decorators
const pkg = await packageRegistry.getEPackage('http://example.com/mymodel');
```

## Usage

### Step 1: Initialize Extension Points

```typescript
import { Registry } from './registry/PluginRegistry';
import { initializeStandardExtensionPoints } from './registry/ExtensionPoints';

// Define all standard extension points
initializeStandardExtensionPoints(Registry);
```

### Step 2: Register Plugins

**Option A: Using Decorators (Recommended)**

```typescript
import { scanAndRegisterPlugins } from './registry/Decorators';

// Scan and auto-register all decorated classes
await scanAndRegisterPlugins([
  ManualPackage,
  MyPlugin,
  XMIResourceFactory,
  // ... all decorated classes
]);
```

**Option B: Programmatic Registration**

```typescript
await Registry.registerPlugin({
  id: 'com.example.plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  extensions: [
    {
      point: 'org.eclipse.emf.ecore.generated_package',
      contribution: {
        uri: 'http://example.com/model',
        packageClass: async () => {
          const { MyPackage } = await import('./my-package');
          return new MyPackage();
        }
      }
    }
  ]
});
```

### Step 3: Query Extensions

```typescript
// Get all registered packages
const packages = Registry.getExtensions('org.eclipse.emf.ecore.generated_package');

packages.forEach(ext => {
  console.log(`Package: ${ext.contribution.uri}`);
  console.log(`From plugin: ${ext.plugin}`);
});
```

### Step 4: Listen for Changes

```typescript
Registry.addExtensionListener(
  'org.eclipse.emf.ecore.generated_package',
  {
    onExtensionAdded: (extension) => {
      console.log(`New package: ${extension.contribution.uri}`);
      // React to new package
    },
    onExtensionRemoved: (extension) => {
      console.log(`Package removed: ${extension.contribution.uri}`);
      // Clean up
    }
  }
);
```

## Complete Example

```typescript
import {
  Registry,
  initializeStandardExtensionPoints,
  scanAndRegisterPlugins,
  RegisterPackage,
  EMFPlugin,
  Activator
} from 'emfts';

// 1. Initialize
initializeStandardExtensionPoints(Registry);

// 2. Define plugin with decorator
@EMFPlugin({
  id: 'com.myapp.models',
  name: 'My Application Models',
  version: '1.0.0'
})
@Activator
class MyModelsPlugin {
  async start() {
    console.log('Models plugin activated');
  }
}

// 3. Define package with decorator
@RegisterPackage({
  uri: 'http://myapp.com/models/user',
  genModel: 'model/user.genmodel'
})
class UserModelPackage implements EPackage {
  // Implementation
}

// 4. Register all
await scanAndRegisterPlugins([
  MyModelsPlugin,
  UserModelPackage
]);

// 5. Use via registry
const userPkg = await packageRegistry.getEPackage('http://myapp.com/models/user');
```

## Benefits over Eclipse Extension Points

✅ **Type Safety**: Full TypeScript type checking
✅ **Modern Syntax**: Decorators instead of XML
✅ **Dynamic**: Runtime plugin loading/unloading
✅ **No Platform Dependency**: Works in any JS environment
✅ **Lazy Loading**: Dynamic imports for performance
✅ **Hot Reloading**: Extension listeners enable live updates
✅ **Debugging**: Stack traces, not XML parsing errors

## Migration from Eclipse

### Before (Eclipse plugin.xml)

```xml
<plugin>
  <extension point="org.eclipse.emf.ecore.generated_package">
    <package
      uri="http://example.com/mymodel"
      class="com.example.MyModelPackage"/>
  </extension>
</plugin>
```

### After (EMFTS)

```typescript
@RegisterPackage({
  uri: 'http://example.com/mymodel'
})
class MyModelPackage implements EPackage {
  // Generated or hand-written implementation
}
```

## Advanced: Custom Extension Points

```typescript
// Define custom extension point
Registry.defineExtensionPoint({
  id: 'my.app.custom.handlers',
  name: 'Custom Event Handlers',
  schema: {
    required: ['event', 'handler'],
    properties: {
      event: { type: 'string', required: true },
      handler: { type: 'class', required: true }
    }
  }
});

// Create custom decorator
export function EventHandler(event: string): ClassDecorator {
  return function(target: Function) {
    Registry.addExtension({
      point: 'my.app.custom.handlers',
      plugin: 'auto',
      contribution: {
        event: event,
        handler: () => new (target as any)()
      }
    });
  };
}

// Use it
@EventHandler('user.created')
class UserCreatedHandler {
  handle(event: any) {
    console.log('User created:', event);
  }
}
```

## See Also

- [plugin-system-example.ts](examples/plugin-system-example.ts) - Complete examples
- [Eclipse Extension Points](https://wiki.eclipse.org/FAQ_What_are_extensions_and_extension_points%3F)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)

# EMFTS Runtime Implementation

Complete TypeScript implementation of Eclipse EMF runtime classes, enabling **Dynamic EMF** - creating and using models without code generation.

## Overview

The runtime provides concrete implementations of all core EMF interfaces, allowing you to:
- Build metamodels programmatically
- Create instances dynamically
- Use the reflective API (eGet/eSet/eIsSet/eUnset)
- Navigate containment hierarchies
- Serialize/deserialize to JSON
- Manage resources and resource sets

## Architecture

```
Runtime Classes
├── BasicEObject          - Base class for all model objects
├── BasicEPackage         - Package container
├── BasicEClass           - Metamodel class descriptor
├── BasicEFactory         - Object factory with dynamic creation
├── BasicEStructuralFeature - Base for attributes and references
├── BasicEAttribute       - Attribute descriptor
├── BasicEReference       - Reference descriptor
├── BasicEDataType        - Data type descriptor
├── BasicEOperation       - Operation descriptor
├── BasicResource         - Persistence and serialization
└── BasicResourceSet      - Resource container
```

## Key Features

### 1. Dynamic Object Creation

```typescript
// Create metamodel
const bookClass = new EClassBuilder('Book').build();
const titleAttr = new EAttributeBuilder('title', EcoreDataTypes.EString)
  .required()
  .build();
bookClass.addFeature(titleAttr);

// Create factory
const factory = new BasicEFactory();
factory.setEPackage(libraryPackage);

// Create instance
const book = factory.create(bookClass);
```

### 2. Reflective API

```typescript
// eSet - Set property value
book.eSet(titleFeature, '1984');

// eGet - Get property value
const title = book.eGet(titleFeature);

// eIsSet - Check if property is set
const isSet = book.eIsSet(titleFeature);

// eUnset - Clear property value
book.eUnset(titleFeature);
```

### 3. Containment Management

```typescript
// Set containment reference
library.eSet(booksReference, [book1, book2]);

// Navigate up
const container = book.eContainer();
const feature = book.eContainmentFeature();

// Navigate down
const contents = library.eContents();           // Direct children
const allContents = library.eAllContents();     // All descendants
```

### 4. Builder Pattern

```typescript
// EClass builder
const personClass = new EClassBuilder('Person')
  .abstract()
  .superType(namedElementClass)
  .feature(nameAttr)
  .feature(ageAttr)
  .operation(sayHelloOp)
  .build();

// EAttribute builder
const nameAttr = new EAttributeBuilder('name', EcoreDataTypes.EString)
  .required()
  .id()
  .defaultValue('Unknown')
  .build();

// EReference builder
const booksRef = new EReferenceBuilder('books', bookClass)
  .containment()
  .many()
  .opposite(libraryRef)
  .build();
```

### 5. JSON Serialization

```typescript
// Create resource
const resource = resourceSet.createResource(URI.createURI('library.json'));
resource.getContents().push(library);

// Save to JSON
await resource.save();

// Load from JSON
await resource.load();

// URI fragment resolution
const fragment = resource.getURIFragment(book);  // "/0/0"
const obj = resource.getEObject(fragment);

// ID-based lookup
const bookByISBN = resource.getEObject('978-0451524935');
```

### 6. Predefined Data Types

```typescript
import { EcoreDataTypes } from '../src/runtime';

EcoreDataTypes.EString    // java.lang.String
EcoreDataTypes.EInt       // int
EcoreDataTypes.EBoolean   // boolean
EcoreDataTypes.EFloat     // float
EcoreDataTypes.EDouble    // double
EcoreDataTypes.ELong      // long
EcoreDataTypes.EDate      // java.util.Date
```

## Complete Example

See [examples/runtime-example.ts](./examples/runtime-example.ts) for a comprehensive demonstration:

```bash
npm run build
node dist/examples/runtime-example.js
```

This example creates a Library metamodel with Books, Writers, and demonstrates:
- Metamodel construction
- Instance creation
- Reflective API usage
- Containment navigation
- Resource serialization

## Runtime Classes Details

### BasicEObject

Base class for all model objects. Implements:
- Feature storage via Map
- Reflective API (eGet/eSet/eIsSet/eUnset)
- Containment tracking (eContainer, eContainmentFeature)
- Content navigation (eContents, eAllContents)
- Proxy support

**Usage:**
```typescript
class MyModelObject extends BasicEObject {
  eClass(): EClass {
    return MyPackage.Literals.MY_CLASS;
  }
}

// Or use DynamicEObject for runtime creation
const obj = new DynamicEObject(myClass);
```

### BasicEPackage

Package container implementation. Manages:
- Classifiers (EClass, EDataType)
- Subpackages
- Factory instance
- Namespace URI and prefix

### BasicEClass

Metamodel class implementation. Provides:
- Feature management (attributes, references)
- Operation management
- Inheritance (superTypes, allSuperTypes)
- Feature lookup by name or ID
- Instance checking

### BasicEFactory

Object creation factory. Supports:
- Static creation via registered creators
- Dynamic creation via DynamicEObject
- Type conversion (createFromString, convertToString)

### BasicEStructuralFeature

Base for attributes and references. Handles:
- Multiplicity (lowerBound, upperBound)
- Flags (changeable, volatile, transient, derived, unsettable)
- Default values
- Type information
- Containing class

### BasicEAttribute

Attribute implementation. Adds:
- ID attribute support
- Data type reference
- Default value computation

### BasicEReference

Reference implementation. Provides:
- Containment flag
- Opposite reference (bidirectional)
- Proxy resolution flag
- Key support for map-like references

### BasicEDataType

Data type implementation. Features:
- Instance class name
- Serializable flag
- Type checking
- Default values for primitives

### BasicEOperation

Operation implementation. Includes:
- Parameters
- Return type
- Exceptions
- Override checking
- Multiplicity

### BasicResource

Persistence implementation. Offers:
- Content management
- Load/save operations
- URI fragment resolution (XPath and ID-based)
- JSON serialization
- Error/warning tracking

### BasicResourceSet

Resource container. Manages:
- Multiple resources
- Package registry integration
- Resource factory registry
- URI converter with mappings

## Implementation Notes

### Feature Storage

Features are stored in a Map using feature IDs:
```typescript
protected eSettings: Map<number, any> = new Map();
```

This provides:
- Efficient lookup by feature ID
- Dynamic feature support
- No fixed property layout

### Containment Relationships

Containment is managed bidirectionally:
- Setting a containment reference updates child's eContainer
- Removing from containment clears eContainer
- Moving between containers handled automatically

### URI Fragments

Two fragment formats supported:
1. **XPath-style**: `/0/2/1` - Navigate by index
2. **ID-based**: `978-0451524935` - Lookup by ID attribute

### Type Safety

While EMF uses runtime reflection, EMFTS maintains TypeScript type safety:
- Generic interfaces for typed access
- Type guards for feature checking
- Builder pattern for fluent API

## Comparison with Eclipse EMF

| Feature | Eclipse EMF | EMFTS |
|---------|-------------|-------|
| Language | Java | TypeScript |
| Dynamic Objects | EObjectImpl | BasicEObject/DynamicEObject |
| Storage | eSettings array | Map<number, any> |
| Serialization | XMI (XML) | JSON (extensible) |
| Code Generation | JET templates | Optional (not required) |
| Reflection | Java reflection | TypeScript structural typing |
| Containment | EObject API | Full implementation |
| Resources | Resource/ResourceSet | Full implementation |

## Building and Testing

```bash
# Install dependencies
npm install

# Build runtime
npm run build

# Run example
node dist/examples/runtime-example.js
```

## What's Next?

The runtime implementation is complete and functional. Potential enhancements:

1. **XMI Support**: Add XML serialization compatible with Eclipse EMF
2. **Change Notification**: Implement ENotification framework
3. **Validation**: Add constraint checking and validation
4. **OCL Support**: Query language implementation
5. **Edit Commands**: Command pattern for undo/redo
6. **Cross-References**: Proxy resolution for inter-resource references
7. **Resource Factories**: Content-type based resource creation
8. **URI Converters**: Platform:/resource and platform:/plugin mappings

## License

Same as Eclipse EMF - Eclipse Public License v2.0

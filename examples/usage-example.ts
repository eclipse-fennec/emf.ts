/**
 * Example usage of EMFTS interfaces
 * Demonstrates how to work with EMF models in TypeScript
 */

import {
  EObject,
  EClass,
  EPackage,
  EFactory,
  EAttribute,
  EReference,
  EPackageRegistry,
  Resource,
  ResourceSet,
  URI
} from '../src/index';

// Example 1: Reflective API Usage
function reflectiveExample() {
  // Get package from global registry
  const manualPackage: EPackage | null = EPackageRegistry.INSTANCE.getEPackage(
    'http://gecko.org/example/model/manual/1.0'
  );

  if (!manualPackage) {
    console.error('Package not found!');
    return;
  }

  // Get the Foo class
  const fooClass: EClass | null = manualPackage.getEClassifier('Foo') as EClass;
  if (!fooClass) {
    console.error('Foo class not found!');
    return;
  }

  // Get the value attribute
  const valueAttr: EAttribute | null = fooClass.getEStructuralFeature('value') as EAttribute;
  if (!valueAttr) {
    console.error('value attribute not found!');
    return;
  }

  // Create an instance using the factory
  const factory: EFactory = manualPackage.getEFactoryInstance();
  const fooInstance: EObject = factory.create(fooClass);

  // Set value reflectively
  fooInstance.eSet(valueAttr, 'Hello from TypeScript!');

  // Get value reflectively
  const value: any = fooInstance.eGet(valueAttr);
  console.log(`Value: ${value}`); // Output: Value: Hello from TypeScript!

  // Check if value is set
  const isSet: boolean = fooInstance.eIsSet(valueAttr);
  console.log(`Is set: ${isSet}`); // Output: Is set: true

  // Unset value
  fooInstance.eUnset(valueAttr);
  const isSetAfterUnset: boolean = fooInstance.eIsSet(valueAttr);
  console.log(`Is set after unset: ${isSetAfterUnset}`); // Output: Is set after unset: false
}

// Example 2: Metamodel Inspection
function metamodelInspectionExample() {
  const pkg: EPackage | null = EPackageRegistry.INSTANCE.getEPackage(
    'http://gecko.org/example/model/manual/1.0'
  );

  if (!pkg) return;

  console.log(`Package: ${pkg.getName()}`);
  console.log(`NS URI: ${pkg.getNsURI()}`);
  console.log(`NS Prefix: ${pkg.getNsPrefix()}`);

  // List all classifiers
  const classifiers = pkg.getEClassifiers();
  console.log(`\nClassifiers (${classifiers.length}):`);

  classifiers.forEach(classifier => {
    console.log(`  - ${classifier.getName()}`);

    if (classifier instanceof Object && 'getEAllStructuralFeatures' in classifier) {
      const eClass = classifier as EClass;
      const features = eClass.getEAllStructuralFeatures();

      console.log(`    Features (${features.length}):`);
      features.forEach(feature => {
        const typeName = feature.getEType()?.getName() || 'unknown';
        const many = feature.isMany() ? '[]' : '';
        console.log(`      - ${feature.getName()}: ${typeName}${many}`);
      });
    }
  });
}

// Example 3: Working with Resources
async function resourceExample() {
  // Create a resource set
  const resourceSet: ResourceSet = createResourceSet();

  // Create a resource
  const uri: URI = URI.createFileURI('/tmp/mymodel.xmi');
  const resource: Resource = resourceSet.createResource(uri);

  // Get package and create object
  const pkg: EPackage | null = resourceSet.getPackageRegistry().getEPackage(
    'http://gecko.org/example/model/manual/1.0'
  );

  if (pkg) {
    const factory: EFactory = pkg.getEFactoryInstance();
    const fooClass: EClass | null = pkg.getEClassifier('Foo') as EClass;

    if (fooClass) {
      const fooInstance: EObject = factory.create(fooClass);

      // Add to resource contents
      resource.getContents().push(fooInstance);

      // Save resource
      await resource.save();
      console.log('Resource saved successfully!');

      // Load resource
      await resource.load();
      console.log('Resource loaded successfully!');

      // Access loaded objects
      const loadedObjects: EObject[] = resource.getContents();
      console.log(`Loaded ${loadedObjects.length} object(s)`);
    }
  }
}

// Example 4: Type-Safe Generated Code Usage (hypothetical)
// This would be generated from .ecore files

interface Foo extends EObject {
  getValue(): string | null;
  setValue(value: string | null): void;
}

class FooImpl implements Foo {
  private value: string | null = null;

  getValue(): string | null {
    return this.value;
  }

  setValue(value: string | null): void {
    this.value = value;
  }

  // EObject methods
  eClass(): EClass {
    return ManualPackage.Literals.FOO;
  }

  eGet(feature: any): any {
    if (feature === ManualPackage.Literals.FOO__VALUE) {
      return this.getValue();
    }
    throw new Error('Unknown feature');
  }

  eSet(feature: any, newValue: any): void {
    if (feature === ManualPackage.Literals.FOO__VALUE) {
      this.setValue(newValue as string);
      return;
    }
    throw new Error('Unknown feature');
  }

  eIsSet(feature: any): boolean {
    if (feature === ManualPackage.Literals.FOO__VALUE) {
      return this.value !== null;
    }
    return false;
  }

  eUnset(feature: any): void {
    if (feature === ManualPackage.Literals.FOO__VALUE) {
      this.setValue(null);
      return;
    }
    throw new Error('Unknown feature');
  }

  // Simplified implementations
  eResource(): Resource | null { return null; }
  eContainer(): EObject | null { return null; }
  eContainingFeature(): any { return null; }
  eContainmentFeature(): EReference | null { return null; }
  eContents(): EObject[] { return []; }
  eAllContents(): Iterator<EObject> { return [][Symbol.iterator](); }
  eIsProxy(): boolean { return false; }
  eCrossReferences(): EObject[] { return []; }
  eInvoke(operation: any, args: any[]): any { throw new Error('Not implemented'); }
}

// Mock package class (would be generated)
class ManualPackage {
  static readonly Literals = {
    FOO: null as any as EClass,
    FOO__VALUE: null as any as EAttribute
  };
}

// Example 5: Type-safe usage with generated code
function typeSafeExample() {
  const foo: Foo = new FooImpl();

  // Type-safe access
  foo.setValue('Hello TypeScript!');
  const value: string | null = foo.getValue();
  console.log(`Type-safe value: ${value}`);

  // Reflective access still works
  foo.eSet(ManualPackage.Literals.FOO__VALUE, 'Hello Reflection!');
  const reflectiveValue: any = foo.eGet(ManualPackage.Literals.FOO__VALUE);
  console.log(`Reflective value: ${reflectiveValue}`);
}

// Helper function to create a resource set (implementation would be separate)
function createResourceSet(): ResourceSet {
  // This would be provided by a runtime implementation
  throw new Error('ResourceSet implementation needed');
}

// Run examples
console.log('=== Example 1: Reflective API ===');
// reflectiveExample(); // Requires registered package

console.log('\n=== Example 2: Metamodel Inspection ===');
// metamodelInspectionExample(); // Requires registered package

console.log('\n=== Example 3: Resource Management ===');
// resourceExample(); // Requires implementation

console.log('\n=== Example 4: Type-Safe Generated Code ===');
typeSafeExample();

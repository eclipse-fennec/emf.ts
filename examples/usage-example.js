"use strict";
/**
 * Example usage of EMFTS interfaces
 * Demonstrates how to work with EMF models in TypeScript
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
// Example 1: Reflective API Usage
function reflectiveExample() {
    // Get package from global registry
    const manualPackage = index_1.EPackageRegistry.INSTANCE.getEPackage('http://gecko.org/example/model/manual/1.0');
    if (!manualPackage) {
        console.error('Package not found!');
        return;
    }
    // Get the Foo class
    const fooClass = manualPackage.getEClassifier('Foo');
    if (!fooClass) {
        console.error('Foo class not found!');
        return;
    }
    // Get the value attribute
    const valueAttr = fooClass.getEStructuralFeature('value');
    if (!valueAttr) {
        console.error('value attribute not found!');
        return;
    }
    // Create an instance using the factory
    const factory = manualPackage.getEFactoryInstance();
    const fooInstance = factory.create(fooClass);
    // Set value reflectively
    fooInstance.eSet(valueAttr, 'Hello from TypeScript!');
    // Get value reflectively
    const value = fooInstance.eGet(valueAttr);
    console.log(`Value: ${value}`); // Output: Value: Hello from TypeScript!
    // Check if value is set
    const isSet = fooInstance.eIsSet(valueAttr);
    console.log(`Is set: ${isSet}`); // Output: Is set: true
    // Unset value
    fooInstance.eUnset(valueAttr);
    const isSetAfterUnset = fooInstance.eIsSet(valueAttr);
    console.log(`Is set after unset: ${isSetAfterUnset}`); // Output: Is set after unset: false
}
// Example 2: Metamodel Inspection
function metamodelInspectionExample() {
    const pkg = index_1.EPackageRegistry.INSTANCE.getEPackage('http://gecko.org/example/model/manual/1.0');
    if (!pkg)
        return;
    console.log(`Package: ${pkg.getName()}`);
    console.log(`NS URI: ${pkg.getNsURI()}`);
    console.log(`NS Prefix: ${pkg.getNsPrefix()}`);
    // List all classifiers
    const classifiers = pkg.getEClassifiers();
    console.log(`\nClassifiers (${classifiers.length}):`);
    classifiers.forEach(classifier => {
        console.log(`  - ${classifier.getName()}`);
        if (classifier instanceof Object && 'getEAllStructuralFeatures' in classifier) {
            const eClass = classifier;
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
    const resourceSet = createResourceSet();
    // Create a resource
    const uri = index_1.URI.createFileURI('/tmp/mymodel.xmi');
    const resource = resourceSet.createResource(uri);
    // Get package and create object
    const pkg = resourceSet.getPackageRegistry().getEPackage('http://gecko.org/example/model/manual/1.0');
    if (pkg) {
        const factory = pkg.getEFactoryInstance();
        const fooClass = pkg.getEClassifier('Foo');
        if (fooClass) {
            const fooInstance = factory.create(fooClass);
            // Add to resource contents
            resource.getContents().push(fooInstance);
            // Save resource
            await resource.save();
            console.log('Resource saved successfully!');
            // Load resource
            await resource.load();
            console.log('Resource loaded successfully!');
            // Access loaded objects
            const loadedObjects = resource.getContents();
            console.log(`Loaded ${loadedObjects.length} object(s)`);
        }
    }
}
class FooImpl {
    constructor() {
        this.value = null;
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        this.value = value;
    }
    // EObject methods
    eClass() {
        return ManualPackage.Literals.FOO;
    }
    eGet(feature) {
        if (feature === ManualPackage.Literals.FOO__VALUE) {
            return this.getValue();
        }
        throw new Error('Unknown feature');
    }
    eSet(feature, newValue) {
        if (feature === ManualPackage.Literals.FOO__VALUE) {
            this.setValue(newValue);
            return;
        }
        throw new Error('Unknown feature');
    }
    eIsSet(feature) {
        if (feature === ManualPackage.Literals.FOO__VALUE) {
            return this.value !== null;
        }
        return false;
    }
    eUnset(feature) {
        if (feature === ManualPackage.Literals.FOO__VALUE) {
            this.setValue(null);
            return;
        }
        throw new Error('Unknown feature');
    }
    // Simplified implementations
    eResource() { return null; }
    eContainer() { return null; }
    eContainingFeature() { return null; }
    eContainmentFeature() { return null; }
    eContents() { return []; }
    eAllContents() { return [][Symbol.iterator](); }
    eIsProxy() { return false; }
    eCrossReferences() { return []; }
    eInvoke(operation, args) { throw new Error('Not implemented'); }
}
// Mock package class (would be generated)
class ManualPackage {
}
ManualPackage.Literals = {
    FOO: null,
    FOO__VALUE: null
};
// Example 5: Type-safe usage with generated code
function typeSafeExample() {
    const foo = new FooImpl();
    // Type-safe access
    foo.setValue('Hello TypeScript!');
    const value = foo.getValue();
    console.log(`Type-safe value: ${value}`);
    // Reflective access still works
    foo.eSet(ManualPackage.Literals.FOO__VALUE, 'Hello Reflection!');
    const reflectiveValue = foo.eGet(ManualPackage.Literals.FOO__VALUE);
    console.log(`Reflective value: ${reflectiveValue}`);
}
// Helper function to create a resource set (implementation would be separate)
function createResourceSet() {
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

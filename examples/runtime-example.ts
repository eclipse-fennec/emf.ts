/**
 * EMFTS Runtime Example
 *
 * This example demonstrates how to:
 * 1. Build a metamodel programmatically (without code generation)
 * 2. Create instances dynamically
 * 3. Use the reflective API (eGet/eSet)
 * 4. Navigate containment hierarchies
 * 5. Serialize to JSON
 */

import {
  BasicEPackage,
  BasicEClass,
  BasicEAttribute,
  BasicEReference,
  BasicEDataType,
  BasicEFactory,
  BasicResource,
  BasicResourceSet,
  EClassBuilder,
  EAttributeBuilder,
  EReferenceBuilder,
  EcoreDataTypes
} from '../src/runtime';

import { URI } from '../src/URI';
import { EClass } from '../src/EClass';
import { EAttribute } from '../src/EAttribute';
import { EReference } from '../src/EReference';

/**
 * Example 1: Build a simple Library metamodel
 */
function buildLibraryMetamodel() {
  console.log('=== Building Library Metamodel ===\n');

  // Create the package
  const libraryPackage = new (class extends BasicEPackage {
    constructor() {
      super();
      this.setName('library');
      this.setNsPrefix('lib');
      this.setNsURI('http://example.com/library');
    }
  })();

  // Create Library class
  const libraryClass = new EClassBuilder('Library')
    .build() as BasicEClass;

  // Create Book class
  const bookClass = new EClassBuilder('Book')
    .build() as BasicEClass;

  // Create Writer class
  const writerClass = new EClassBuilder('Writer')
    .build() as BasicEClass;

  // Add attributes to Library
  const libraryName = new EAttributeBuilder('name', EcoreDataTypes.EString)
    .required()
    .build();
  libraryClass.addFeature(libraryName);

  // Add attributes to Book
  const bookTitle = new EAttributeBuilder('title', EcoreDataTypes.EString)
    .required()
    .build();
  const bookPages = new EAttributeBuilder('pages', EcoreDataTypes.EInt)
    .defaultValue('0')
    .build();
  const bookISBN = new EAttributeBuilder('isbn', EcoreDataTypes.EString)
    .id(true)
    .build();

  bookClass.addFeature(bookTitle);
  bookClass.addFeature(bookPages);
  bookClass.addFeature(bookISBN);

  // Add attributes to Writer
  const writerName = new EAttributeBuilder('name', EcoreDataTypes.EString)
    .required()
    .build();

  writerClass.addFeature(writerName);

  // Add references
  const booksReference = new EReferenceBuilder('books', bookClass)
    .containment(true)
    .many(true)
    .build();
  libraryClass.addFeature(booksReference);

  const writersReference = new EReferenceBuilder('writers', writerClass)
    .containment(true)
    .many(true)
    .build();
  libraryClass.addFeature(writersReference);

  const authorReference = new EReferenceBuilder('author', writerClass)
    .build();
  bookClass.addFeature(authorReference);

  // Add classes to package
  libraryPackage.getEClassifiers().push(libraryClass);
  libraryPackage.getEClassifiers().push(bookClass);
  libraryPackage.getEClassifiers().push(writerClass);

  console.log(`Package: ${libraryPackage.getName()}`);
  console.log(`  URI: ${libraryPackage.getNsURI()}`);
  console.log(`  Classifiers: ${libraryPackage.getEClassifiers().map(c => c.getName()).join(', ')}`);
  console.log();

  return { libraryPackage, libraryClass, bookClass, writerClass };
}

/**
 * Example 2: Create instances using the factory
 */
function createInstances(metamodel: ReturnType<typeof buildLibraryMetamodel>) {
  console.log('=== Creating Instances ===\n');

  const { libraryPackage, libraryClass, bookClass, writerClass } = metamodel;

  // Create factory
  const factory = new BasicEFactory();
  factory.setEPackage(libraryPackage);

  // Create library instance
  const library = factory.create(libraryClass);
  library.eSet(libraryClass.getEStructuralFeature('name')!, 'City Library');

  // Create writer instances
  const writer1 = factory.create(writerClass);
  writer1.eSet(writerClass.getEStructuralFeature('name')!, 'George Orwell');

  const writer2 = factory.create(writerClass);
  writer2.eSet(writerClass.getEStructuralFeature('name')!, 'Aldous Huxley');

  // Create book instances
  const book1 = factory.create(bookClass);
  book1.eSet(bookClass.getEStructuralFeature('title')!, '1984');
  book1.eSet(bookClass.getEStructuralFeature('pages')!, 328);
  book1.eSet(bookClass.getEStructuralFeature('isbn')!, '978-0451524935');
  book1.eSet(bookClass.getEStructuralFeature('author')!, writer1);

  const book2 = factory.create(bookClass);
  book2.eSet(bookClass.getEStructuralFeature('title')!, 'Brave New World');
  book2.eSet(bookClass.getEStructuralFeature('pages')!, 268);
  book2.eSet(bookClass.getEStructuralFeature('isbn')!, '978-0060850524');
  book2.eSet(bookClass.getEStructuralFeature('author')!, writer2);

  // Add books and writers to library (containment)
  const booksFeature = libraryClass.getEStructuralFeature('books')!;
  const writersFeature = libraryClass.getEStructuralFeature('writers')!;

  library.eSet(booksFeature, [book1, book2]);
  library.eSet(writersFeature, [writer1, writer2]);

  console.log(`Library: ${library.eGet(libraryClass.getEStructuralFeature('name')!)}`);
  console.log(`  Books: ${(library.eGet(booksFeature) as any[]).length}`);
  console.log(`  Writers: ${(library.eGet(writersFeature) as any[]).length}`);
  console.log();

  return { library, factory };
}

/**
 * Example 3: Use reflective API
 */
function demonstrateReflectiveAPI(
  library: any,
  metamodel: ReturnType<typeof buildLibraryMetamodel>
) {
  console.log('=== Reflective API ===\n');

  const { libraryClass, bookClass } = metamodel;

  // Navigate using reflective API
  const books = library.eGet(libraryClass.getEStructuralFeature('books')!);

  console.log('Books in library:');
  for (const book of books) {
    const title = book.eGet(bookClass.getEStructuralFeature('title')!);
    const pages = book.eGet(bookClass.getEStructuralFeature('pages')!);
    const isbn = book.eGet(bookClass.getEStructuralFeature('isbn')!);
    const author = book.eGet(bookClass.getEStructuralFeature('author')!);
    const authorName = author ? author.eGet(
      author.eClass().getEStructuralFeature('name')!
    ) : 'Unknown';

    console.log(`  - "${title}" by ${authorName}`);
    console.log(`    Pages: ${pages}, ISBN: ${isbn}`);
  }
  console.log();

  // Test eIsSet
  const book = books[0];
  console.log('Testing eIsSet:');
  console.log(`  title is set: ${book.eIsSet(bookClass.getEStructuralFeature('title')!)}`);
  console.log(`  pages is set: ${book.eIsSet(bookClass.getEStructuralFeature('pages')!)}`);
  console.log();

  // Test eUnset
  console.log('Unsetting pages...');
  book.eUnset(bookClass.getEStructuralFeature('pages')!);
  console.log(`  pages is set: ${book.eIsSet(bookClass.getEStructuralFeature('pages')!)}`);
  console.log(`  pages value: ${book.eGet(bookClass.getEStructuralFeature('pages')!)}`);
  console.log();
}

/**
 * Example 4: Navigate containment hierarchy
 */
function demonstrateContainment(library: any) {
  console.log('=== Containment Navigation ===\n');

  // Get all contents
  const contents = library.eContents();
  console.log(`Direct contents: ${contents.length} items`);

  // Get all descendants
  const allContents = library.eAllContents();
  let count = 0;
  let result = allContents.next();
  while (!result.done) {
    count++;
    result = allContents.next();
  }
  console.log(`All descendants: ${count} items`);
  console.log();

  // Check container relationships
  const books = contents[0];
  if (Array.isArray(books)) {
    const firstBook = books[0];
    if (firstBook) {
      console.log('First book container chain:');
      let current = firstBook;
      while (current) {
        const container = current.eContainer();
        if (container) {
          const feature = current.eContainmentFeature();
          console.log(`  - Contained by ${container.eClass().getName()} via ${feature?.getName()}`);
        }
        current = container;
      }
    }
  }
  console.log();
}

/**
 * Example 5: Resource and serialization
 */
async function demonstrateSerialization(
  library: any,
  metamodel: ReturnType<typeof buildLibraryMetamodel>
) {
  console.log('=== Resource and Serialization ===\n');

  const { libraryPackage } = metamodel;

  // Create resource set
  const resourceSet = new BasicResourceSet();
  resourceSet.getPackageRegistry().set(libraryPackage.getNsURI()!, libraryPackage);

  // Create resource
  const uri = URI.createURI('library://my-library.json');
  const resource = resourceSet.createResource(uri);

  // Add library to resource
  resource.getContents().push(library);

  console.log(`Resource URI: ${resource.getURI()?.toString()}`);
  console.log(`Resource contents: ${resource.getContents().length} root objects`);
  console.log();

  // Save (will log serialized data)
  console.log('Saving resource...');
  await resource.save();
  console.log();

  // Test URI fragments
  const fragment = resource.getURIFragment(library);
  console.log(`Library URI fragment: ${fragment}`);

  const retrieved = resource.getEObject(fragment);
  console.log(`Retrieved object: ${retrieved === library ? 'SAME' : 'DIFFERENT'}`);
  console.log();

  // Test ID-based lookup
  const { bookClass } = metamodel;
  const books = library.eGet(library.eClass().getEStructuralFeature('books')!);
  const firstBook = books[0];
  const isbn = firstBook.eGet(bookClass.getEStructuralFeature('isbn')!);

  const bookByID = resource.getEObject(isbn);
  console.log(`Book by ISBN: ${bookByID === firstBook ? 'FOUND' : 'NOT FOUND'}`);
  console.log();
}

/**
 * Run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     EMFTS Runtime Example              ║');
  console.log('║     Dynamic EMF in TypeScript          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();

  // Build metamodel
  const metamodel = buildLibraryMetamodel();

  // Create instances
  const { library } = createInstances(metamodel);

  // Demonstrate reflective API
  demonstrateReflectiveAPI(library, metamodel);

  // Demonstrate containment
  demonstrateContainment(library);

  // Demonstrate serialization
  await demonstrateSerialization(library, metamodel);

  console.log('✓ All examples completed successfully!');
}

// Run examples if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export { main };

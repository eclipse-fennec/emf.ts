# Collections: EList, EMap and arrays

Multi-valued features are returned either as an `EList` or as a plain array,
depending on the accessor. This page says which is which, and what an `EList`
guarantees that an array cannot.

## Which accessor returns what

`EList` accessors are the ones that own their contents: mutating them updates the
model and emits notifications. Array accessors are either derived views
(`getEAll*`, filtered variants) or lists that have not been migrated yet.

| Accessor | Returns |
|---|---|
| `EPackage.getEClassifiers()` | `EList<EClassifier>` |
| `EPackage.getESubpackages()` | `EList<EPackage>` |
| `EClass.getEStructuralFeatures()` | `EList<EStructuralFeature>` |
| `Resource.getContents()` | `EList<EObject>` |
| `EAnnotation.getDetails()` | `EMap<string, string>` |
| `EClass.getESuperTypes()` | `EClass[]` |
| `EClass.getEAllSuperTypes()` | `EClass[]` |
| `EClass.getEAllStructuralFeatures()` | `EStructuralFeature[]` |
| `EClass.getEAttributes()` / `getEAllAttributes()` | `EAttribute[]` |
| `EClass.getEReferences()` / `getEAllReferences()` | `EReference[]` |
| `EClass.getEAllContainments()` | `EReference[]` |
| `EClass.getEOperations()` / `getEAllOperations()` | `EOperation[]` |
| `EClassifier.getETypeParameters()` | `ETypeParameter[]` |
| `EOperation.getEParameters()` | `EParameter[]` |
| `EOperation.getEExceptions()` | `EClassifier[]` |
| `EEnum.getELiterals()` | `EEnumLiteral[]` |
| `EModelElement.getEAnnotations()` | `EAnnotation[]` |
| `EAnnotation.getContents()` / `getReferences()` | `EObject[]` |
| `ETypeParameter.getEBounds()` | `EGenericType[]` |
| `EGenericType.getETypeArguments()` | `EGenericType[]` |
| `ResourceSet.getResources()` | `Resource[]` |

Java EMF returns an `EList` throughout, so the array returns are a known
deviation; the intent is to unify on `EList` in a future major version. Writing
code that works with either is straightforward, because the two overlap far more
than they differ - see below.

## Writing code that works with both

An `EList` supports the array API you are likely to reach for:

```ts
list.length          // and size()
list[0]              // and get(0)
list.map(fn)         // filter, forEach, find, findIndex, some, every,
                     // slice, reduce, includes, indexOf, lastIndexOf,
                     // concat, join, at, flatMap
list.push(x)         // pop, shift, unshift, splice
list.sort(cmp)       // reverse
for (const x of list) { /* ... */ }
const [first] = list
const copy = [...list]
JSON.stringify(list) // -> [...]
```

Two idioms need care:

```ts
// Works on an EList, but NOT on an array:
list.size()

// Works on an array, but NOT on an EList:
Array.isArray(value)
```

If you need one shape regardless of what an accessor gave you, normalize with
`Array.from()`, which works on both:

```ts
const features = Array.from(eClass.getEAllStructuralFeatures())
```

## EList is not an Array - deliberately

`Array.isArray(eList)` returns `false`, and that will not change.

An `EList` is a `NotifyingEList`: every mutation emits a notification, which is
what adapters and `EContentAdapter` rely on. A real Array cannot keep that
promise, because it exposes two write paths that no interceptor can see:

```ts
list.length = 0      // would empty the list
list[5] = value      // would write a raw slot
```

`EList` supports both of these expressions, but routes them through `clear()`,
`removeAt()` and `set()` so that notifications still fire. Inheriting from
`Array` would hand out the native versions instead and silently break the
contract. Array subclasses also construct their own type via `Symbol.species`,
so `map()` and `filter()` would try to build an `EList` with an array length as
its constructor argument.

This is the position `NodeList`, `HTMLCollection`, `FileList` and `arguments`
have held in the DOM for decades: indexable, iterable, with a `length` - and not
an array. `Array.from(list)` is the documented way to get a real one.

Note that assigning past the end throws instead of creating a sparse list:

```ts
const list = eClass.getEStructuralFeatures()  // size 2
list[2] = feature   // appends, same as add()
list[7] = feature   // RangeError - use add() or push()
```

## Serialization

`JSON.stringify(list)` produces a plain array. This works for lists of primitive
values; a list of `EObject`s still cannot be stringified directly, because
`EObject`s reference their container and are therefore cyclic. Use the JSON
resource support for models - see [examples/Persistence.md](./examples/Persistence.md).

## EMap

`EAnnotation.getDetails()` returns an `EMap<K, V>`, which is an `EList` of map
entries plus map operations (`getByKey`, `putByKey`, `removeByKey`,
`containsKey`, `keys`, `mapValues`, `toMap`). This mirrors Java EMF, where
`EMap<K,V>` extends `EList<Map.Entry<K,V>>`.

Because `EMap.keys()` returns the map keys, `EList` deliberately does not declare
the array-style `keys()`/`values()`/`entries()` iterators - the two meanings
cannot coexist on one type. Use `Array.from(list).keys()` if you need the
array-style iterator.

# Collections: EList and EMap

Every multi-valued accessor returns an `EList`, as in Java EMF. This page covers
the two flavours you will meet, what an `EList` guarantees that an array cannot,
and how to migrate code written against the earlier array returns.

## Owned versus derived lists

| | example | writable |
|---|---|---|
| **Owned** — the list holds the contents | `getEStructuralFeatures()`, `getEOperations()`, `getESuperTypes()`, `getEClassifiers()`, `getEParameters()`, `getELiterals()` | yes |
| **Derived** — assembled from the class and its supertypes | `getEAllStructuralFeatures()`, `getEAllSuperTypes()`, `getEAttributes()`, `getEReferences()`, `getEAllAttributes()`, `getEAllReferences()`, `getEAllContainments()`, `getEAllOperations()` | **no** |

Writing into a derived list cannot have an effect - it is assembled on demand -
so instead of failing silently it throws:

```ts
eClass.getEAllStructuralFeatures().add(feature)
// Error: Cannot call add() on the result of getEAllStructuralFeatures():
//        it is a derived list and cannot be modified.
//        Modify the owning list instead (e.g. getEStructuralFeatures()).

eClass.getEStructuralFeatures().add(feature)   // this is the way
```

This matches `EcoreEList.UnmodifiableEList` in Java EMF, whose mutating methods
throw `UnsupportedOperationException`.

Derived lists are cached and returned as the identical object while the metamodel
is unchanged, again as in Java EMF:

```ts
eClass.getEAllStructuralFeatures() === eClass.getEAllStructuralFeatures()  // true
```

The cache is invalidated by any structural change, including changes several
levels up the inheritance chain — adding a feature to a grandparent class
refreshes its descendants' derived lists.

## The array API on EList

An `EList` supports the array surface you are likely to reach for:

```ts
list.length          // and size()
list[0]              // and get(0)
list[list.length] = x  // appends, like add()
list.map(fn)         // filter, forEach, find, findIndex, some, every,
                     // slice, reduce, includes, indexOf, lastIndexOf,
                     // concat, join, at, flatMap
list.push(x)         // pop, shift, unshift, splice
list.sort(cmp)       // reverse — both emit MOVE notifications
list.length = 0      // clears, like clear()
for (const x of list) { /* ... */ }
const [first] = list
const copy = [...list]
JSON.stringify(list) // -> [...]
```

Not available: `keys()`, `values()` and `entries()`. `EMap` extends `EList` and
defines `keys()` with map semantics, so the array-style iterators cannot coexist
on the same type. Use `Array.from(list).keys()`.

## EList is not an Array - deliberately

`Array.isArray(eList)` returns `false`, and that will not change.

An `EList` is a `NotifyingEList`: every mutation emits a notification, which
adapters and `EContentAdapter` depend on. A real Array cannot keep that promise,
because it exposes two write paths no interceptor can see:

```ts
list.length = 0      // would empty the list
list[5] = value      // would write a raw slot
```

`EList` supports both expressions but routes them through `clear()`,
`removeAt()` and `set()` so notifications still fire. Inheriting from `Array`
would hand out the native versions instead. Array subclasses also construct
their own type through `Symbol.species`, so `map()` and `filter()` would try to
build an `EList` with an array length as its constructor argument.

This is the position `NodeList`, `HTMLCollection`, `FileList` and `arguments`
have held in the DOM for decades: indexable, iterable, with a `length` — and not
an array. `Array.from(list)` is the documented way to get a real one.

Assigning past the end throws rather than creating a sparse list:

```ts
const features = eClass.getEStructuralFeatures()   // size 2
features[2] = feature   // appends, same as add()
features[7] = feature   // RangeError — use add() or push()
```

## Migrating from the array returns

Most code needs no change, because the array API above keeps working. Two things
do need attention:

**1. `Array.isArray()` checks.** The common normalizing idiom now takes the wrong
branch and would treat a list as a single value:

```ts
// before — wraps the EList in a one-element array
const items = Array.isArray(value) ? value : [value]

// after
import { isListValue, toArray } from '@emfts/core'
const items = isListValue(value) ? toArray(value) : [value]
```

**2. Passing a result where an array is required.** Anything with an `Array`
parameter type, or a library that checks for a real array, needs a conversion:

```ts
someLibrary(Array.from(eClass.getEAllStructuralFeatures()))
```

Helpers exported for this purpose:

| | |
|---|---|
| `isEList(v)` | true for an `EList` |
| `isListValue(v)` | true for an `EList` **or** a plain array |
| `toArray(v)` | normalizes either shape to a plain array |
| `replaceListContents(list, v)` | refills an owned list from an array, `EList` or iterable |

## Serialization

`JSON.stringify(list)` produces a plain array. That works for lists of primitive
values; a list of `EObject`s still cannot be stringified directly, because
`EObject`s reference their container and are therefore cyclic. Use the JSON
resource support for models — see [examples/Persistence.md](./examples/Persistence.md).

## EMap

`EAnnotation.getDetails()` returns an `EMap<K, V>`: an `EList` of map entries
plus map operations (`getByKey`, `putByKey`, `removeByKey`, `containsKey`,
`keys`, `mapValues`, `toMap`). This mirrors Java EMF, where `EMap<K,V>` extends
`EList<Map.Entry<K,V>>`.

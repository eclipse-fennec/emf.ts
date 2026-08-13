# Bug: BasicEAnnotation.eGet('details') returns Map — XMI loader crash

## Fehler

```
TypeError: list.push is not a function
    at XMLHelperImpl.setValue (XMLHelper.js:252:22)
    at XMIHandler.createObject (XMLHandler.js:514:25)
    at XMIHandler.handleFeature (XMLHandler.js:438:22)
```

## Ursache

`EcoreFactory.create()` wurde um `case 'EAnnotation': return new BasicEAnnotation()` erweitert (Commit auf `src/ecore/EcorePackage.ts`). Vorher wurde ein `DynamicEObject` erzeugt, dessen `eGet` fuer many-Features ein Array zurueckgibt.

`BasicEAnnotation.eGet('details')` gibt `this.details` zurueck — eine `Map<string, string>`. Der XMI Loader (`XMLHelper.setValue`) erwartet aber ein Array mit `.push()`:

```typescript
// XMLHelper.ts:344-353
setValue(eObject, feature, value, position) {
  if (feature.isMany()) {
    let list = eObject.eGet(feature);  // Map<string, string> ← kein Array!
    if (!list) { list = []; eObject.eSet(feature, list); }
    list.push(value);                  // ← TypeError: Map hat kein .push()
  }
}
```

## Reproduktion

Jede `.ecore` Datei mit `<details>` Kindelementen in `<eAnnotations>`:

```xml
<eAnnotations source="http://www.eclipse.org/emf/2002/GenModel">
  <details key="documentation" value="..."/>
</eAnnotations>
```

## Java EMF Verhalten

In Java EMF gibt `EAnnotation.getDetails()` ein `EMap<String, String>` zurueck, das `EList` erweitert. `EMap` unterstuetzt sowohl Listen-Operationen (`add()`) als auch Map-Operationen (`get(key)`, `put(key, value)`). `eGet(detailsFeature)` gibt dasselbe `EMap`-Objekt zurueck.

## Vorgeschlagener Fix

Option A: `eGet('details')` ein Array von EStringToStringMapEntry-EObjects zurueckgeben lassen (XMI-kompatibel), `getDetails()` synchronisiert lazy in die Map.

Option B: Eine `EMap`-Implementierung erstellen die sowohl `push()`/Array-Kompatibilitaet als auch `Map.get()`/`Map.set()` bietet (analog zu Java EMF).

Option C: `XMLHelper.setValue` um Map-Handling erweitern — wenn `list instanceof Map`, die Map-Entry Attribute (`key`/`value`) extrahieren und `map.set()` aufrufen. Erfordert Aenderung der Reihenfolge in `createObject` (erst `handleObjectAttribs`, dann `setValue`).

## Betroffene Dateien

- `src/runtime/BasicEAnnotation.ts` — `eGet('details')` gibt Map statt Array zurueck
- `src/xmi/XMLHelper.ts` — `setValue()` nimmt Array an
- `src/ecore/EcorePackage.ts` — `EcoreFactory.create('EAnnotation')` erzeugt jetzt BasicEAnnotation
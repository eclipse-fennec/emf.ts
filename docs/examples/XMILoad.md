# XMILoad

## XMI Loading with Nested Elements

XMI Loading mit verschachtelten Elementen Testet das Parsen von komplexen Ecore-Dateien.

```typescript
resource.loadFromString(ecoreXML);
const pkg = resource.getContents()[0];
const personClass = pkg.getEClassifiers()[0];
```


/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject.js';
import { EClass } from '../EClass.js';
import { EStructuralFeature } from '../EStructuralFeature.js';
import { EReference } from '../EReference.js';
import { EAttribute } from '../EAttribute.js';
import { EDataType } from '../EDataType.js';
import { EPackage } from '../EPackage.js';
import { Resource } from '../Resource.js';
import { URI } from '../URI.js';
import { XMLHelper, XMLHelperImpl } from './XMLHelper.js';
import { XSI_URI, XMI_URI } from './XMLHandler.js';
import { isEList } from '../EList.js';
import { InternalEObject, isInternalEObject } from '../InternalEObject.js';
import {
  ExtendedMetaData,
  SIMPLE_CONTENT,
  SIMPLE_FEATURE,
  ELEMENT_FEATURE,
  ATTRIBUTE_FEATURE,
  UNSPECIFIED_FEATURE
} from './ExtendedMetaData.js';

/**
 * XMLSave - Serializes EObjects to XML/XMI format
 */
export class XMLSave {
  protected helper: XMLHelper;
  protected resource: Resource;
  protected declaredNamespaces: Map<string, string> = new Map();
  protected output: string[] = [];
  protected indent: number = 0;
  protected indentString: string = '  ';
  protected idAttributeName: string = 'id';

  constructor(helper?: XMLHelper) {
    this.helper = helper || new XMLHelperImpl();
    this.resource = null as any;
  }

  /**
   * Save resource to string
   */
  save(resource: Resource, options?: Map<string, any>): string {
    return this.saveObjects(resource, resource.getContents(), options);
  }

  /**
   * Save a specific set of objects using the given resource for reference resolution.
   */
  saveObjects(resource: Resource, objects: Iterable<EObject>, options?: Map<string, any>): string {
    this.resource = resource;
    this.output = [];
    this.declaredNamespaces.clear();
    this.indent = 0;

    if (options) {
      this.helper.setOptions(options);
    }

    // XML declaration
    this.output.push('<?xml version="1.0" encoding="UTF-8"?>\n');

    const objectArray = Array.isArray(objects) ? objects : [...objects];

    if (objectArray.length > 1) {
      // Multiple root objects: wrap in <xmi:XMI> container per XMI 2.x spec
      this.saveMultipleRoots(objectArray);
    } else {
      for (const root of objectArray) {
        this.saveObject(root, true);
      }
    }

    return this.output.join('');
  }

  /**
   * Save multiple root objects wrapped in an <xmi:XMI> container element
   */
  protected saveMultipleRoots(contents: Iterable<EObject>): void {
    // Collect all packages from all root objects
    const allPackages = new Set<EPackage>();
    for (const root of contents) {
      for (const pkg of this.collectPackages(root)) {
        allPackages.add(pkg);
      }
    }

    // Write <xmi:XMI> opening tag with namespace declarations
    this.output.push(`<xmi:XMI`);
    this.output.push(` xmlns:xmi="${XMI_URI}"`);
    this.output.push(` xmi:version="2.0"`);
    this.output.push(` xmlns:xsi="${XSI_URI}"`);

    const writtenPrefixes = new Set<string>();
    for (const pkg of allPackages) {
      const nsURI = pkg.getNsURI();
      const prefix = this.getPrefix(pkg);
      if (nsURI && prefix && !writtenPrefixes.has(prefix)) {
        this.output.push(` xmlns:${prefix}="${nsURI}"`);
        this.declaredNamespaces.set(nsURI, prefix);
        writtenPrefixes.add(prefix);
      }
    }

    this.output.push('>\n');
    this.indent++;

    // Write each root object without namespace declarations
    for (const root of contents) {
      this.saveObject(root, false);
    }

    this.indent--;
    this.output.push('</xmi:XMI>\n');
  }

  /**
   * Save a single object
   */
  protected saveObject(obj: EObject, isRoot: boolean): void {
    const eClass = obj.eClass();
    const ePackage = eClass.getEPackage();

    // Get element name
    const prefix = ePackage ? this.getPrefix(ePackage) : '';
    const localName = eClass.getName() || 'Object';
    const qName = prefix ? `${prefix}:${localName}` : localName;

    // Start element
    this.writeIndent();
    this.output.push(`<${qName}`);

    // Write namespaces for root element
    if (isRoot) {
      this.writeNamespaces(obj);
    }

    // Write xsi:type if needed
    if (!isRoot) {
      this.writeTypeAttribute(obj);
    }

    // Write xmi:id if present
    this.saveID(obj);

    // Write attributes
    this.writeAttributes(obj);

    // Check for simple content (EMD kind="simple")
    const emd = this.helper.getExtendedMetaData();
    const simpleText = this.getSimpleContentText(obj, emd);

    // Check for content
    const hasContent = this.hasElementContent(obj);

    if (simpleText !== null) {
      // Simple content: write text directly
      this.output.push(`>${this.escapeXml(simpleText)}`);
      if (hasContent) {
        this.output.push('\n');
        this.indent++;
        this.writeElements(obj);
        this.indent--;
        this.writeIndent();
      }
      this.output.push(`</${qName}>\n`);
    } else if (hasContent) {
      this.output.push('>\n');
      this.indent++;

      // Write element content (containment references)
      this.writeElements(obj);

      this.indent--;
      this.writeIndent();
      this.output.push(`</${qName}>\n`);
    } else {
      this.output.push('/>\n');
    }
  }

  /**
   * Write xmi:id attribute if the resource tracks an ID for this object
   */
  protected saveID(obj: EObject): void {
    const id = this.helper.getID(obj);
    if (id) {
      this.output.push(` ${this.idAttributeName}="${this.escapeXml(id)}"`);
    }
  }

  /**
   * Write namespace declarations
   */
  protected writeNamespaces(obj: EObject): void {
    // Collect all packages used
    const packages = this.collectPackages(obj);

    // Write XMI namespace
    this.output.push(` xmlns:xmi="${XMI_URI}"`);
    this.output.push(` xmi:version="2.0"`);

    // Write XSI namespace
    this.output.push(` xmlns:xsi="${XSI_URI}"`);

    // Write package namespaces (avoid duplicates)
    const writtenPrefixes = new Set<string>();
    for (const pkg of packages) {
      const nsURI = pkg.getNsURI();
      const prefix = this.getPrefix(pkg);
      if (nsURI && prefix && !writtenPrefixes.has(prefix)) {
        this.output.push(` xmlns:${prefix}="${nsURI}"`);
        this.declaredNamespaces.set(nsURI, prefix);
        writtenPrefixes.add(prefix);
      }
    }

    // Collect and write EMD namespace declarations
    const emd = this.helper.getExtendedMetaData();
    if (emd) {
      this.collectEMDNamespaces(obj, emd, writtenPrefixes);
    }
  }

  /**
   * Collect and declare additional namespaces from EMD annotations.
   */
  protected collectEMDNamespaces(obj: EObject, emd: ExtendedMetaData, writtenPrefixes: Set<string>): void {
    const collectFromObject = (o: EObject) => {
      const eClass = o.eClass();
      for (const feature of eClass.getEAllStructuralFeatures()) {
        const ns = emd.getNamespace(feature);
        if (ns && !this.declaredNamespaces.has(ns) && ns !== 'http://www.w3.org/XML/1998/namespace') {
          // Generate a prefix from the namespace
          const prefix = this.generatePrefix(ns, writtenPrefixes);
          if (prefix) {
            this.output.push(` xmlns:${prefix}="${ns}"`);
            this.declaredNamespaces.set(ns, prefix);
            writtenPrefixes.add(prefix);
          }
        }
      }
      for (const content of o.eContents()) {
        collectFromObject(content);
      }
    };
    collectFromObject(obj);
  }

  /**
   * Generate a namespace prefix for a URI.
   */
  protected generatePrefix(nsURI: string, usedPrefixes: Set<string>): string | null {
    // Try to extract a meaningful prefix from the URI
    const lastSlash = nsURI.lastIndexOf('/');
    let candidate = lastSlash >= 0 ? nsURI.substring(lastSlash + 1) : nsURI;
    // Clean up
    candidate = candidate.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!candidate) candidate = 'ns';
    if (candidate.length > 10) candidate = candidate.substring(0, 10);

    if (!usedPrefixes.has(candidate)) return candidate;

    // Add numeric suffix
    for (let i = 1; i < 100; i++) {
      const prefixed = `${candidate}${i}`;
      if (!usedPrefixes.has(prefixed)) return prefixed;
    }
    return null;
  }

  /**
   * Collect all packages used by object tree
   */
  protected collectPackages(obj: EObject): Set<EPackage> {
    const packages = new Set<EPackage>();

    const collectFromObject = (o: EObject) => {
      const eClass = o.eClass();
      const pkg = eClass.getEPackage();
      if (pkg) {
        packages.add(pkg);
      }

      // Check contained objects
      for (const content of o.eContents()) {
        collectFromObject(content);
      }
    };

    collectFromObject(obj);
    return packages;
  }

  /**
   * Get prefix for package
   */
  protected getPrefix(pkg: EPackage): string {
    return pkg.getNsPrefix() || pkg.getName() || 'ns';
  }

  /**
   * Write xsi:type attribute if needed
   */
  protected writeTypeAttribute(obj: EObject): void {
    // TODO: Write type if different from expected type
  }

  /**
   * Write attribute values and non-containment references
   */
  protected writeAttributes(obj: EObject): void {
    const eClass = obj.eClass();
    const emd = this.helper.getExtendedMetaData();

    for (const feature of eClass.getEAllStructuralFeatures()) {
      if (feature.isTransient() || feature.isDerived()) continue;

      // Skip simple content feature (written as text content)
      if (emd) {
        const emdName = emd.getName(feature);
        if (emdName === ':0') continue;
      }

      if (this.isAttribute(feature)) {
        // Skip EMD element features (written as elements in writeElements)
        if (emd && emd.getFeatureKind(feature) === ELEMENT_FEATURE) continue;

        // Write EAttribute as attribute
        const attr = feature as EAttribute;
        let value = obj.eGet(attr);

        if (value !== null && value !== undefined) {
          // Resolve proxy if necessary
          value = this.resolveValue(value, obj);

          if (value !== null && value !== undefined) {
            // Get default value safely - may return null if type not properly set
            let defaultValue: any = null;
            try {
              defaultValue = attr.getDefaultValue();
            } catch {
              // Ignore - use null as default
            }
            if (value !== defaultValue) {
              const stringValue = this.convertToString(attr, value);
              const attrName = this.getSerializedAttributeName(attr, emd);
              this.output.push(` ${attrName}="${this.escapeXml(stringValue)}"`);
            }
          }
        }
      } else if ('isContainment' in feature) {
        // Write non-containment EReference as attribute with href
        const ref = feature as EReference;
        if (!ref.isContainment()) {
          let value = obj.eGet(ref);
          if (value !== null && value !== undefined) {
            const serializedRefName = this.helper.getSerializedFeatureName(ref);
            if (!feature.isMany()) {
              // Single-valued reference - resolve proxy first
              value = this.resolveValue(value, obj);

              if (value !== null && value !== undefined) {
                // If value is now a string (unresolved proxy URI), use it directly
                if (typeof value === 'string') {
                  this.output.push(` ${serializedRefName}="${this.escapeXml(value)}"`);
                } else if (typeof value === 'boolean') {
                  // Handle primitive boolean (shouldn't be a reference, but handle gracefully)
                  this.output.push(` ${serializedRefName}="${value ? 'true' : 'false'}"`);
                } else if (typeof value === 'number') {
                  // Handle primitive number (shouldn't be a reference, but handle gracefully)
                  this.output.push(` ${serializedRefName}="${String(value)}"`);
                } else {
                  const href = this.getTypePrefixedHref(ref, value as EObject);
                  if (href) {
                    this.output.push(` ${serializedRefName}="${this.escapeXml(href)}"`);
                  }
                }
              }
            } else if (Array.isArray(value) || isEList(value)) {
              // Multi-valued non-containment refs: same-document refs as space-separated attribute
              const sameDocHrefs: string[] = [];
              for (const refObj of value) {
                const resolved = this.resolveValue(refObj, obj);
                if (resolved === null || resolved === undefined) continue;
                if (typeof resolved === 'string') continue; // cross-doc proxy, handled in writeElements
                const refResource = (resolved as EObject).eResource?.();
                if (refResource && refResource === this.resource) {
                  const href = this.getHref(resolved as EObject);
                  if (href) sameDocHrefs.push(href);
                }
                // cross-document refs are handled in writeElements
              }
              if (sameDocHrefs.length > 0) {
                this.output.push(` ${serializedRefName}="${this.escapeXml(sameDocHrefs.join(' '))}"`);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get href for cross-reference
   */
  protected getHref(obj: EObject): string | null {
    // Handle proxies — deresolve the proxy URI against the resource URI
    // (Java EMF never resolves proxies during save, just deresolves)
    if (isInternalEObject(obj) && obj.eIsProxy()) {
      const proxyURI = obj.eProxyURI();
      if (!proxyURI) return null;
      return this.helper.deresolve(proxyURI).toString();
    }

    // For EClassifier/EStructuralFeature in subpackages, always check if the
    // root package is in our resource — regardless of what eResource() returns,
    // since the eContainer chain may point to a different resource instance.
    const intraFragment = this.getIntraResourceFragment(obj);
    if (intraFragment) {
      return intraFragment;
    }

    const resource = obj.eResource?.();

    // Try to get URI fragment from resource
    if (resource) {
      const fragment = resource.getURIFragment(obj);
      if (fragment) {
        // Same resource: use fragment-only reference
        // Path-based fragments (/0, /0/@features.1) always start with /
        // and are written without # (SAME_DOC / getIDREF style).
        // ID-based fragments (xmi:id values like _myId) never start with /
        // and get # prefix.
        if (resource === this.resource) {
          return fragment.startsWith('/') ? fragment : `#${fragment}`;
        }
        // Different resource: use full URI
        const uri = resource.getURI();
        if (uri) {
          return `${uri.toString()}#${fragment}`;
        }
        return `#${fragment}`;
      }
    }

    // Handle EStructuralFeature (EAttribute, EReference) - need containing class
    if ('getEContainingClass' in obj && typeof (obj as any).getEContainingClass === 'function') {
      const containingClass = (obj as any).getEContainingClass();
      if (containingClass) {
        const pkg = containingClass.getEPackage?.();
        const className = containingClass.getName?.();
        const featureName = (obj as any).getName?.();
        if (pkg && className && featureName) {
          const nsURI = pkg.getNsURI?.();
          if (nsURI) {
            return `${nsURI}#//${className}/${featureName}`;
          }
        }
      }
    }

    // Handle EClassifier (EClass, EDataType, EEnum) - use package URI
    if ('getEPackage' in obj && typeof (obj as any).getEPackage === 'function') {
      const pkg = (obj as any).getEPackage();
      if (pkg) {
        const nsURI = pkg.getNsURI?.();
        const name = (obj as any).getName?.();
        if (nsURI && name) {
          return `${nsURI}#//${name}`;
        }
      }
    }

    // Fallback: just use name as fragment
    if ('getName' in obj) {
      const name = (obj as any).getName?.();
      if (name) {
        return `//${name}`;
      }
    }

    return null;
  }

  /**
   * For Ecore objects (EClassifier, EStructuralFeature) that lack eResource()
   * because the eContainer chain is not set, walk up the Ecore-specific
   * hierarchy (ePackage/eSuperPackage) to find the root package. If that root
   * is in this.resource, build a hierarchical fragment path like
   * "//service/base/Service" or "//service/base/Service/id".
   */
  protected getIntraResourceFragment(obj: EObject): string | null {
    if (!this.resource) return null;

    const pathSegments: string[] = [];
    let pkg: EPackage | null = null;

    // EStructuralFeature → getEContainingClass → getEPackage → ...
    if ('getEContainingClass' in obj && typeof (obj as any).getEContainingClass === 'function') {
      const containingClass = (obj as any).getEContainingClass();
      if (!containingClass) return null;
      const featureName = (obj as any).getName?.();
      const className = containingClass.getName?.();
      if (!featureName || !className) return null;
      pathSegments.push(className, featureName);
      pkg = containingClass.getEPackage?.() ?? null;
    }
    // EClassifier → getEPackage → ...
    else if ('getEPackage' in obj && typeof (obj as any).getEPackage === 'function') {
      const name = (obj as any).getName?.();
      if (!name) return null;
      pathSegments.push(name);
      pkg = (obj as any).getEPackage();
    }

    if (!pkg) return null;

    // Walk up eSuperPackage chain, collecting subpackage names
    while (pkg) {
      const superPkg: any = typeof pkg.getESuperPackage === 'function' ? pkg.getESuperPackage() : null;
      if (!superPkg) break; // pkg is the root
      const pkgName = pkg.getName?.();
      if (pkgName) pathSegments.unshift(pkgName);
      pkg = superPkg;
    }

    // Check if root package is in our resource's contents
    const contents = this.resource.getContents();
    for (const root of contents) {
      if (root === pkg) {
        return '#//' + pathSegments.join('/');
      }
    }

    return null;
  }

  /**
   * Get href with type prefix for cross-document references when the declared
   * type is abstract and differs from the actual type.
   * Java EMF format: "prefix:TypeName URI#fragment"
   */
  protected getTypePrefixedHref(ref: EReference, value: EObject): string | null {
    const href = this.getHref(value);
    if (!href) return null;

    // Only add type prefix for cross-document refs (not starting with / or #)
    if (href.startsWith('/') || href.startsWith('#')) return href;

    const declaredType = ref.getEType();
    const actualType = value.eClass();
    if (declaredType && actualType && actualType !== declaredType
        && 'isAbstract' in declaredType && (declaredType as EClass).isAbstract()) {
      const actualPkg = actualType.getEPackage();
      if (actualPkg) {
        const prefix = this.getPrefix(actualPkg);
        const typeName = actualType.getName();
        if (prefix && typeName) {
          return `${prefix}:${typeName} ${href}`;
        }
      }
    }

    return href;
  }

  /**
   * Check if feature is an attribute (not a reference)
   */
  protected isAttribute(feature: EStructuralFeature): boolean {
    return !('isContainment' in feature);
  }

  /**
   * Check if object has element content (containments, multi-valued non-containment refs, or EMD element features)
   */
  protected hasElementContent(obj: EObject): boolean {
    const eClass = obj.eClass();
    const features = eClass.getEAllStructuralFeatures();
    const emd = this.helper.getExtendedMetaData();

    // Check EMD element features (EAttributes written as elements)
    if (emd) {
      for (const feature of features) {
        if (feature.isTransient() || feature.isDerived()) continue;
        if (!this.isAttribute(feature)) continue;
        if (emd.getFeatureKind(feature) !== ELEMENT_FEATURE) continue;
        const value = obj.eGet(feature);
        if (value !== null && value !== undefined) return true;
      }
    }

    for (const feature of features) {
      if ('isContainment' in feature) {
        const ref = feature as EReference;
        if (feature.isTransient()) continue;

        const value = obj.eGet(ref);
        if (value === null || value === undefined) continue;

        if (ref.isContainment()) {
          // Containment references
          if ((Array.isArray(value) || isEList(value)) && value.length > 0) return true;
          if (!Array.isArray(value) && !isEList(value)) return true;
        } else if (feature.isMany() && (Array.isArray(value) || isEList(value)) && value.length > 0) {
          // Multi-valued non-containment references: only element content if cross-document
          for (const refObj of value) {
            const refResource = (refObj as EObject).eResource?.();
            if (!refResource || refResource !== this.resource) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Write element content (containments and multi-valued non-containment references)
   */
  protected writeElements(obj: EObject): void {
    const eClass = obj.eClass();
    const emd = this.helper.getExtendedMetaData();

    // Write EAttribute features annotated as kind="element" (EMD element features)
    if (emd) {
      for (const feature of eClass.getEAllStructuralFeatures()) {
        if (feature.isTransient() || feature.isDerived()) continue;
        if (!this.isAttribute(feature)) continue;

        const fKind = emd.getFeatureKind(feature);
        if (fKind !== ELEMENT_FEATURE) continue;

        const value = obj.eGet(feature);
        if (value === null || value === undefined) continue;

        const elemName = this.getSerializedElementName(feature, emd);
        const attr = feature as EAttribute;

        if (feature.isMany() && (Array.isArray(value) || isEList(value))) {
          for (const item of value) {
            if (item !== null && item !== undefined) {
              this.writeIndent();
              const strVal = this.convertSingleValueToString(attr, item);
              this.output.push(`<${elemName}>${this.escapeXml(strVal)}</${elemName}>\n`);
            }
          }
        } else {
          this.writeIndent();
          const strVal = this.convertToString(attr, value);
          this.output.push(`<${elemName}>${this.escapeXml(strVal)}</${elemName}>\n`);
        }
      }
    }

    for (const feature of eClass.getEAllStructuralFeatures()) {
      if ('isContainment' in feature) {
        const ref = feature as EReference;
        if (feature.isTransient()) continue;

        const value = obj.eGet(ref);
        if (value === null || value === undefined) continue;

        if (ref.isContainment()) {
          // Containment: write as nested elements
          if (Array.isArray(value) || isEList(value)) {
            for (const child of value) {
              this.writeElement(ref, child);
            }
          } else {
            this.writeElement(ref, value as EObject);
          }
        } else if (feature.isMany() && (Array.isArray(value) || isEList(value)) && value.length > 0) {
          // Multi-valued non-containment: only cross-document refs as elements with href
          for (const refObj of value) {
            const resolved = this.resolveValue(refObj, obj);
            if (resolved === null || resolved === undefined) continue;
            const refResource = typeof resolved !== 'string' ? (resolved as EObject).eResource?.() : null;
            // Skip same-document refs (already written as attribute)
            if (refResource && refResource === this.resource) continue;
            const href = typeof resolved === 'string' ? resolved : this.getHref(resolved as EObject);
            if (href) {
              this.writeIndent();
              this.output.push(`<${this.helper.getSerializedFeatureName(ref)} href="${this.escapeXml(href)}"/>\n`);
            }
          }
        }
      }
    }
  }

  /**
   * Write a single element
   */
  protected writeElement(feature: EReference, value: EObject): void {
    const emd = this.helper.getExtendedMetaData();
    const featureName = this.getSerializedElementName(feature, emd) || 'element';

    this.writeIndent();
    this.output.push(`<${featureName}`);

    // Write xsi:type if actual type differs from declared type
    const declaredType = feature.getEType() as EClass;
    const actualType = value.eClass();

    if (declaredType && actualType && actualType !== declaredType) {
      const pkg = actualType.getEPackage();
      const prefix = pkg ? this.getPrefix(pkg) : '';
      const typeName = prefix ? `${prefix}:${actualType.getName()}` : actualType.getName();
      this.output.push(` xsi:type="${typeName}"`);
    }

    // Write xmi:id if present
    this.saveID(value);

    // Write attributes
    this.writeAttributes(value);

    // Check for simple content
    const simpleText = this.getSimpleContentText(value, emd);

    // Check for nested content
    const hasContent = this.hasElementContent(value);

    if (simpleText !== null) {
      this.output.push(`>${this.escapeXml(simpleText)}`);
      if (hasContent) {
        this.output.push('\n');
        this.indent++;
        this.writeElements(value);
        this.indent--;
        this.writeIndent();
      }
      this.output.push(`</${featureName}>\n`);
    } else if (hasContent) {
      this.output.push('>\n');
      this.indent++;

      this.writeElements(value);

      this.indent--;
      this.writeIndent();
      this.output.push(`</${featureName}>\n`);
    } else {
      this.output.push('/>\n');
    }
  }

  /**
   * Resolve a value if it's a proxy.
   * Returns the resolved value or the original value if not a proxy or cannot be resolved.
   */
  protected resolveValue(value: any, owner: EObject): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Check if value is a proxy
    if (isInternalEObject(value) && value.eIsProxy()) {
      // Try to resolve via the owner's resource
      if ('eResolveProxy' in owner && typeof (owner as any).eResolveProxy === 'function') {
        const resolved = (owner as any).eResolveProxy(value);
        if (resolved !== value && !(isInternalEObject(resolved) && resolved.eIsProxy())) {
          return resolved;
        }
      }

      // If still a proxy, try to resolve via the resource set
      const proxyURI = value.eProxyURI();
      if (proxyURI && this.resource) {
        const resourceSet = this.resource.getResourceSet();
        if (resourceSet) {
          const uriStr = proxyURI.toString();
          const hashIndex = uriStr.indexOf('#');

          if (hashIndex >= 0) {
            const fragment = uriStr.substring(hashIndex + 1);
            let targetResource = this.resource;

            if (hashIndex > 0) {
              const resourceURI = URI.createURI(uriStr.substring(0, hashIndex));
              targetResource = resourceSet.getResource(resourceURI, true) || this.resource;
            }

            if (targetResource) {
              const resolved = targetResource.getEObject(fragment);
              if (resolved) {
                return resolved;
              }
            }
          }
        }
      }

      // Cannot resolve - return the proxy URI as a string for serialization
      // This way unresolved proxies are serialized as references, not "EProxy(...)"
      return proxyURI?.toString() || null;
    }

    return value;
  }

  /**
   * Convert value to string
   */
  protected convertToString(attr: EAttribute, value: any): string {
    if (value === null || value === undefined) return '';

    // If value is already a string (e.g., from unresolved proxy URI), return it
    if (typeof value === 'string') {
      return value;
    }

    // Handle boolean explicitly
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Handle numbers
    if (typeof value === 'number') {
      return String(value);
    }

    // Handle arrays (multi-valued attributes) - serialize as space-separated values
    if (Array.isArray(value) || isEList(value)) {
      const items: string[] = [];
      for (const item of value) {
        if (item !== null && item !== undefined) {
          items.push(this.convertSingleValueToString(attr, item));
        }
      }
      return items.join(' ');
    }

    // Handle EObject values (shouldn't happen for attributes, but just in case)
    if (value && typeof value === 'object' && 'eClass' in value) {
      // This is an EObject - get its name or ID
      if ('getName' in value && typeof value.getName === 'function') {
        return value.getName() || '';
      }
      // Fallback - this shouldn't happen for proper attributes
      return '';
    }

    const eType = attr.getEType();
    if (eType && 'getEPackage' in eType) {
      const pkg = (eType as EDataType).getEPackage();
      if (pkg) {
        const factory = pkg.getEFactoryInstance();
        if (factory) {
          return factory.convertToString(eType as EDataType, value);
        }
      }
    }

    return String(value);
  }

  /**
   * Convert a single value to string (helper for arrays)
   */
  protected convertSingleValueToString(attr: EAttribute, value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);

    const eType = attr.getEType();
    if (eType && 'getEPackage' in eType) {
      const pkg = (eType as EDataType).getEPackage();
      if (pkg) {
        const factory = pkg.getEFactoryInstance();
        if (factory) {
          return factory.convertToString(eType as EDataType, value);
        }
      }
    }

    return String(value);
  }

  /**
   * Get the text content for a simple-content class, or null if not applicable.
   */
  protected getSimpleContentText(obj: EObject, emd: ExtendedMetaData | null): string | null {
    if (!emd) return null;

    const eClass = obj.eClass();
    if (emd.getContentKind(eClass) !== SIMPLE_CONTENT) return null;

    const simpleFeature = emd.getSimpleContentFeature(eClass);
    if (!simpleFeature) return null;

    const value = obj.eGet(simpleFeature);
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);

    return String(value);
  }

  /**
   * Get the serialized attribute name, including namespace prefix if EMD specifies one.
   */
  protected getSerializedAttributeName(feature: EStructuralFeature, emd: ExtendedMetaData | null): string {
    if (emd) {
      const ns = emd.getNamespace(feature);
      const name = emd.getName(feature) ?? feature.getName() ?? '';
      if (ns) {
        const prefix = this.getNamespacePrefix(ns);
        if (prefix) {
          return `${prefix}:${name}`;
        }
      }
      if (name && !name.startsWith(':')) {
        return name;
      }
    }
    return this.helper.getSerializedFeatureName(feature);
  }

  /**
   * Get the serialized element name, including namespace prefix if EMD specifies one.
   */
  protected getSerializedElementName(feature: EStructuralFeature, emd: ExtendedMetaData | null): string {
    if (emd) {
      const ns = emd.getNamespace(feature);
      const name = emd.getName(feature) ?? feature.getName() ?? '';
      if (ns) {
        const prefix = this.getNamespacePrefix(ns);
        if (prefix) {
          return `${prefix}:${name}`;
        }
      }
      if (name && !name.startsWith(':')) {
        return name;
      }
    }
    return this.helper.getSerializedFeatureName(feature);
  }

  /**
   * Get or create a namespace prefix for the given URI.
   */
  protected getNamespacePrefix(nsURI: string): string | null {
    // Check already declared namespaces
    const existing = this.declaredNamespaces.get(nsURI);
    if (existing) return existing;

    // Well-known namespaces
    if (nsURI === 'http://www.w3.org/XML/1998/namespace') return 'xml';

    return null;
  }

  /**
   * Escape XML special characters
   */
  protected escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Write indentation
   */
  protected writeIndent(): void {
    for (let i = 0; i < this.indent; i++) {
      this.output.push(this.indentString);
    }
  }
}

/**
 * XMI-specific save implementation
 */
export class XMISave extends XMLSave {
  constructor(helper?: XMLHelper) {
    super(helper);
    this.idAttributeName = 'xmi:id';
  }

  protected override writeNamespaces(obj: EObject): void {
    super.writeNamespaces(obj);
  }
}

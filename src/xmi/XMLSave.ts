/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EObject } from '../EObject';
import { EClass } from '../EClass';
import { EStructuralFeature } from '../EStructuralFeature';
import { EReference } from '../EReference';
import { EAttribute } from '../EAttribute';
import { EDataType } from '../EDataType';
import { EPackage } from '../EPackage';
import { Resource } from '../Resource';
import { URI } from '../URI';
import { XMLHelper, XMLHelperImpl } from './XMLHelper';
import { XSI_URI, XMI_URI } from './XMLHandler';
import { isEList } from '../EList';
import { InternalEObject, isInternalEObject } from '../InternalEObject';

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

  constructor(helper?: XMLHelper) {
    this.helper = helper || new XMLHelperImpl();
    this.resource = null as any;
  }

  /**
   * Save resource to string
   */
  save(resource: Resource, options?: Map<string, any>): string {
    this.resource = resource;
    this.output = [];
    this.declaredNamespaces.clear();
    this.indent = 0;

    // XML declaration
    this.output.push('<?xml version="1.0" encoding="UTF-8"?>\n');

    const contents = resource.getContents();
    for (const root of contents) {
      this.saveObject(root, true);
    }

    return this.output.join('');
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

    // Write attributes
    this.writeAttributes(obj);

    // Check for content
    const hasContent = this.hasElementContent(obj);

    if (hasContent) {
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

    for (const feature of eClass.getEAllStructuralFeatures()) {
      if (feature.isTransient() || feature.isDerived()) continue;

      if (this.isAttribute(feature)) {
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
              this.output.push(` ${attr.getName()}="${this.escapeXml(stringValue)}"`);
            }
          }
        }
      } else if ('isContainment' in feature) {
        // Write non-containment EReference as attribute with href
        const ref = feature as EReference;
        if (!ref.isContainment()) {
          let value = obj.eGet(ref);
          if (value !== null && value !== undefined) {
            if (!feature.isMany()) {
              // Single-valued reference - resolve proxy first
              value = this.resolveValue(value, obj);

              if (value !== null && value !== undefined) {
                // If value is now a string (unresolved proxy URI), use it directly
                if (typeof value === 'string') {
                  this.output.push(` ${ref.getName()}="${this.escapeXml(value)}"`);
                } else if (typeof value === 'boolean') {
                  // Handle primitive boolean (shouldn't be a reference, but handle gracefully)
                  this.output.push(` ${ref.getName()}="${value ? 'true' : 'false'}"`);
                } else if (typeof value === 'number') {
                  // Handle primitive number (shouldn't be a reference, but handle gracefully)
                  this.output.push(` ${ref.getName()}="${String(value)}"`);
                } else {
                  const href = this.getHref(value as EObject);
                  if (href) {
                    this.output.push(` ${ref.getName()}="${this.escapeXml(href)}"`);
                  }
                }
              }
            }
            // Multi-valued non-containment refs are written as elements with href
          }
        }
      }
    }
  }

  /**
   * Get href for cross-reference
   */
  protected getHref(obj: EObject): string | null {
    // Handle proxies - return their URI directly
    if (isInternalEObject(obj) && obj.eIsProxy()) {
      const proxyURI = obj.eProxyURI();
      return proxyURI?.toString() || null;
    }

    const resource = obj.eResource?.();

    // Try to get URI fragment from resource
    if (resource) {
      const fragment = resource.getURIFragment(obj);
      const uri = resource.getURI();
      if (uri && fragment) {
        return `${uri.toString()}#${fragment}`;
      }
      if (fragment) {
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
   * Check if feature is an attribute (not a reference)
   */
  protected isAttribute(feature: EStructuralFeature): boolean {
    return !('isContainment' in feature);
  }

  /**
   * Check if object has element content (containments or multi-valued non-containment refs)
   */
  protected hasElementContent(obj: EObject): boolean {
    const eClass = obj.eClass();
    const features = eClass.getEAllStructuralFeatures();
    console.log('[XMLSave] hasElementContent for', eClass.getName(), '- features count:', features.length);

    for (const feature of features) {
      const featureName = feature.getName?.() || 'unknown';
      if ('isContainment' in feature) {
        const ref = feature as EReference;
        if (feature.isTransient()) continue;

        const value = obj.eGet(ref);
        console.log('[XMLSave]   feature:', featureName, 'isContainment:', ref.isContainment(), 'value:', value, 'length:', Array.isArray(value) ? value.length : 'N/A');
        if (value === null || value === undefined) continue;

        if (ref.isContainment()) {
          // Containment references
          if ((Array.isArray(value) || isEList(value)) && value.length > 0) return true;
          if (!Array.isArray(value) && !isEList(value)) return true;
        } else if (feature.isMany() && (Array.isArray(value) || isEList(value)) && value.length > 0) {
          // Multi-valued non-containment references
          return true;
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
          // Multi-valued non-containment: write as elements with href
          for (const refObj of value) {
            const href = this.getHref(refObj as EObject);
            if (href) {
              this.writeIndent();
              this.output.push(`<${ref.getName()} href="${this.escapeXml(href)}"/>\n`);
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
    const featureName = feature.getName() || 'element';

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

    // Write attributes
    this.writeAttributes(value);

    // Check for nested content
    const hasContent = this.hasElementContent(value);

    if (hasContent) {
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
  protected override writeNamespaces(obj: EObject): void {
    super.writeNamespaces(obj);
  }
}

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import sax from 'sax';
import { Resource } from '../Resource';
import { XMLHelper, XMLHelperImpl } from './XMLHelper';
import { XMLHandler, AttributesImpl, XML_NS } from './XMLHandler';

/**
 * XMLLoad - sets up SAX parser and invokes handler
 */
export class XMLLoad {
  protected helper: XMLHelper;

  constructor(helper?: XMLHelper) {
    this.helper = helper || new XMLHelperImpl();
  }

  /**
   * Load resource from string
   */
  load(resource: Resource, xmlString: string, options?: Map<string, any>): void {
    const opts = options || new Map();
    const handler = this.makeDefaultHandler(resource, opts);

    const parser = sax.parser(true, {
      xmlns: true,
      position: true,
      trim: false
    });

    const attribs = new AttributesImpl();

    // Handle XML declaration
    parser.onprocessinginstruction = (node) => {
      if (node.name === 'xml') {
        // Extract encoding and version if needed
      }
    };

    // Handle start tag
    parser.onopentag = (tag) => {
      attribs.clear();

      // Handle namespace declarations and regular attributes
      // sax returns QualifiedTag when xmlns: true
      const qualifiedTag = tag as sax.QualifiedTag;
      for (const [key, attr] of Object.entries(qualifiedTag.attributes)) {
        const qualifiedAttr = attr as sax.QualifiedAttribute;
        const qName = qualifiedAttr.prefix ? `${qualifiedAttr.prefix}:${qualifiedAttr.local}` : qualifiedAttr.local;

        // Namespace declaration
        if (qualifiedAttr.prefix === 'xmlns' || qualifiedAttr.name === 'xmlns') {
          const prefix = qualifiedAttr.prefix === 'xmlns' ? qualifiedAttr.local : '';
          handler.startPrefixMapping(prefix, qualifiedAttr.value);
        }

        attribs.add(qName, qualifiedAttr.local, qualifiedAttr.uri, qualifiedAttr.value);
      }

      // Update line/column
      (handler as any).lineNumber = parser.line;
      (handler as any).columnNumber = parser.column;

      handler.startElement(qualifiedTag.uri, qualifiedTag.local, qualifiedTag.name, attribs);
    };

    // Handle end tag
    parser.onclosetag = (tagName) => {
      const colonIndex = tagName.indexOf(':');
      const localName = colonIndex >= 0 ? tagName.substring(colonIndex + 1) : tagName;
      handler.endElement('', localName, tagName);
    };

    // Handle text content
    parser.ontext = (text) => {
      if (text.trim()) {
        handler.characters(text);
      }
    };

    parser.oncdata = (cdata) => {
      handler.characters(cdata);
    };

    // Handle errors
    parser.onerror = (err) => {
      console.error('XML Parse Error:', err.message);
      (handler as any).error(err.message);
    };

    // Parse the XML
    parser.write(xmlString).close();

    // End document
    handler.endDocument();
  }

  /**
   * Create the default handler for loading
   */
  protected makeDefaultHandler(resource: Resource, options: Map<string, any>): XMLHandler {
    return new XMLHandler(resource, this.helper, options);
  }
}

/**
 * XMI-specific loader
 */
export class XMILoad extends XMLLoad {
  constructor(helper?: XMLHelper) {
    super(helper || new XMIHelperImpl());
  }

  protected makeDefaultHandler(resource: Resource, options: Map<string, any>): XMLHandler {
    return new XMIHandler(resource, this.helper, options);
  }
}

/**
 * XMI-specific helper
 */
export class XMIHelperImpl extends XMLHelperImpl {
  // XMI-specific helper methods can be added here
}

/**
 * XMI-specific handler
 */
export class XMIHandler extends XMLHandler {
  protected xmiVersion: string = '2.0';

  constructor(resource: Resource, helper: XMLHelper, options: Map<string, any>) {
    super(resource, helper, options);
  }

  protected recordHeaderInformation(): void {
    // Record XMI version from root element
    if (this.attribs) {
      const version = this.attribs.getValueByQName('xmi:version');
      if (version) {
        this.xmiVersion = version;
      }
    }
  }

  protected getXSIType(): string | null {
    // XMI uses both xsi:type and xmi:type
    let type = super.getXSIType();
    if (!type && this.attribs) {
      type = this.attribs.getValueByQName('xmi:type');
    }
    return type;
  }

  protected handleId(obj: EObject, id: string): void {
    // Store ID for later resolution
    // Resource can track ID -> EObject mapping
    if (this.resource && 'setID' in this.resource) {
      (this.resource as any).setID(obj, id);
    }
  }
}

// Need to import EObject for the XMIHandler
import { EObject } from '../EObject';

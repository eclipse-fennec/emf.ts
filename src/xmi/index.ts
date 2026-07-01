/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Resource } from '../Resource.js';

// Resource implementations
export {
  XMLResource,
  XMIResource,
  XMLResourceFactory,
  XMIResourceFactory,
  OPTION_DEFER_ATTACHMENT,
  OPTION_DEFER_IDREF_RESOLUTION,
  OPTION_USE_DEPRECATED_METHODS,
  OPTION_RECORD_UNKNOWN_FEATURE,
  OPTION_EXTENDED_META_DATA
} from './XMLResource.js';

import { XMLResourceFactory, XMIResourceFactory } from './XMLResource.js';

// Auto-register XML/XMI factories for common extensions
const extensionMap = Resource.INSTANCE_FACTORY_REGISTRY.getExtensionToFactoryMap();
if (!extensionMap.has('xml')) {
  extensionMap.set('xml', new XMLResourceFactory());
}
if (!extensionMap.has('xmi')) {
  extensionMap.set('xmi', new XMIResourceFactory());
}
if (!extensionMap.has('ecore')) {
  extensionMap.set('ecore', new XMIResourceFactory());
}

// XML Loading
export { XMLLoad, XMILoad, XMIHelperImpl, XMIHandler } from './XMLLoad.js';

// XML Saving
export { XMLSave, XMISave } from './XMLSave.js';

// XML Handler
export type { Attributes } from './XMLHandler.js';
export {
  XMLHandler,
  AttributesImpl,
  XSI_URI,
  XMI_URI,
  XML_NS,
  XSI_NS,
  XMI_NS,
  TYPE_ATTRIB,
  NIL_ATTRIB,
  SCHEMA_LOCATION_ATTRIB,
  HREF_ATTRIB,
  ID_ATTRIB,
  ERROR_TYPE,
  OBJECT_TYPE,
  UNKNOWN_FEATURE_TYPE
} from './XMLHandler.js';

// XML Helper
export {
  XMLHelper,
  XMLHelperImpl,
  ManyReference,
  DATATYPE_SINGLE,
  DATATYPE_IS_MANY,
  IS_MANY_ADD,
  IS_MANY_MOVE,
  OTHER,
  OPTION_FEATURE_NAME_MAP
} from './XMLHelper.js';

// ExtendedMetaData
export {
  ExtendedMetaData,
  ANNOTATION_URI as EMD_ANNOTATION_URI,
  SIMPLE_CONTENT,
  MIXED_CONTENT,
  EMPTY_CONTENT,
  ELEMENT_ONLY_CONTENT,
  UNSPECIFIED_CONTENT,
  SIMPLE_FEATURE,
  ELEMENT_FEATURE,
  ATTRIBUTE_FEATURE,
  ELEMENT_WILDCARD_FEATURE,
  ATTRIBUTE_WILDCARD_FEATURE,
  GROUP_FEATURE,
  UNSPECIFIED_FEATURE
} from './ExtendedMetaData.js';

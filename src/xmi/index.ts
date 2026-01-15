/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Resource } from '../Resource';

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
} from './XMLResource';

import { XMLResourceFactory, XMIResourceFactory } from './XMLResource';

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
export { XMLLoad, XMILoad, XMIHelperImpl, XMIHandler } from './XMLLoad';

// XML Saving
export { XMLSave, XMISave } from './XMLSave';

// XML Handler
export type { Attributes } from './XMLHandler';
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
} from './XMLHandler';

// XML Helper
export {
  XMLHelper,
  XMLHelperImpl,
  ManyReference,
  DATATYPE_SINGLE,
  DATATYPE_IS_MANY,
  IS_MANY_ADD,
  IS_MANY_MOVE,
  OTHER
} from './XMLHelper';

/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { Resource } from '../Resource';

// Resource implementation
export { JSONResource, JSONResourceFactory } from './JSONResource';

// Save/Load
export { JSONSave, OPTION_SERIALIZE_TYPE, OPTION_INDENT, SERIALIZE_TYPE_ALWAYS, SERIALIZE_TYPE_POLYMORPHIC } from './JSONSave';
export { JSONLoad } from './JSONLoad';

import { JSONResourceFactory } from './JSONResource';

// Auto-register .json extension factory
const extensionMap = Resource.INSTANCE_FACTORY_REGISTRY.getExtensionToFactoryMap();
if (!extensionMap.has('json')) {
  extensionMap.set('json', new JSONResourceFactory());
}

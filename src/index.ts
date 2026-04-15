/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

// Core metamodel interfaces
export * from './EObject.js';
export * from './EList.js';
export * from './EModelElement.js';
export * from './ENamedElement.js';
export * from './EClassifier.js';
export * from './EClass.js';
export * from './EDataType.js';
export * from './EEnum.js';
export * from './EEnumLiteral.js';
export * from './EStructuralFeature.js';
export * from './EAttribute.js';
export * from './EReference.js';
export * from './EPackage.js';
export * from './EFactory.js';
export * from './EOperation.js';
export * from './EParameter.js';
export * from './EAnnotation.js';
export * from './EMap.js';
export * from './ETypeParameter.js';
export * from './EGenericType.js';

// Resource management
export * from './Resource.js';
export * from './ResourceSet.js';
export * from './URI.js';
export * from './InternalEObject.js';

// XMI/XML serialization
export * from './xmi/index.js';

// JSON serialization
export * from './json/index.js';

// Type guards
export * from './util/TypeGuards.js';

// Utility classes
export * from './util/EcoreUtil.js';

// Notification system
export * from './notify/index.js';

// Ecore compatibility (EResourceSetImpl, getEcorePackage, etc.)
export * from './ecore/index.js';

// Runtime implementations (BasicEPackage, BasicEDataType, dataTypeRegistry, etc.)
export * from './runtime/index.js';

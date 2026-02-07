/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

// Core metamodel interfaces
export * from './EObject';
export * from './EList';
export * from './EModelElement';
export * from './ENamedElement';
export * from './EClassifier';
export * from './EClass';
export * from './EDataType';
export * from './EEnum';
export * from './EEnumLiteral';
export * from './EStructuralFeature';
export * from './EAttribute';
export * from './EReference';
export * from './EPackage';
export * from './EFactory';
export * from './EOperation';
export * from './EParameter';
export * from './EAnnotation';
export * from './ETypeParameter';
export * from './EGenericType';

// Resource management
export * from './Resource';
export * from './ResourceSet';
export * from './URI';
export * from './InternalEObject';

// XMI/XML serialization
export * from './xmi';

// Type guards
export * from './util/TypeGuards';

// Utility classes
export * from './util/EcoreUtil';

// Notification system
export * from './notify';

// Ecore compatibility (EResourceSetImpl, getEcorePackage, etc.)
export * from './ecore';

// Runtime implementations (BasicEPackage, BasicEDataType, dataTypeRegistry, etc.)
export * from './runtime';

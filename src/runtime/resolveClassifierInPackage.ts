/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

import { EClassifier } from '../EClassifier.js';
import { EPackage } from '../EPackage.js';

/**
 * Resolves a classifier from a fragment path within an EPackage,
 * navigating into subpackages when the path contains multiple segments.
 *
 * Examples:
 * - fragment "//EString"            → pkg.getEClassifier("EString")
 * - fragment "//resource/relational/Table" → pkg → subpkg "resource" → subpkg "relational" → getEClassifier("Table")
 */
export function resolveClassifierInPackage(pkg: EPackage, fragment: string): EClassifier | null {
  let path = fragment;
  while (path.startsWith('/')) {
    path = path.substring(1);
  }
  if (!path) return null;

  const segments = path.split('/');

  // Single segment: direct classifier lookup
  if (segments.length === 1) {
    return pkg.getEClassifier(segments[0]);
  }

  // Multiple segments: navigate subpackages, last segment is the classifier name
  const classifierName = segments[segments.length - 1];
  let currentPkg: EPackage | null = pkg;

  for (let i = 0; i < segments.length - 1; i++) {
    const subPkgName = segments[i];
    const subPackages = currentPkg.getESubpackages();
    currentPkg = null;
    for (let j = 0; j < subPackages.length; j++) {
      const sp = subPackages.get(j);
      if (sp.getName() === subPkgName) {
        currentPkg = sp;
        break;
      }
    }
    if (!currentPkg) return null;
  }

  return currentPkg.getEClassifier(classifierName);
}

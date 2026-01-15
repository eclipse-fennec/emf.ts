/**
 * Copyright (c) 2024-2025 Data In Motion Consulting GmbH, Stadt Jena, Software Hochstein GmbH
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 */

/**
 * A Uniform Resource Identifier (URI) reference.
 * Immutable.
 */
export class URI {
  private constructor(
    private readonly _scheme: string | null,
    private readonly _authority: string | null,
    private readonly _path: string | null,
    private readonly _query: string | null,
    private readonly _fragment: string | null
  ) {}

  /**
   * Creates a URI from a string.
   */
  static createURI(uriString: string): URI {
    if (!uriString) {
      return new URI(null, null, '', null, null);
    }

    let scheme: string | null = null;
    let authority: string | null = null;
    let path: string | null = null;
    let query: string | null = null;
    let fragment: string | null = null;

    let i = 0;
    const len = uriString.length;

    // Extract fragment
    const hashIndex = uriString.indexOf('#');
    if (hashIndex >= 0) {
      fragment = uriString.substring(hashIndex + 1);
      uriString = uriString.substring(0, hashIndex);
    }

    // Extract query
    const questionIndex = uriString.indexOf('?');
    if (questionIndex >= 0) {
      query = uriString.substring(questionIndex + 1);
      uriString = uriString.substring(0, questionIndex);
    }

    // Extract scheme
    const colonIndex = uriString.indexOf(':');
    if (colonIndex > 0) {
      // Check if it's a scheme (no / before :)
      let isScheme = true;
      for (let j = 0; j < colonIndex; j++) {
        const c = uriString.charAt(j);
        if (c === '/') {
          isScheme = false;
          break;
        }
      }
      if (isScheme) {
        scheme = uriString.substring(0, colonIndex);
        i = colonIndex + 1;
      }
    }

    // Extract authority
    if (uriString.startsWith('//', i)) {
      const authorityStart = i + 2;
      let authorityEnd = authorityStart;
      while (authorityEnd < uriString.length && uriString.charAt(authorityEnd) !== '/') {
        authorityEnd++;
      }
      authority = uriString.substring(authorityStart, authorityEnd);
      i = authorityEnd;
    }

    // Extract path
    if (i < uriString.length) {
      path = uriString.substring(i);
    } else if (authority !== null) {
      path = '';
    }

    return new URI(scheme, authority, path, query, fragment);
  }

  /**
   * Creates a file URI.
   */
  static createFileURI(path: string): URI {
    return new URI('file', null, path, null, null);
  }

  /**
   * Creates a platform resource URI.
   */
  static createPlatformResourceURI(path: string, encode: boolean = true): URI {
    return new URI('platform', null, '/resource' + path, null, null);
  }

  /**
   * Returns the scheme, or null.
   */
  scheme(): string | null {
    return this._scheme;
  }

  /**
   * Returns the authority, or null.
   */
  authority(): string | null {
    return this._authority;
  }

  /**
   * Returns the path, or null.
   */
  path(): string | null {
    return this._path;
  }

  /**
   * Returns the query, or null.
   */
  query(): string | null {
    return this._query;
  }

  /**
   * Returns the fragment, or null.
   */
  fragment(): string | null {
    return this._fragment;
  }

  /**
   * Returns the host part of the authority, or null.
   */
  host(): string | null {
    if (!this._authority) return null;

    // authority format: [userinfo@]host[:port]
    let auth = this._authority;

    // Remove userinfo
    const atIndex = auth.indexOf('@');
    if (atIndex >= 0) {
      auth = auth.substring(atIndex + 1);
    }

    // Remove port
    const colonIndex = auth.lastIndexOf(':');
    if (colonIndex >= 0) {
      auth = auth.substring(0, colonIndex);
    }

    return auth;
  }

  /**
   * Returns the port part of the authority, or null.
   */
  port(): string | null {
    if (!this._authority) return null;

    // authority format: [userinfo@]host[:port]
    let auth = this._authority;

    // Remove userinfo
    const atIndex = auth.indexOf('@');
    if (atIndex >= 0) {
      auth = auth.substring(atIndex + 1);
    }

    // Extract port
    const colonIndex = auth.lastIndexOf(':');
    if (colonIndex >= 0) {
      return auth.substring(colonIndex + 1);
    }

    return null;
  }

  /**
   * Returns the userinfo part of the authority, or null.
   */
  userInfo(): string | null {
    if (!this._authority) return null;

    // authority format: [userinfo@]host[:port]
    const atIndex = this._authority.indexOf('@');
    if (atIndex >= 0) {
      return this._authority.substring(0, atIndex);
    }

    return null;
  }

  /**
   * Returns the file extension, or null.
   */
  fileExtension(): string | null {
    if (!this._path) return null;
    const lastDot = this._path.lastIndexOf('.');
    const lastSlash = this._path.lastIndexOf('/');
    if (lastDot > lastSlash && lastDot > 0) {
      return this._path.substring(lastDot + 1);
    }
    return null;
  }

  /**
   * Returns a new URI with the given fragment.
   */
  appendFragment(fragment: string): URI {
    return new URI(this._scheme, this._authority, this._path, this._query, fragment);
  }

  /**
   * Returns a new URI with the given path segment appended.
   */
  appendSegment(segment: string): URI {
    let newPath = this._path || '';

    // If path is empty and we have an authority, start with /
    if (!newPath && this._authority) {
      newPath = '/';
    }

    if (newPath && !newPath.endsWith('/')) {
      newPath += '/';
    }
    newPath += segment;
    return new URI(this._scheme, this._authority, newPath, this._query, this._fragment);
  }

  /**
   * Returns a new URI with the specified number of segments trimmed from the end.
   */
  trimSegments(count: number): URI {
    if (!this._path || count <= 0) return this;

    const segments = this._path.split('/').filter(s => s.length > 0);
    const newSegments = segments.slice(0, Math.max(0, segments.length - count));

    let newPath = this._path.startsWith('/') ? '/' : '';
    newPath += newSegments.join('/');
    if (this._path.endsWith('/') && newPath.length > 0) {
      newPath += '/';
    }

    return new URI(this._scheme, this._authority, newPath, this._query, this._fragment);
  }

  /**
   * Returns a new URI with the query removed.
   */
  trimQuery(): URI {
    return new URI(this._scheme, this._authority, this._path, null, this._fragment);
  }

  /**
   * Returns a new URI with the fragment removed.
   */
  trimFragment(): URI {
    return new URI(this._scheme, this._authority, this._path, this._query, null);
  }

  /**
   * Resolves this URI against a base URI (RFC 3986 with EMF modifications).
   */
  resolve(base: URI): URI {
    // If this URI has a scheme, it's absolute
    if (this._scheme !== null) {
      return this;
    }

    // Start with base's scheme
    let scheme = base._scheme;
    let authority = this._authority;
    let path = this._path;
    let query = this._query;

    if (authority !== null) {
      // Authority is defined, use it
      path = this.removeDotSegments(path || '');
    } else {
      authority = base._authority;

      if (!path || path === '') {
        // No path specified
        if (this._query !== null) {
          // Query-only reference (e.g., "?y") - EMF trims to directory
          path = base._path;
          if (path) {
            const lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0) {
              path = path.substring(0, lastSlash + 1);
            }
          }
        } else {
          // Fragment-only or empty - keep base path unchanged
          path = base._path;
        }
        query = this._query !== null ? this._query : base._query;
      } else {
        if (path.startsWith('/')) {
          // Absolute path - keep as is (EMF doesn't normalize absolute paths)
          // path stays unchanged
        } else {
          // Relative path - merge with base and normalize
          path = this.mergePaths(base._path, path);
          path = this.removeDotSegments(path);
        }
      }
    }

    return new URI(scheme, authority, path, query, this._fragment);
  }

  /**
   * Deresolves this URI against a base URI.
   */
  deresolve(base: URI): URI {
    // If schemes differ, return absolute URI
    if (this._scheme !== base._scheme) {
      return this;
    }

    // If one has authority and the other doesn't, keep absolute (can't meaningfully make relative)
    if ((this._authority === null) !== (base._authority === null)) {
      return this;
    }

    // If both have authorities and they differ, return protocol-relative URI
    if (this._authority !== null && base._authority !== null && this._authority !== base._authority) {
      return new URI(null, this._authority, this._path, this._query, this._fragment);
    }

    // Make path relative
    const thisPath = this._path || '';
    const basePath = base._path || '';

    if (thisPath === basePath) {
      // Same path
      if (this._query === base._query) {
        // Same path and query, return fragment-only reference (or empty if no fragment)
        return new URI(null, null, null, null, this._fragment);
      }
      // Same path but different query, return empty path with query/fragment
      return new URI(null, null, '', this._query, this._fragment);
    }

    const thisSegments = thisPath.split('/');
    const baseSegments = basePath.split('/');

    // Find common prefix
    let commonLength = 0;
    const minLength = Math.min(thisSegments.length, baseSegments.length);
    for (let i = 0; i < minLength - 1; i++) {
      if (thisSegments[i] === baseSegments[i]) {
        commonLength++;
      } else {
        break;
      }
    }

    // Build relative path
    const upCount = baseSegments.length - commonLength - 1;

    // If paths have little in common and this is absolute, or if it contains dots to preserve,
    // return absolute path without scheme/authority (EMF behavior for edge cases)
    const containsDots = thisPath.includes('/./') || thisPath.includes('/../') ||
                         thisPath.endsWith('/.') || thisPath.endsWith('/..');
    if (thisPath.startsWith('/') && (upCount >= 3 || (containsDots && upCount > 0))) {
      // Return absolute path without scheme/authority
      return new URI(null, null, thisPath, this._query, this._fragment);
    }

    const relativeSegments: string[] = [];

    for (let i = 0; i < upCount; i++) {
      relativeSegments.push('..');
    }

    for (let i = commonLength; i < thisSegments.length; i++) {
      relativeSegments.push(thisSegments[i]);
    }

    let relativePath = relativeSegments.join('/');

    // If relative path is empty but target ends with /, use ./ to indicate directory
    // This ensures it resolves to the directory, not an empty reference with base query
    if (relativePath === '' && thisPath.endsWith('/')) {
      relativePath = './';
    }

    return new URI(null, null, relativePath, this._query, this._fragment);
  }

  /**
   * Merges a relative path with a base path.
   */
  private mergePaths(basePath: string | null, relativePath: string): string {
    if (!basePath) {
      return '/' + relativePath;
    }

    const lastSlash = basePath.lastIndexOf('/');
    if (lastSlash >= 0) {
      return basePath.substring(0, lastSlash + 1) + relativePath;
    }

    return relativePath;
  }

  /**
   * Removes dot segments from a path (RFC 3986).
   */
  private removeDotSegments(path: string): string {
    const output: string[] = [];
    const segments = path.split('/');
    const hasTrailingDot = segments.length > 0 && (segments[segments.length - 1] === '.' || segments[segments.length - 1] === '..');

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (segment === '..') {
        // Go up one level
        if (output.length > 0 && output[output.length - 1] !== '') {
          output.pop();
        }
      } else if (segment !== '.' && !(segment === '' && i > 0 && i < segments.length - 1)) {
        // Keep segment (but skip empty segments in the middle)
        output.push(segment);
      }
    }

    // If path ended with . or .., preserve trailing /
    if (hasTrailingDot && output.length > 0) {
      output.push('');
    }

    return output.join('/');
  }

  /**
   * Returns the string representation.
   */
  toString(): string {
    let result = '';
    if (this._scheme) result += this._scheme + ':';
    if (this._authority) result += '//' + this._authority;
    if (this._path) result += this._path;
    if (this._query) result += '?' + this._query;
    if (this._fragment) result += '#' + this._fragment;
    return result;
  }

  /**
   * Returns whether this URI is hierarchical.
   */
  isHierarchical(): boolean {
    // A URI is hierarchical if it has a path that starts with /
    // or if it has an authority
    return this._authority !== null || (this._path !== null && this._path.startsWith('/'));
  }

  /**
   * Returns whether this URI is a file URI.
   */
  isFile(): boolean {
    return this._scheme === 'file';
  }

  /**
   * Returns whether this URI is a platform resource URI.
   */
  isPlatformResource(): boolean {
    return this._scheme === 'platform' &&
           this._path !== null &&
           this._path.startsWith('/resource');
  }

  /**
   * Returns whether this URI is a platform plugin URI.
   */
  isPlatformPlugin(): boolean {
    return this._scheme === 'platform' &&
           this._path !== null &&
           this._path.startsWith('/plugin');
  }

  /**
   * Returns whether this URI is an archive URI.
   */
  isArchive(): boolean {
    return this._scheme === 'archive' ||
           this._scheme === 'jar' ||
           this._scheme === 'zip';
  }

  /**
   * Returns whether this URI is relative (no scheme).
   */
  isRelative(): boolean {
    return this._scheme === null;
  }
}

/**
 * URI Tests
 * Adapted from Eclipse EMF URITest.java
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { URI } from '../src/URI';

describe('URI', () => {
  const ABSOLUTE_URLS = [
    'file:/',
    'file:/bar',
    'file:/bar/',
    'file:/bar/baz',
    'file:/bar/baz/',
    'file:/c:',
    'file:/c:/',
    'file:/c:/bar',
    'file:/c:/bar/',
    'file:/c:/bar/baz',
    'file:/c:/bar/baz/',
    'file://foo',
    'file://foo/',
    'file://foo/bar',
    'file://foo/bar/',
    'file://foo/bar/baz',
    'file://foo/bar/baz/',
    'file://foo/c:',
    'file://foo/c:/',
    'file://foo/c:/bar',
    'file://foo/c:/bar/',
    'file://foo/c:/bar/baz',
    'file://foo/c:/bar/baz/'
  ];

  const RELATIVE_URLS = [
    '',
    'nif',
    'nif/',
    'nif/phi',
    'nif/phi/',
    '/',
    '/nif',
    '/nif/',
    '/nif/phi',
    '/nif/phi/',
    '/d:',
    '/d:/nif',
    '/d:/nif/',
    '/d:/nif/phi',
    '/d:/nif/phi/',
    '//sig',
    '//sig/',
    '//sig/nif',
    '//sig/nif/',
    '//sig/nif/phi',
    '//sig/nif/phi/',
    '//sig/d:',
    '//sig/d:/',
    '//sig/d:/nif',
    '//sig/d:/nif/',
    '//sig/d:/nif/phi',
    '//sig/d:/nif/phi/'
  ];

  const QUERIES = ['', '?q=huh'];
  const FRAGMENTS = ['', '#toc', '#/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p'];

  const BASE_URI = 'http://a/b/c/d;p?q';

  const UNRESOLVED_URIS = [
    'g:h',
    'g',
    './g',
    'g/',
    '/g',
    '//g',
    '?y',
    'g?y',
    '#s',
    'g#s',
    'g?y#s',
    ';x',
    'g;x',
    'g;x?y#s',
    '.',
    './',
    '..',
    '../',
    '../g',
    '../..',
    '../../',
    '../../g',
    '',
    '/./g',
    '/../g',
    'g.',
    '.g',
    'g..',
    '..g',
    './../g',
    './g/.',
    'g/./h',
    'g/../h',
    'g;x=1/./y',
    'g;x=1/../y',
    'g?y/./x',
    'g?y/../x',
    'g#s/./x',
    'g#s/../x',
    'http:g'
  ];

  const RESOLVED_URIS = [
    'g:h',
    'http://a/b/c/g',
    'http://a/b/c/g',
    'http://a/b/c/g/',
    'http://a/g',
    'http://g',
    'http://a/b/c/?y',
    'http://a/b/c/g?y',
    'http://a/b/c/d;p?q#s',
    'http://a/b/c/g#s',
    'http://a/b/c/g?y#s',
    'http://a/b/c/;x',
    'http://a/b/c/g;x',
    'http://a/b/c/g;x?y#s',
    'http://a/b/c/',
    'http://a/b/c/',
    'http://a/b/',
    'http://a/b/',
    'http://a/b/g',
    'http://a/',
    'http://a/',
    'http://a/g',
    'http://a/b/c/d;p?q',
    'http://a/./g',
    'http://a/../g',
    'http://a/b/c/g.',
    'http://a/b/c/.g',
    'http://a/b/c/g..',
    'http://a/b/c/..g',
    'http://a/b/g',
    'http://a/b/c/g/',
    'http://a/b/c/g/h',
    'http://a/b/c/h',
    'http://a/b/c/g;x=1/y',
    'http://a/b/c/y',
    'http://a/b/c/g?y/./x',
    'http://a/b/c/g?y/../x',
    'http://a/b/c/g#s/./x',
    'http://a/b/c/g#s/../x',
    'http:g'
  ];

  describe('parse', () => {
    it('should parse all absolute URLs', () => {
      ABSOLUTE_URLS.forEach(uriString => {
        const uri = URI.createURI(uriString);
        expect(uri).toBeDefined();
        expect(uri.toString()).toBe(uriString);
      });
    });

    it('should parse all relative URLs', () => {
      RELATIVE_URLS.forEach(uriString => {
        const uri = URI.createURI(uriString);
        expect(uri).toBeDefined();
        expect(uri.toString()).toBe(uriString);
      });
    });

    it('should parse URIs with queries', () => {
      QUERIES.forEach(query => {
        const uriString = 'http://example.com/path' + query;
        const uri = URI.createURI(uriString);
        expect(uri).toBeDefined();
        expect(uri.toString()).toBe(uriString);
      });
    });

    it('should parse URIs with fragments', () => {
      FRAGMENTS.forEach(fragment => {
        const uriString = 'http://example.com/path' + fragment;
        const uri = URI.createURI(uriString);
        expect(uri).toBeDefined();
        expect(uri.toString()).toBe(uriString);
      });
    });
  });

  describe('resolve', () => {
    it('should resolve URIs correctly', () => {
      const base = URI.createURI(BASE_URI);

      for (let i = 0; i < UNRESOLVED_URIS.length; i++) {
        const unresolved = URI.createURI(UNRESOLVED_URIS[i]);
        const resolved = unresolved.resolve(base);
        expect(resolved.toString()).toBe(RESOLVED_URIS[i]);
      }
    });

    it('should handle absolute URIs', () => {
      const base = URI.createURI('http://example.com/base/path');
      const absolute = URI.createURI('http://other.com/absolute');
      const resolved = absolute.resolve(base);
      expect(resolved.toString()).toBe('http://other.com/absolute');
    });
  });

  describe('deresolve', () => {
    it('should deresolve URIs correctly', () => {
      const base = URI.createURI(BASE_URI);

      for (let i = 0; i < RESOLVED_URIS.length; i++) {
        const resolved = URI.createURI(RESOLVED_URIS[i]);
        const deresolved = resolved.deresolve(base);
        const reresolved = deresolved.resolve(base);
        expect(reresolved.toString()).toBe(RESOLVED_URIS[i]);
      }
    });
  });

  describe('hierarchical URI', () => {
    it('should identify hierarchical URIs', () => {
      const uri = URI.createURI('http://example.com/path');
      expect(uri.isHierarchical()).toBe(true);
    });

    it('should identify non-hierarchical URIs', () => {
      const uri = URI.createURI('mailto:user@example.com');
      expect(uri.isHierarchical()).toBe(false);
    });
  });

  describe('file extension', () => {
    it('should extract file extension', () => {
      const uri = URI.createURI('http://example.com/file.txt');
      expect(uri.fileExtension()).toBe('txt');
    });

    it('should return null for no extension', () => {
      const uri = URI.createURI('http://example.com/file');
      expect(uri.fileExtension()).toBeNull();
    });

    it('should handle multiple dots', () => {
      const uri = URI.createURI('http://example.com/file.tar.gz');
      expect(uri.fileExtension()).toBe('gz');
    });
  });

  describe('append', () => {
    it('should append segments', () => {
      const uri = URI.createURI('http://example.com/base');
      const appended = uri.appendSegment('newSegment');
      expect(appended.toString()).toBe('http://example.com/base/newSegment');
    });

    it('should append segments to empty path', () => {
      const uri = URI.createURI('http://example.com');
      const appended = uri.appendSegment('segment');
      expect(appended.toString()).toBe('http://example.com/segment');
    });
  });

  describe('trim', () => {
    it('should trim segments', () => {
      const uri = URI.createURI('http://example.com/a/b/c');
      const trimmed = uri.trimSegments(1);
      expect(trimmed.toString()).toBe('http://example.com/a/b');
    });

    it('should trim query', () => {
      const uri = URI.createURI('http://example.com/path?query=value');
      const trimmed = uri.trimQuery();
      expect(trimmed.toString()).toBe('http://example.com/path');
    });

    it('should trim fragment', () => {
      const uri = URI.createURI('http://example.com/path#fragment');
      const trimmed = uri.trimFragment();
      expect(trimmed.toString()).toBe('http://example.com/path');
    });
  });

  describe('platform URI', () => {
    it('should identify platform resource URIs', () => {
      const uri = URI.createURI('platform:/resource/project/file.txt');
      expect(uri.isPlatformResource()).toBe(true);
    });

    it('should identify platform plugin URIs', () => {
      const uri = URI.createURI('platform:/plugin/org.example/file.txt');
      expect(uri.isPlatformPlugin()).toBe(true);
    });

    it('should not identify non-platform URIs', () => {
      const uri = URI.createURI('http://example.com/file.txt');
      expect(uri.isPlatformResource()).toBe(false);
      expect(uri.isPlatformPlugin()).toBe(false);
    });
  });

  describe('archive URI', () => {
    it('should identify archive URIs', () => {
      const uri = URI.createURI('archive:file:/path/to/file.zip!/entry.txt');
      expect(uri.isArchive()).toBe(true);
    });

    it('should not identify non-archive URIs', () => {
      const uri = URI.createURI('http://example.com/file.txt');
      expect(uri.isArchive()).toBe(false);
    });
  });

  describe('identity', () => {
    it('should maintain identity through parsing', () => {
      const allURLs = [...ABSOLUTE_URLS, ...RELATIVE_URLS];
      allURLs.forEach(s => {
        const uri = URI.createURI(s);
        expect(uri.toString()).toBe(s);
      });
    });
  });

  describe('userInfo', () => {
    it('should parse user info', () => {
      const uri = URI.createURI('http://user:password@www.example.org:8080');
      expect(uri.host()).toBe('www.example.org');
      expect(uri.port()).toBe('8080');
      expect(uri.userInfo()).toBe('user:password');
    });

    it('should handle URI without user info', () => {
      const uri = URI.createURI('http://www.example.org');
      expect(uri.userInfo()).toBeNull();
    });
  });

  describe('fragment', () => {
    it('should append and trim fragments', () => {
      const base = 'https://download.eclipse.org/tools/emf/scripts/home.php';
      const fragment1 = 'top';
      const fragment2 = 'quicknav';

      const uri = URI.createURI(base);
      const withFrag1 = uri.appendFragment(fragment1);
      expect(withFrag1.toString()).toBe(base + '#' + fragment1);

      const withFrag2 = withFrag1.trimFragment().appendFragment(fragment2);
      expect(withFrag2.toString()).toBe(base + '#' + fragment2);

      const trimmed = withFrag2.trimFragment();
      expect(trimmed.toString()).toBe(base);
    });
  });

  describe('createFileURI', () => {
    it('should create file URI from path', () => {
      const uri = URI.createFileURI('/home/user/file.txt');
      expect(uri.isFile()).toBe(true);
      expect(uri.scheme()).toBe('file');
    });
  });

  describe('createPlatformResourceURI', () => {
    it('should create platform resource URI', () => {
      const uri = URI.createPlatformResourceURI('/project/file.txt', true);
      expect(uri.isPlatformResource()).toBe(true);
      expect(uri.toString()).toContain('platform:/resource/');
    });
  });
});

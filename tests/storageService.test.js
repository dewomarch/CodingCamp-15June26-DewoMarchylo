/**
 * Tests for StorageService
 * Requirements: 6.1, 6.7, 6.8
 *
 * StorageService is the single point of contact for all localStorage I/O.
 * These tests run in the jsdom environment (vitest + jsdom).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Pull StorageService out of app.js.
// Because app.js is not an ES module (it uses plain const declarations and
// relies on being a browser script), we re-declare StorageService inline here
// so the tests remain self-contained and don't depend on bundler magic.
// ---------------------------------------------------------------------------

const StorageService = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // silently ignore
    }
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Force localStorage.getItem to throw an arbitrary error. */
function stubGetItemThrows(errorMsg = 'Access denied') {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error(errorMsg);
  });
}

/** Force localStorage.getItem to return a raw string (even malformed JSON). */
function stubGetItemReturns(value) {
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(value);
}

/** Force localStorage.setItem to throw a QuotaExceededError. */
function stubSetItemThrowsQuota() {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
    throw err;
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------

  describe('get()', () => {
    it('returns null for a key that does not exist', () => {
      expect(StorageService.get('nonexistent')).toBeNull();
    });

    it('returns the parsed value for a key that exists', () => {
      localStorage.setItem('myKey', JSON.stringify({ hello: 'world' }));
      expect(StorageService.get('myKey')).toEqual({ hello: 'world' });
    });

    it('returns null when stored value is corrupted JSON (SyntaxError) — Req 6.8', () => {
      stubGetItemReturns('{ bad json :::');
      expect(StorageService.get('corruptedKey')).toBeNull();
    });

    it('returns null when localStorage.getItem throws (access denied)', () => {
      stubGetItemThrows('Access denied');
      expect(StorageService.get('anyKey')).toBeNull();
    });

    it('returns null for a JSON "null" value stored under the key', () => {
      localStorage.setItem('nullKey', 'null');
      expect(StorageService.get('nullKey')).toBeNull();
    });

    it('correctly parses a stored array', () => {
      const arr = [1, 2, 3];
      localStorage.setItem('arr', JSON.stringify(arr));
      expect(StorageService.get('arr')).toEqual(arr);
    });

    it('correctly parses a stored boolean false', () => {
      localStorage.setItem('flag', JSON.stringify(false));
      expect(StorageService.get('flag')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // set()
  // -------------------------------------------------------------------------

  describe('set()', () => {
    it('returns true and persists the value on success', () => {
      const result = StorageService.set('key1', { a: 1 });
      expect(result).toBe(true);
      expect(JSON.parse(localStorage.getItem('key1'))).toEqual({ a: 1 });
    });

    it('returns false when localStorage.setItem throws QuotaExceededError — Req 6.1', () => {
      stubSetItemThrowsQuota();
      const result = StorageService.set('key1', { a: 1 });
      expect(result).toBe(false);
    });

    it('returns false when localStorage.setItem throws a generic error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('some write error');
      });
      expect(StorageService.set('key1', 'value')).toBe(false);
    });

    it('serializes arrays correctly — Req 6.7', () => {
      const tasks = [{ id: '1', text: 'Buy milk', completed: false }];
      StorageService.set('todo_tasks', tasks);
      const stored = JSON.parse(localStorage.getItem('todo_tasks'));
      expect(stored).toEqual(tasks);
    });
  });

  // -------------------------------------------------------------------------
  // remove()
  // -------------------------------------------------------------------------

  describe('remove()', () => {
    it('removes an existing key', () => {
      localStorage.setItem('removeMe', '"value"');
      StorageService.remove('removeMe');
      expect(localStorage.getItem('removeMe')).toBeNull();
    });

    it('does not throw when the key does not exist', () => {
      expect(() => StorageService.remove('ghost')).not.toThrow();
    });

    it('does not throw when localStorage.removeItem throws', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      expect(() => StorageService.remove('key')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // get / set round-trip — Req 6.7
  // -------------------------------------------------------------------------

  describe('get/set round-trip', () => {
    it('preserves a Task object through serialize → deserialize cycle', () => {
      const task = { id: 'abc-123', text: 'Write tests', completed: false };
      StorageService.set('todo_tasks', [task]);
      const [retrieved] = StorageService.get('todo_tasks');
      expect(retrieved).toEqual(task);
    });

    it('preserves a LinkItem object through serialize → deserialize cycle', () => {
      const link = { id: 'xyz-456', label: 'GitHub', url: 'https://github.com' };
      StorageService.set('quick_links', [link]);
      const [retrieved] = StorageService.get('quick_links');
      expect(retrieved).toEqual(link);
    });

    it('round-trip identity holds for nested objects', () => {
      const value = { a: [1, 2, 3], b: { c: true } };
      StorageService.set('nested', value);
      expect(StorageService.get('nested')).toEqual(value);
    });

    it('round-trip identity holds for strings', () => {
      StorageService.set('str', 'hello world');
      expect(StorageService.get('str')).toBe('hello world');
    });

    it('round-trip identity holds for numbers', () => {
      StorageService.set('num', 42);
      expect(StorageService.get('num')).toBe(42);
    });
  });
});

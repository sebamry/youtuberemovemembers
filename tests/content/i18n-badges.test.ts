import { describe, expect, test } from 'vitest';

import { isMembersBadgeText, normalizeBadgeText } from '@content/i18n-badges';

describe('members badge matching', () => {
  test('normalizes whitespace and casing', () => {
    expect(normalizeBadgeText('  Miembros   primero  ')).toBe('miembros primero');
  });

  test('matches known members-only phrases', () => {
    expect(isMembersBadgeText('Miembros primero')).toBe(true);
    expect(isMembersBadgeText('Solo para miembros')).toBe(true);
    expect(isMembersBadgeText('Members only')).toBe(true);
    expect(isMembersBadgeText('Members first')).toBe(true);
  });

  test('ignores unrelated labels', () => {
    expect(isMembersBadgeText('Publico')).toBe(false);
    expect(isMembersBadgeText('Recommended')).toBe(false);
  });
});

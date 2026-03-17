const MEMBERS_BADGE_PHRASES = new Set([
  'miembros primero',
  'primero para miembros',
  'solo para miembros',
  'members only',
  'members first'
]);

export function normalizeBadgeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isMembersBadgeText(value: string) {
  return MEMBERS_BADGE_PHRASES.has(normalizeBadgeText(value));
}

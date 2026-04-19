const MEMBERS_BADGE_PHRASES = new Set([
  'miembros primero',
  'primero para miembros',
  'solo para miembros',
  'apenas para membros',
  'membros primeiro',
  'membres uniquement',
  'en premier pour les membres',
  'members only',
  'members first',
  'nur fur mitglieder',
  'zuerst fur mitglieder'
]);

export function normalizeBadgeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isMembersBadgeText(value: string) {
  return MEMBERS_BADGE_PHRASES.has(normalizeBadgeText(value));
}

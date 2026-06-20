export const normalizeMatchFlag = (value: unknown, target: boolean): boolean => {
  if (target) {
    return value === true || value === 1 || value === '1';
  }
  return value === false || value === 0 || value === '0';
};

export const getEventOpponentName = (event: any): string => {
  if (!event?.title) return '';
  const parts = String(event.title).split(' - ');
  if (parts.length === 2) {
    const part1 = parts[0].trim();
    const part2 = parts[1].trim();
    if (event?.type === 'match') {
      const isHomeMatch = normalizeMatchFlag(event?.is_home_match, true);
      const isAwayMatch = normalizeMatchFlag(event?.is_home_match, false);
      if (isHomeMatch || isAwayMatch) {
        return isHomeMatch ? part2 : part1;
      }
    }
    return part1;
  }
  return String(event.title);
};

export const getEventSquadIndicator = (event: any): 'I' | 'II' | null => {
  const title = String(event?.title || '').trim();
  const teamName = String(event?.team_name || '').trim();
  const description = String(event?.description || '').trim();
  const explicitSquadLabel = description.match(/^Mannschaft:\s*(II|I|2|1)\s*$/im)?.[1] || '';

  const ownTitlePart = (() => {
    const parts = title.replace(/^\[(?:I{1,3}|\d+)\]\s*/i, '').split(' - ');
    if (parts.length !== 2 || event?.type !== 'match') return '';
    const isHomeMatch = normalizeMatchFlag(event?.is_home_match, true);
    const isAwayMatch = normalizeMatchFlag(event?.is_home_match, false);
    if (isHomeMatch) return parts[0].trim();
    if (isAwayMatch) return parts[1].trim();
    return '';
  })();

  if (
    /^\[(?:II|2)\]\s*/i.test(title) ||
    /^\((?:II|2)\)\s*/i.test(title) ||
    /^(?:II|2)$/i.test(explicitSquadLabel) ||
    /\bII\b/i.test(teamName) ||
    /\bII\b/i.test(ownTitlePart)
  ) {
    return 'II';
  }
  if (
    /^\[(?:I|1)\]\s*/i.test(title) ||
    /^\((?:I|1)\)\s*/i.test(title) ||
    /^(?:I|1)$/i.test(explicitSquadLabel) ||
    /\bI\b/i.test(teamName) ||
    /\bI\b/i.test(ownTitlePart)
  ) {
    return 'I';
  }
  return null;
};

export const getEventDisplayTitle = (event: any): string => {
  const opponent = getEventOpponentName(event);
  return String(opponent || event?.title || '')
    .replace(/^\[(?:I{1,3}|\d+)\]\s*/i, '')
    .replace(/^\((?:I{1,3}|\d+)\)\s*/i, '')
    .replace(/^spiel\s+gegen\s+/i, '')
    .trim();
};

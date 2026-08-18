const DIACRITICS_PATTERN = new RegExp('[̀-ͯ]', 'g');

export function slugify(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return cleaned || 'zona';
}

export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let attempt = 2;
  let candidate = `${base}-${attempt}`;
  while (taken.has(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}

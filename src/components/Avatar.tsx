import type { JSX } from 'react';

const RING_COLORS = ['#e0a636', '#6b93a8', '#8a7cae', '#6b7789', '#a87c6b'];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({
  id,
  name,
  size = 48,
}: {
  id: string;
  name: string;
  size?: number;
}): JSX.Element {
  const ringColor = RING_COLORS[hashString(id) % RING_COLORS.length];

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full border-2 bg-graphite-800 font-semibold text-graphite-100"
      style={{
        width: size,
        height: size,
        borderColor: ringColor,
        fontSize: size * 0.36,
      }}
    >
      {initialsFromName(name)}
    </span>
  );
}

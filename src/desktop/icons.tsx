import type { JSX, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(children: JSX.Element, props: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CaseDeskIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M3 8h14" />
    </>,
    props,
  );
}

export function EvidenceIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </>,
    props,
  );
}

export function PeopleIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3 2.5-5 6-5s6 2 6 5" />
    </>,
    props,
  );
}

export function LocationsIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <path d="M10 17s5.5-4.6 5.5-8.7A5.5 5.5 0 0 0 4.5 8.3C4.5 12.4 10 17 10 17Z" />
      <circle cx="10" cy="8.3" r="1.8" />
    </>,
    props,
  );
}

export function TimelineIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
    </>,
    props,
  );
}

export function AnalyticsIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <path d="M4 16V9M10 16V4M16 16v-6" />
    </>,
    props,
  );
}

export function MessagesIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <rect x="3" y="4.5" width="14" height="11" rx="1.5" />
      <path d="m3.5 5.5 6.5 5 6.5-5" />
    </>,
    props,
  );
}

export function ReportsIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <path d="M6 3h6l3 3v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M8 10h4M8 13h4" />
    </>,
    props,
  );
}

export function SettingsIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 3.5v1.8M10 14.7v1.8M16.5 10h-1.8M5.3 10H3.5M14.6 5.4l-1.3 1.3M6.7 13.3l-1.3 1.3M14.6 14.6l-1.3-1.3M6.7 6.7 5.4 5.4" />
    </>,
    props,
  );
}

export function LogoutIcon(props: IconProps): JSX.Element {
  return base(
    <>
      <path d="M8 17H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3" />
      <path d="M13 14l4-4-4-4M17 10H7" />
    </>,
    props,
  );
}

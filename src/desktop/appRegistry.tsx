import type { ComponentType, SVGProps } from 'react';
import { AnalyticsApp } from '../applications/analytics/AnalyticsApp';
import { CaseDeskApp } from '../applications/case-desk/CaseDeskApp';
import { EvidenceApp } from '../applications/evidence/EvidenceApp';
import { LocationsApp } from '../applications/locations/LocationsApp';
import { MessagesApp } from '../applications/messages/MessagesApp';
import { PeopleApp } from '../applications/people/PeopleApp';
import { ReportsApp } from '../applications/reports/ReportsApp';
import { SettingsApp } from '../applications/settings/SettingsApp';
import { TimelineApp } from '../applications/timeline/TimelineApp';
import {
  AnalyticsIcon,
  CaseDeskIcon,
  EvidenceIcon,
  LocationsIcon,
  MessagesIcon,
  PeopleIcon,
  ReportsIcon,
  SettingsIcon,
  TimelineIcon,
} from './icons';
import type { SectionId } from './navigation.store';

export const SECTION_COMPONENTS: Record<SectionId, ComponentType> = {
  'case-desk': CaseDeskApp,
  evidence: EvidenceApp,
  people: PeopleApp,
  locations: LocationsApp,
  timeline: TimelineApp,
  analytics: AnalyticsApp,
  messages: MessagesApp,
  reports: ReportsApp,
  settings: SettingsApp,
};

export const NAV_ITEMS: {
  id: SectionId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { id: 'case-desk', label: 'Case Desk', icon: CaseDeskIcon },
  { id: 'evidence', label: 'Evidence', icon: EvidenceIcon },
  { id: 'people', label: 'People', icon: PeopleIcon },
  { id: 'locations', label: 'Locations', icon: LocationsIcon },
  { id: 'timeline', label: 'Timeline', icon: TimelineIcon },
  { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
  { id: 'messages', label: 'Messages', icon: MessagesIcon },
  { id: 'reports', label: 'Reports', icon: ReportsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

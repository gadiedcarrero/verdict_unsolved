import { adventureCaseBundleRaw } from '@/cases/case-001-la-ultima-llamada';
import { loadAdventureCase } from './loadAdventureCase';

export const activeAdventureCaseResult = loadAdventureCase(adventureCaseBundleRaw);

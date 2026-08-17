import { caseBundleRaw } from '@/cases/case-001-four-minutes';
import { loadCase } from './loadCase';

export const activeCaseResult = loadCase(caseBundleRaw);

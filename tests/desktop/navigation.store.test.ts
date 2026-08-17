import { beforeEach, describe, expect, it } from 'vitest';
import { useNavigationStore } from '@/desktop/navigation.store';

describe('navigation.store', () => {
  beforeEach(() => {
    useNavigationStore.setState({ activeSection: 'case-desk' });
  });

  it('defaults to the case-desk section', () => {
    expect(useNavigationStore.getState().activeSection).toBe('case-desk');
  });

  it('changes the active section', () => {
    useNavigationStore.getState().setSection('evidence');

    expect(useNavigationStore.getState().activeSection).toBe('evidence');
  });

  it('can switch between multiple sections', () => {
    const { setSection } = useNavigationStore.getState();

    setSection('people');
    expect(useNavigationStore.getState().activeSection).toBe('people');

    setSection('timeline');
    expect(useNavigationStore.getState().activeSection).toBe('timeline');
  });
});

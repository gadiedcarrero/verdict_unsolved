import { useEffect, type JSX } from 'react';
import { CaseProvider } from '../app/CaseContext';
import { activeCaseResult } from '../game-engine/case-loader/activeCase';
import { useSaveStore } from '../game-engine/save-system/save.store';
import { SECTION_COMPONENTS } from './appRegistry';
import { CaseSummaryPanel } from './CaseSummaryPanel';
import { useNavigationStore } from './navigation.store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

function DashboardSurface({ onLogout }: { onLogout: () => void }): JSX.Element {
  const activeSection = useNavigationStore((s) => s.activeSection);
  const ActiveSectionComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-graphite-950">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar onLogout={onLogout} />
        <main className="min-w-0 flex-1 overflow-hidden">
          <ActiveSectionComponent />
        </main>
        {activeSection === 'case-desk' && <CaseSummaryPanel />}
      </div>
    </div>
  );
}

export function Desktop({ onExit }: { onExit: () => void }): JSX.Element {
  const load = useSaveStore((s) => s.load);
  const isLoaded = useSaveStore((s) => s.isLoaded);
  const setActiveCase = useSaveStore((s) => s.setActiveCase);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isLoaded && activeCaseResult.ok) {
      setActiveCase(activeCaseResult.data.case.id);
    }
  }, [isLoaded, setActiveCase]);

  if (!activeCaseResult.ok) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 p-8 text-center text-graphite-200">
        <p>
          No se pudo cargar el caso de demostración.
          <br />
          <span className="text-sm text-graphite-400">{activeCaseResult.error}</span>
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="h-screen w-screen bg-graphite-950" />;
  }

  return (
    <CaseProvider bundle={activeCaseResult.data}>
      <DashboardSurface onLogout={onExit} />
    </CaseProvider>
  );
}

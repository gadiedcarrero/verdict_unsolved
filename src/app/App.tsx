import { useEffect, useState, type JSX } from 'react';
import { AdventureRuntime } from '../adventure/AdventureRuntime';
import { usePreferencesStore } from '../game-engine/preferences/preferences.store';
import { SplashScreen } from './SplashScreen';

function usePreferencesEffect(): void {
  const textScale = usePreferencesStore((s) => s.textScale);
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
  }, [textScale]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
}

export function App(): JSX.Element {
  const [entered, setEntered] = useState(false);
  usePreferencesEffect();

  if (!entered) {
    return <SplashScreen onEnter={() => setEntered(true)} />;
  }

  return <AdventureRuntime onExit={() => setEntered(false)} />;
}

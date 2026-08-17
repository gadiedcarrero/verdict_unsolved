import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de renderizado no controlado:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;

    if (error) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-graphite-950 p-8 text-center text-graphite-200">
          <p className="text-sm font-semibold tracking-widest text-red-400 uppercase">
            Algo salió mal
          </p>
          <p className="max-w-lg text-sm leading-relaxed text-graphite-300">{error.message}</p>
          <pre className="max-h-40 max-w-xl overflow-auto rounded border border-graphite-700 bg-graphite-900 p-3 text-left text-[11px] text-graphite-500">
            {error.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

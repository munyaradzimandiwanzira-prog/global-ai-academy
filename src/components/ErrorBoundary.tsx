import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches render errors (including failed lazy chunk loads after a deploy). */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ui]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /Failed to fetch dynamically imported module|Importing a module script failed/i.test(this.state.error.message);
    return (
      <div className="container flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{chunk ? 'A new version is available' : 'This page hit a problem'}</h1>
        <p className="mt-2 max-w-md text-muted-fg">
          {chunk ? 'We updated the Academy while you were learning. Reload to get the latest version.' : 'Reload the page to try again. Your progress is saved.'}
        </p>
        <button onClick={() => location.reload()} className="btn-primary mt-6">Reload page</button>
      </div>
    );
  }
}

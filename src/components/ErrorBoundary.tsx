import React from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-red-50 p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-red-900">Algo deu errado</h1>
            <p className="mb-4 text-red-700">
              Um erro inesperado ocorreu. Nossa equipe foi notificada e está investigando.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default Sentry.withErrorBoundary(ErrorBoundary, { fallback: <div>Erro ao carregar.</div> });

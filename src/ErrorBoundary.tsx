import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };
  
  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'black', background: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2>Qualcosa è andato storto.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>{this.state.error?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '10px' }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px', marginTop: '20px', background: '#000', color: '#fff', borderRadius: '8px', fontWeight: 'bold' }}>Ricarica applicazione</button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}


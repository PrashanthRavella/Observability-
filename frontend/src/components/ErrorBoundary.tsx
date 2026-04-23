import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught visualization error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center border overflow-hidden rounded-xl bg-red-900/10 border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
          <h3 className="text-red-400 font-medium mb-1">Visualization Error</h3>
          <p className="text-sm text-red-400/70 max-w-xs">{this.props.fallbackMessage || this.state.errorMsg || 'A visual component crashed.'}</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

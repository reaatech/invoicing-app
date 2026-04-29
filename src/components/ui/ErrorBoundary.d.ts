import React from 'react';
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
declare class ErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>);
  static getDerivedStateFromError(error: Error): ErrorBoundaryState;
  componentDidCatch(error: Error, info: React.ErrorInfo): void;
  handleReload: () => void;
  handleDismiss: () => void;
  render(): React.ReactNode;
}
export default ErrorBoundary;

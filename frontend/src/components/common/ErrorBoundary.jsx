import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { fallbackLabel = "Something went wrong", children } = this.props;

    if (!hasError) return children;

    return (
      <div className="error-boundary" role="alert">
        <p className="error-boundary__label">{fallbackLabel}</p>
        {error?.message && (
          <p className="error-boundary__detail">{error.message}</p>
        )}
        <button className="error-boundary__retry" onClick={this.handleRetry}>
          Try again
        </button>
      </div>
    );
  }
}
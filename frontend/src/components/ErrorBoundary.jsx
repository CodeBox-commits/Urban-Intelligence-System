import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong while loading the dashboard.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
          <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-rose-600">UrbanIQ could not render this page</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Frontend runtime error</h1>
            <p className="mt-3 text-sm text-gray-600">{this.state.message}</p>
            <p className="mt-4 text-sm text-gray-500">Refresh the page after saving the latest files.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

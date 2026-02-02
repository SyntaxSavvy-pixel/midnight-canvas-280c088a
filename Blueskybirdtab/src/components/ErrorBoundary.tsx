import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col items-center justify-center p-8 font-sans">
                    <div className="max-w-xl w-full bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
                        <h1 className="text-2xl font-semibold mb-4 text-red-400">Something went wrong</h1>
                        <p className="text-[#888] mb-6">The application encountered an unexpected error.</p>

                        {this.state.error && (
                            <div className="bg-[#0f0f0f] rounded-lg p-4 mb-6 border border-[#252525] overflow-auto max-h-[200px]">
                                <p className="font-mono text-sm text-red-300 break-words">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

import { AlertCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  details?: unknown;
  onDismiss?: () => void;
}

function formatDetails(details: unknown): string {
  if (typeof details === 'string') {
    return details;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export function ErrorMessage({ message, details, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-red-950/50 border border-red-900 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-red-200 font-medium">{message}</p>
          {details !== undefined && details !== null && (
            <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-32">
              {formatDetails(details)}
            </pre>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

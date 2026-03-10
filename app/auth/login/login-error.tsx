"use client";

interface LoginErrorProps {
  error: string;
  errorMessages: Record<string, string>;
}

export function LoginError({ error, errorMessages }: LoginErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full">
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md shadow-lg">
          <p className="font-medium">Authentication Error</p>
          <p className="text-sm mt-1">
            {errorMessages[error] || "An unexpected error occurred"}
          </p>
        </div>
        
        <div className="text-center mt-4">
          <button
            onClick={() => window.location.href = "/auth/login"}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

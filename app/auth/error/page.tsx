import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ErrorPage({ 
  searchParams 
}: { 
  searchParams: Promise<Record<string, string | string[] | undefined>> 
}) {
  const params = await searchParams;
  
  console.error("[KratosError /auth/error] Received params:", params);
  console.error("[KratosError /auth/error] Param keys:", Object.keys(params));
  console.error("[KratosError /auth/error] Param values:", JSON.stringify(params));
  
  const error = typeof params.error === "string" ? params.error : "";
  const desc = typeof params.error_description === "string" ? params.error_description : "";
  const reason = typeof params.reason === "string" ? params.reason : "";
  const id = typeof params.id === "string" ? params.id : "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white shadow rounded-lg p-6 space-y-4">
        <Image src="/rexform-logo.png" alt="REXFORM" width={140} height={27} className="dark:invert" priority />
        <h1 className="text-2xl font-semibold text-gray-900">Kratos Error</h1>
        <p className="text-sm text-gray-600">Kratos redirected to /auth/error. This usually means an error occurred during login/OIDC flow.</p>
        
        {Object.keys(params).length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800 font-medium">No error details provided</p>
            <p className="text-xs text-yellow-700 mt-1">The error page was called without query parameters. Check server logs for details.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {id && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm text-blue-800">Error ID: {id}</div>
                <div className="text-xs text-blue-600 mt-1">Use this ID to look up the error in Kratos logs</div>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-sm font-medium text-red-900">Error: {error}</div>
              </div>
            )}
            {desc && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-sm text-red-800">Description: {desc}</div>
              </div>
            )}
            {reason && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm text-yellow-800">Reason: {reason}</div>
              </div>
            )}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            Raw Query Parameters (JSON)
          </summary>
          <pre className="mt-2 text-xs font-mono whitespace-pre-wrap bg-gray-100 rounded p-3 text-gray-800 overflow-auto">
            {JSON.stringify(params, null, 2)}
          </pre>
        </details>

        <div className="pt-4 border-t space-x-3">
          <a 
            href="/auth/login" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
          {id && (
            <a 
              href={`/.ory/self-service/errors?id=${id}`}
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              View Kratos Error Details
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

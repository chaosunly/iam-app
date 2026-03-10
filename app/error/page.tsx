export const dynamic = "force-dynamic";

export default async function HydraErrorPage({ 
  searchParams 
}: { 
  searchParams: Promise<Record<string, string | string[] | undefined>> 
}) {
  const params = await searchParams;
  
  console.error("[HydraError /error] Params:", params);
  console.error("[HydraError /error] Keys:", Object.keys(params));
  
  const error = typeof params.error === "string" ? params.error : "";
  const desc = typeof params.error_description === "string" ? params.error_description : "";
  const hint = typeof params.error_hint === "string" ? params.error_hint : "";
  const debug = typeof params.error_debug === "string" ? params.error_debug : "";
  const challenge = typeof params.login_challenge === "string" ? params.login_challenge : "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white shadow rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">OAuth2 Error</h1>
        <p className="text-sm text-gray-600">Hydra redirected to URLS_ERROR with the following details:</p>
        
        <div className="space-y-2">
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
          {hint && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-sm text-yellow-800">Hint: {hint}</div>
            </div>
          )}
          {debug && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="text-sm text-gray-700 font-mono whitespace-pre-wrap">{debug}</div>
            </div>
          )}
          {challenge && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm text-blue-800">Login Challenge: {challenge}</div>
            </div>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            Raw Query Parameters (JSON)
          </summary>
          <pre className="mt-2 text-xs font-mono whitespace-pre-wrap bg-gray-100 rounded p-3 text-gray-800 overflow-auto">
            {JSON.stringify(params, null, 2)}
          </pre>
        </details>

        <div className="pt-4 border-t">
          <a 
            href="/auth/login" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    </main>
  );
}

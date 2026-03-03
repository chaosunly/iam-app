export const dynamic = "force-dynamic";

export default async function ErrorPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const desc = typeof params.error_description === "string" ? params.error_description : "";
  const reason = typeof params.reason === "string" ? params.reason : "";
  const challenge = typeof params.login_challenge === "string" ? params.login_challenge : "";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-xl w-full bg-white shadow rounded-lg p-6 space-y-3">
        <h1 className="text-xl font-semibold text-gray-900">OAuth2 Error</h1>
        <p className="text-sm text-gray-700">If you hit this page, Hydra redirected to URLS_ERROR. Below are the query params.</p>
        <div className="text-sm font-mono whitespace-pre-wrap bg-gray-100 rounded p-3 text-gray-800">
          {JSON.stringify(params, null, 2)}
        </div>
        {error && <div className="text-sm text-red-600">error: {error}</div>}
        {desc && <div className="text-sm text-red-600">description: {desc}</div>}
        {reason && <div className="text-sm text-red-600">reason: {reason}</div>}
        {challenge && <div className="text-sm text-blue-600">login_challenge: {challenge}</div>}
      </div>
    </main>
  );
}

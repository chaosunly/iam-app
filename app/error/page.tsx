'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorHint = searchParams.get('error_hint');
  const errorDebug = searchParams.get('error_debug');

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>OAuth2 Error</h1>
      
      {error && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#fee', border: '1px solid #fcc' }}>
          <h2>Error: {error}</h2>
          {errorDescription && <p><strong>Description:</strong> {errorDescription}</p>}
          {errorHint && <p><strong>Hint:</strong> {errorHint}</p>}
          {errorDebug && (
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
              {errorDebug}
            </pre>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>All URL Parameters:</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}

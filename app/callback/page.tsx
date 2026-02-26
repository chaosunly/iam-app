'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>OAuth2 Callback</h1>
      
      {error ? (
        <div style={{ marginTop: '20px', padding: '20px', background: '#fee', border: '1px solid #fcc', borderRadius: '8px' }}>
          <h2>❌ Error</h2>
          <p><strong>Error:</strong> {error}</p>
          <p><strong>Description:</strong> {searchParams.get('error_description')}</p>
        </div>
      ) : code ? (
        <div style={{ marginTop: '20px', padding: '20px', background: '#efe', border: '1px solid #cfc', borderRadius: '8px' }}>
          <h2>✅ Authorization Code Received</h2>
          <p><strong>Code:</strong></p>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
            {code}
          </pre>
          {state && <p><strong>State:</strong> {state}</p>}
          
          <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
            <p><strong>Next Step:</strong> Exchange this code for tokens</p>
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '11px', marginTop: '10px' }}>
{`curl -X POST https://hydra-production-a56f.up.railway.app/oauth2/token \\
  -u my-app:my-super-secret-secret \\
  -d grant_type=authorization_code \\
  -d code=${code} \\
  -d redirect_uri=https://gateway-production-6cac.up.railway.app/callback`}
            </pre>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '20px', padding: '20px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '8px' }}>
          <p>No authorization code or error received.</p>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>All URL Parameters:</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
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

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}

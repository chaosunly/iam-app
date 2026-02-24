/**
 * Hydra Service - OAuth2/OIDC Server Integration
 * Handles login and consent flow with Ory Hydra
 */

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL;

if (!HYDRA_ADMIN_URL) {
  throw new Error("HYDRA_ADMIN_URL environment variable is not set");
}

export interface OAuth2LoginRequest {
  challenge: string;
  skip: boolean;
  subject?: string;
  client?: {
    client_id: string;
    client_name?: string;
    skip_consent?: boolean;
  };
  oidc_context?: {
    login_hint?: string;
  };
  request_url?: string;
}

export interface OAuth2ConsentRequest {
  challenge: string;
  skip: boolean;
  subject?: string;
  client?: {
    client_id: string;
    client_name?: string;
    skip_consent?: boolean;
  };
  requested_scope?: string[];
  requested_access_token_audience?: string[];
  acr?: string;
  context?: Record<string, unknown>;
}

export interface AcceptLoginResponse {
  redirect_to: string;
}

export interface AcceptConsentResponse {
  redirect_to: string;
}

/**
 * Get OAuth2 login request information
 */
export async function getOAuth2LoginRequest(
  challenge: string
): Promise<OAuth2LoginRequest> {
  const response = await fetch(
    `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login?login_challenge=${challenge}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get login request: ${error}`);
  }

  return response.json();
}

/**
 * Accept OAuth2 login request
 */
export async function acceptOAuth2LoginRequest(
  challenge: string,
  params: {
    subject: string;
    remember?: boolean;
    remember_for?: number;
    acr?: string;
    context?: Record<string, unknown>;
  }
): Promise<AcceptLoginResponse> {
  const response = await fetch(
    `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept?login_challenge=${challenge}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to accept login request: ${error}`);
  }

  return response.json();
}

/**
 * Reject OAuth2 login request
 */
export async function rejectOAuth2LoginRequest(
  challenge: string,
  params: {
    error: string;
    error_description?: string;
  }
): Promise<AcceptLoginResponse> {
  const response = await fetch(
    `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/reject?login_challenge=${challenge}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to reject login request: ${error}`);
  }

  return response.json();
}

/**
 * Get OAuth2 consent request information
 */
export async function getOAuth2ConsentRequest(
  challenge: string
): Promise<OAuth2ConsentRequest> {
  const response = await fetch(
    `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent?consent_challenge=${challenge}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get consent request: ${error}`);
  }

  return response.json();
}

/**
 * Accept OAuth2 consent request
 */
export async function acceptOAuth2ConsentRequest(
  challenge: string,
  params: {
    grant_scope?: string[];
    grant_access_token_audience?: string[];
    remember?: boolean;
    remember_for?: number;
    session?: {
      access_token?: Record<string, unknown>;
      id_token?: Record<string, unknown>;
    };
  }
): Promise<AcceptConsentResponse> {
  const response = await fetch(
    `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/accept?consent_challenge=${challenge}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to accept consent request: ${error}`);
  }

  return response.json();
}

/**
 * Reject OAuth2 consent request
 */
export async function rejectOAuth2ConsentRequest(
  challenge: string,
  params: {
    error: string;
    error_description?: string;
  }
): Promise<AcceptConsentResponse> {
  const response = await fetch(
    `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/reject?consent_challenge=${challenge}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to reject consent request: ${error}`);
  }

  return response.json();
}

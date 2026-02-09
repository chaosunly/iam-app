// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Identity types (Ory Kratos)
export interface Identity {
  id: string;
  schema_id: string;
  schema_url: string;
  state: string;
  state_changed_at: string;
  traits: Record<string, any>;
  verifiable_addresses?: VerifiableAddress[];
  recovery_addresses?: RecoveryAddress[];
  metadata_public?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VerifiableAddress {
  id: string;
  value: string;
  verified: boolean;
  via: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RecoveryAddress {
  id: string;
  value: string;
  via: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIdentityRequest {
  schema_id: string;
  traits: Record<string, any>;
  state?: string;
  metadata_public?: Record<string, any>;
}

// Permission types (Ory Keto)
export interface RelationTuple {
  namespace: string;
  object: string;
  relation: string;
  subject: string;
}

export interface PermissionCheck {
  allowed: boolean;
}

export interface PermissionRequest {
  namespace: string;
  object: string;
  relation: string;
  subject: string;
}

// Session types
export interface Session {
  id: string;
  active: boolean;
  expires_at: string;
  authenticated_at: string;
  issued_at: string;
  identity: Identity;
}

// Error types
export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
  status: number;
}

// User context for Zero-Trust
export interface UserContext {
  userId: string;
  identity: Identity;
  permissions?: string[];
  roles?: string[];
  sessionId: string;
}

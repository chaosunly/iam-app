"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseApiMutationOptions<TData> {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  onSuccess?: (data: TData) => void;
}

interface UseApiMutationResult<TBody, TData> {
  mutate: (body?: TBody) => Promise<void>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
}

export function useApiMutation<TBody = unknown, TData = unknown>(
  url: string,
  options: UseApiMutationOptions<TData> = {},
): UseApiMutationResult<TBody, TData> {
  const { method = "POST", onSuccess } = options;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const mutate = useCallback(
    async (body?: TBody) => {
      setIsPending(true);
      setError(null);
      try {
        const res = await fetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) {
          const message = data.error ?? "Something went wrong";
          setError(message);
          toast.error(message);
          return;
        }
        onSuccessRef.current?.(data as TData);
      } catch {
        const message = "Network error. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setIsPending(false);
      }
    },
    [url, method],
  );

  const reset = useCallback(() => setError(null), []);

  return { mutate, isPending, error, reset };
}

"use client";

import { useEffect } from "react";
import type { UiNode } from "@ory/client-fetch";

interface UiNodeScriptAttributes {
  src: string;
  async: boolean;
  crossorigin: string;
  integrity: string;
  nonce: string;
  referrerpolicy: string;
  type: string;
  id: string;
}

interface WebAuthnScriptProps {
  nodes: UiNode[];
}

/**
 * Injects Kratos WebAuthn/Passkey script nodes into the document.
 * Kratos requires these scripts to call navigator.credentials.create / .get
 * and populate hidden form fields with the credential result.
 */
export function WebAuthnScript({ nodes }: WebAuthnScriptProps) {
  const scriptNodes = nodes.filter((n) => n.type === "script");

  useEffect(() => {
    const injected: HTMLScriptElement[] = [];

    for (const node of scriptNodes) {
      const attrs = node.attributes as unknown as UiNodeScriptAttributes;
      const existing = document.getElementById(attrs.id ?? attrs.src);
      if (existing) continue;

      const script = document.createElement("script");
      script.src = attrs.src;
      script.async = attrs.async ?? true;
      if (attrs.crossorigin) script.crossOrigin = attrs.crossorigin;
      if (attrs.integrity) script.integrity = attrs.integrity;
      if (attrs.nonce) script.nonce = attrs.nonce;
      if (attrs.referrerpolicy) script.referrerPolicy = attrs.referrerpolicy;
      if (attrs.type) script.type = attrs.type;
      if (attrs.id) script.id = attrs.id;

      document.head.appendChild(script);
      injected.push(script);
    }

    return () => {
      injected.forEach((s) => s.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

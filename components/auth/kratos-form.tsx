"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getHiddenFields, getFlowMessages } from "@/lib/auth/ory-flow-utils";
import type { UiNode, UiText } from "@ory/client-fetch";
import { AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KratosFormProps {
  action: string;
  nodes: UiNode[];
  messages?: UiText[];
  children: React.ReactNode;
  className?: string;
  method?: "POST" | "GET";
}

function getMessageVariant(type: string) {
  switch (type) {
    case "error":
      return { icon: AlertCircle, className: "border-destructive/50 text-destructive" };
    case "success":
      return { icon: CheckCircle2, className: "border-green-500/50 text-green-700 dark:text-green-400" };
    default:
      return { icon: Info, className: "" };
  }
}

/**
 * KratosForm — a shared wrapper for all Ory Kratos self-service flows.
 * - Renders a native <form> pointing to the Kratos action URL
 * - Automatically injects hidden fields (csrf_token, method, etc.)
 * - Displays flow.ui.messages as Alerts above the form content
 */
export function KratosForm({
  action,
  nodes,
  messages,
  children,
  className,
  method = "POST",
}: KratosFormProps) {
  const hiddenFields = getHiddenFields(nodes);
  const flowMessages = getFlowMessages(messages);

  return (
    <form action={action} method={method} className={cn("space-y-4", className)}>
      {/* Hidden fields: csrf_token, method, etc. */}
      {hiddenFields.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}

      {/* Global flow messages */}
      {flowMessages.length > 0 && (
        <div className="space-y-2">
          {flowMessages.map((msg, i) => {
            const { icon: Icon, className: msgClassName } = getMessageVariant(msg.type ?? "info");
            return (
              <Alert key={i} className={msgClassName}>
                <Icon className="h-4 w-4" />
                <AlertDescription>{msg.text}</AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {children}
    </form>
  );
}

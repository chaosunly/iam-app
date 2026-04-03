"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        redirect: "manual",
      });

      // API returns a 302 redirect to MAS logout (clears Element session)
      // then MAS redirects back to IAM login.
      if (response.type === "opaqueredirect" || response.status === 302) {
        window.location.href = response.headers.get("location") || "/auth/login";
      } else if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirectUrl || "/auth/login";
      } else {
        window.location.href = "/auth/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  return (
    <form onSubmit={handleLogout}>
      <Button type="submit" disabled={isLoggingOut} size="sm">
        {isLoggingOut ? "Logging out..." : "Logout"}
      </Button>
    </form>
  );
}

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
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirectUrl || "/";
      } else {
        window.location.href = "/";
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

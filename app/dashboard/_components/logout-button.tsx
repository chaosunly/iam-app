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
        // Use replace so the logout page is not in browser history
        window.location.replace(data.redirectUrl || "/auth/login");
      } else {
        window.location.replace("/auth/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/auth/login");
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

"use client";

import { useState } from "react";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingOut(true);

    try {
      // Call the logout API
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.redirected) {
        // Force a full page reload to clear all client-side state
        window.location.href = response.url;
      } else {
        // Fallback: navigate to login page
        window.location.href = "/auth/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force reload to login page on error
      window.location.href = "/auth/login";
    }
  };

  return (
    <form onSubmit={handleLogout}>
      <button
        type="submit"
        disabled={isLoggingOut}
        className="text-sm px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </form>
  );
}

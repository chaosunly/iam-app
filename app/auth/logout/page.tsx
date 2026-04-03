"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    // Call the logout API
    async function logout() {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          redirect: "manual",
        });

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
    }

    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Logging out...</h2>
        <p className="text-gray-600">Please wait while we log you out.</p>
      </div>
    </div>
  );
}


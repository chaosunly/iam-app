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


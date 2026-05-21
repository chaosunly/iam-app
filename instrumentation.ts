export async function register() {
  // Only run in the Node.js server runtime, not during the build or in Edge
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Delay first run so the server is fully started
  setTimeout(async () => {
    const { syncPendingAccounts } = await import(
      "@/lib/services/matrix-provision.service"
    );

    const run = async () => {
      try {
        await syncPendingAccounts();
      } catch (err) {
        console.error("[MatrixProvision] Pending account sync error:", err);
      }
    };

    await run();
    setInterval(run, INTERVAL_MS);
  }, 15_000);
}

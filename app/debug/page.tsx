export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      <div className="space-y-2">
        <p>
          <strong>Ory SDK URL:</strong>{" "}
          {process.env.NEXT_PUBLIC_ORY_SDK_URL || "Not set"}
        </p>
        <div className="mt-4">
          <p className="font-semibold mb-2">Test Connection:</p>
          <button
            onClick={async () => {
              try {
                const response = await fetch(
                  `${process.env.NEXT_PUBLIC_ORY_SDK_URL}/sessions/whoami`,
                  {
                    credentials: "include",
                  },
                );
                const data = await response.json();
                console.log("Session:", data);
                alert(JSON.stringify(data, null, 2));
              } catch (error) {
                console.error("Error:", error);
                alert("Error: " + error);
              }
            }}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Check Session
          </button>
        </div>
      </div>
    </div>
  );
}

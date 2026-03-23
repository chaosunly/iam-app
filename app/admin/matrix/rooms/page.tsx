"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface MatrixSpace {
  id: string;
  name: string;
  org?: { id: string; name: string } | null;
}

interface MatrixRoom {
  id: string;
  name: string;
  description?: string | null;
  matrixId?: string | null;
  spaceId: string;
  createdAt: string;
  space?: MatrixSpace | null;
}

export default function MatrixRoomsPage() {
  const searchParams = useSearchParams();
  const [spaceFilter, setSpaceFilter] = useState(searchParams.get("spaceId") || "");
  const [spaces, setSpaces] = useState<MatrixSpace[]>([]);
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMatrixId, setNewMatrixId] = useState("");
  const [newSpaceId, setNewSpaceId] = useState(searchParams.get("spaceId") || "");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [spaceFilter]);

  async function fetchSpaces() {
    try {
      const res = await fetch("/api/admin/matrix/spaces");
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
      }
    } catch {
      // non-blocking
    }
  }

  async function fetchRooms() {
    try {
      setLoading(true);
      const url = spaceFilter
        ? `/api/admin/matrix/rooms?spaceId=${spaceFilter}`
        : "/api/admin/matrix/rooms";
      const res = await fetch(url);
      if (res.status === 403) {
        setError("You do not have permission to view Matrix rooms.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err: any) {
      setError(err.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/matrix/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          matrixId: newMatrixId.trim() || undefined,
          spaceId: newSpaceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create room");
      }

      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewMatrixId("");
      fetchRooms();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(roomId: string, roomName: string) {
    if (!confirm(`Delete room "${roomName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/matrix/rooms/${roomId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete room");
      }
      fetchRooms();
    } catch (err: any) {
      alert(err.message || "Failed to delete room");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Matrix Rooms</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage individual Matrix rooms within spaces
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors"
        >
          Create Room
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Filter by space */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Filter by space:
        </label>
        <select
          value={spaceFilter}
          onChange={(e) => setSpaceFilter(e.target.value)}
          className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All spaces</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.org ? `${s.org.name} / ` : ""}
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inline create panel */}
      {showCreate && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">New Room</h2>
          {createError && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 text-sm">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Space <span className="text-red-500">*</span>
              </label>
              <select
                value={newSpaceId}
                onChange={(e) => setNewSpaceId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select space</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.org ? `${s.org.name} / ` : ""}
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="general"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Element Room ID
              </label>
              <input
                type="text"
                value={newMatrixId}
                onChange={(e) => setNewMatrixId(e.target.value)}
                placeholder="!xyz456:matrix.org"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors text-sm"
              >
                {creating ? "Creating..." : "Create Room"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {rooms.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      # {room.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {room.space && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                          {room.space.org?.name ? `${room.space.org.name} / ` : ""}
                          {room.space.name}
                        </span>
                      )}
                      {room.matrixId && (
                        <span className="text-xs text-zinc-500 font-mono">{room.matrixId}</span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {room.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      Created {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/admin/matrix/roles?resourceType=room&resourceId=${room.id}`}
                      className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                    >
                      Roles
                    </Link>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No rooms yet</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 text-sm">
              {spaceFilter ? "No rooms in the selected space." : "Create a room to get started."}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors"
            >
              Create Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

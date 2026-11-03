"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DatabaseStorageInfo } from "@/lib/database-storage";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatTableName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DatabaseStorageCard() {
  const [storage, setStorage] = useState<DatabaseStorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/database-storage${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to read database storage");
      setStorage(data.storage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read database storage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const percent = storage ? Math.min(100, storage.percentUsed) : 0;
  const barColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const percentColor = percent >= 90 ? "text-red-600" : percent >= 70 ? "text-amber-600" : "text-emerald-600";

  return (
    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold text-gray-900">Database Storage</CardTitle>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
          {loading ? "Checking..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && !storage ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !storage ? (
          <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between mb-2">
                <p className="text-sm text-gray-700">
                  <span className="text-xl font-bold text-gray-900">{formatBytes(storage.usedBytes)}</span>
                  {" "}used of {formatBytes(storage.limitBytes)}
                </p>
                <p className={`text-sm font-semibold ${percentColor}`}>{storage.percentUsed}%</p>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                <span>{formatBytes(storage.remainingBytes)} remaining</span>
                <span>
                  {storage.usageSource === "neon" ? "Measured by Neon (database branch size)" : "Measured from the connected database"}
                  {" · "}
                  {storage.limitSource === "neon" ? "limit from Neon plan" : "configured limit"}
                </span>
              </div>
            </div>

            {storage.neonTotalStorageBytes !== null && (
              <p className="text-xs text-gray-500">
                Neon total storage including change history: {formatBytes(storage.neonTotalStorageBytes)}
              </p>
            )}

            {storage.neonError && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Could not reach Neon ({storage.neonError}); showing the connected database size instead.
              </p>
            )}

            {storage.largestTables.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Largest tables</p>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {storage.largestTables.map((table) => (
                    <div key={table.name} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-gray-800">{formatTableName(table.name)}</span>
                      <span className="font-medium text-gray-800">{formatBytes(table.bytes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-400">
              Last checked {new Date(storage.checkedAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

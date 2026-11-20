"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Network,
  RefreshCw,
  Search,
  Key,
  Link as LinkIcon,
  Layers,
  Database,
  Table as TableIcon,
  AlertCircle,
  Hash,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useShellStore } from "@/lib/store";
import {
  fetchWorkspaceSchemas,
  fetchSchemaGraph,
  refreshConnectionSchema,
  SchemaObject,
  SchemaSnapshot,
  SchemaGraphResponse,
} from "@/lib/schema-api";
import { SchemaCanvas } from "@/components/schema/schema-canvas";

const emptyGraphData: SchemaGraphResponse = {
  workspace_id: "",
  nodes: [],
  edges: [],
  statistics: {
    total_nodes: 0,
    total_edges: 0,
    foreign_keys_count: 0,
    inferred_count: 0,
    user_defined_count: 0,
    cross_database_count: 0,
  },
};

export default function SchemaPage() {
  const currentWorkspace = useShellStore((s) => s.currentWorkspace);

  const [viewMode, setViewMode] = useState<"canvas" | "table">("canvas");
  const [graphData, setGraphData] = useState<SchemaGraphResponse>(emptyGraphData);
  const [snapshots, setSnapshots] = useState<SchemaSnapshot[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [snapshotsData, graphResp] = await Promise.all([
        fetchWorkspaceSchemas(currentWorkspace.id),
        fetchSchemaGraph(currentWorkspace.id),
      ]);
      setSnapshots(snapshotsData);
      setGraphData(graphResp);

      if (snapshotsData.length > 0) {
        setSelectedConnectionId(snapshotsData[0].connection_id);
        if (snapshotsData[0].objects.length > 0) {
          setSelectedObjectName(snapshotsData[0].objects[0].name);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load schemas";
      setError(msg);
      setSnapshots([]);
      setGraphData(emptyGraphData);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace.id]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!ignore) {
        await loadData();
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [loadData]);

  const activeSnapshot =
    snapshots.find((s) => s.connection_id === selectedConnectionId) || snapshots[0];

  const handleRefresh = async () => {
    if (!activeSnapshot) return;
    setIsRefreshing(true);
    try {
      await refreshConnectionSchema(
        currentWorkspace.id,
        activeSnapshot.connection_id
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh schema");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredObjects: SchemaObject[] = activeSnapshot
    ? activeSnapshot.objects.filter((obj) =>
        obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obj.fields.some((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const selectedObject =
    activeSnapshot?.objects.find((o) => o.name === selectedObjectName) ||
    filteredObjects[0];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Top Header Mode Switcher Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border/80 bg-sidebar px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Network className="h-4 w-4 text-brand" />
          <span className="text-xs font-semibold text-zinc-200">Schema Explorer</span>
          <div className="flex items-center bg-background border border-border/80 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("canvas")}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === "canvas"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Network className="h-3 w-3" />
              <span>Visual Canvas</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span>Table Details</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "table" && snapshots.length > 1 && (
            <div className="flex items-center gap-1 bg-background border border-border/80 rounded-md p-0.5">
              {snapshots.map((snap) => (
                <button
                  key={snap.connection_id}
                  onClick={() => {
                    setSelectedConnectionId(snap.connection_id);
                    if (snap.objects.length > 0) {
                      setSelectedObjectName(snap.objects[0].name);
                    }
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
                    snap.connection_id === activeSnapshot?.connection_id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {snap.connection_id}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || !activeSnapshot}
            className="h-8 text-xs border-border/80 text-zinc-200 hover:bg-muted gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Introspecting..." : "Refresh Schema"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border-b border-red-800/50 flex items-center gap-2 text-xs text-red-300 shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main View Area */}
      {viewMode === "canvas" ? (
        <div className="flex-1 w-full h-full min-h-0">
          <SchemaCanvas
            initialData={graphData}
            workspaceId={currentWorkspace.id}
            onRefresh={loadData}
          />
        </div>
      ) : (
        /* Table View */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Entities List */}
          <div className="w-80 border-r border-border/80 bg-sidebar flex flex-col shrink-0">
            <div className="p-3 border-b border-border/80">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <Input
                  placeholder="Search tables & fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background border-border/80 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-9 w-full bg-muted" />
                  <Skeleton className="h-9 w-full bg-muted" />
                  <Skeleton className="h-9 w-full bg-muted" />
                </div>
              ) : filteredObjects.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No matching entities found.
                </div>
              ) : (
                filteredObjects.map((obj) => {
                  const isSelected = selectedObject?.name === obj.name;
                  return (
                    <button
                      key={`${obj.schema_name}-${obj.name}`}
                      onClick={() => setSelectedObjectName(obj.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-primary/15 border border-brand/30 text-brand font-medium"
                          : "text-zinc-300 hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {obj.object_type === "collection" ? (
                          <Layers className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        ) : obj.object_type === "index" ? (
                          <Database className="h-3.5 w-3.5 shrink-0 text-brand" />
                        ) : (
                          <TableIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        )}
                        <span className="truncate">{obj.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                        {obj.fields.length} cols
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Entity Details */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            {selectedObject ? (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-card border border-border/80 p-5 rounded-xl shadow-sm flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold text-zinc-100">
                        {selectedObject.name}
                      </h2>
                      <Badge variant="outline" className="text-[11px] border-border text-zinc-300">
                        {selectedObject.object_type.toUpperCase()}
                      </Badge>
                      {selectedObject.schema_name && (
                        <span className="text-xs text-zinc-500">
                          schema: {selectedObject.schema_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Estimated row count:{" "}
                      <span className="text-zinc-200 font-medium">
                        {selectedObject.row_count_estimate !== null && selectedObject.row_count_estimate !== undefined
                          ? selectedObject.row_count_estimate.toLocaleString()
                          : "Unknown"}
                      </span>
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[11px] bg-muted text-zinc-300 border border-border/70">
                    {selectedObject.fields.length} Fields
                  </Badge>
                </div>

                {/* Fields Table */}
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-border/80">
                    <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      Columns & Fields
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-zinc-400 border-b border-border/80">
                        <tr>
                          <th className="py-2.5 px-4 font-medium">Field Name</th>
                          <th className="py-2.5 px-4 font-medium">Data Type</th>
                          <th className="py-2.5 px-4 font-medium">Key Constraints</th>
                          <th className="py-2.5 px-4 font-medium">Nullable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {selectedObject.fields.map((f) => (
                          <tr key={f.name} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-zinc-200">
                              {f.name}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-brand text-[11px]">
                              {f.data_type}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {f.is_primary_key && (
                                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0.5">
                                    <Key className="h-2.5 w-2.5" />
                                    <span>PK</span>
                                  </Badge>
                                )}
                                {f.is_foreign_key && (
                                  <Badge className="bg-brand-muted text-brand border-brand/30 text-[10px] gap-1 px-1.5 py-0.5">
                                    <LinkIcon className="h-2.5 w-2.5" />
                                    <span>FK</span>
                                  </Badge>
                                )}
                                {!f.is_primary_key && !f.is_foreign_key && (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-zinc-400">
                              {f.is_nullable ? "Yes" : "No"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Relationships */}
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-border/80">
                    <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      Discovered Relationships ({selectedObject.relationships.length})
                    </h3>
                  </div>

                  {selectedObject.relationships.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500">
                      No foreign key or inferred relationships detected for this entity.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {selectedObject.relationships.map((rel, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                              <LinkIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                                <span className="font-mono text-brand">
                                  {rel.source_table}.({rel.source_fields.join(", ")})
                                </span>
                                <span className="text-zinc-500">→</span>
                                <span className="font-mono text-brand">
                                  {rel.target_table}.({rel.target_fields.join(", ")})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    rel.provenance === "foreign_key"
                                      ? "text-brand border-brand/30"
                                      : "text-amber-400 border-amber-500/30"
                                  }`}
                                >
                                  {rel.provenance === "foreign_key"
                                    ? "Foreign Key Constraint"
                                    : "Inferred Reference"}
                                </Badge>
                                {rel.cardinality && (
                                  <span className="text-[10px] text-zinc-500">
                                    Cardinality: {rel.cardinality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Hash className="h-10 w-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-semibold text-zinc-300">No Entity Selected</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

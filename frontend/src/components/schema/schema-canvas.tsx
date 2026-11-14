"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  BackgroundVariant,
} from "@xyflow/react";
import {
  Network,
  Plus,
  Key,
  Link as LinkIcon,
  X,
  Trash2,
  Database,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableNode } from "@/components/schema/table-node";
import { AddRelationshipDialog } from "@/components/schema/add-relationship-dialog";
import {
  GraphEdge,
  GraphNode,
  SchemaGraphResponse,
  UserDefinedRelationship,
  deleteUserDefinedRelationship,
} from "@/lib/schema-api";

const nodeTypes = {
  tableNode: TableNode,
};

interface SchemaCanvasProps {
  initialData: SchemaGraphResponse;
  workspaceId: string;
  onRefresh?: () => void;
}

export function SchemaCanvas({
  initialData,
  workspaceId,
  onRefresh,
}: SchemaCanvasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddRelOpen, setIsAddRelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // "postgres" | "mongodb" | "elasticsearch" | null

  // Calculate layout coordinates for nodes
  const calculateInitialNodes = useCallback(
    (graphNodes: GraphNode[]): Node<GraphNode>[] => {
      // Group by connection ID to cluster tables from same database together
      const groups: Record<string, GraphNode[]> = {};
      graphNodes.forEach((node) => {
        const key = node.connection_id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(node);
      });

      const result: Node<GraphNode>[] = [];
      let colIndex = 0;

      Object.entries(groups).forEach(([, nodesInGroup]) => {
        nodesInGroup.forEach((node, rowIndex) => {
          result.push({
            id: node.id,
            type: "tableNode",
            position: {
              x: colIndex * 380 + 60,
              y: rowIndex * 320 + 60,
            },
            data: node,
          });
        });
        colIndex += 1;
      });

      return result;
    },
    []
  );

  const calculateInitialEdges = useCallback(
    (graphEdges: GraphEdge[]): Edge<GraphEdge>[] => {
      return graphEdges.map((edge) => {
        const isFk = edge.provenance === "foreign_key";
        const isUser = edge.provenance === "user_defined";

        const strokeColor = isUser
          ? edge.is_cross_database
            ? "#10a37f"
            : "#14b8a6"
          : isFk
          ? "#71717a"
          : "#f59e0b";

        return {
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          sourceHandle: `${edge.source_field}-source`,
          targetHandle: `${edge.target_field}-target`,
          animated: !isFk,
          style: {
            stroke: strokeColor,
            strokeWidth: isUser ? 2.5 : 2,
            strokeDasharray: isFk ? undefined : "5,5",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: strokeColor,
          },
          label: `${edge.source_field} → ${edge.target_field}`,
          labelStyle: {
            fill: "#a1a1aa",
            fontSize: 10,
            fontFamily: "monospace",
          },
          labelBgStyle: {
            fill: "#181818",
            fillOpacity: 0.95,
          },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          data: edge,
        };
      });
    },
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNode>>(
    calculateInitialNodes(initialData.nodes)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<GraphEdge>>(
    calculateInitialEdges(initialData.edges)
  );

  // Sync with prop updates
  useEffect(() => {
    setNodes(calculateInitialNodes(initialData.nodes));
    setEdges(calculateInitialEdges(initialData.edges));
  }, [initialData, calculateInitialNodes, calculateInitialEdges, setNodes, setEdges]);

  // Filter nodes based on search term or database filter
  const filteredNodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return nodes.map((node) => {
      const gNode = node.data as unknown as GraphNode;
      const matchesSearch =
        !q ||
        gNode.name.toLowerCase().includes(q) ||
        gNode.fields.some((f) => f.name.toLowerCase().includes(q));

      const matchesFilter =
        !activeFilter || gNode.database_type === activeFilter;

      const isVisible = matchesSearch && matchesFilter;

      return {
        ...node,
        style: {
          ...node.style,
          opacity: isVisible ? 1 : 0.2,
          pointerEvents: (isVisible ? "auto" : "none") as React.CSSProperties["pointerEvents"],
        },
      };
    });
  }, [nodes, searchTerm, activeFilter]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode((node.data as unknown as GraphNode) || null);
      setSelectedEdge(null);
    },
    []
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge((edge.data as unknown as GraphEdge) || null);
      setSelectedNode(null);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleRelationshipCreated = (newRel: UserDefinedRelationship) => {
    const newEdge: GraphEdge = {
      id: `user::${newRel.id}`,
      source_node_id: `${newRel.source_connection_id}::${newRel.source_table}`,
      source_field: newRel.source_fields[0] || "",
      target_node_id: `${newRel.target_connection_id}::${newRel.target_table}`,
      target_field: newRel.target_fields[0] || "",
      provenance: "user_defined",
      cardinality: newRel.cardinality,
      confidence: newRel.confidence,
      is_cross_database:
        newRel.source_connection_id !== newRel.target_connection_id,
      description: newRel.description,
    };

    const isCross = newEdge.is_cross_database;
    const strokeColor = isCross ? "#10a37f" : "#14b8a6";

    const rfEdge: Edge<GraphEdge> = {
      id: newEdge.id,
      source: newEdge.source_node_id,
      target: newEdge.target_node_id,
      sourceHandle: `${newEdge.source_field}-source`,
      targetHandle: `${newEdge.target_field}-target`,
      animated: true,
      style: {
        stroke: strokeColor,
        strokeWidth: 2.5,
        strokeDasharray: "5,5",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: strokeColor,
      },
      label: `${newEdge.source_field} → ${newEdge.target_field}`,
      labelStyle: { fill: "#ececec", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "#181818", fillOpacity: 0.95 },
      data: newEdge,
    };

    setEdges((prev) => [...prev, rfEdge]);
    if (onRefresh) onRefresh();
  };

  const handleDeleteRelationship = async (relId: string) => {
    try {
      await deleteUserDefinedRelationship(workspaceId, relId);
      setEdges((prev) => prev.filter((e) => e.id !== `user::${relId}`));
      setSelectedEdge(null);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      console.error("Failed to delete relationship:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#212121] text-[#ececec] relative">
      {/* Canvas Toolbar */}
      <div className="flex h-12 items-center justify-between border-b border-[#303030] bg-[#181818] px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Network className="h-4 w-4 text-emerald-400" />
            <span>Interactive Schema Canvas</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] text-zinc-400 border-[#303030] bg-[#212121]"
            >
              {initialData.statistics.total_nodes} Entities
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] text-zinc-300 border-[#303030] bg-[#262626]"
            >
              {initialData.statistics.foreign_keys_count} FKs
            </Badge>
            {initialData.statistics.user_defined_count > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              >
                {initialData.statistics.user_defined_count} Custom Links
              </Badge>
            )}
          </div>
        </div>

        {/* Toolbar Center: Search & Database Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input
              placeholder="Find entity or field..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-8 text-xs bg-[#212121] border-[#303030] text-[#ececec] placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#212121] border border-[#303030] rounded-md p-0.5">
            <button
              onClick={() => setActiveFilter(null)}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === null
                  ? "bg-[#303030] text-[#ececec] font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("postgres")}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === "postgres"
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Postgres
            </button>
            <button
              onClick={() => setActiveFilter("mongodb")}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === "mongodb"
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mongo
            </button>
            <button
              onClick={() => setActiveFilter("elasticsearch")}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === "elasticsearch"
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ES
            </button>
          </div>
        </div>

        {/* Toolbar Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddRelOpen(true)}
            className="h-8 text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Tables</span>
          </Button>
        </div>
      </div>

      {/* React Flow Viewport Area */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-[#212121]"
        >
          <Background
            color="#333333"
            gap={20}
            size={1.5}
            variant={BackgroundVariant.Dots}
          />
          <Controls
            className="!bg-[#181818] !border-[#303030] !text-[#ececec] !shadow-xl [&>button]:!border-[#303030] [&>button]:!fill-[#ececec] [&>button:hover]:!bg-[#2a2a2a]"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-[#181818] !border-[#303030] !rounded-lg !overflow-hidden"
            nodeColor={(node) => {
              const dType = (node.data as unknown as GraphNode)?.database_type;
              if (dType === "postgres") return "#10a37f";
              if (dType === "mongodb") return "#14b8a6";
              if (dType === "elasticsearch") return "#f59e0b";
              return "#52525b";
            }}
            maskColor="rgba(23, 23, 23, 0.75)"
          />
        </ReactFlow>

        {/* Inspector Side Drawer */}
        {(selectedNode || selectedEdge) && (
          <div className="absolute top-4 right-4 w-96 max-h-[calc(100%-32px)] bg-[#181818] border border-[#303030] rounded-xl shadow-2xl p-4 flex flex-col z-20 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2d2d]">
              <div className="flex items-center gap-2 truncate">
                {selectedNode && (
                  <>
                    <Database className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-[#ececec] truncate">
                      {selectedNode.name}
                    </span>
                  </>
                )}
                {selectedEdge && (
                  <>
                    <LinkIcon className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-[#ececec] truncate">
                      Relationship Detail
                    </span>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
              <div className="flex-1 overflow-y-auto pt-3 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Database Source</span>
                  <Badge variant="outline" className="text-[10px] border-[#303030] text-zinc-300">
                    {selectedNode.connection_name} ({selectedNode.database_type})
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Estimated Rows</span>
                  <span className="font-mono text-[#ececec] font-medium">
                    {selectedNode.row_count_estimate?.toLocaleString() || "Unknown"}
                  </span>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Fields & Columns ({selectedNode.fields.length})
                  </h4>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {selectedNode.fields.map((f) => (
                      <div
                        key={f.name}
                        className="p-2 rounded bg-[#212121] border border-[#303030] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {f.is_primary_key && (
                            <Key className="h-3 w-3 shrink-0 text-amber-400" />
                          )}
                          {f.is_foreign_key && !f.is_primary_key && (
                            <LinkIcon className="h-3 w-3 shrink-0 text-emerald-400" />
                          )}
                          <span className="font-mono text-[11px] text-[#ececec] truncate">
                            {f.name}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-400">
                          {f.data_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Edge Details */}
            {selectedEdge && (
              <div className="flex-1 overflow-y-auto pt-3 space-y-4 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px] mb-1">Source Table & Field</span>
                  <div className="font-mono p-2 rounded bg-[#212121] border border-[#2d2d2d] text-emerald-400">
                    {selectedEdge.source_node_id} . {selectedEdge.source_field}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] mb-1">Target Table & Field</span>
                  <div className="font-mono p-2 rounded bg-[#212121] border border-[#2d2d2d] text-teal-300">
                    {selectedEdge.target_node_id} . {selectedEdge.target_field}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Provenance</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedEdge.provenance === "foreign_key"
                        ? "text-zinc-300 border-zinc-700"
                        : selectedEdge.provenance === "user_defined"
                        ? "text-emerald-400 border-emerald-500/30"
                        : "text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {selectedEdge.provenance.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Cardinality</span>
                  <span className="font-mono text-zinc-200">
                    {selectedEdge.cardinality || "many_to_one"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Cross-Database</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedEdge.is_cross_database
                        ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
                        : "text-zinc-400 border-[#303030]"
                    }`}
                  >
                    {selectedEdge.is_cross_database ? "Yes (Heterogeneous)" : "No (Intra-database)"}
                  </Badge>
                </div>

                {selectedEdge.provenance === "user_defined" && (
                  <div className="pt-2 border-t border-[#303030]">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const rawId = selectedEdge.id.replace("user::", "");
                        handleDeleteRelationship(rawId);
                      }}
                      className="w-full text-xs gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Relationship</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Relationship Dialog */}
      <AddRelationshipDialog
        open={isAddRelOpen}
        onOpenChange={setIsAddRelOpen}
        workspaceId={workspaceId}
        nodes={initialData.nodes}
        onRelationshipCreated={handleRelationshipCreated}
      />
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  Node,
  Edge,
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
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
  Sparkles,
  Layers,
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

/**
 * Intelligent DAG / Topological Layering Algorithm for Schema Graphs.
 * Arranges any schema such that lines flow cleanly left-to-right without overlaps.
 */
export function calculateOptimalLayout(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[]
): Node<GraphNode>[] {
  if (!graphNodes || graphNodes.length === 0) return [];

  // 1. Identify which field names participate in relationships for glowing port handles
  const connectedFieldsMap: Record<string, Set<string>> = {};
  graphEdges.forEach((edge) => {
    if (!connectedFieldsMap[edge.source_node_id]) {
      connectedFieldsMap[edge.source_node_id] = new Set();
    }
    if (!connectedFieldsMap[edge.target_node_id]) {
      connectedFieldsMap[edge.target_node_id] = new Set();
    }
    if (edge.source_field) {
      connectedFieldsMap[edge.source_node_id].add(edge.source_field);
    }
    if (edge.target_field) {
      connectedFieldsMap[edge.target_node_id].add(edge.target_field);
    }
  });

  // Curated Enterprise Co-ordinates when the full demo cluster + healthcare cluster is loaded
  const hasHealthcare = graphNodes.some((n) =>
    ["admissions", "appointments", "billing_invoices", "patients"].includes(n.name.toLowerCase())
  );
  const hasEcommerce = graphNodes.some((n) =>
    ["orders", "products", "customers", "order_items"].includes(n.name.toLowerCase())
  );

  if (hasHealthcare && hasEcommerce) {
    const multiDomainCoordinates: Record<string, { x: number; y: number }> = {
      // Healthcare Domain (Left Block - 4 Column Clinical Flow: Transactions -> Admissions/Appts -> Entities -> Depts)
      billing_invoices: { x: 50, y: 60 },
      diagnoses: { x: 50, y: 390 },
      medical_procedures: { x: 50, y: 720 },
      prescriptions: { x: 50, y: 1050 },
      admissions: { x: 440, y: 180 },
      appointments: { x: 440, y: 700 },
      patients: { x: 830, y: 100 },
      physicians: { x: 830, y: 480 },
      rooms: { x: 830, y: 860 },
      departments: { x: 1220, y: 620 },

      // E-Commerce, Mongo & Elasticsearch Domain (Right Block - 3 Column DAG Flow)
      reviews: { x: 1680, y: 60 },
      catalog: { x: 1680, y: 390 },
      order_items: { x: 1680, y: 720 },
      events: { x: 1680, y: 1050 },
      access_logs: { x: 1680, y: 1370 },
      products: { x: 2080, y: 160 },
      orders: { x: 2080, y: 680 },
      customers: { x: 2480, y: 680 },
    };

    if (graphNodes.every((n) => n.name.toLowerCase() in multiDomainCoordinates)) {
      return graphNodes.map((node) => {
        const pos = multiDomainCoordinates[node.name.toLowerCase()] || { x: 100, y: 100 };
        const connectedFields = Array.from(connectedFieldsMap[node.id] || []);
        return {
          id: node.id,
          type: "tableNode",
          position: pos,
          data: {
            ...node,
            connectedFields,
          },
        };
      });
    }
  }

  // Pure E-Commerce + Mongo + ES Demo Cluster (8 tables)
  const singleClusterDemoCoordinates: Record<string, { x: number; y: number }> = {
    reviews: { x: 50, y: 60 },
    catalog: { x: 50, y: 390 },
    order_items: { x: 50, y: 720 },
    events: { x: 50, y: 1050 },
    access_logs: { x: 50, y: 1370 },
    products: { x: 450, y: 160 },
    orders: { x: 450, y: 680 },
    customers: { x: 850, y: 680 },
  };

  if (!hasHealthcare && graphNodes.every((n) => n.name.toLowerCase() in singleClusterDemoCoordinates)) {
    return graphNodes.map((node) => {
      const pos = singleClusterDemoCoordinates[node.name.toLowerCase()] || { x: 100, y: 100 };
      const connectedFields = Array.from(connectedFieldsMap[node.id] || []);
      return {
        id: node.id,
        type: "tableNode",
        position: pos,
        data: {
          ...node,
          connectedFields,
        },
      };
    });
  }

  // 3. Generalized Multi-Database Domain Clustering Algorithm
  // Partitions tables by connection_id so separate databases form their own structured lanes
  const connectionGroups = new Map<string, GraphNode[]>();
  graphNodes.forEach((node) => {
    const connKey = node.connection_id || node.connection_name || "default";
    if (!connectionGroups.has(connKey)) {
      connectionGroups.set(connKey, []);
    }
    connectionGroups.get(connKey)!.push(node);
  });

  const nodeIds = new Set(graphNodes.map((n) => n.id));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  graphNodes.forEach((n) => {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  });

  graphEdges.forEach((e) => {
    if (nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id)) {
      outgoing.get(e.source_node_id)!.push(e.target_node_id);
      incoming.get(e.target_node_id)!.push(e.source_node_id);
    }
  });

  const result: Node<GraphNode>[] = [];
  let currentDomainOffsetX = 50;

  // Sort connection groups so larger domains (e.g. relational databases) appear first
  const sortedConnectionKeys = Array.from(connectionGroups.keys()).sort((a, b) => {
    return (connectionGroups.get(b)?.length || 0) - (connectionGroups.get(a)?.length || 0);
  });

  sortedConnectionKeys.forEach((connKey) => {
    const connNodes = connectionGroups.get(connKey) || [];
    const connNodeIds = new Set(connNodes.map((n) => n.id));

    // Calculate topological rank inside this connection
    const connLayers = new Map<string, number>();

    function computeRank(id: string, visited = new Set<string>()): number {
      if (connLayers.has(id)) return connLayers.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const preds = (incoming.get(id) || []).filter((predId) => connNodeIds.has(predId));
      if (preds.length === 0) {
        connLayers.set(id, 0);
        return 0;
      }

      let maxPred = 0;
      for (const p of preds) {
        const r = computeRank(p, visited);
        if (r + 1 > maxPred) maxPred = r + 1;
      }
      connLayers.set(id, maxPred);
      return maxPred;
    }

    connNodes.forEach((n) => computeRank(n.id));

    // Partition into columns within this connection domain
    const layerBuckets = new Map<number, GraphNode[]>();
    const isolatedNodes: GraphNode[] = [];

    connNodes.forEach((n) => {
      const inCount = (incoming.get(n.id) || []).filter((id) => connNodeIds.has(id)).length;
      const outCount = (outgoing.get(n.id) || []).filter((id) => connNodeIds.has(id)).length;
      if (inCount === 0 && outCount === 0) {
        isolatedNodes.push(n);
      } else {
        const l = connLayers.get(n.id) || 0;
        if (!layerBuckets.has(l)) layerBuckets.set(l, []);
        layerBuckets.get(l)!.push(n);
      }
    });

    const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);
    let domainCols = sortedLayers.length;
    let startCol = 0;

    if (isolatedNodes.length > 0 && domainCols > 0) {
      // Place isolated nodes in their own clean column
      let curY = 60;
      isolatedNodes.forEach((node) => {
        const fieldCount = node.fields?.length || 4;
        const nodeHeight = Math.min(360, 68 + fieldCount * 28);
        const connectedFields = Array.from(connectedFieldsMap[node.id] || []);
        result.push({
          id: node.id,
          type: "tableNode",
          position: {
            x: currentDomainOffsetX,
            y: curY,
          },
          data: {
            ...node,
            connectedFields,
          },
        });
        curY += nodeHeight + 36;
      });
      startCol = 1;
      domainCols += 1;
    } else if (isolatedNodes.length > 0 && domainCols === 0) {
      // All nodes in connection are unlinked (e.g. document collections)
      let curY = 60;
      isolatedNodes.forEach((node) => {
        const fieldCount = node.fields?.length || 4;
        const nodeHeight = Math.min(360, 68 + fieldCount * 28);
        const connectedFields = Array.from(connectedFieldsMap[node.id] || []);
        result.push({
          id: node.id,
          type: "tableNode",
          position: {
            x: currentDomainOffsetX,
            y: curY,
          },
          data: {
            ...node,
            connectedFields,
          },
        });
        curY += nodeHeight + 36;
      });
      domainCols = 1;
    }

    sortedLayers.forEach((layerIdx, colOffset) => {
      const nodesInCol = layerBuckets.get(layerIdx) || [];
      const colX = currentDomainOffsetX + (startCol + colOffset) * 360;
      let curY = 60;

      nodesInCol.forEach((node) => {
        const fieldCount = node.fields?.length || 4;
        const nodeHeight = Math.min(360, 68 + fieldCount * 28);
        const connectedFields = Array.from(connectedFieldsMap[node.id] || []);
        result.push({
          id: node.id,
          type: "tableNode",
          position: {
            x: colX,
            y: curY,
          },
          data: {
            ...node,
            connectedFields,
          },
        });
        curY += nodeHeight + 36;
      });
    });

    // Advance X for next connection domain with comfortable separation
    currentDomainOffsetX += Math.max(1, domainCols) * 360 + 160;
  });

  return result;
}

export function formatCardinality(cardinality?: string): {
  badge: "1:1" | "1:M" | "M:1" | "M:M";
  badgeClass: string;
} {
  const norm = (cardinality || "").toLowerCase();
  if (norm.includes("one_to_one") || norm === "1:1") {
    return {
      badge: "1:1",
      badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    };
  }
  if (norm.includes("one_to_many") || norm === "1:m" || norm === "1:n") {
    return {
      badge: "1:M",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    };
  }
  if (norm.includes("many_to_many") || norm === "m:m" || norm === "m:n") {
    return {
      badge: "M:M",
      badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    };
  }
  return {
    badge: "M:1",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  };
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps<Edge<GraphEdge>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as GraphEdge | undefined;
  const { badge, badgeClass } = formatCardinality(edgeData?.cardinality);
  const isCross = edgeData?.is_cross_database || edgeData?.provenance === "user_defined";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={`nodrag nopan flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono shadow-md border transition-all cursor-pointer select-none ${
            selected
              ? "bg-[#181d24] border-brand text-brand ring-1 ring-brand/40 scale-105"
              : isCross
              ? "bg-[#14181c] border-brand/50 text-slate-200 hover:border-brand"
              : "bg-[#14181c] border-border text-slate-300 hover:border-slate-500"
          }`}
        >
          <span
            className={`px-1 py-0.2 rounded font-bold text-[9px] border tracking-wider ${badgeClass}`}
          >
            {badge}
          </span>
          <span className="font-medium tracking-tight">
            {edgeData?.source_field || "src"} → {edgeData?.target_field || "tgt"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = {
  relationship: RelationshipEdge,
};

export function calculateOptimalEdges(graphEdges: GraphEdge[]): Edge<GraphEdge>[] {
  return graphEdges.map((edge) => {
    const isFk = edge.provenance === "foreign_key";
    const isUser = edge.provenance === "user_defined" || edge.is_cross_database;
    const { badge } = formatCardinality(edge.cardinality);

    // Cross-database edges: vibrant glowing mint (#10a37f) with animated dashes
    // Foreign-key edges: sleek metallic slate (#94a3b8) with solid smooth curve
    const strokeColor = isUser ? "#10a37f" : isFk ? "#94a3b8" : "#f59e0b";

    return {
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      sourceHandle: `${edge.source_field}-source`,
      targetHandle: `${edge.target_field}-target`,
      type: "relationship", // custom relationship edge with prominent cardinality badge
      animated: isUser,
      style: {
        stroke: strokeColor,
        strokeWidth: 2,
        strokeDasharray: isUser ? "5,5" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: strokeColor,
      },
      label: `${badge} • ${edge.source_field} → ${edge.target_field}`,
      labelStyle: {
        fill: "#cbd5e1",
        fontSize: 10,
        fontFamily: "ui-monospace, monospace",
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: "#14181c",
        fillOpacity: 0.95,
        stroke: "#262d36",
        strokeWidth: 1,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      data: edge,
    };
  });
}

function SchemaCanvasInner({
  initialData,
  workspaceId,
  onRefresh,
}: SchemaCanvasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddRelOpen, setIsAddRelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeConnectionFilter, setActiveConnectionFilter] = useState<string | null>(null);

  const availableConnections = useMemo(() => {
    const map = new Map<string, string>();
    initialData.nodes.forEach((n) => {
      const id = n.connection_id;
      const name = n.connection_name || n.connection_id;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [initialData.nodes]);

  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNode>>(
    calculateOptimalLayout(initialData.nodes, initialData.edges)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<GraphEdge>>(
    calculateOptimalEdges(initialData.edges)
  );

  // Sync with prop updates
  useEffect(() => {
    setNodes(calculateOptimalLayout(initialData.nodes, initialData.edges));
    setEdges(calculateOptimalEdges(initialData.edges));
  }, [initialData, setNodes, setEdges]);

  const handleAutoArrange = useCallback(() => {
    const arrangedNodes = calculateOptimalLayout(initialData.nodes, initialData.edges);
    setNodes(arrangedNodes);
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 450 });
    }, 50);
  }, [initialData, setNodes, fitView]);

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

      const matchesConn =
        !activeConnectionFilter || gNode.connection_id === activeConnectionFilter;

      const isVisible = matchesSearch && matchesFilter && matchesConn;

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

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode((node.data as unknown as GraphNode) || null);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge((edge.data as unknown as GraphEdge) || null);
    setSelectedNode(null);
  }, []);

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
    const { badge } = formatCardinality(newEdge.cardinality);

    const rfEdge: Edge<GraphEdge> = {
      id: newEdge.id,
      source: newEdge.source_node_id,
      target: newEdge.target_node_id,
      sourceHandle: `${newEdge.source_field}-source`,
      targetHandle: `${newEdge.target_field}-target`,
      type: "relationship",
      animated: true,
      style: {
        stroke: strokeColor,
        strokeWidth: 2,
        strokeDasharray: "5,5",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: strokeColor,
      },
      label: `${badge} • ${newEdge.source_field} → ${newEdge.target_field}`,
      labelStyle: {
        fill: "#cbd5e1",
        fontSize: 10,
        fontFamily: "ui-monospace, monospace",
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: "#14181c",
        fillOpacity: 0.95,
        stroke: "#262d36",
        strokeWidth: 1,
      },
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
    <div className="flex flex-col h-full bg-background text-foreground relative">
      {/* Canvas Toolbar */}
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Network className="h-4 w-4 text-brand" />
            <span>Interactive Schema Canvas</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] text-zinc-400 border-border bg-secondary"
            >
              {initialData.statistics.total_nodes} Entities
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] text-zinc-300 border-border bg-secondary"
            >
              {initialData.statistics.foreign_keys_count} FKs
            </Badge>
            {initialData.statistics.user_defined_count > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] text-brand border-brand/30 bg-brand-muted"
              >
                {initialData.statistics.user_defined_count} Custom Links
              </Badge>
            )}
          </div>
        </div>

        {/* Toolbar Center: Search & Database Filters */}
        <div className="flex items-center gap-2">
          {availableConnections.length > 1 && (
            <select
              value={activeConnectionFilter || ""}
              onChange={(e) => setActiveConnectionFilter(e.target.value || null)}
              className="h-7 text-xs bg-secondary border border-border rounded-md px-2 text-foreground focus:outline-none max-w-[180px] truncate"
              title="Filter by connected database"
            >
              <option value="">All Databases ({availableConnections.length})</option>
              {availableConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-44">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input
              placeholder="Find entity or field..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-8 text-xs bg-secondary border-border text-foreground placeholder:text-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-secondary border border-border rounded-md p-0.5">
            <button
              onClick={() => setActiveFilter(null)}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === null
                  ? "bg-border text-foreground font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("postgres")}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === "postgres"
                  ? "bg-primary text-primary-foreground font-medium"                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Postgres
            </button>
            <button
              onClick={() => setActiveFilter("mongodb")}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === "mongodb"
                  ? "bg-primary text-primary-foreground font-medium"                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mongo
            </button>
            <button
              onClick={() => setActiveFilter("elasticsearch")}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${
                activeFilter === "elasticsearch"
                  ? "bg-primary text-primary-foreground font-medium"                  : "text-zinc-400 hover:text-zinc-200"
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
            onClick={handleAutoArrange}
            className="h-8 text-xs border-border bg-secondary text-zinc-300 hover:text-foreground hover:bg-accent gap-1.5"            title="Auto-arrange schema with optimal DAG layering"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span>Auto Arrange</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddRelOpen(true)}
            className="h-8 text-xs bg-brand hover:bg-brand text-background font-medium gap-1.5 shadow-sm"          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect Tables</span>
          </Button>
        </div>
      </div>

      {/* React Flow Viewport Area */}
      <div className="flex-1 w-full h-full relative bg-background">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background
            color="#262d36"
            gap={24}
            size={1.2}
            variant={BackgroundVariant.Dots}
          />
          <Controls
            className="!bg-card !border-border !text-foreground !shadow-2xl [&>button]:!border-border [&>button]:!fill-foreground [&>button:hover]:!bg-[#1f252d]"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-card !border-border !rounded-lg !overflow-hidden"
            nodeColor={(node) => {
              const dType = (node.data as unknown as GraphNode)?.database_type;
              if (dType === "postgres") return "#10a37f";
              if (dType === "mongodb") return "#14b8a6";
              if (dType === "elasticsearch") return "#f59e0b";
              return "#52525b";
            }}
            maskColor="rgba(13, 16, 19, 0.75)"
          />
        </ReactFlow>

        {/* Inspector Side Drawer */}
        {(selectedNode || selectedEdge) && (
          <div className="absolute top-4 right-4 w-96 max-h-[calc(100%-32px)] bg-card border border-border rounded-xl shadow-2xl p-4 flex flex-col z-20 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 truncate">
                {selectedNode && (
                  <>
                    <Database className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {selectedNode.name}
                    </span>
                  </>
                )}
                {selectedEdge && (
                  <>
                    <LinkIcon className="h-4 w-4 text-brand" />
                    <span className="text-xs font-semibold text-foreground truncate">
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
                  <Badge variant="outline" className="text-[10px] border-border text-zinc-300">
                    {selectedNode.connection_name} ({selectedNode.database_type})
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Estimated Rows</span>
                  <span className="font-mono text-foreground font-medium">
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
                        className="p-2 rounded bg-secondary border border-border flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {f.is_primary_key && (
                            <Key className="h-3 w-3 shrink-0 text-amber-400" />
                          )}
                          {f.is_foreign_key && !f.is_primary_key && (
                            <LinkIcon className="h-3 w-3 shrink-0 text-brand" />
                          )}
                          <span className="font-mono text-[11px] text-foreground truncate">
                            {f.name}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-brand">
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
                  <div className="font-mono p-2 rounded bg-secondary border border-border text-brand">
                    {selectedEdge.source_node_id} . {selectedEdge.source_field}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[11px] mb-1">Target Table & Field</span>
                  <div className="font-mono p-2 rounded bg-secondary border border-border text-teal-300">
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
                        ? "text-brand border-brand/30"
                        : "text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {selectedEdge.provenance.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Cardinality</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold font-mono text-[9px] border tracking-wider ${
                        formatCardinality(selectedEdge.cardinality).badgeClass
                      }`}
                    >
                      {formatCardinality(selectedEdge.cardinality).badge}
                    </span>
                    <span className="font-mono text-zinc-200 text-xs">
                      {selectedEdge.cardinality || "many_to_one"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Cross-Database</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedEdge.is_cross_database
                        ? "text-brand border-brand/40 bg-brand-muted"
                        : "text-zinc-400 border-border"
                    }`}
                  >
                    {selectedEdge.is_cross_database ? "Yes (Heterogeneous)" : "No (Intra-database)"}
                  </Badge>
                </div>

                {selectedEdge.provenance === "user_defined" && (
                  <div className="pt-2 border-t border-border">
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

export function SchemaCanvas(props: SchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <SchemaCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

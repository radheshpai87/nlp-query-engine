"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createUserDefinedRelationship,
  GraphNode,
  UserDefinedRelationship,
} from "@/lib/schema-api";
import { Link, AlertCircle } from "lucide-react";

interface AddRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  nodes: GraphNode[];
  onRelationshipCreated: (rel: UserDefinedRelationship) => void;
}

export function AddRelationshipDialog({
  open,
  onOpenChange,
  workspaceId,
  nodes,
  onRelationshipCreated,
}: AddRelationshipDialogProps) {
  const [sourceNodeId, setSourceNodeId] = useState(nodes[0]?.id || "");
  const [sourceField, setSourceField] = useState("");
  const [targetNodeId, setTargetNodeId] = useState(nodes[1]?.id || nodes[0]?.id || "");
  const [targetField, setTargetField] = useState("");
  const [cardinality, setCardinality] = useState("many_to_one");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceNode || !targetNode) {
      setError("Please select valid source and target tables.");
      return;
    }
    if (!sourceField || !targetField) {
      setError("Please specify both source and target columns.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const rel = await createUserDefinedRelationship(workspaceId, {
        name: `${sourceNode.name}.${sourceField} → ${targetNode.name}.${targetField}`,
        source_connection_id: sourceNode.connection_id,
        source_table: sourceNode.name,
        source_fields: [sourceField],
        target_connection_id: targetNode.connection_id,
        target_table: targetNode.name,
        target_fields: [targetField],
        cardinality,
        description: description || undefined,
      });

      onRelationshipCreated(rel);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create relationship"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCrossDatabase =
    sourceNode && targetNode && sourceNode.connection_id !== targetNode.connection_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
              <Link className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                Define Relationship
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Link two tables or collections across databases for cross-source queries.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Source Selection */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                Source Entity
              </span>
              {sourceNode && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  [{sourceNode.database_type}] {sourceNode.connection_name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">Table / Collection</label>
                <select
                  value={sourceNodeId}
                  onChange={(e) => {
                    setSourceNodeId(e.target.value);
                    setSourceField("");
                  }}
                  className="w-full text-xs h-8 rounded-md bg-card border border-border text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.connection_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">Column / Field</label>
                <select
                  value={sourceField}
                  onChange={(e) => setSourceField(e.target.value)}
                  className="w-full text-xs h-8 rounded-md bg-card border border-border text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Select field...</option>
                  {sourceNode?.fields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.data_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Target Selection */}
          <div className="p-3 rounded-lg border border-border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                Target Entity
              </span>
              {targetNode && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  [{targetNode.database_type}] {targetNode.connection_name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">Table / Collection</label>
                <select
                  value={targetNodeId}
                  onChange={(e) => {
                    setTargetNodeId(e.target.value);
                    setTargetField("");
                  }}
                  className="w-full text-xs h-8 rounded-md bg-card border border-border text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.connection_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">Column / Field</label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full text-xs h-8 rounded-md bg-card border border-border text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Select field...</option>
                  {targetNode?.fields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.data_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cross Database Badge */}
          {isCrossDatabase && (
            <div className="p-2 rounded bg-brand-muted border border-brand/30 text-[11px] text-brand flex items-center justify-between">
              <span>Cross-Database Relationship Detected</span>
              <span className="text-[9px] font-mono uppercase bg-brand/15 px-1.5 py-0.5 rounded text-brand">
                Heterogeneous Join
              </span>
            </div>
          )}

          {/* Cardinality & Notes */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Cardinality</label>
              <select
                value={cardinality}
                onChange={(e) => setCardinality(e.target.value)}
                className="w-full text-xs h-8 rounded-md bg-card border border-border text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="many_to_one">Many-to-One (N:1)</option>
                <option value="one_to_one">One-to-One (1:1)</option>
                <option value="one_to_many">One-to-Many (1:N)</option>
                <option value="many_to_many">Many-to-Many (M:N)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block">Description (Optional)</label>
              <Input
                placeholder="e.g. Orders placed by customer"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs bg-card border-border text-foreground placeholder:text-zinc-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !sourceField || !targetField}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"            >
              {isSubmitting ? "Linking..." : "Create Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

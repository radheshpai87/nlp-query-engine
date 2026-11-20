"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Database, Layers, Search, Key, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GraphNode } from "@/lib/schema-api";

export type TableNodeProps = NodeProps & {
  data: GraphNode & {
    selectedField?: string;
    connectedFields?: string[];
  };
};

function TableNodeComponent({ data, selected }: TableNodeProps) {
  const isPostgres = data.database_type === "postgres";
  const isMongo = data.database_type === "mongodb";

  const dbBadgeColor = isPostgres
    ? "text-brand bg-brand-muted border-brand/30"
    : isMongo
    ? "text-teal-400 bg-teal-500/10 border-teal-500/30"
    : "text-amber-400 bg-amber-500/10 border-amber-500/30";

  const DbIcon = isPostgres ? Database : isMongo ? Layers : Search;

  const connectedFieldsSet = new Set(data.connectedFields || []);

  return (
    <div
      className={`w-[290px] min-w-[290px] max-w-[290px] rounded-xl border bg-card shadow-2xl transition-all duration-200 select-none ${
        selected
          ? "border-brand ring-2 ring-brand/40 shadow-[0_0_24px_rgba(16,163,127,0.2)]"
          : "border-border hover:border-input"
      }`}
    >
      {/* Node-level target handle fallback */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !-left-[5px] !bg-brand !border-2 !border-card !opacity-0"
      />

      {/* Header */}
      <div className="p-3 border-b border-border bg-muted rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 truncate">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${dbBadgeColor}`}
            >
              <DbIcon className="h-3.5 w-3.5" />
            </div>
            <span className="font-mono text-xs font-bold text-foreground truncate">
              {data.name}
            </span>
          </div>

          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 uppercase font-mono font-bold tracking-wider shrink-0 ${dbBadgeColor}`}
          >
            {data.database_type}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
          <span className="truncate max-w-[150px]">{data.connection_name}</span>
          <span className="font-mono">
            {data.row_count_estimate !== null && data.row_count_estimate !== undefined
              ? `${data.row_count_estimate.toLocaleString()} rows`
              : `${data.fields.length} cols`}
          </span>
        </div>
      </div>

      {/* Fields List */}
      <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
        {data.fields.map((field) => {
          const isSelectedField = data.selectedField === field.name;
          const isConnected =
            connectedFieldsSet.has(field.name) ||
            field.is_primary_key ||
            field.is_foreign_key;

          return (
            <div
              key={field.name}
              className={`relative flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors group ${
                isSelectedField
                  ? "bg-brand/15 text-brand font-medium"
                  : "hover:bg-secondary text-foreground/80"
              }`}
            >
              {/* Individual Left Target Handle */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.name}-target`}
                className={`!w-2.5 !h-2.5 !-left-[5px] !rounded-full !border-2 !border-card transition-all ${
                  isConnected
                    ? "!bg-brand !shadow-[0_0_8px_rgba(16,163,127,0.7)] opacity-100"
                    : "!bg-muted-foreground opacity-0 group-hover:opacity-100"
                }`}
              />

              <div className="flex items-center gap-1.5 truncate pr-2">
                {field.is_primary_key && (
                  <Key className="h-3 w-3 shrink-0 text-amber-400" />
                )}
                {field.is_foreign_key && !field.is_primary_key && (
                  <LinkIcon className="h-3 w-3 shrink-0 text-brand" />
                )}
                <span className="font-mono text-[11px] truncate text-foreground">{field.name}</span>
              </div>

              <span className="font-mono text-[10px] text-muted-foreground shrink-0 ml-auto">
                {field.data_type}
              </span>

              {/* Individual Right Source Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className={`!w-2.5 !h-2.5 !-right-[5px] !rounded-full !border-2 !border-card transition-all ${
                  isConnected
                    ? "!bg-brand !shadow-[0_0_8px_rgba(16,163,127,0.7)] opacity-100"
                    : "!bg-muted-foreground opacity-0 group-hover:opacity-100"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Node-level source handle fallback */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !-right-[5px] !bg-brand !border-2 !border-card !opacity-0"
      />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);

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
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : isMongo
    ? "text-teal-400 bg-teal-500/10 border-teal-500/30"
    : "text-amber-400 bg-amber-500/10 border-amber-500/30";

  const DbIcon = isPostgres ? Database : isMongo ? Layers : Search;

  const connectedFieldsSet = new Set(data.connectedFields || []);

  return (
    <div
      className={`w-[290px] min-w-[290px] max-w-[290px] rounded-xl border bg-[#14181c] shadow-2xl transition-all duration-200 select-none ${
        selected
          ? "border-[#10a37f] ring-2 ring-[#10a37f]/40 shadow-[0_0_24px_rgba(16,163,127,0.2)]"
          : "border-[#262d36] hover:border-[#38424d]"
      }`}
    >
      {/* Node-level target handle fallback */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !-left-[5px] !bg-[#10a37f] !border-2 !border-[#14181c] !opacity-0"
      />

      {/* Header */}
      <div className="p-3 border-b border-[#262d36] bg-[#161a20] rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 truncate">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${dbBadgeColor}`}
            >
              <DbIcon className="h-3.5 w-3.5" />
            </div>
            <span className="font-mono text-xs font-bold text-[#f4f4f5] truncate">
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

        <div className="flex items-center justify-between text-[10px] text-[#71717a] px-0.5">
          <span className="truncate max-w-[150px]">{data.connection_name}</span>
          <span className="font-mono">
            {data.row_count_estimate !== null && data.row_count_estimate !== undefined
              ? `${data.row_count_estimate.toLocaleString()} rows`
              : `${data.fields.length} cols`}
          </span>
        </div>
      </div>

      {/* Fields List */}
      <div className="divide-y divide-[#1e242c] max-h-[380px] overflow-y-auto">
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
                  ? "bg-[#10a37f]/15 text-emerald-300 font-medium"
                  : "hover:bg-[#191e24] text-[#d4d4d8]"
              }`}
            >
              {/* Individual Left Target Handle */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.name}-target`}
                className={`!w-2.5 !h-2.5 !-left-[5px] !rounded-full !border-2 !border-[#14181c] transition-all ${
                  isConnected
                    ? "!bg-[#10a37f] !shadow-[0_0_8px_rgba(16,163,127,0.7)] opacity-100"
                    : "!bg-[#52525b] opacity-0 group-hover:opacity-100"
                }`}
              />

              <div className="flex items-center gap-1.5 truncate pr-2">
                {field.is_primary_key && (
                  <Key className="h-3 w-3 shrink-0 text-amber-400" />
                )}
                {field.is_foreign_key && !field.is_primary_key && (
                  <LinkIcon className="h-3 w-3 shrink-0 text-emerald-400" />
                )}
                <span className="font-mono text-[11px] truncate text-[#f4f4f5]">{field.name}</span>
              </div>

              <span className="font-mono text-[10px] text-[#71717a] shrink-0 ml-auto">
                {field.data_type}
              </span>

              {/* Individual Right Source Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className={`!w-2.5 !h-2.5 !-right-[5px] !rounded-full !border-2 !border-[#14181c] transition-all ${
                  isConnected
                    ? "!bg-[#10a37f] !shadow-[0_0_8px_rgba(16,163,127,0.7)] opacity-100"
                    : "!bg-[#52525b] opacity-0 group-hover:opacity-100"
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
        className="!w-2.5 !h-2.5 !-right-[5px] !bg-[#10a37f] !border-2 !border-[#14181c] !opacity-0"
      />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);

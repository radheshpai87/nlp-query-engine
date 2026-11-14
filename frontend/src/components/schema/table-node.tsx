"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Database, Layers, Search, Key, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GraphNode } from "@/lib/schema-api";

export type TableNodeProps = NodeProps & {
  data: GraphNode & {
    selectedField?: string;
  };
};

function TableNodeComponent({ data, selected }: TableNodeProps) {
  const isPostgres = data.database_type === "postgres";
  const isMongo = data.database_type === "mongodb";

  const dbColor = isPostgres
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : isMongo
    ? "text-teal-400 bg-teal-500/10 border-teal-500/30"
    : "text-amber-400 bg-amber-500/10 border-amber-500/30";

  const DbIcon = isPostgres ? Database : isMongo ? Layers : Search;

  return (
    <div
      className={`min-w-[280px] max-w-[340px] rounded-xl border bg-[#181818] shadow-xl transition-all duration-200 ${
        selected
          ? "border-[#10a37f] ring-2 ring-[#10a37f]/30 shadow-[#10a37f]/10"
          : "border-[#303030] hover:border-[#424242]"
      }`}
    >
      {/* Target handle for incoming relationships */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#10a37f] !border-2 !border-[#181818]"
      />

      {/* Header */}
      <div className="p-3.5 border-b border-[#2d2d2d] bg-[#1d1d1d] rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 truncate">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${dbColor}`}
            >
              <DbIcon className="h-3.5 w-3.5" />
            </div>
            <span className="font-mono text-xs font-bold text-[#ececec] truncate">
              {data.name}
            </span>
          </div>

          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 uppercase tracking-wider shrink-0 ${dbColor}`}
          >
            {data.database_type}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#8e8e8e] px-0.5">
          <span className="truncate max-w-[150px]">{data.connection_name}</span>
          <span>
            {data.row_count_estimate !== null && data.row_count_estimate !== undefined
              ? `${data.row_count_estimate.toLocaleString()} rows`
              : `${data.fields.length} cols`}
          </span>
        </div>
      </div>

      {/* Fields List */}
      <div className="divide-y divide-[#2a2a2a] max-h-[300px] overflow-y-auto">
        {data.fields.map((field) => {
          const isSelectedField = data.selectedField === field.name;

          return (
            <div
              key={field.name}
              className={`relative flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                isSelectedField
                  ? "bg-[#10a37f]/15 text-emerald-300 font-medium"
                  : "hover:bg-[#242424] text-[#b4b4b4]"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate pr-2">
                {field.is_primary_key && (
                  <Key className="h-3 w-3 shrink-0 text-amber-400" />
                )}
                {field.is_foreign_key && !field.is_primary_key && (
                  <LinkIcon className="h-3 w-3 shrink-0 text-emerald-400" />
                )}
                <span className="font-mono text-[11px] truncate text-[#ececec]">{field.name}</span>
              </div>

              <span className="font-mono text-[10px] text-[#737373] shrink-0">
                {field.data_type}
              </span>

              {/* Individual field handles for precise connection */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.name}-target`}
                className="!w-2 !h-2 !-left-1 !bg-[#10a37f] !border !border-[#181818] opacity-0 group-hover:opacity-100"
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                className="!w-2 !h-2 !-right-1 !bg-[#10a37f] !border !border-[#181818] opacity-0 group-hover:opacity-100"
              />
            </div>
          );
        })}
      </div>

      {/* Source handle for outgoing relationships */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#10a37f] !border-2 !border-[#181818]"
      />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);

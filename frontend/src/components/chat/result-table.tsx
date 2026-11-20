"use client";

import { useState, useMemo } from "react";
import { Download, ArrowUpDown, ArrowUp, ArrowDown, Search, Database, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExecutionResult } from "@/lib/execution-api";

interface ResultTableProps {
  result: ExecutionResult;
}

export function ResultTable({ result }: ResultTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(colName);
      setSortDir("asc");
    }
  };

  const filteredRows = useMemo(() => {
    let rows = [...result.rows];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA);
        const strB = String(valB);
        return sortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return rows;
  }, [result.rows, searchQuery, sortCol, sortDir]);

  const exportCSV = () => {
    if (!result.rows.length) return;
    const headers = result.columns.map((c) => `"${c.name}"`).join(",");
    const csvRows = filteredRows.map((r) =>
      result.columns
        .map((c) => {
          const val = r[c.name];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const blob = new Blob([`${headers}\n${csvRows.join("\n")}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_result_${result.execution_id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredRows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_result_${result.execution_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm space-y-3 p-4">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Badge variant="success" className="gap-1 text-[11px] py-0.5">
            <ShieldCheck className="h-3 w-3" />
            <span>Success</span>
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Clock className="h-3.5 w-3.5 text-sky-400" />
            <span>{result.duration_ms}ms</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Database className="h-3.5 w-3.5 text-purple-400" />
            <span>{result.row_count} rows</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Filter results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs w-40 sm:w-48 bg-background"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            className="h-8 text-xs gap-1"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportJSON}
            className="h-8 text-xs gap-1"
          >
            <Download className="h-3 w-3" />
            <span>JSON</span>
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-border overflow-x-auto max-h-96">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-muted/50 text-muted-foreground font-medium sticky top-0 border-b border-border">
            <tr>
              {result.columns.map((col) => {
                const isSorted = sortCol === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-foreground select-none transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">{col.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60 font-normal">
                        {col.data_type}
                      </span>
                      {isSorted ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-sky-400" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-sky-400" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30 hover:opacity-100" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length || 1}
                  className="py-8 text-center text-muted-foreground"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {result.columns.map((col) => {
                    const val = row[col.name];
                    const displayVal =
                      val === null || val === undefined
                        ? "NULL"
                        : typeof val === "object"
                        ? JSON.stringify(val)
                        : String(val);

                    return (
                      <td
                        key={col.name}
                        className={`py-2 px-3 whitespace-nowrap ${
                          val === null || val === undefined
                            ? "text-muted-foreground/50 italic font-sans"
                            : "text-foreground"
                        }`}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result.is_truncated && (
        <p className="text-[11px] text-amber-400 font-medium text-center">
          Displaying first {result.row_count} records (result limit reached).
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Lock,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShellStore } from "@/lib/store";
import {
  AuditEvent,
  AuditIntegrityResponse,
  exportAuditTrail,
  getAuditTrail,
  verifyAuditIntegrity,
} from "@/lib/audit-api";

export default function AuditPage() {
  const currentWorkspace = useShellStore((state) => state.currentWorkspace);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<AuditIntegrityResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [, startExportTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    if (!currentWorkspace?.id) return;

    const skip = (page - 1) * limit;
    getAuditTrail(currentWorkspace.id, {
      search: search.trim() || undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      limit,
      skip,
    })
      .then((res) => {
        if (isMounted) {
          setEvents(res.items);
          setTotal(res.total);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load audit logs.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.id, page, statusFilter, search]);

  const handleRefresh = async () => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * limit;
      const res = await getAuditTrail(currentWorkspace.id, {
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        limit,
        skip,
      });
      setEvents(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    handleRefresh();
  };

  const handleVerifyIntegrity = async () => {
    if (!currentWorkspace?.id || isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await verifyAuditIntegrity(currentWorkspace.id);
      setIntegrity(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Integrity check failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = (format: "json" | "csv") => {
    if (!currentWorkspace?.id) return;
    startExportTransition(async () => {
      try {
        const blob = await exportAuditTrail(currentWorkspace.id, format);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_trail_${currentWorkspace.id}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Export failed.");
      }
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "SUCCESS" || s === "ALLOWED") {
      return (
        <Badge variant="success" className="text-[10px] font-mono">
          SUCCESS
        </Badge>
      );
    }
    if (s === "DENIED" || s === "BLOCKED") {
      return (
        <Badge variant="destructive" className="text-[10px] font-mono">
          DENIED
        </Badge>
      );
    }
    return (
      <Badge variant="warning" className="text-[10px] font-mono">
        {s}
      </Badge>
    );
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Security & Audit Trail
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable, cryptographically verifiable governance log tracking credentials access,
            schema changes, and query executions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="gap-2 text-xs"
          >
            <Lock className="h-3.5 w-3.5 text-sky-500" />
            <span>{isVerifying ? "Verifying Chain..." : "Verify Integrity"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("csv")}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("json")}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>JSON</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8 text-slate-400 hover:text-slate-200"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Integrity Verification Result Banner */}
      {integrity && (
        <div
          data-testid="integrity-banner"
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            integrity.is_valid
              ? "bg-emerald-950/20 border-emerald-800 text-emerald-300"
              : "bg-rose-950/20 border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {integrity.is_valid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                {integrity.is_valid
                  ? "Cryptographic Hash Chain Verified:"
                  : "Audit Tamper Alert Detected:"}
              </span>{" "}
              {integrity.message} ({integrity.total_events_checked} events audited)
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIntegrity(null)}
            className="h-6 px-2 text-[10px]"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, resource ID, or actor user ID..."
            className="pl-9 h-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs rounded-md border border-border bg-background text-foreground"
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-md">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Seq</TableHead>
              <TableHead className="w-40">Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28">Event Hash</TableHead>
              <TableHead className="w-16 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-500" />
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                  <Layers className="h-6 w-6 mx-auto mb-2 text-slate-600 opacity-50" />
                  No audit events found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              events.map((evt) => {
                const isExpanded = expandedId === evt.id;
                const dateStr = new Date(evt.created_at).toLocaleString();
                const hashPrefix = evt.event_hash ? evt.event_hash.slice(0, 8) : "-";

                return (
                  <div key={evt.id} className="contents">
                    <TableRow className="hover:bg-slate-800/40 transition-colors">
                      <TableCell className="font-mono text-xs text-slate-400">
                        #{evt.sequence}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {dateStr}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {evt.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300 max-w-[140px] truncate">
                        {evt.user_id || (
                          <span className="italic text-muted-foreground">system</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[180px] truncate">
                        {evt.resource_type}
                        {evt.resource_id ? `/${evt.resource_id}` : ""}
                      </TableCell>
                      <TableCell>{getStatusBadge(evt.status)}</TableCell>
                      <TableCell>
                        <span
                          className="font-mono text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded cursor-help"
                          title={`SHA-256: ${evt.event_hash || "N/A"}`}
                        >
                          {hashPrefix}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                          className="h-7 w-7 text-slate-400 hover:text-slate-200"
                          title="View sanitized event details"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable JSON Details Row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-950/60 border-t border-slate-800">
                        <TableCell colSpan={8} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-semibold flex items-center gap-1.5">
                                <FileCode2 className="h-3.5 w-3.5 text-sky-400" />
                                Event Details Payload & Cryptographic Proof
                              </span>
                              <span>ID: {evt.id}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pb-2">
                              <div>
                                <span className="text-slate-500">Previous Hash:</span>{" "}
                                <span className="text-slate-300">
                                  {evt.previous_hash || "GENESIS"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Event Hash:</span>{" "}
                                <span className="text-emerald-400">{evt.event_hash}</span>
                              </div>
                            </div>

                            <pre className="p-3 rounded-md bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60 leading-relaxed">
                              {JSON.stringify(evt.details, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </div>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-slate-950/40 text-xs text-muted-foreground">
          <div>
            Showing {(page - 1) * limit + (events.length > 0 ? 1 : 0)} to{" "}
            {Math.min(page * limit, total)} of {total} events
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>

            <span className="text-slate-400">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="h-8 gap-1 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

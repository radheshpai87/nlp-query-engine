"use client";

import { useState } from "react";
import { Database, ShieldCheck, Copy, Check, Layers, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CompilationResult,
  CompiledSQLQuery,
  CompiledMongoQuery,
  CompiledElasticsearchQuery,
} from "@/lib/query-plan-api";

interface QueryDialectPreviewProps {
  result: CompilationResult;
}

export function QueryDialectPreview({ result }: QueryDialectPreviewProps) {
  const [activeTab, setActiveTab] = useState<string>("primary");
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSingleQuery = (
    query: CompiledSQLQuery | CompiledMongoQuery | CompiledElasticsearchQuery
  ) => {
    if (query.dialect === "postgres") {
      const sqlQuery = query as CompiledSQLQuery;
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-sky-500/40 text-sky-400 font-mono text-[11px]">
                PostgreSQL SQL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Target: {sqlQuery.target_table}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(sqlQuery.sql)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"            >
              {copied ? <Check className="h-3 w-3 text-brand" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy SQL"}</span>
            </Button>
          </div>

          <pre className="p-3 rounded-lg bg-slate-950 text-sky-200 text-xs font-mono overflow-x-auto border border-border leading-relaxed">
            {sqlQuery.sql}
          </pre>

          {Object.keys(sqlQuery.parameters).length > 0 && (
            <div className="p-2.5 rounded-lg bg-background/50 border border-border/80 text-xs space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Parameters:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 font-mono text-[11px] text-foreground/80">
                {Object.entries(sqlQuery.parameters).map(([key, val]) => (
                  <div key={key} className="bg-background px-2 py-1 rounded border border-border">
                    <span className="text-sky-400">:{key}</span> = {JSON.stringify(val)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (query.dialect === "mongodb") {
      const mongoQuery = query as CompiledMongoQuery;
      const jsonStr = JSON.stringify(mongoQuery.pipeline, null, 2);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-brand/40 text-brand font-mono text-[11px]">
                MongoDB MQL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Collection: {mongoQuery.collection}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(jsonStr)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"            >
              {copied ? <Check className="h-3 w-3 text-brand" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy Pipeline"}</span>
            </Button>
          </div>

          <pre className="p-3 rounded-lg bg-slate-950 text-brand text-xs font-mono overflow-x-auto border border-border leading-relaxed">
            {jsonStr}
          </pre>
        </div>
      );
    }

    if (query.dialect === "elasticsearch") {
      const esQuery = query as CompiledElasticsearchQuery;
      const jsonStr = JSON.stringify(esQuery.query_body, null, 2);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-mono text-[11px]">
                Elasticsearch Query DSL
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Index: {esQuery.index}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(jsonStr)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"            >
              {copied ? <Check className="h-3 w-3 text-brand" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy Query"}</span>
            </Button>
          </div>

          <pre className="p-3 rounded-lg bg-slate-950 text-amber-200 text-xs font-mono overflow-x-auto border border-border leading-relaxed">
            {jsonStr}
          </pre>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Code className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Generated Native Query</h3>
            <p className="text-[11px] text-muted-foreground">{result.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1 text-[10px] py-0.5">
            <ShieldCheck className="h-3 w-3" />
            <span>Read-Only Assured</span>
          </Badge>
          {result.is_cross_database && (
            <Badge variant="outline" className="gap-1 text-[10px] text-purple-400 border-purple-500/30">
              <Layers className="h-3 w-3" />
              <span>Federated Plan</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Single Query Mode */}
      {!result.is_cross_database && result.single_query && (
        <div>{renderSingleQuery(result.single_query)}</div>
      )}

      {/* Cross-Database Mode */}
      {result.is_cross_database && result.cross_database_plan && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-950/10 text-xs space-y-2">
            <span className="font-semibold text-purple-300">In-Memory Hash Join Strategy</span>
            <div className="space-y-1">
              {result.cross_database_plan.join_steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 font-mono text-[11px] text-foreground/80 bg-background/60 p-2 rounded border border-border"
                >
                  <Database className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>{step.left_source_id}.{step.left_key}</span>
                  <span className="text-purple-400 font-bold">⟕</span>
                  <span>{step.right_source_id}.{step.right_key}</span>
                  <Badge variant="outline" className="text-[9px] uppercase ml-auto text-purple-300">
                    {step.strategy}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-queries Tabs */}
          <div className="space-y-3">
            <div className="flex border-b border-border gap-2">
              {result.cross_database_plan.sub_queries.map((sub, idx) => {
                const isSelected = activeTab === `sub_${idx}` || (activeTab === "primary" && idx === 0);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTab(`sub_${idx}`)}
                    className={`pb-2 px-2 text-xs font-medium border-b-2 transition-all ${
                      isSelected
                        ? "border-sky-500 text-sky-400 font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sub-Query {idx + 1} ({sub.dialect.toUpperCase()})
                  </button>
                );
              })}
            </div>

            <div>
              {result.cross_database_plan.sub_queries.map((sub, idx) => {
                const isSelected = activeTab === `sub_${idx}` || (activeTab === "primary" && idx === 0);
                if (!isSelected) return null;
                return <div key={idx}>{renderSingleQuery(sub)}</div>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

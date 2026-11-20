"use client";

import * as React from "react";
import { useState } from "react";
import {
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  Play,
  Code2,
  Table as TableIcon,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Menu,
  Terminal,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useShellStore } from "@/lib/store";
import {
  evaluateQueryAmbiguity,
  resolveQueryClarification,
  PendingClarification,
  AmbiguityEvaluationResult,
} from "@/lib/ambiguity-api";
import {
  compileLogicalPlan,
  synthesizeLogicalPlan,
  CompilationResult,
} from "@/lib/query-plan-api";
import { executeQueryPlan, ExecutionResult } from "@/lib/execution-api";
import { authFetch } from "@/lib/auth-api";
import { ClarificationPrompt } from "@/components/chat/clarification-prompt";
import { ResultTable } from "@/components/chat/result-table";
import { ResultChart } from "@/components/chat/result-chart";
import { ProvenanceInspector } from "@/components/chat/provenance-inspector";
import { QueryDialectPreview } from "@/components/chat/query-dialect-preview";
import { MarkdownContent } from "@/components/chat/markdown-content";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  userQuery?: string;
  status?: "evaluating" | "clarifying" | "ready" | "executing" | "executed" | "error" | "conversational" | "guardrail";
  clarifications?: PendingClarification[];
  resolvedContext?: Record<string, unknown>;
  intent?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  compilation?: CompilationResult;
  executionResult?: ExecutionResult;
  timestamp: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const SAMPLE_QUERIES = [
  "Show me top 5 products by revenue this month",
  "High-value customers who purchased electronics recently",
  "Which customers have placed orders but have not paid?",
  "What is the average transaction value for customers from Bengaluru?",
];

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}_${messageCounter}`;
}

export default function ChatPage() {
  const { currentWorkspace, setMobileSidebarOpen, mobileSidebarOpen } = useShellStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [activeExecutingId, setActiveExecutingId] = useState<string | null>(null);
  const [activeCompilingId, setActiveCompilingId] = useState<string | null>(null);
  const [messageViewModes, setMessageViewModes] = useState<Record<string, "table" | "chart">>({});
  const [sourceCount, setSourceCount] = useState<number | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let ignore = false;
    authFetch(`${API_BASE}/workspaces/${currentWorkspace.id}/connections`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setSourceCount(data.length);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [currentWorkspace.id]);

  React.useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const toggleMessageView = (messageId: string, mode: "table" | "chart") => {
    setMessageViewModes((prev) => ({ ...prev, [messageId]: mode }));
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText ?? inputValue).trim();
    if (!text || isSubmitting) return;

    setInputValue("");
    const userMsgId = createMessageId("user");
    const assistantMsgId = createMessageId("assistant");

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: "Just now",
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "Inspecting schemas & evaluating ambiguity...",
      status: "evaluating",
      timestamp: "Just now",
      userQuery: text,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setIsSubmitting(true);

    try {
      const result: AmbiguityEvaluationResult = await evaluateQueryAmbiguity(
        currentWorkspace.id,
        text
      );

      // Handle Conversational / System Queries and Guard Rails directly
      if (
        result.conversational_response ||
        result.is_metadata_query ||
        result.is_guardrail_blocked ||
        result.suggested_action === "conversational_response" ||
        result.suggested_action === "guardrail_blocked"
      ) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  status: result.is_guardrail_blocked ? "guardrail" : "conversational",
                  content:
                    result.conversational_response ||
                    "I am your dedicated query assistant for the connected databases (PostgreSQL, MongoDB, Elasticsearch).",
                  clarifications: [],
                  plan: undefined,
                }
              : msg
          )
        );
        return;
      }

      let plan: Record<string, unknown> | undefined;
      let planError: string | null = null;
      try {
        plan = await synthesizeLogicalPlan(
          currentWorkspace.id,
          text,
          result.inferred_intent
        );
      } catch (err) {
        planError = err instanceof Error ? err.message : "Failed to synthesize query plan.";
        console.warn("Synthesize plan fallback", err);
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== assistantMsgId) return msg;

          if (result.is_ambiguous && result.clarifications.length > 0) {
            return {
              ...msg,
              status: "clarifying",
              content:
                "I detected ambiguities in your query. Please clarify the following parameters before proceeding:",
              clarifications: result.clarifications,
              resolvedContext: {},
              intent: result.inferred_intent,
              plan,
            };
          }

          if (!plan) {
            return {
              ...msg,
              status: "error",
              content:
                planError ||
                `Could not generate a logical query plan for '${text}'. Please check the available database entities.`,
              clarifications: [],
              intent: result.inferred_intent,
              plan: undefined,
            };
          }

          return {
            ...msg,
            status: "ready",
            content:
              "I've matched this request to the connected schemas. Review the plan, then run it when you're ready.",
            clarifications: [],
            intent: result.inferred_intent,
            plan,
          };
        })
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                status: "error",
                content: `Evaluation failed: ${errorMessage}`,
              }
            : msg
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deep link support: /chat?q=... submits the question once on mount. The
  // submission is deferred so it does not run as a synchronous effect update.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const queryParam = new URLSearchParams(window.location.search).get("q");
    if (!queryParam) return;
    const timer = setTimeout(() => handleSend(queryParam), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolveClarification = async (
    messageId: string,
    clarificationId: string,
    selectedValue?: unknown,
    customInput?: string
  ) => {
    setResolvingId(clarificationId);
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.clarifications) {
      setResolvingId(null);
      return;
    }

    try {
      const response = await resolveQueryClarification(
        currentWorkspace.id,
        {
          clarification_id: clarificationId,
          selected_value: selectedValue,
          custom_input: customInput,
        },
        targetMsg.clarifications
      );

      const updatedResolvedContext = {
        ...(targetMsg.resolvedContext || {}),
        [response.parameter_name]: response.resolved_value,
      };

      let updatedPlan = targetMsg.plan;
      try {
        const queryText =
          targetMsg.userQuery ||
          (targetMsg.plan?.query_text as string) ||
          "Query";
        updatedPlan = await synthesizeLogicalPlan(
          currentWorkspace.id,
          queryText,
          updatedResolvedContext
        );
      } catch (err) {
        console.warn("Failed to update synthesized plan", err);
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const updatedClarifications = (msg.clarifications || []).map((c) => {
            if (c.id === clarificationId) {
              const matchingOpt = c.options?.find((o) => o.value === response.resolved_value);
              const label =
                customInput ||
                matchingOpt?.label ||
                (response.resolved_value != null ? String(response.resolved_value) : "Confirmed");
              return {
                ...c,
                resolved: true,
                selected_value: response.resolved_value,
                user_response: label,
              };
            }
            return c;
          });

          const allResolved = updatedClarifications.every((c) => c.resolved);

          return {
            ...msg,
            clarifications: updatedClarifications,
            resolvedContext: updatedResolvedContext,
            plan: updatedPlan,
            status: allResolved ? "ready" : "clarifying",
            content: allResolved
              ? "All parameters clarified. Ready to construct the logical query plan across your data sources."
              : msg.content,
          };
        })
      );
    } catch (err) {
      console.error("Failed to resolve clarification", err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleCompilePlan = async (message: ChatMessage) => {
    // If dialect preview is already open, clicking toggles it closed
    if (message.compilation) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, compilation: undefined } : msg
        )
      );
      return;
    }

    setActiveCompilingId(message.id);
    try {
      let currentPlan = message.plan;
      if (!currentPlan && message.userQuery) {
        currentPlan = await synthesizeLogicalPlan(
          currentWorkspace.id,
          message.userQuery,
          message.intent
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message.id ? { ...msg, plan: currentPlan } : msg
          )
        );
      }

      if (!currentPlan) {
        throw new Error("No logical query plan available to compile.");
      }

      const compilation = await compileLogicalPlan(currentWorkspace.id, currentPlan);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, compilation } : msg
        )
      );
    } catch (err: unknown) {
      console.error("Compilation error", err);
      const errorMessage = err instanceof Error ? err.message : "Dialect compilation failed.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                status: "error",
                content: `${msg.content}\n\n⚠️ **Compilation Error:** ${errorMessage}`,
              }
            : msg
        )
      );
    } finally {
      setActiveCompilingId(null);
    }
  };

  const handleExecutePlan = async (message: ChatMessage) => {
    setActiveExecutingId(message.id);

    try {
      let currentPlan = message.plan;
      if (!currentPlan && message.userQuery) {
        currentPlan = await synthesizeLogicalPlan(
          currentWorkspace.id,
          message.userQuery,
          message.intent
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message.id ? { ...msg, plan: currentPlan } : msg
          )
        );
      }

      if (!currentPlan) {
        throw new Error("No logical query plan available to execute.");
      }

      const queryText =
        (currentPlan.query_text as string) ||
        message.userQuery ||
        "Executed query";

      const executionResult = await executeQueryPlan(currentWorkspace.id, {
        logical_plan: currentPlan,
        natural_query: queryText,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                status: "executed",
                executionResult,
              }
            : msg
        )
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Execution failed";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                status: "error",
                content: `${msg.content}\n\n⚠️ **Execution Error:** ${errorMessage}`,
              }
            : msg
        )
      );
    } finally {
      setActiveExecutingId(null);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-sans antialiased select-text">
      <header className="z-20 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-5">
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-foreground hover:bg-muted"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-1">
            <span className="text-[13px] font-medium">Assistant</span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {currentWorkspace.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                sourceCount !== null && sourceCount > 0 ? "bg-emerald-400" : "bg-muted-foreground/40"
              }`}
            />
            {sourceCount === null
              ? "Checking sources"
              : sourceCount === 0
              ? "No sources connected"
              : `${sourceCount} source${sourceCount > 1 ? "s" : ""} connected`}
          </span>

          <Badge variant="outline" className="hidden border-border text-[10px] font-normal text-muted-foreground lg:flex">
            Read-only
          </Badge>

          {/* Single, Clear New Chat Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewSession}
            className="text-xs h-7 text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 rounded-lg px-2.5 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>New chat</span>
          </Button>

          {/* API Docs Link */}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex text-muted-foreground hover:text-foreground"          >
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
              <Terminal className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-8 py-16">
            <div className="space-y-3 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-[13px] font-semibold">
                N
              </span>
              <div className="space-y-1.5">
                <h1 className="text-lg font-medium tracking-tight">
                  What would you like to explore today?
                </h1>
                <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  Ask a question across your connected databases. Underspecified
                  thresholds and dates are clarified before anything runs.
                </p>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Suggested queries
              </p>
              <div className="space-y-1.5">
                {SAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card/50 px-3 py-2 text-left text-[13px] text-foreground/90 transition-colors hover:border-input hover:bg-card"
                  >
                    <span>{q}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Thread */
          <div className="max-w-3xl mx-auto space-y-6 pb-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] font-semibold text-foreground">
                    N
                  </div>
                )}

                <div
                  className={`space-y-3 ${
                    message.role === "user"
                      ? "max-w-[80%] bg-muted text-foreground text-sm px-4 py-2.5 rounded-[22px] rounded-tr-md shadow-xs"
                      : "flex-1 max-w-[90%] text-foreground px-1 py-0.5"
                  }`}
                >
                  {message.status === "guardrail" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Guard Rail Protected</span>
                    </div>
                  )}

                  {message.status === "conversational" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Cluster Assistant</span>
                    </div>
                  )}

                  {message.role === "assistant" ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}

                  {/* Thinking / Evaluating Animation */}
                  {message.status === "evaluating" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand" />
                      <span>Inspecting schemas & ambiguity parameters...</span>
                    </div>
                  )}

                  {/* Action Banner: View Dialect & Run Query */}
                  {(message.status === "ready" || message.status === "executed") && (message.plan || message.userQuery) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-brand/30 bg-brand/10 text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                        <span className="text-xs text-foreground">Logical plan constructed with read-only assurance.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCompilePlan(message)}
                          disabled={activeCompilingId === message.id}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5"                        >
                          {activeCompilingId === message.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-brand" />
                          ) : (
                            <Code2 className="h-3 w-3" />
                          )}
                          <span>
                            {activeCompilingId === message.id
                              ? "Compiling..."
                              : message.compilation
                              ? "Hide Dialect"
                              : "View Dialect"}
                          </span>
                        </Button>

                        {message.status !== "executed" && (
                          <Button
                            size="sm"
                            onClick={() => handleExecutePlan(message)}
                            disabled={activeExecutingId === message.id}
                            className="h-7 text-xs bg-brand hover:bg-brand text-background font-medium gap-1.5 rounded-lg shadow-sm"                          >
                            {activeExecutingId === message.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3 fill-current" />
                            )}
                            <span>{activeExecutingId === message.id ? "Running Query..." : "Run Query"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {message.status === "error" && (
                    <div className="p-2.5 rounded-xl border border-red-500/40 bg-red-950/20 text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <span>{message.content}</span>
                    </div>
                  )}

                  {/* Dialect Preview Drawer */}
                  {message.compilation && (
                    <div className="pt-2">
                      <QueryDialectPreview result={message.compilation} />
                    </div>
                  )}

                  {/* Clarification Questions */}
                  {message.clarifications && message.clarifications.length > 0 && (
                    <div className="space-y-3 pt-2">
                      {message.clarifications.map((c) => (
                        <ClarificationPrompt
                          key={c.id}
                          clarification={c}
                          onResolve={(cid, val, custom) =>
                            handleResolveClarification(message.id, cid, val, custom)
                          }
                          isResolving={resolvingId === c.id}
                        />
                      ))}
                    </div>
                  )}

                  {/* Execution Results: Table, Visual Chart & Provenance Inspector */}
                  {message.executionResult && (
                    <div className="pt-3 space-y-3">
                      {/* View Mode Switcher */}
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-semibold text-foreground">
                          Query Execution Output
                        </span>

                        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => toggleMessageView(message.id, "table")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                              (messageViewModes[message.id] || "table") === "table"
                                ? "bg-accent text-foreground font-medium shadow-xs"                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <TableIcon className="h-3 w-3" />
                            <span>Table</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleMessageView(message.id, "chart")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                              messageViewModes[message.id] === "chart"
                                ? "bg-accent text-foreground font-medium shadow-xs"                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <BarChart3 className="h-3 w-3" />
                            <span>Chart</span>
                          </button>
                        </div>
                      </div>

                      {/* Tabular or Chart Output */}
                      {(messageViewModes[message.id] || "table") === "table" ? (
                        <ResultTable result={message.executionResult} />
                      ) : (
                        <ResultChart result={message.executionResult} />
                      )}

                      {/* Explainability & Provenance Drawer */}
                      <ProvenanceInspector
                        naturalQuery={(message.plan?.query_text as string) || message.content}
                        executionResult={message.executionResult}
                        compilation={message.compilation}
                        plan={message.plan}
                        resolvedContext={message.resolvedContext}
                      />
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground flex justify-end">
                    {message.timestamp}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground text-xs font-semibold mt-0.5">
                    U
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto space-y-2"
        >
          <div className="relative flex items-center rounded-xl border border-input bg-card px-2.5 py-1 transition-colors focus-within:border-ring">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about your databases (e.g. Show me top 5 products...)"
              className="flex-1 bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-sm shadow-none"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={isSubmitting || !inputValue.trim()}
              size="icon"
              className="h-8 w-8 rounded-full bg-white text-black hover:bg-neutral-200 disabled:bg-input disabled:text-muted-foreground shrink-0 transition-colors shadow-sm"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Read-only. Every query is validated against the connected schema before it runs.
          </p>
        </form>
      </div>
    </div>
  );
}

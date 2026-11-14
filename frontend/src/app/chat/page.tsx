"use client";

import * as React from "react";
import { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Play,
  Code2,
  Table as TableIcon,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "evaluating" | "clarifying" | "ready" | "executing" | "executed" | "error";
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
  const currentWorkspace = useShellStore((state) => state.currentWorkspace);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [activeExecutingId, setActiveExecutingId] = useState<string | null>(null);
  const [activeCompilingId, setActiveCompilingId] = useState<string | null>(null);
  const [messageViewModes, setMessageViewModes] = useState<Record<string, "table" | "chart">>({});
  const [sourceCount, setSourceCount] = useState<number | null>(null);

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
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryParam = searchParams.get("q");
      if (queryParam) {
        handleSend(queryParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      content: "Evaluating ambiguity and inspecting connected schemas...",
      status: "evaluating",
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setIsSubmitting(true);

    try {
      const result: AmbiguityEvaluationResult = await evaluateQueryAmbiguity(
        currentWorkspace.id,
        text
      );

      let plan: Record<string, unknown> | undefined;
      try {
        plan = await synthesizeLogicalPlan(
          currentWorkspace.id,
          text,
          result.inferred_intent
        );
      } catch (err) {
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

          return {
            ...msg,
            status: "ready",
            content: `I've analyzed your query with high confidence (${Math.round(
              result.confidence * 100
            )}%). Ready to construct the logical query plan.`,
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
        updatedPlan = await synthesizeLogicalPlan(
          currentWorkspace.id,
          (targetMsg.plan?.query_text as string) || "Query",
          updatedResolvedContext
        );
      } catch (err) {
        console.warn("Failed to update synthesized plan", err);
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const updatedClarifications = (msg.clarifications || []).map((c) =>
            c.id === clarificationId
              ? {
                  ...c,
                  resolved: true,
                  user_response: response.resolved_value,
                }
              : c
          );

          const allDone = response.ready_to_execute;

          return {
            ...msg,
            clarifications: updatedClarifications,
            resolvedContext: updatedResolvedContext,
            status: allDone ? "ready" : "clarifying",
            plan: updatedPlan,
            content: allDone
              ? "All parameters clarified. Ready to construct the logical query plan across your data sources."
              : msg.content,
          };
        })
      );
    } catch (err: unknown) {
      console.error("Failed to resolve clarification", err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleCompilePlan = async (message: ChatMessage) => {
    if (!message.plan) return;
    setActiveCompilingId(message.id);
    try {
      const compilation = await compileLogicalPlan(currentWorkspace.id, message.plan);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, compilation } : m))
      );
    } catch (err) {
      console.error("Compilation failed", err);
    } finally {
      setActiveCompilingId(null);
    }
  };

  const handleExecutePlan = async (message: ChatMessage) => {
    if (!message.plan) return;
    setActiveExecutingId(message.id);
    try {
      const executionResult = await executeQueryPlan(currentWorkspace.id, {
        logical_plan: message.plan,
        natural_query: (message.plan.query_text as string) || "Executed query",
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                status: "executed",
                executionResult,
              }
            : m
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                status: "error",
                content: `Execution error: ${msg}`,
              }
            : m
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
    <div className="flex flex-col h-full bg-[#212121] text-[#ececec]">
      {/* ChatGPT-style Subheader */}
      <div className="flex h-12 items-center justify-between border-b border-[#2d2d2d] bg-[#212121] px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f2f2f] text-[#ececec]">
            <Sparkles className="h-3.5 w-3.5 text-[#10a37f]" />
          </div>
          <span className="text-xs font-semibold text-[#ececec]">Query Assistant</span>
          <span className="text-xs text-[#737373]">·</span>
          <span className="text-xs text-[#b4b4b4]">{currentWorkspace.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[11px] font-normal py-0.5 border-[#383838] ${
              sourceCount !== null && sourceCount > 0 ? "text-[#10a37f] bg-[#10a37f]/10" : "text-[#8e8e8e]"
            }`}
          >
            <ShieldCheck className="h-3 w-3 mr-1 text-[#10a37f]" />
            <span>
              {sourceCount === null
                ? "Checking sources..."
                : sourceCount === 0
                ? "No Sources Connected"
                : `${sourceCount} Connected Source${sourceCount > 1 ? "s" : ""}`}
            </span>
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewSession}
            className="text-xs h-7 text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#2f2f2f] gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 py-12">
            <div className="flex flex-col items-center space-y-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f2f2f] text-[#10a37f] border border-[#383838] shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#ececec]">
                What would you like to explore today?
              </h1>
              <p className="text-xs md:text-sm text-[#8e8e8e] max-w-md">
                Ask any question across your connected databases. Ambiguities in metrics or dates will be clarified before execution.
              </p>
            </div>

            <div className="w-full space-y-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373] text-center">
                Suggested queries
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SAMPLE_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="p-3 text-left rounded-xl border border-[#303030] bg-[#212121] hover:bg-[#2a2a2a] hover:border-[#424242] text-xs text-[#b4b4b4] hover:text-[#ececec] transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3.5 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10a37f] text-white shadow-sm mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 space-y-3 ${
                    message.role === "user"
                      ? "bg-[#2f2f2f] text-[#ececec] rounded-tr-sm"
                      : "bg-[#1e1e1e] border border-[#303030] text-[#ececec] rounded-tl-sm shadow-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                  {/* Status Banner */}
                  {message.status === "evaluating" && (
                    <div className="flex items-center gap-2 text-xs text-[#8e8e8e] animate-pulse">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#10a37f]" />
                      <span>Inspecting schemas & ambiguity parameters...</span>
                    </div>
                  )}

                  {(message.status === "ready" || message.status === "executed") && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[#10a37f]/30 bg-[#10a37f]/10 text-xs text-[#ececec]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#10a37f] shrink-0" />
                        <span className="text-xs text-[#d1d5db]">Logical plan constructed with read-only assurance.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCompilePlan(message)}
                          disabled={activeCompilingId === message.id}
                          className="h-7 text-xs text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] gap-1"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>{activeCompilingId === message.id ? "Compiling..." : "View Dialect"}</span>
                        </Button>

                        {message.status !== "executed" && (
                          <Button
                            size="sm"
                            onClick={() => handleExecutePlan(message)}
                            disabled={activeExecutingId === message.id}
                            className="h-7 text-xs bg-[#10a37f] hover:bg-[#0d8a6c] text-white font-medium gap-1"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>{activeExecutingId === message.id ? "Running..." : "Run Query"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {message.status === "error" && (
                    <div className="p-2.5 rounded-xl border border-red-500/40 bg-red-950/20 text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <span>{message.content}</span>
                    </div>
                  )}

                  {/* Dialect Preview if requested */}
                  {message.compilation && (
                    <div className="pt-2">
                      <QueryDialectPreview result={message.compilation} />
                    </div>
                  )}

                  {/* Interactive Clarification Cards */}
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
                      <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-2">
                        <span className="text-xs font-semibold text-[#ececec]">
                          Query Execution Output
                        </span>

                        <div className="flex items-center gap-1 bg-[#262626] p-0.5 rounded-lg border border-[#333333]">
                          <button
                            type="button"
                            onClick={() => toggleMessageView(message.id, "table")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                              (messageViewModes[message.id] || "table") === "table"
                                ? "bg-[#383838] text-white font-medium shadow-xs"
                                : "text-[#8e8e8e] hover:text-[#ececec]"
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
                                ? "bg-[#383838] text-white font-medium shadow-xs"
                                : "text-[#8e8e8e] hover:text-[#ececec]"
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

                  <div className="text-[10px] text-[#737373] flex justify-end">
                    {message.timestamp}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2f2f2f] text-[#ececec] text-xs font-semibold mt-0.5">
                    U
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ChatGPT Minimalist Query Input Bar */}
      <div className="p-4 bg-[#212121]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto space-y-2"
        >
          <div className="relative flex items-center rounded-2xl border border-[#383838] bg-[#2f2f2f] px-3 py-1 shadow-md focus-within:border-[#505050] transition-colors">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about your databases (e.g. Show me top 5 products...)"
              className="flex-1 bg-transparent border-0 text-[#ececec] placeholder:text-[#8e8e8e] focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-sm shadow-none"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={isSubmitting || !inputValue.trim()}
              size="icon"
              className="h-8 w-8 rounded-full bg-white text-black hover:bg-neutral-200 disabled:bg-[#404040] disabled:text-[#737373] shrink-0"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-center text-[#737373]">
            Read-only safety engine active · Queries ground directly to introspected PostgreSQL, MongoDB & Elasticsearch schemas.
          </p>
        </form>
      </div>
    </div>
  );
}

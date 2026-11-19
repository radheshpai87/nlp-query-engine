"use client";

import * as React from "react";
import { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  ShieldCheck,
  Play,
  Code2,
  Table as TableIcon,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryParam = searchParams.get("q");
      if (queryParam) {
        handleSend(queryParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  selected_value: response.resolved_value,
                }
              : c
          );

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
    <div className="flex flex-col h-full bg-[#212121] text-[#ececec] font-sans antialiased select-text">
      {/* ChatGPT Single Sleek Topbar (No double headers!) */}
      <header className="flex h-12 items-center justify-between border-b border-[#2d2d2d] bg-[#212121] px-3 sm:px-5 shrink-0 z-20">
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-[#ececec] hover:bg-[#2f2f2f]"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* ChatGPT Model Badge */}
          <div className="flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs sm:text-sm font-semibold text-[#ececec]">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10a37f] text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <span>Query Assistant</span>
            <span className="text-xs text-[#737373] hidden sm:inline">·</span>
            <span className="text-xs text-[#a3a3a3] font-normal hidden sm:inline">
              Federated Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Read-Only Safety Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10a37f]/10 border border-[#10a37f]/30 text-[#10a37f] text-[11px] font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Read-Only Guard</span>
          </div>

          {/* Sources Count Pill */}
          <Badge
            variant="outline"
            className={`text-[11px] font-normal py-0.5 border-[#383838] hidden sm:flex ${
              sourceCount !== null && sourceCount > 0 ? "text-[#10a37f] bg-[#10a37f]/10" : "text-[#8e8e8e]"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#10a37f] mr-1.5 animate-pulse" />
            <span>
              {sourceCount === null
                ? "Checking sources..."
                : sourceCount === 0
                ? "No Sources Connected"
                : `${sourceCount} Connected Source${sourceCount > 1 ? "s" : ""}`}
            </span>
          </Badge>

          {/* Single, Clear New Chat Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewSession}
            className="text-xs h-7 text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#2f2f2f] gap-1.5 rounded-lg px-2.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Button>

          {/* API Docs Link */}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex text-[#8e8e8e] hover:text-white"
          >
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#2f2f2f]">
              <Terminal className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          /* Pure ChatGPT Empty State */
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 py-10 animate-in fade-in duration-300">
            <div className="flex flex-col items-center space-y-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2a2a2a] text-[#10a37f] border border-[#383838] shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#ececec]">
                What would you like to explore today?
              </h1>
              <p className="text-xs sm:text-sm text-[#8e8e8e] max-w-md">
                Ask any question across your connected databases. Ambiguities in metrics or dates will be clarified before execution.
              </p>
            </div>

            {/* ChatGPT 2x2 Suggestion Cards */}
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
                    className="p-3.5 text-left rounded-2xl border border-[#2f2f2f] bg-[#212121] hover:bg-[#282828] hover:border-[#444444] text-xs text-[#b4b4b4] hover:text-[#ececec] transition-all shadow-xs group"
                  >
                    <div className="font-medium text-white group-hover:text-[#10a37f] transition-colors">
                      {q}
                    </div>
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
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10a37f] text-white shadow-sm mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`space-y-3 ${
                    message.role === "user"
                      ? "max-w-[80%] bg-[#2f2f2f] text-[#ececec] text-sm px-4 py-2.5 rounded-[22px] rounded-tr-md shadow-xs"
                      : "flex-1 max-w-[90%] bg-[#1c1c1c] border border-[#2e2e2e] text-[#ececec] px-4 py-3.5 rounded-[22px] rounded-tl-md shadow-sm"
                  }`}
                >
                  {message.status === "guardrail" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Guard Rail Protected</span>
                    </div>
                  )}

                  {message.status === "conversational" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10a37f]/10 border border-[#10a37f]/20 text-[#10a37f] text-[11px] font-medium">
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
                    <div className="flex items-center gap-2 text-xs text-[#8e8e8e] pt-1">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#10a37f]" />
                      <span>Inspecting schemas & ambiguity parameters...</span>
                    </div>
                  )}

                  {/* Action Banner: View Dialect & Run Query */}
                  {(message.status === "ready" || message.status === "executed") && (message.plan || message.userQuery) && (
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
                          className="h-7 text-xs text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] gap-1.5"
                        >
                          {activeCompilingId === message.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-[#10a37f]" />
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
                            className="h-7 text-xs bg-[#10a37f] hover:bg-[#0d8a6c] text-white font-medium gap-1.5 rounded-lg shadow-sm"
                          >
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ChatGPT Signature Floating Input Pill Bar */}
      <div className="p-4 bg-[#212121] border-t border-[#2a2a2a]/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto space-y-2"
        >
          <div className="relative flex items-center rounded-[26px] border border-[#383838] bg-[#2f2f2f] px-3.5 py-1 shadow-lg focus-within:border-[#525252] transition-colors">
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
              className="h-8 w-8 rounded-full bg-white text-black hover:bg-neutral-200 disabled:bg-[#404040] disabled:text-[#737373] shrink-0 transition-colors shadow-sm"
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

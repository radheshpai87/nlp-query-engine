"use client";

import * as React from "react";
import { Check, ThumbsDown, ThumbsUp, Sparkles, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { submitQueryFeedback } from "@/lib/feedback-api";

interface QueryFeedbackBarProps {
  workspaceId: string;
  queryText: string;
  conversationId?: string | null;
  messageId?: string;
  generatedQuery?: string;
  generatedPlan?: Record<string, unknown>;
  targetDatabases?: string[];
  disabled?: boolean;
}

const ERROR_CATEGORIES = [
  { id: "wrong_table", label: "Wrong Table" },
  { id: "wrong_aggregation", label: "Wrong Aggregation" },
  { id: "missed_filter", label: "Missed Filter" },
  { id: "execution_error", label: "Execution Failed" },
  { id: "other", label: "Other" },
];

export function QueryFeedbackBar({
  workspaceId,
  queryText,
  conversationId,
  messageId,
  generatedQuery,
  generatedPlan,
  targetDatabases,
  disabled = false,
}: QueryFeedbackBarProps) {
  const [feedbackState, setFeedbackState] = React.useState<"idle" | "positive" | "negative_form" | "submitted">("idle");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("wrong_table");
  const [userNotes, setUserNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedChoice, setSubmittedChoice] = React.useState<"right" | "not_right" | null>(null);

  const handlePositiveFeedback = async () => {
    if (isSubmitting || disabled) return;
    setIsSubmitting(true);
    try {
      await submitQueryFeedback(workspaceId, {
        query_text: queryText,
        is_correct: true,
        conversation_id: conversationId,
        message_id: messageId,
        category: "accurate",
        generated_query: generatedQuery,
        generated_plan: generatedPlan,
        target_databases: targetDatabases,
      });
      setSubmittedChoice("right");
      setFeedbackState("submitted");
    } catch (err) {
      console.warn("Could not submit positive feedback", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNegativeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || disabled) return;
    setIsSubmitting(true);
    try {
      await submitQueryFeedback(workspaceId, {
        query_text: queryText,
        is_correct: false,
        conversation_id: conversationId,
        message_id: messageId,
        category: selectedCategory,
        user_notes: userNotes.trim() || undefined,
        generated_query: generatedQuery,
        generated_plan: generatedPlan,
        target_databases: targetDatabases,
      });
      setSubmittedChoice("not_right");
      setFeedbackState("submitted");
    } catch (err) {
      console.warn("Could not submit negative feedback", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedbackState === "submitted") {
    return (
      <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground animate-in fade-in duration-200">
        {submittedChoice === "right" ? (
          <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-normal">
            <Check className="h-3 w-3 text-emerald-400" />
            <span>Marked as Right • Reinforced as verified learning example</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-rose-500/30 bg-rose-500/10 text-rose-400 font-normal">
            <Sparkles className="h-3 w-3 text-rose-400" />
            <span>Marked as Not Right • Correction saved for future queries</span>
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Was this result right?</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePositiveFeedback}
            disabled={isSubmitting || disabled}
            className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Mark as Right (correct interpretation & result)"
          >
            <ThumbsUp className="mr-1 h-3 w-3 text-emerald-500" />
            <span>Right</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFeedbackState(feedbackState === "negative_form" ? "idle" : "negative_form")}
            disabled={isSubmitting || disabled}
            className={`h-6 px-2 text-[11px] font-medium transition-colors ${
              feedbackState === "negative_form"
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
            }`}
            title="Mark as Not Right (incorrect logic, tables, or result)"
          >
            <ThumbsDown className="mr-1 h-3 w-3 text-rose-500" />
            <span>Not Right</span>
          </Button>
        </div>
      </div>

      {feedbackState === "negative_form" && (
        <form
          onSubmit={handleNegativeSubmit}
          className="rounded-lg border border-border/80 bg-card/60 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
            <span className="flex items-center gap-1.5">
              <MessageSquarePlus className="h-3.5 w-3.5 text-rose-400" />
              <span>Help the system learn from this mistake:</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedbackState("idle")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ERROR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300 font-medium"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="What went wrong or what tables/filters were expected? (Optional)"
              className="h-7 text-xs bg-background/50 border-border/80 focus-visible:ring-1 focus-visible:ring-rose-500/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white shrink-0"
            >
              Submit & Learn
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { HelpCircle, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PendingClarification } from "@/lib/ambiguity-api";

interface ClarificationPromptProps {
  clarification: PendingClarification;
  onResolve: (clarificationId: string, value: unknown, customInput?: string) => void;
  isResolving?: boolean;
}

export function ClarificationPrompt({
  clarification,
  onResolve,
  isResolving = false,
}: ClarificationPromptProps) {
  const [selectedVal, setSelectedVal] = useState<unknown>(
    clarification.default_value ?? clarification.options[0]?.value
  );
  const [customText, setCustomText] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const handleSelectOption = (val: unknown) => {
    setSelectedVal(val);
    setIsCustomMode(false);
  };

  const handleConfirm = () => {
    if (isCustomMode && customText.trim()) {
      onResolve(clarification.id, undefined, customText.trim());
    } else {
      onResolve(clarification.id, selectedVal);
    }
  };

  if (clarification.resolved) {
    const displayVal =
      clarification.user_response ||
      (clarification.selected_value != null ? String(clarification.selected_value) : null) ||
      (clarification.default_value != null ? String(clarification.default_value) : null) ||
      "Confirmed";

    return (
      <div className="p-3.5 rounded-xl border border-brand/30 bg-brand-muted text-xs text-brand flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-muted text-brand">
            <Check className="h-3 w-3" />
          </div>
          <div>
            <span className="text-muted-foreground font-medium mr-1.5">{clarification.question}</span>
            <span className="font-semibold text-brand">
              Resolved: {String(displayVal)}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-brand/40 text-brand">
          Clarified
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 text-slate-100 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-amber-200">
              {clarification.question}
            </h4>
            {clarification.explanation && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {clarification.explanation}
              </p>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] text-amber-400 border-amber-500/30 shrink-0"
        >
          Clarification Needed
        </Badge>
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {clarification.options.map((option, idx) => {
          const isSelected = !isCustomMode && selectedVal === option.value;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(option.value)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "bg-amber-500/20 border-amber-500 text-amber-100 ring-1 ring-amber-500/40"
                  : "bg-background/60 border-border hover:border-slate-700 text-foreground/80 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium">{option.label}</span>
                {option.is_recommended && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-slate-950 font-bold">
                    Recommended
                  </Badge>
                )}
              </div>
              {option.description && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {option.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Input Option */}
      {clarification.allow_custom_input && (
        <div className="pt-1 flex items-center gap-2">
          <Input
            placeholder="Or type a custom value (e.g. 750 or last 14 days)..."
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              setIsCustomMode(true);
            }}
            className="h-8 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-2 flex justify-end">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isResolving}
          className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold gap-1.5 shadow-md"
        >
          <span>{isResolving ? "Resolving..." : "Confirm & Continue"}</span>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

import { Shield, Sliders } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Workspace & Safety Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure execution policies, LLM providers, and credential encryption keys.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="bg-[#181818] border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-sm">Query Safety Policy</CardTitle>
              </div>
              <Badge variant="success">Enforced</Badge>
            </div>
            <CardDescription className="text-xs">
              Hard constraints applied to all query generation and adapter executions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Max Execution Timeout (Seconds)</label>
                <Input defaultValue="30" className="h-8 bg-[#212121] border-border/80" />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Max Result Rows</label>
                <Input defaultValue="1000" className="h-8 bg-[#212121] border-border/80" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-muted-foreground">Allow Write Operations (DML/DDL)</span>
              <Badge variant="destructive">Disabled (Read-Only)</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#181818] border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm">LLM & Ambiguity Provider</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Configure model endpoints for intent classification and ambiguity evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Active Provider</label>
                <Input defaultValue="mock (Deterministic for Tests)" disabled className="h-8 bg-[#262626] border-border/80" />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Ollama Endpoint</label>
                <Input defaultValue="http://localhost:11434" className="h-8 bg-[#212121] border-border/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

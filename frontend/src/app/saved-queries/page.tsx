import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function SavedQueriesPage() {
  return (
    <div className="mx-auto flex-1 max-w-6xl space-y-6 p-6 md:p-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-lg font-medium tracking-tight">Saved queries</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Reusable questions you return to regularly.
        </p>
      </div>

      <EmptyState
        icon={Bookmark}
        title="Nothing saved yet"
        description="Saving from the assistant is not enabled in this build. Query history remains available for every execution."
      />
    </div>
  );
}

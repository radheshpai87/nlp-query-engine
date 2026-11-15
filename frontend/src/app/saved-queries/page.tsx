import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SavedQueriesPage() {
  const savedQueries = [
    {
      id: "sq-1",
      title: "Monthly Revenue by Category",
      description: "Aggregates completed orders grouped by electronics, apparel, and home.",
      database: "PostgreSQL",
      tags: ["finance", "orders"],
    },
    {
      id: "sq-2",
      title: "Unpaid High-Value Customers",
      description: "Filters customers with pending invoices exceeding $1,000.",
      database: "Cross-Database",
      tags: ["billing", "customers"],
    },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Saved Queries
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bookmarked questions and reusable parameterized business queries.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium" size="sm">
          <Plus className="h-4 w-4" />
          <span>Save Current Query</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedQueries.map((item) => (
          <Card key={item.id} className="bg-[#181818] border-border/80 hover:border-emerald-600/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-border">
                  {item.database}
                </Badge>
              </div>
              <CardDescription className="text-xs pt-1">{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 mt-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-[#262626] text-zinc-300 px-2 py-0.5 rounded border border-border/60">
                    #{tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function HistoryPage() {
  const executions = [
    {
      id: "exec-101",
      query: "Top 5 products by revenue this month",
      target: "PostgreSQL & Mongo",
      status: "success",
      rows: 5,
      duration: "142ms",
      timestamp: "10 mins ago",
    },
    {
      id: "exec-102",
      query: "Which customers placed orders but have not paid?",
      target: "PostgreSQL",
      status: "success",
      rows: 18,
      duration: "88ms",
      timestamp: "1 hour ago",
    },
    {
      id: "exec-103",
      query: "Recent authentication error spikes across logs",
      target: "Elasticsearch",
      status: "success",
      rows: 42,
      duration: "65ms",
      timestamp: "3 hours ago",
    },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Query Execution History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of natural language questions, generated plans, and database execution results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter queries..." className="w-64 h-8 text-xs" />
        </div>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Natural Language Query</TableHead>
              <TableHead>Target Database</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Execution Time</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-xs text-foreground">
                  {row.query}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {row.target}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{row.rows}</TableCell>
                <TableCell className="text-xs font-mono">{row.duration}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.timestamp}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <span>Re-run</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

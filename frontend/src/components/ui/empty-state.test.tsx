import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "./empty-state";
import { Database } from "lucide-react";

describe("EmptyState Component", () => {
  it("renders title, description and triggers action button", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Database}
        title="No databases connected"
        description="Connect a PostgreSQL or MongoDB database to begin querying."
        actionLabel="Connect Database"
        onAction={handleAction}
      />
    );

    expect(screen.getByText("No databases connected")).toBeInTheDocument();
    expect(
      screen.getByText("Connect a PostgreSQL or MongoDB database to begin querying.")
    ).toBeInTheDocument();

    const actionBtn = screen.getByRole("button", { name: "Connect Database" });
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

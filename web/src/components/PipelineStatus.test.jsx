import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PipelineStatus from "./PipelineStatus";

describe("PipelineStatus", () => {
  it("renders_all_5_agents_in_order", () => {
    render(<PipelineStatus agentStatuses={{}} />);

    const rows = screen.getAllByTestId(/agent-row-/);
    expect(rows).toHaveLength(5);

    const intakeText = screen.getByText("Intake & strategy");
    const draftText = screen.getByText("Content draft");
    expect(
      intakeText.compareDocumentPosition(draftText) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows_pending_when_no_status", () => {
    render(<PipelineStatus agentStatuses={{}} />);

    const statuses = screen.getAllByText("pending");
    expect(statuses).toHaveLength(5);
  });

  it("shows_green_for_complete_status", () => {
    render(
      <PipelineStatus
        agentStatuses={{
          intake_agent: { status: "intake_complete" },
        }}
      />,
    );

    const intakeRow = screen.getByTestId("agent-row-intake_agent");
    const dot = within(intakeRow).getByRole("presentation", { hidden: true });
    expect(dot.className).toContain("status-green");
  });

  it("shows_amber_for_revise_status", () => {
    render(
      <PipelineStatus
        agentStatuses={{
          compliance_agent: { status: "compliance_revise", iteration: 2 },
        }}
      />,
    );

    expect(screen.getByText("revise (attempt 2/3)")).toBeInTheDocument();
  });

  it("shows_red_for_escalated_status", () => {
    render(
      <PipelineStatus
        agentStatuses={{
          compliance_agent: { status: "escalated" },
        }}
      />,
    );

    const row = screen.getByTestId("agent-row-compliance_agent");
    const dot = within(row).getByRole("presentation", { hidden: true });
    expect(dot.className).toContain("status-red");
  });
});

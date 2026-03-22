import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BriefInput from "./BriefInput";

describe("BriefInput", () => {
  it("renders_all_form_fields", () => {
    render(<BriefInput onStart={vi.fn()} />);

    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("Brief description")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Engagement data (optional)"),
    ).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Run pipeline" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("enables_button_when_topic_filled", async () => {
    const user = userEvent.setup();
    render(<BriefInput onStart={vi.fn()} />);

    const topicInput = screen.getByLabelText("Topic");
    const button = screen.getByRole("button", { name: "Run pipeline" });

    await user.type(topicInput, "SIP vs lump sum");
    expect(button).not.toBeDisabled();
  });

  it("shows_error_for_invalid_engagement_json", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<BriefInput onStart={onStart} />);

    await user.type(screen.getByLabelText("Topic"), "Test topic");
    await user.type(
      screen.getByLabelText("Engagement data (optional)"),
      "not valid json",
    );
    await user.click(screen.getByRole("button", { name: "Run pipeline" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Engagement data must be valid JSON.",
    );
    expect(onStart).not.toHaveBeenCalled();
  });

  it("calls_on_start_with_correct_args", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue(undefined);
    render(<BriefInput onStart={onStart} />);

    await user.type(screen.getByLabelText("Topic"), "RBI update");
    await user.type(
      screen.getByLabelText("Brief description"),
      "Audience is retail investors",
    );
    fireEvent.change(screen.getByLabelText("Engagement data (optional)"), {
      target: { value: '{"ctr":0.12,"top_channel":"linkedin"}' },
    });
    await user.click(screen.getByRole("button", { name: "Run pipeline" }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith(
        {
          topic: "RBI update",
          description: "Audience is retail investors",
        },
        { ctr: 0.12, top_channel: "linkedin" },
      );
    });
  });

  it("calls_on_start_with_null_engagement_when_empty", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue(undefined);
    render(<BriefInput onStart={onStart} />);

    await user.type(screen.getByLabelText("Topic"), "Only topic");
    await user.click(screen.getByRole("button", { name: "Run pipeline" }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith(
        {
          topic: "Only topic",
          description: "",
        },
        null,
      );
    });
  });

  it("shows_loading_state_during_submit", async () => {
    const user = userEvent.setup();
    let resolvePromise;
    const onStart = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    render(<BriefInput onStart={onStart} />);
    await user.type(screen.getByLabelText("Topic"), "Slow request topic");
    await user.click(screen.getByRole("button", { name: "Run pipeline" }));

    expect(
      screen.getByRole("button", { name: "Starting..." }),
    ).toBeInTheDocument();

    resolvePromise();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Run pipeline" }),
      ).toBeInTheDocument();
    });
  });
});

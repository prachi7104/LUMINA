import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import FeedbackForm from "./FeedbackForm";

describe("FeedbackForm", () => {
  it("renders_all_form_elements", () => {
    render(<FeedbackForm onSubmit={vi.fn()} onSkip={vi.fn()} />);

    for (const value of [1, 2, 3, 4, 5]) {
      expect(
        screen.getByRole("button", { name: String(value) }),
      ).toBeInTheDocument();
    }

    expect(screen.getByLabelText("Channel")).toBeInTheDocument();
    expect(
      screen.getByLabelText("What could be improved?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save feedback" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("save_button_disabled_until_rating_selected", async () => {
    const user = userEvent.setup();
    render(<FeedbackForm onSubmit={vi.fn()} onSkip={vi.fn()} />);

    const saveButton = screen.getByRole("button", { name: "Save feedback" });
    expect(saveButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "4" }));
    expect(saveButton).toBeEnabled();
  });

  it("calls_on_submit_with_correct_data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FeedbackForm onSubmit={onSubmit} onSkip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "3" }));
    await user.selectOptions(screen.getByLabelText("Channel"), "twitter");
    await user.type(
      screen.getByLabelText("What could be improved?"),
      "Needs more examples",
    );
    await user.click(screen.getByRole("button", { name: "Save feedback" }));

    expect(onSubmit).toHaveBeenCalledWith(3, "Needs more examples", "twitter");
  });

  it("calls_on_skip_when_skip_clicked", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<FeedbackForm onSubmit={vi.fn()} onSkip={onSkip} />);

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("highlights_selected_rating_and_below", async () => {
    const user = userEvent.setup();
    render(<FeedbackForm onSubmit={vi.fn()} onSkip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "3" }));

    for (const value of [1, 2, 3]) {
      expect(
        screen.getByRole("button", { name: String(value) }).className,
      ).toContain("rating-highlight");
    }

    for (const value of [4, 5]) {
      expect(
        screen.getByRole("button", { name: String(value) }).className,
      ).not.toContain("rating-highlight");
    }
  });
});

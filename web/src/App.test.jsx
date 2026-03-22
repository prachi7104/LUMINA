import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as React from "react";

import App from "./App";
import * as pipelineApi from "./api/pipeline";
import * as sseHook from "./hooks/usePipelineSSE";

vi.mock("./api/pipeline", async () => {
  const actual = await vi.importActual("./api/pipeline");
  return {
    ...actual,
    startPipeline: vi.fn(),
    getOutputs: vi.fn(),
    approvePipeline: vi.fn(),
    submitFeedback: vi.fn(),
  };
});

vi.mock("./hooks/usePipelineSSE", () => ({
  usePipelineSSE: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sseHook.usePipelineSSE.mockImplementation(() => {});
    pipelineApi.startPipeline.mockResolvedValue({
      run_id: "test-123",
      status: "started",
    });
    pipelineApi.getOutputs.mockResolvedValue([]);
    pipelineApi.approvePipeline.mockResolvedValue({ status: "approved" });
    pipelineApi.submitFeedback.mockResolvedValue({ status: "saved" });
  });

  it("renders_brief_input_initially", () => {
    render(<App />);

    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("pipeline-status-list"),
    ).not.toBeInTheDocument();
  });

  it("transitions_to_running_after_start", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Topic"), "RBI outlook");
    await user.click(screen.getByRole("button", { name: "Run pipeline" }));

    await waitFor(() => {
      expect(screen.getByLabelText("pipeline-status-list")).toBeInTheDocument();
    });
  });

  it("shows_done_screen_after_full_flow", async () => {
    sseHook.usePipelineSSE.mockImplementation(
      (runId, _onAgentUpdate, onComplete) => {
        React.useEffect(() => {
          if (runId) {
            onComplete(runId);
          }
        }, [runId, onComplete]);
      },
    );

    pipelineApi.getOutputs.mockResolvedValue([
      {
        channel: "blog",
        language: "en",
        content: "<article><p>Blog body</p></article>",
      },
      {
        channel: "twitter",
        language: "en",
        content: JSON.stringify(["1/1 Tweet"]),
      },
      { channel: "linkedin", language: "en", content: "LinkedIn body" },
      { channel: "whatsapp", language: "en", content: "WhatsApp body" },
      { channel: "article", language: "hi", content: "हिंदी सामग्री" },
    ]);

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Topic"), "Full flow test");
    await user.click(screen.getByRole("button", { name: "Run pipeline" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Approve & publish" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Approve & publish" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save feedback" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Run another pipeline" }),
      ).toBeInTheDocument();
    });
  });
});

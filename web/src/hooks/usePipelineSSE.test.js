import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePipelineSSE } from "./usePipelineSSE";

function HookHarness({ runId, onAgentUpdate, onComplete, onError }) {
  usePipelineSSE(runId, onAgentUpdate, onComplete, onError);
  return null;
}

describe("usePipelineSSE", () => {
  let instances;
  let EventSourceMock;

  beforeEach(() => {
    instances = [];
    EventSourceMock = vi.fn().mockImplementation((url) => {
      const instance = {
        url,
        onmessage: null,
        onerror: null,
        close: vi.fn(),
      };
      instances.push(instance);
      return instance;
    });
    vi.stubGlobal("EventSource", EventSourceMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("test_does_nothing_when_run_id_is_null", () => {
    render(
      React.createElement(HookHarness, {
        runId: null,
        onAgentUpdate: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }),
    );

    expect(EventSourceMock).not.toHaveBeenCalled();
  });

  it("test_creates_sse_connection_when_run_id_provided", () => {
    render(
      React.createElement(HookHarness, {
        runId: "test-run-123",
        onAgentUpdate: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }),
    );

    expect(EventSourceMock).toHaveBeenCalledTimes(1);
    expect(EventSourceMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/pipeline/test-run-123/stream",
    );
  });

  it("test_calls_on_agent_update_for_agent_complete_events", async () => {
    const onAgentUpdate = vi.fn();
    render(
      React.createElement(HookHarness, {
        runId: "test-run-123",
        onAgentUpdate,
        onComplete: vi.fn(),
        onError: vi.fn(),
      }),
    );

    const payload = {
      type: "agent_complete",
      agent: "draft_agent",
      run_id: "test-run-123",
    };

    act(() => {
      instances[0].onmessage({ data: JSON.stringify(payload) });
    });

    await waitFor(() => {
      expect(onAgentUpdate).toHaveBeenCalledWith(payload);
    });
  });

  it("test_calls_on_complete_for_human_required", async () => {
    const onComplete = vi.fn();
    render(
      React.createElement(HookHarness, {
        runId: "test-run-123",
        onAgentUpdate: vi.fn(),
        onComplete,
        onError: vi.fn(),
      }),
    );

    act(() => {
      instances[0].onmessage({
        data: JSON.stringify({
          type: "human_required",
          run_id: "test-run-123",
        }),
      });
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("test-run-123");
    });
    expect(instances[0].close).toHaveBeenCalled();
  });

  it("test_closes_connection_on_unmount", () => {
    const { unmount } = render(
      React.createElement(HookHarness, {
        runId: "test-run-123",
        onAgentUpdate: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      }),
    );

    unmount();
    expect(instances[0].close).toHaveBeenCalled();
  });
});

import { useEffect } from "react";

import { createSSEConnection } from "../api/pipeline";

export function usePipelineSSE(runId, onAgentUpdate, onComplete, onError) {
  useEffect(() => {
    if (!runId) {
      return;
    }

    let eventSource;

    try {
      eventSource = createSSEConnection(runId, (event) => {
        if (event?.type === "agent_complete") {
          onAgentUpdate?.(event);
          return;
        }

        if (event?.type === "human_required") {
          onComplete?.(event.run_id || runId);
          eventSource?.close();
          return;
        }

        if (event?.type === "error") {
          onError?.(event.message || "Connection failed");
          eventSource?.close();
        }
      });
    } catch (error) {
      onError?.(error?.message || "Connection failed");
      return;
    }

    return () => {
      eventSource?.close();
    };
  }, [runId, onAgentUpdate, onComplete, onError]);
}

import { useCallback, useState } from "react";

import {
  approvePipeline,
  getOutputs,
  startPipeline,
  submitFeedback,
} from "./api/pipeline";
import ApprovalGate from "./components/ApprovalGate";
import BriefInput from "./components/BriefInput";
import FeedbackForm from "./components/FeedbackForm";
import PipelineStatus from "./components/PipelineStatus";
import { usePipelineSSE } from "./hooks/usePipelineSSE";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [stage, setStage] = useState("input");
  const [runId, setRunId] = useState(null);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [outputs, setOutputs] = useState([]);

  const handleStart = useCallback(async (brief, engagementData) => {
    const result = await startPipeline(brief, engagementData);
    setRunId(result.run_id);
    setAgentStatuses({});
    setOutputs([]);
    setStage("running");
  }, []);

  const handleAgentUpdate = useCallback((event) => {
    const agentId = event?.agent_id || event?.agent;
    if (!agentId) {
      return;
    }
    setAgentStatuses((prev) => ({ ...prev, [agentId]: event }));
  }, []);

  const handleComplete = useCallback(
    async (completedRunId) => {
      const targetRunId = completedRunId || runId;
      if (!targetRunId) {
        return;
      }
      const nextOutputs = await getOutputs(targetRunId);
      setOutputs(nextOutputs || []);
      setStage("approval");
    },
    [runId],
  );

  const handleSSEError = useCallback((_message) => {
    // Keep the UI stable; caller can add toast handling later.
  }, []);

  usePipelineSSE(runId, handleAgentUpdate, handleComplete, handleSSEError);

  const handleApprove = useCallback(async () => {
    if (!runId) {
      return;
    }
    await approvePipeline(runId, true);
    setStage("feedback");
  }, [runId]);

  const handleFeedbackSubmit = useCallback(
    async (rating, comment, channel) => {
      if (runId) {
        await submitFeedback(runId, rating, comment, channel);
      }
      setStage("done");
    },
    [runId],
  );

  const handleFeedbackSkip = useCallback(() => {
    setStage("done");
  }, []);

  const resetToInput = useCallback(() => {
    setStage("input");
    setRunId(null);
    setAgentStatuses({});
    setOutputs([]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="mx-auto max-w-4xl px-6 pt-10">
        <h1 className="text-3xl font-bold">NarrativeOps</h1>
        <p className="mt-2 text-sm text-gray-300">
          AI-powered editorial pipeline with compliance-first publishing.
        </p>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {stage === "input" ? <BriefInput onStart={handleStart} /> : null}

        {stage === "running" ? (
          <PipelineStatus agentStatuses={agentStatuses} />
        ) : null}

        {stage === "approval" ? (
          <ApprovalGate
            outputs={outputs}
            runId={runId || ""}
            apiBase={API_BASE}
            onApprove={handleApprove}
          />
        ) : null}

        {stage === "feedback" ? (
          <FeedbackForm
            onSubmit={handleFeedbackSubmit}
            onSkip={handleFeedbackSkip}
          />
        ) : null}

        {stage === "done" ? (
          <section>
            <h2 className="text-2xl font-semibold">complete</h2>
            <button
              type="button"
              onClick={resetToInput}
              className="mt-4 rounded bg-white px-4 py-2 text-gray-900"
            >
              Run another pipeline
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

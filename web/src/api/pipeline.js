const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    return (
      data?.message ||
      data?.detail ||
      `Request failed with status ${response.status}`
    );
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function handleJsonResponse(response) {
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }
  return response.json();
}

export async function startPipeline(brief, engagementData = null) {
  const response = await fetch(`${API_BASE}/api/pipeline/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      brief,
      engagement_data: engagementData,
    }),
  });

  return handleJsonResponse(response);
}

export function createSSEConnection(runId, onEvent) {
  const eventSource = new EventSource(
    `${API_BASE}/api/pipeline/${runId}/stream`,
  );

  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      onEvent(parsed);
    } catch {
      onEvent({ type: "error", message: "Connection failed" });
    }
  };

  eventSource.onerror = () => {
    onEvent({ type: "error", message: "Connection failed" });
  };

  return eventSource;
}

export async function getOutputs(runId) {
  const response = await fetch(`${API_BASE}/api/pipeline/${runId}/outputs`);
  const data = await handleJsonResponse(response);
  return data.outputs;
}

export async function approvePipeline(runId, approved = true) {
  const response = await fetch(`${API_BASE}/api/pipeline/${runId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approved }),
  });

  return handleJsonResponse(response);
}

export async function submitFeedback(runId, rating, comment, channel) {
  const response = await fetch(`${API_BASE}/api/pipeline/${runId}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rating, comment, channel }),
  });

  return handleJsonResponse(response);
}

export async function getAudit(runId) {
  const response = await fetch(`${API_BASE}/api/pipeline/${runId}/audit`);
  const data = await handleJsonResponse(response);
  return data.events;
}

export function getAuditPdfUrl(runId) {
  return `${API_BASE}/api/pipeline/${runId}/audit/pdf`;
}

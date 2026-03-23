import type {
  AuditEvent,
  DashboardSummary,
  DiffResponse,
  PipelineMetrics,
  PipelineOutput,
  UploadGuideResponse,
} from "./types";

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function parseResponseBody(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

async function assertOk(response: Response, endpoint: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const bodyText = await parseResponseBody(response);
  const suffix = bodyText ? ` Body: ${bodyText}` : "";
  throw new Error(`Request to ${endpoint} failed with HTTP ${response.status}.${suffix}`);
}

export async function startPipeline(
  brief: { topic: string; description: string; content_category?: string },
  sessionId?: string,
  engagementData?: Record<string, unknown> | null,
): Promise<{ run_id: string; status: string }> {
  const endpoint = `${BASE_URL}/api/pipeline/run`;
  const briefPayload: Record<string, unknown> = { ...brief };

  if (sessionId) {
    briefPayload.session_id = sessionId;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      brief: briefPayload,
      engagement_data: engagementData ?? null,
    }),
  });

  await assertOk(response, endpoint);
  return (await response.json()) as { run_id: string; status: string };
}

export async function uploadBrandGuide(
  file: File,
  sessionId: string,
): Promise<UploadGuideResponse> {
  const endpoint = `${BASE_URL}/api/upload-guide`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  await assertOk(response, endpoint);
  return (await response.json()) as UploadGuideResponse;
}

export async function approvePipeline(runId: string): Promise<{ status: string }> {
  const endpoint = `${BASE_URL}/api/pipeline/${runId}/approve`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approved: true }),
  });

  await assertOk(response, endpoint);
  return (await response.json()) as { status: string };
}

export async function getOutputs(runId: string): Promise<PipelineOutput[]> {
  const endpoint = `${BASE_URL}/api/pipeline/${runId}/outputs`;
  const response = await fetch(endpoint);

  await assertOk(response, endpoint);
  const data = (await response.json()) as { outputs: PipelineOutput[] };
  return data.outputs;
}

export async function captureDiff(
  runId: string,
  channel: string,
  originalText: string,
  correctedText: string,
  category: string,
): Promise<DiffResponse> {
  const endpoint = `${BASE_URL}/api/pipeline/${runId}/diff`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      original_text: originalText,
      corrected_text: correctedText,
      content_category: category,
    }),
  });

  await assertOk(response, endpoint);
  return (await response.json()) as DiffResponse;
}

export async function getMetrics(runId: string): Promise<PipelineMetrics> {
  const endpoint = `${BASE_URL}/api/pipeline/${runId}/metrics`;
  const response = await fetch(endpoint);

  await assertOk(response, endpoint);
  return (await response.json()) as PipelineMetrics;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const endpoint = `${BASE_URL}/api/dashboard/summary`;
  const response = await fetch(endpoint);

  await assertOk(response, endpoint);
  return (await response.json()) as DashboardSummary;
}

export async function getAuditTrail(runId: string): Promise<AuditEvent[]> {
  const endpoint = `${BASE_URL}/api/pipeline/${runId}/audit`;
  const response = await fetch(endpoint);

  await assertOk(response, endpoint);
  const data = (await response.json()) as { events: AuditEvent[] };
  return data.events;
}

export async function submitFeedback(
  runId: string,
  rating: number,
  comment: string,
  channel: string,
): Promise<{ status: string }> {
  const endpoint = `${BASE_URL}/api/pipeline/${runId}/feedback`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating,
      comment,
      channel,
    }),
  });

  await assertOk(response, endpoint);
  return (await response.json()) as { status: string };
}

export function getAuditPdfUrl(runId: string): string {
  return `${BASE_URL}/api/pipeline/${runId}/audit/pdf`;
}

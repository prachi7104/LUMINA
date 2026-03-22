const AGENTS = [
  { id: "intake_agent", name: "Intake & strategy" },
  { id: "draft_agent", name: "Content draft" },
  { id: "compliance_agent", name: "Compliance review" },
  { id: "localization_agent", name: "Hindi localization" },
  { id: "format_agent", name: "Channel formatting" },
];

function getStatusValue(event) {
  return String(event?.status || "").toLowerCase();
}

function getDotClass(event) {
  if (!event?.status) {
    return "status-dot status-gray";
  }

  const status = getStatusValue(event);
  if (
    status.includes("complete") ||
    status.includes("pass") ||
    status === "awaiting_approval"
  ) {
    return "status-dot status-green";
  }

  if (status.includes("revise")) {
    return "status-dot status-amber status-pulse";
  }

  if (status.includes("escalat") || status.includes("fail")) {
    return "status-dot status-red";
  }

  return "status-dot status-blue status-pulse";
}

function getStatusLabel(event) {
  if (!event?.status) {
    return "pending";
  }

  const status = getStatusValue(event);
  if (status.includes("revise")) {
    const iteration = event?.iteration ?? 1;
    return `revise (attempt ${iteration}/3)`;
  }

  return String(event.status).replaceAll("_", " ");
}

export default function PipelineStatus({ agentStatuses }) {
  return (
    <div aria-label="pipeline-status-list" className="pipeline-status-list">
      {AGENTS.map((agent) => {
        const event = agentStatuses?.[agent.id] || null;
        return (
          <div
            key={agent.id}
            className="pipeline-status-row"
            data-testid={`agent-row-${agent.id}`}
          >
            <div className="pipeline-status-left">
              <span
                role="presentation"
                aria-hidden="true"
                className={getDotClass(event)}
                style={{ width: "2px", height: "2px", borderRadius: "9999px" }}
              />
              <span>{agent.name}</span>
            </div>
            <span data-testid={`agent-status-${agent.id}`}>
              {getStatusLabel(event)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

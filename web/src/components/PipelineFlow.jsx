import ReactFlow, { Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const AGENTS = [
  {
    id: "intake_agent",
    label: "Intake & strategy",
    position: { x: 200, y: 0 },
  },
  { id: "draft_agent", label: "Content draft", position: { x: 200, y: 120 } },
  {
    id: "compliance_agent",
    label: "Compliance check",
    position: { x: 200, y: 240 },
  },
  {
    id: "localization_agent",
    label: "Hindi localization",
    position: { x: 200, y: 360 },
  },
  { id: "format_agent", label: "Format + audit", position: { x: 200, y: 480 } },
];

function resolveNodeState(event) {
  if (!event?.status) {
    return "pending";
  }

  const status = String(event.status).toLowerCase();
  if (
    status.includes("complete") ||
    status.includes("pass") ||
    status === "awaiting_approval"
  ) {
    return "success";
  }
  if (status.includes("revise")) {
    return "warning";
  }
  if (status.includes("escalat") || status.includes("fail")) {
    return "error";
  }
  return "running";
}

function nodeStyleForState(nodeState) {
  if (nodeState === "success") {
    return {
      background: "#052e16",
      border: "1px solid #22c55e",
      color: "#dcfce7",
    };
  }
  if (nodeState === "warning") {
    return {
      background: "#451a03",
      border: "1px solid #f59e0b",
      color: "#fef3c7",
    };
  }
  if (nodeState === "error") {
    return {
      background: "#450a0a",
      border: "1px solid #ef4444",
      color: "#fee2e2",
    };
  }
  if (nodeState === "running") {
    return {
      background: "#172554",
      border: "1px solid #3b82f6",
      color: "#dbeafe",
    };
  }
  return {
    background: "#111827",
    border: "1px solid #4b5563",
    color: "#e5e7eb",
  };
}

export default function PipelineFlow({ agentStatuses }) {
  const nodes = AGENTS.map((agent) => {
    const nodeState = resolveNodeState(agentStatuses?.[agent.id]);
    return {
      id: agent.id,
      data: { label: agent.label },
      position: agent.position,
      style: {
        ...nodeStyleForState(nodeState),
        borderRadius: 10,
        fontSize: 13,
        padding: 10,
        width: 180,
        textAlign: "center",
      },
    };
  });

  const edges = [
    {
      id: "intake-draft",
      source: "intake_agent",
      target: "draft_agent",
      type: "straight",
      style: { stroke: "#6b7280", strokeWidth: 1.5 },
    },
    {
      id: "draft-compliance",
      source: "draft_agent",
      target: "compliance_agent",
      type: "straight",
      style: { stroke: "#6b7280", strokeWidth: 1.5 },
    },
    {
      id: "compliance-localization",
      source: "compliance_agent",
      target: "localization_agent",
      type: "straight",
      style: { stroke: "#6b7280", strokeWidth: 1.5 },
    },
    {
      id: "localization-format",
      source: "localization_agent",
      target: "format_agent",
      type: "straight",
      style: { stroke: "#6b7280", strokeWidth: 1.5 },
    },
    {
      id: "compliance-revise",
      source: "compliance_agent",
      target: "draft_agent",
      type: "smoothstep",
      label: "REVISE",
      animated: true,
      style: { stroke: "#f59e0b", strokeWidth: 2 },
      labelStyle: { fill: "#f59e0b", fontWeight: 700 },
    },
  ];

  return (
    <div className="h-[560px] rounded-lg border border-gray-700 bg-gray-900 p-2">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
      >
        <Background color="#374151" gap={18} />
      </ReactFlow>
    </div>
  );
}

import { useState } from "react";

export default function BriefInput({ onStart }) {
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [engagementDataText, setEngagementDataText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = topic.trim().length > 0 && !loading;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    let parsedEngagementData = null;
    setError("");

    if (engagementDataText.trim()) {
      try {
        parsedEngagementData = JSON.parse(engagementDataText);
      } catch {
        setError("Engagement data must be valid JSON.");
        return;
      }
    }

    setLoading(true);
    try {
      await onStart(
        {
          topic: topic.trim(),
          description: description.trim(),
        },
        parsedEngagementData,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="topic">Topic</label>
        <input
          id="topic"
          type="text"
          placeholder="e.g. RBI rate cut impact for retail investors"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="description">Brief description</label>
        <textarea
          id="description"
          placeholder="Key messages, audience, tone, context..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="engagement-data">Engagement data (optional)</label>
        <div>
          Use JSON here to enable Scenario 3 with engagement-aware drafting.
        </div>
        <textarea
          id="engagement-data"
          placeholder='Example: {"ctr": 0.08, "avg_read_time_sec": 92, "top_channel": "linkedin"}'
          value={engagementDataText}
          onChange={(event) => setEngagementDataText(event.target.value)}
        />
      </div>

      {error ? <p role="alert">{error}</p> : null}

      <button type="submit" disabled={!canSubmit}>
        {loading ? "Starting..." : "Run pipeline"}
      </button>
    </form>
  );
}

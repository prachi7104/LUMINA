import { useMemo, useState } from "react";

const TABS = ["Blog", "Twitter", "LinkedIn", "WhatsApp", "Hindi"];

function findOutput(outputs, channel, language = null) {
  return outputs.find((item) => {
    if (language) {
      return item.channel === channel && item.language === language;
    }
    return item.channel === channel;
  });
}

function stripHtmlAndTruncate(content, limit = 800) {
  const plainText = String(content || "")
    .replace(/<[^>]*>/g, "")
    .trim();
  if (plainText.length <= limit) {
    return plainText;
  }
  return `${plainText.slice(0, limit)}...`;
}

function getTabContent(tab, outputs) {
  if (tab === "Blog") {
    const blog = findOutput(outputs, "blog");
    return stripHtmlAndTruncate(blog?.content || "");
  }

  if (tab === "Twitter") {
    const twitter = findOutput(outputs, "twitter");
    try {
      const tweets = JSON.parse(twitter?.content || "[]");
      if (Array.isArray(tweets)) {
        return tweets.join("\n\n");
      }
      return String(twitter?.content || "");
    } catch {
      return String(twitter?.content || "");
    }
  }

  if (tab === "LinkedIn") {
    return String(findOutput(outputs, "linkedin")?.content || "");
  }

  if (tab === "WhatsApp") {
    return String(findOutput(outputs, "whatsapp")?.content || "");
  }

  if (tab === "Hindi") {
    return String(findOutput(outputs, "article", "hi")?.content || "");
  }

  return "";
}

export default function ApprovalGate({ outputs, runId, apiBase, onApprove }) {
  const [activeTab, setActiveTab] = useState("Blog");

  const auditPdfUrl = `${apiBase}/api/pipeline/${runId}/audit/pdf`;
  const content = useMemo(
    () => getTabContent(activeTab, outputs || []),
    [activeTab, outputs],
  );

  return (
    <section>
      <header>
        <h2>Review before publishing</h2>
        <p>Pipeline paused for your approval</p>
      </header>

      <div>
        <a href={auditPdfUrl}>Download audit PDF</a>
        <button
          type="button"
          onClick={onApprove}
          className="approval-btn-green"
        >
          Approve & publish
        </button>
      </div>

      <nav aria-label="Output channels">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>

      <article>
        <pre style={{ whiteSpace: "pre-wrap" }}>{content}</pre>
      </article>
    </section>
  );
}

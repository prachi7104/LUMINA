import { useEffect, useMemo, useRef, useState } from "react";

import { patchOutput } from "../api/pipeline";

const TABS = ["Blog", "Twitter", "LinkedIn", "WhatsApp", "Hindi"];

const TAB_TARGETS = {
  Blog: { channel: "blog", language: "en" },
  Twitter: { channel: "twitter", language: "en" },
  LinkedIn: { channel: "linkedin", language: "en" },
  WhatsApp: { channel: "whatsapp", language: "en" },
  Hindi: { channel: "article", language: "hi" },
};

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

function getTabRawContent(tab, outputs) {
  if (tab === "Blog") {
    return String(findOutput(outputs, "blog")?.content || "");
  }
  if (tab === "Twitter") {
    return String(findOutput(outputs, "twitter")?.content || "");
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

function getWordCount(text) {
  const tokens = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length;
}

export default function ApprovalGate({ outputs, runId, apiBase, onApprove }) {
  const [activeTab, setActiveTab] = useState("Blog");
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [savedToastVisible, setSavedToastVisible] = useState(false);
  const [localEdits, setLocalEdits] = useState({});

  const textareaRef = useRef(null);
  const toastTimerRef = useRef(null);

  const auditPdfUrl = `${apiBase}/api/pipeline/${runId}/audit/pdf`;
  const effectiveOutputs = useMemo(() => {
    if (!outputs) {
      return [];
    }
    return outputs.map((item) => {
      const key = `${item.channel}:${item.language || ""}`;
      if (!(key in localEdits)) {
        return item;
      }
      return { ...item, content: localEdits[key] };
    });
  }, [outputs, localEdits]);

  const rawContent = useMemo(
    () => getTabRawContent(activeTab, effectiveOutputs),
    [activeTab, effectiveOutputs],
  );

  const content = useMemo(
    () => getTabContent(activeTab, effectiveOutputs),
    [activeTab, effectiveOutputs],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editMode || !textareaRef.current) {
      return;
    }
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 300)}px`;
  }, [editMode, editContent]);

  function handleTabSwitch(nextTab) {
    if (nextTab === activeTab) {
      return;
    }

    if (editMode && editContent !== rawContent) {
      const shouldDiscard = window.confirm(
        "You have unsaved edits. Discard them?",
      );
      if (!shouldDiscard) {
        return;
      }
    }

    setActiveTab(nextTab);
    setEditMode(false);
    setEditContent("");
    setSaveStatus("idle");
    setSaveError("");
  }

  function handleStartEdit() {
    setEditMode(true);
    setEditContent(rawContent);
    setSaveStatus("idle");
    setSaveError("");
  }

  function handleCancelEdit() {
    setEditMode(false);
    setEditContent("");
    setSaveStatus("idle");
    setSaveError("");
  }

  async function handleSaveEdits() {
    const target = TAB_TARGETS[activeTab];
    if (!target) {
      return;
    }

    setSaveStatus("saving");
    setSaveError("");
    try {
      await patchOutput(runId, target.channel, target.language, editContent);
      const editKey = `${target.channel}:${target.language || ""}`;
      setLocalEdits((prev) => ({ ...prev, [editKey]: editContent }));
      setSaveStatus("saved");
      setEditMode(false);
      setSavedToastVisible(true);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setSavedToastVisible(false);
      }, 2000);
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error?.message || "Failed to save edits.");
    }
  }

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

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{activeTab}</h3>
        {!editMode ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="rounded border border-gray-400 px-2 py-1 text-xs"
          >
            <span aria-hidden="true">✎</span> Edit
          </button>
        ) : null}
      </div>

      <nav aria-label="Output channels" className="mt-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabSwitch(tab)}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>

      <article>
        {editMode ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              style={{
                width: "100%",
                minHeight: "300px",
                resize: "none",
                fontFamily:
                  activeTab === "Blog" || activeTab === "Hindi"
                    ? "inherit"
                    : "monospace",
              }}
            />
            <p className="mt-2 text-sm text-gray-300">
              Word count: {getWordCount(editContent)}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={saveStatus === "saving"}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {saveStatus === "saving" ? "Saving..." : "Save edits"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
            {saveStatus === "error" ? (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {saveError || "Failed to save edits."}
              </p>
            ) : null}
          </div>
        ) : (
          <pre style={{ whiteSpace: "pre-wrap" }}>{content}</pre>
        )}
      </article>

      {savedToastVisible ? (
        <div className="fixed bottom-4 right-4 rounded bg-green-600 px-3 py-2 text-sm text-white">
          Saved
        </div>
      ) : null}
    </section>
  );
}

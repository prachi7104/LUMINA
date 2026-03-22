import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ApprovalGate from "./ApprovalGate";

const MOCK_OUTPUTS = [
  {
    channel: "blog",
    language: "en",
    content:
      "<article><h1>Market Update</h1><p>Retail investors should diversify.</p></article>",
  },
  {
    channel: "twitter",
    language: "en",
    content: JSON.stringify(["1/2 First tweet", "2/2 Second tweet"]),
  },
  {
    channel: "linkedin",
    language: "en",
    content: "LinkedIn long-form post",
  },
  {
    channel: "whatsapp",
    language: "en",
    content: "WhatsApp short message",
  },
  {
    channel: "article",
    language: "hi",
    content: "यह हिंदी लेख है।",
  },
];

describe("ApprovalGate", () => {
  it("renders_all_channel_tabs", () => {
    render(
      <ApprovalGate
        outputs={MOCK_OUTPUTS}
        runId="test-123"
        apiBase="http://localhost:8000"
        onApprove={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Blog" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Twitter" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "LinkedIn" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "WhatsApp" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hindi" })).toBeInTheDocument();
  });

  it("shows_blog_content_by_default", () => {
    render(
      <ApprovalGate
        outputs={MOCK_OUTPUTS}
        runId="test-123"
        apiBase="http://localhost:8000"
        onApprove={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Market UpdateRetail investors should diversify\./),
    ).toBeInTheDocument();
  });

  it("switches_to_twitter_on_tab_click", async () => {
    const user = userEvent.setup();
    render(
      <ApprovalGate
        outputs={MOCK_OUTPUTS}
        runId="test-123"
        apiBase="http://localhost:8000"
        onApprove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Twitter" }));

    expect(
      screen.getByText(/1\/2 First tweet\s+2\/2 Second tweet/s),
    ).toBeInTheDocument();
  });

  it("approve_button_calls_on_approve", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <ApprovalGate
        outputs={MOCK_OUTPUTS}
        runId="test-123"
        apiBase="http://localhost:8000"
        onApprove={onApprove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve & publish" }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("pdf_link_has_correct_url", () => {
    render(
      <ApprovalGate
        outputs={MOCK_OUTPUTS}
        runId="test-123"
        apiBase="http://localhost:8000"
        onApprove={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: "Download audit PDF" });
    expect(link).toHaveAttribute(
      "href",
      "http://localhost:8000/api/pipeline/test-123/audit/pdf",
    );
  });
});

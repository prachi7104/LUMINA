import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalGate } from '../app/screens/ApprovalGate';

const mockNavigate = vi.fn();

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'run-123' }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { category: 'mutual_fund' } }),
  };
});

const mockGetOutputs = vi.fn();
const mockGetMetrics = vi.fn();
const mockCaptureDiff = vi.fn();
const mockApprovePipeline = vi.fn();
const mockRejectPipeline = vi.fn();
const mockGetAuditTrail = vi.fn();
const mockGetPipelineStrategy = vi.fn();

vi.mock('../app/api/client', () => ({
  getOutputs: (...args: unknown[]) => mockGetOutputs(...args),
  getMetrics: (...args: unknown[]) => mockGetMetrics(...args),
  captureDiff: (...args: unknown[]) => mockCaptureDiff(...args),
  approvePipeline: (...args: unknown[]) => mockApprovePipeline(...args),
  rejectPipeline: (...args: unknown[]) => mockRejectPipeline(...args),
  getAuditTrail: (...args: unknown[]) => mockGetAuditTrail(...args),
  getPipelineStrategy: (...args: unknown[]) => mockGetPipelineStrategy(...args),
}));

describe('ApprovalGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetOutputs.mockResolvedValue([
      { channel: 'blog', language: 'en', content: '<p>Original content</p>' },
      { channel: 'twitter', language: 'en', content: '["tweet 1"]' },
      { channel: 'linkedin', language: 'en', content: 'LinkedIn copy' },
      { channel: 'whatsapp', language: 'en', content: 'WhatsApp copy' },
      { channel: 'blog', language: 'hi', content: 'Hindi copy' },
    ]);

    mockGetMetrics.mockResolvedValue({
      run_id: 'run-123',
      total_duration_ms: 154000,
      total_duration_display: '2m 34s',
      actual_duration_ms: 154000,
      actual_duration_display: '2m 34s',
      baseline_manual_hours: 8,
      estimated_hours_saved: 7.5,
      time_saved_display: '7.5 hours',
      estimated_cost_saved_inr: 11250,
      cost_saved_display: '₹11,250',
      compliance_iterations: 2,
      corrections_applied: 1,
      rules_checked: 12,
      trend_sources_used: 2,
      brand_rules_used: true,
      rules_source_label: 'Custom brand guide',
    });

    mockCaptureDiff.mockResolvedValue({
      status: 'captured',
      diff_summary: 'updated',
      corrections_count: 1,
    });

    mockApprovePipeline.mockResolvedValue({ status: 'approved' });
    mockRejectPipeline.mockResolvedValue({ status: 'rejected' });
    mockGetPipelineStrategy.mockResolvedValue({
      run_id: 'run-123',
      engagement_strategy: {},
      content_calendar: null,
      strategy_recommendation: null,
      pivot_recommended: false,
      pivot_reason: null,
    });

    mockGetAuditTrail.mockResolvedValue([
      {
        agent_name: 'compliance_agent',
        action: 'checked_compliance',
        verdict: 'REVISE',
        model_used: 'llama',
        duration_ms: 120,
        created_at: new Date().toISOString(),
        output_summary: JSON.stringify({
          format: 'compliance_v1',
          verdict: 'REVISE',
          summary: '2 issues found',
          annotations: [
            {
              severity: 'error',
              rule_id: 'SEBI01',
              message: 'Avoid guaranteed claims',
              sentence: 'Guaranteed 12% returns',
              suggested_fix: 'Projected returns may vary with market conditions',
            },
            {
              severity: 'warning',
              rule_id: 'ASCI03',
              message: 'Avoid excessive emphasis',
              sentence: 'BEST EVER!!!',
            },
          ],
        }),
      },
    ]);
  });

  it('renders metrics panel from API values', async () => {
    render(<ApprovalGate />);

    expect(await screen.findByText('Impact this run')).toBeInTheDocument();
    expect(screen.getAllByText('2m 34s').length).toBeGreaterThan(0);
    expect(screen.getByText('₹11,250')).toBeInTheDocument();
    expect(screen.getByText('Custom brand guide')).toBeInTheDocument();
    expect(screen.getByText('Grounded')).toBeInTheDocument();
  });

  it('sanitizes unsafe HTML before rendering', async () => {
    mockGetOutputs.mockResolvedValueOnce([
      {
        channel: 'blog',
        language: 'en',
        content: '<h2>Safe heading</h2><script>alert("xss")</script><a href="javascript:alert(1)">bad</a>',
      },
    ]);

    const { container } = render(<ApprovalGate />);

    expect(await screen.findByText('Safe heading')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    const link = container.querySelector('a');
    const hrefValue = link?.getAttribute('href') || '';
    expect(hrefValue).not.toContain('javascript:');
  });

  it('captures diff on save and shows toast', async () => {
    render(<ApprovalGate />);

    await screen.findByText('Review your content');

    fireEvent.click(screen.getByRole('button', { name: /edit content/i }));

    const textbox = await screen.findByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Corrected content for blog' } });

    fireEvent.click(screen.getByRole('button', { name: /save edits/i }));

    await waitFor(() => {
      expect(mockCaptureDiff).toHaveBeenCalledWith(
        'run-123',
        'blog',
        'en',
        '<p>Original content</p>',
        'Corrected content for blog',
        'mutual_fund',
      );
    });

    expect(screen.getByText('Correction captured for future drafts')).toBeInTheDocument();
  });

  it('opens audit trail from sidebar action', async () => {
    render(<ApprovalGate />);

    await screen.findByText('Review your content');
    fireEvent.click(screen.getByRole('button', { name: /view full audit/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/audit/run-123');
  });
});

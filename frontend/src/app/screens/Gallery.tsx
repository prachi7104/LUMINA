import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, ArrowRight, FileText, Linkedin, Loader2, MessageCircle, RotateCw, Twitter, Trash2, Clock } from 'lucide-react';

import { getOutputs, listRuns } from '../api/client';
import type { PipelineOutput, RunSummary } from '../api/types';

type FilterStatus = 'all' | 'completed' | 'awaiting_approval';

type OutputsByRun = Record<string, PipelineOutput[]>;

const CHANNEL_ICONS = {
  blog: FileText,
  twitter: Twitter,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  article: FileText,
};

const CHANNEL_LABELS: Record<keyof typeof CHANNEL_ICONS, string> = {
  blog: 'Blog',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  article: 'Article',
};

export function Gallery() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [search, setSearch] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [outputsByRun, setOutputsByRun] = useState<OutputsByRun>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingOutputsFor, setLoadingOutputsFor] = useState<string | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('gallery_search_history');
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch {
        setSearchHistory([]);
      }
    }
  }, []);

  // Save search history to localStorage (keep only last 4)
  useEffect(() => {
    if (search.trim() && search.trim().length > 0) {
      setSearchHistory(prev => {
        const updated = [search.trim(), ...prev.filter(s => s !== search.trim())].slice(0, 4);
        localStorage.setItem('gallery_search_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [search]);

  const fetchRuns = () => {
    setLoading(true);
    setError(null);
    listRuns(50)
      .then(setRuns)
      .catch((err) => {
        console.error('Failed to load runs for gallery', err);
        setRuns([]);
        setError('Unable to load gallery runs. Service may be temporarily unavailable.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesFilter = filter === 'all' || run.status === filter;
      const matchesSearch = run.brief_topic.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [runs, filter, search]);

  const handleToggleExpand = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }

    setExpandedRunId(runId);
    if (outputsByRun[runId]) {
      return;
    }

    setLoadingOutputsFor(runId);
    try {
      const outputs = await getOutputs(runId);
      setOutputsByRun((prev) => ({ ...prev, [runId]: outputs }));
    } catch (err) {
      console.error('Failed to load outputs for run', runId, err);
      setOutputsByRun((prev) => ({ ...prev, [runId]: [] }));
    } finally {
      setLoadingOutputsFor(null);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!window.confirm('Are you sure you want to delete this chat/run? This action cannot be undone.')) {
      return;
    }

    setDeletingRunId(runId);
    try {
      // Call the API to delete the run
      const response = await fetch(`/api/runs/${runId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from runs list
        setRuns((prev) => prev.filter((r) => r.id !== runId));
        // Clean up outputs
        setOutputsByRun((prev) => {
          const updated = { ...prev };
          delete updated[runId];
          return updated;
        });
      } else {
        console.error('Failed to delete run:', response.statusText);
        alert('Failed to delete this chat. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting run:', err);
      alert('Error deleting this chat. Please try again.');
    } finally {
      setDeletingRunId(null);
    }
  };

  const handleClearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('gallery_search_history');
  };

  const formatMeta = (run: RunSummary) => {
    const createdAt = new Date(run.created_at);
    const date = Number.isNaN(createdAt.getTime()) ? run.created_at : createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const durationMs = run.total_duration_ms || 0;
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);
    const durationText = durationMs > 0 ? `${mins}m ${secs}s` : 'N/A';
    return `${date} · ${durationText} · ${run.status.replace('_', ' ')}`;
  };

  const metadataRows = (run: RunSummary) => {
    return [
      { label: 'Hours saved', value: `${(run.estimated_hours_saved || 0).toFixed(1)}h` },
      { label: 'Compliance loops', value: String(run.compliance_iterations || 0) },
      { label: 'Trend sources', value: String(run.trend_sources_used || 0) },
    ];
  };

  const channelStatus = (channel: keyof typeof CHANNEL_ICONS, outputs: PipelineOutput[]) => {
    const exists = outputs.some((output) => output.channel === channel);
    return exists ? 'Available' : 'Pending';
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="border-b border-border-default">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <h2 className="text-2xl text-text-primary">Asset Library</h2>
          <p className="mt-1 text-sm text-text-secondary">Lumina: Enterprise content, on autopilot.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topic"
              className="w-full rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
            {/* Search History Dropdown */}
            {(search === '' || search.length < 1) && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border-default bg-bg-surface shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-2 border-b border-border-default">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Recent searches
                    </p>
                    <button
                      onClick={handleClearSearchHistory}
                      className="text-xs text-accent-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div>
                  {searchHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearch(item)}
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {(['all', 'completed', 'awaiting_approval'] as FilterStatus[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-2 text-xs capitalize transition-colors ${
                  filter === value
                    ? 'bg-accent-primary text-white'
                    : 'border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                {value === 'awaiting_approval' ? 'Awaiting' : value}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading gallery...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-6 py-5 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning mb-1">Service Temporarily Unavailable</p>
                  <p className="text-text-secondary">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchRuns}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-white hover:bg-warning/90 transition-colors text-sm font-medium"
              >
                <RotateCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-default bg-bg-surface p-8 text-center text-sm text-text-secondary">
            No runs found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredRuns.map((run) => {
              const outputs = outputsByRun[run.id] || [];
              const isExpanded = expandedRunId === run.id;
              return (
                <div key={run.id} className="rounded-md border border-border-default bg-bg-surface p-5">
                  <h3 className="line-clamp-2 text-text-primary">{run.brief_topic || 'Untitled run'}</h3>
                  <p className="mt-2 text-xs text-text-secondary">{formatMeta(run)}</p>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border-default bg-bg-primary p-2">
                    {metadataRows(run).map((item) => (
                      <div key={`${run.id}-${item.label}`}>
                        <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{item.label}</p>
                        <p className="text-xs font-medium text-text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['blog', 'twitter', 'linkedin', 'whatsapp', 'article'] as Array<keyof typeof CHANNEL_ICONS>).map((channel, idx) => {
                      const Icon = CHANNEL_ICONS[channel] || FileText;
                      const status = channelStatus(channel, outputs);
                      return (
                        <span
                          key={`${run.id}-${channel}-${idx}`}
                          className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                            status === 'Available'
                              ? 'border-success/30 bg-success/10 text-success'
                              : 'border-border-default bg-bg-surface text-text-secondary'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {CHANNEL_LABELS[channel]} · {status}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleExpand(run.id)}
                      className="text-sm text-accent-primary hover:underline"
                    >
                      {isExpanded ? 'Hide' : 'View'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(run.status === 'awaiting_approval' ? `/approval/${run.id}` : `/audit/${run.id}`)}
                        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
                      >
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRun(run.id)}
                        disabled={deletingRunId === run.id}
                        className="p-1.5 text-text-secondary hover:text-warning hover:bg-warning/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete this chat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-border-default pt-4">
                      {loadingOutputsFor === run.id ? (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading channel outputs...
                        </div>
                      ) : outputs.length === 0 ? (
                        <p className="text-xs text-text-secondary">No outputs found for this run.</p>
                      ) : (
                        outputs.map((output) => (
                          <div key={`${run.id}-${output.channel}-${output.language}`} className="rounded-md border border-border-default bg-bg-primary p-3">
                            <p className="text-xs font-medium text-text-primary">
                              {output.channel} ({output.language.toUpperCase()})
                            </p>
                            <p className="mt-1 line-clamp-3 text-xs text-text-secondary">{output.content.replace(/<[^>]*>/g, '').trim()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

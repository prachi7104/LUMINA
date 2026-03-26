import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BriefConfiguration } from './BriefConfiguration';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

vi.mock('../../api/client', () => ({
  startPipeline: vi.fn(),
  uploadBrandGuide: vi.fn(),
}));

describe('BriefConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not reset manually selected tone while typing brief', () => {
    render(<BriefConfiguration />);

    fireEvent.click(screen.getByRole('button', { name: 'Analytical' }));
    expect(screen.getByRole('button', { name: 'Analytical' })).toHaveClass('bg-accent-primary');

    const textarea = screen.getByPlaceholderText('Describe your content requirements...');
    fireEvent.change(textarea, { target: { value: 'Fintech payments and insurance updates' } });

    expect(screen.getByRole('button', { name: 'Analytical' })).toHaveClass('bg-accent-primary');
  });

  it('does not reset manually selected channels while typing brief', () => {
    render(<BriefConfiguration />);

    fireEvent.click(screen.getByRole('button', { name: /publisher brief/i }));
    expect(screen.getByRole('button', { name: /publisher brief/i })).toHaveClass('bg-accent-primary/10');

    const textarea = screen.getByPlaceholderText('Describe your content requirements...');
    fireEvent.change(textarea, { target: { value: 'Mutual fund NAV and SIP allocation note' } });

    expect(screen.getByRole('button', { name: /publisher brief/i })).toHaveClass('bg-accent-primary/10');
  });
});

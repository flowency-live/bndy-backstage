import { describe, it, expect } from 'vitest';
import { ShieldCheck } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import { GodmodePageHeader } from '../godmode-ui';

describe('GodmodePageHeader', () => {
  it('renders without an icon', () => {
    render(<GodmodePageHeader title="Ownership claims" />);
    expect(screen.getByRole('heading', { name: 'Ownership claims' })).toBeInTheDocument();
  });

  it('renders the icon when provided', () => {
    const { container } = render(<GodmodePageHeader icon={ShieldCheck} title="Ownership claims" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders the description when provided', () => {
    render(
      <GodmodePageHeader
        title="Ownership claims"
        description="Join bndy requests waiting for verification."
      />,
    );
    expect(screen.getByText('Join bndy requests waiting for verification.')).toBeInTheDocument();
  });

  it('omits the description element when not provided', () => {
    render(<GodmodePageHeader title="Ownership claims" />);
    expect(screen.queryByTestId('godmode-page-description')).toBeNull();
  });
});

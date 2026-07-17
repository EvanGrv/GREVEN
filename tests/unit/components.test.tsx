import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GrevenTitle } from '@/components/typography/GrevenTitle';
import { EgMark } from '@/components/ui/Logo/EgMark';

describe('GrevenTitle', () => {
  it('exposes a single accessible "GREVEN" name and keeps the visual split', () => {
    render(<GrevenTitle />);
    const heading = screen.getByRole('heading', { name: 'GREVEN' });
    expect(heading).toBeInTheDocument();
    // The visual parts remain in the DOM for the GRE [slot] VEN composition.
    expect(heading.textContent).toBe('GREVEN');
  });
});

describe('EgMark', () => {
  it('is decorative by default and labelled when a title is given', () => {
    const { rerender, container } = render(<EgMark />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    rerender(<EgMark title="GREVEN" />);
    expect(screen.getByRole('img', { name: 'GREVEN' })).toBeInTheDocument();
  });
});

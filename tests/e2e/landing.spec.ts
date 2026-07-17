import { expect, test } from '@playwright/test';
import { isMobileViewport, openSection } from './helpers';

test.describe('Landing', () => {
  test('shows the GREVEN wordmark and section navigation', async ({ page, viewport }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('GRE');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('VEN');
    // The sections are reachable on every viewport (rail or mobile menu).
    await openSection(page, viewport?.width, 'Recherche');
    await expect(page).toHaveURL(/\/recherche$/);
  });

  test('is navigable to a section without relying on the 3D scene', async ({ page, viewport }) => {
    await page.goto('/');
    await openSection(page, viewport?.width, 'Projets');
    await expect(page).toHaveURL(/\/projets$/);
  });

  test('raises the neuron preview card on hover and travels from its arrow', async ({
    page,
    viewport,
  }) => {
    test.skip(isMobileViewport(viewport?.width), 'hover-only interaction');
    await page.goto('/');
    // Hovering the rail focuses the neuron, which raises its preview card.
    await page
      .getByRole('navigation', { name: 'Sections du portfolio' })
      .getByRole('link', { name: 'Recherche' })
      .hover();
    const card = page.getByRole('dialog', { name: 'Aperçu — Recherche' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Machine Learning');
    // The card's arrow launches the travel (or plain-navigates without WebGL).
    await card.getByRole('link', { name: 'Explorer Recherche' }).click();
    await expect(page).toHaveURL(/\/recherche$/, { timeout: 15_000 });
  });
});

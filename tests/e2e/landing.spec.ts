import { expect, test } from '@playwright/test';
import { openSection } from './helpers';

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
});

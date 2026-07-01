import { expect, test } from '@playwright/test';

test.describe('Landing', () => {
  test('shows the GREVEN wordmark and section navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('GRE');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('VEN');
    await expect(page.getByRole('link', { name: 'Recherche' })).toBeVisible();
  });

  test('is navigable to a section without WebGL', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Recherche' }).click();
    await expect(page).toHaveURL(/\/recherche/);
  });
});

import { expect, test } from '@playwright/test';
import { openSection } from './helpers';

const SECTIONS = [
  { label: 'Recherche', path: '/recherche' },
  { label: 'Projets', path: '/projets' },
  { label: 'Publications', path: '/publications' },
  { label: 'À propos', path: '/a-propos' },
  { label: 'Contact', path: '/contact' },
] as const;

test.describe('Section navigation', () => {
  for (const section of SECTIONS) {
    test(`reaches ${section.label} and returns to the network`, async ({ page, viewport }) => {
      await page.goto('/');
      await openSection(page, viewport?.width, section.label);
      await expect(page).toHaveURL(new RegExp(`${section.path}$`));

      // Every section page must offer the way back into the network.
      const back = page.getByRole('link', { name: /retour au réseau/i });
      await expect(back).toBeVisible();
      await back.click();
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

test.describe('Branding', () => {
  test('carries the GREVEN ML title and French locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GREVEN — ML Research Portfolio/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('header logo links back to the network home', async ({ page }) => {
    await page.goto('/recherche');
    // The link's accessible name is its aria-label, not the visible lockup.
    await page.getByRole('link', { name: /GREVEN — retour à l.accueil/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Quality override', () => {
  test('renders the landing under a forced low tier (no-WebGL-like path)', async ({
    page,
    viewport,
  }) => {
    await page.goto('/?quality=low');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('GREVEN');
    // Navigation stays reachable whatever the tier and viewport.
    await openSection(page, viewport?.width, 'Recherche');
    await expect(page).toHaveURL(/\/recherche$/);
  });
});

import { devices, type Page } from '@playwright/test';

/** True when the test viewport matches the mobile project (iPhone 13). */
export const isMobileViewport = (width: number | undefined): boolean =>
  (width ?? 1280) <= (devices['iPhone 13'].viewport?.width ?? 390);

/** Click a section link, going through the mobile menu when needed. */
export async function openSection(
  page: Page,
  viewportWidth: number | undefined,
  label: string,
): Promise<void> {
  if (isMobileViewport(viewportWidth)) {
    await page.getByRole('button', { name: 'Menu' }).click();
  }
  await page
    .getByRole('navigation', { name: 'Sections du portfolio' })
    .getByRole('link', { name: label })
    .click();
}

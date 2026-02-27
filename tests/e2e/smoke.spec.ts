import { expect, test } from "@playwright/test";

test("main navigation works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Writings" })).toBeVisible();
  await expect(page.locator("[data-hero-logo-3d]")).toBeVisible();
  await expect
    .poll(async () => {
      return page.locator("[data-hero-logo-3d]").evaluate((node) => {
        return node.classList.contains("hero-logo-3d--ready") || node.classList.contains("hero-logo-3d--fallback-only");
      });
    })
    .toBe(true);

  await page.getByRole("link", { name: "Writings" }).click();
  await expect(page).toHaveURL(/\/writings/);

  const insightLinks = page.getByRole("link", { name: "Read insight" });
  if ((await insightLinks.count()) > 0) {
    await insightLinks.first().click();
    await expect(page).toHaveURL(/\/insights\//);
    await expect(page.getByRole("link", { name: "Read full article on Substack" })).toBeVisible();
    await page.goto("/writings");
  }

  await page.getByRole("link", { name: "Portfolio" }).click();
  await expect(page).toHaveURL(/\/portfolio/);

  await page.getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/projects/);

  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about/);

  await page.getByRole("link", { name: "Disclaimer" }).click();
  await expect(page).toHaveURL(/\/legal\/disclaimer/);
});

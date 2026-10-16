import { test, expect } from '../support/fixtures';
import { env } from '../support/env';

test.describe('sign in', () => {
  test('admin signs in through the form and lands on /admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email, username or phone number').fill(env.admin.identifier);
    await page.getByPlaceholder('Password').fill(env.admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  });

  test('staff signs in through the form and lands on /dms', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email, username or phone number').fill(env.staff.username);
    await page.getByPlaceholder('Password').fill(env.staff.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dms$/);
    await expect(page.getByRole('heading', { name: 'DMS' })).toBeVisible();
  });

  test('wrong password shows an error and stays on /login', async ({ page, allowBrowserErrors }) => {
    // The rejected login is an expected 401 that the browser logs as a console error.
    allowBrowserErrors(/401/);
    await page.goto('/login');
    await page.getByPlaceholder('Email, username or phone number').fill(env.admin.identifier);
    await page.getByPlaceholder('Password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email, sign-in name or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('empty form is rejected client-side', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter your email, username or phone number and password.')).toBeVisible();
  });
});

test.describe('route guards', () => {
  test('anonymous visit to /dms redirects to sign in and back after login', async ({ page }) => {
    await page.goto('/dms');
    await expect(page).toHaveURL(/\/login\?notice=required/);
    await expect(page.getByText('Sign in required')).toBeVisible();

    await page.getByPlaceholder('Email, username or phone number').fill(env.staff.username);
    await page.getByPlaceholder('Password').fill(env.staff.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dms$/);
  });

  test('staff opening /admin is sent to their own home', async ({ staffPage }) => {
    await staffPage.goto('/admin');
    await expect(staffPage).toHaveURL(/\/dms$/);
  });

  test('admin opening a dealer page is sent to /admin', async ({ adminPage }) => {
    await adminPage.goto('/crm');
    await expect(adminPage).toHaveURL(/\/admin$/);
  });
});

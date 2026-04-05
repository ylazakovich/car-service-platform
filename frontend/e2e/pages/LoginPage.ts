import { expect, type Locator, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@autoservice.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "change-me-in-production";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? "staff@autoservice.local";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? "change-me-in-production";

/**
 * Login screen — role-based locators, same flow for admin and staff.
 */
export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private emailField(): Locator {
    return this.page.getByRole("textbox", { name: "Email" });
  }

  private passwordField(): Locator {
    return this.page.getByRole("textbox", { name: "Password" });
  }

  private signInButton(): Locator {
    return this.page.getByRole("button", { name: "Sign In" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailField().fill(email);
    await this.passwordField().fill(password);
    await this.signInButton().click();
  }

  async signInAsAdmin(): Promise<void> {
    await this.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(this.page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible({
      timeout: 30_000,
    });
  }

  async signInAsStaff(): Promise<void> {
    await this.signIn(STAFF_EMAIL, STAFF_PASSWORD);
    await expect(this.page).toHaveURL(/\/app/);
  }
}

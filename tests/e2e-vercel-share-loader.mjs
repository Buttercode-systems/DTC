import { chromium } from "@playwright/test";

const shareUrl = process.env.E2E_SHARE_URL;
if (shareUrl) {
  const launch = chromium.launch.bind(chromium);
  chromium.launch = async (...args) => {
    const browser = await launch(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...contextArgs) => {
      const context = await newContext(...contextArgs);
      const page = await context.newPage();
      await page.goto(shareUrl, { waitUntil: "domcontentloaded" });
      await page.close();
      return context;
    };
    return browser;
  };
}

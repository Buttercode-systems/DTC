import { chromium } from "@playwright/test";

const shareUrl = process.env.E2E_SHARE_URL;
if (shareUrl) {
  const browserTypePrototype = Object.getPrototypeOf(chromium);
  const launch = browserTypePrototype.launch;

  browserTypePrototype.launch = async function (...args) {
    const browser = await launch.apply(this, args);
    const browserPrototype = Object.getPrototypeOf(browser);
    const newContext = browserPrototype.newContext;

    browserPrototype.newContext = async function (...contextArgs) {
      const context = await newContext.apply(this, contextArgs);
      const page = await context.newPage();
      await page.goto(shareUrl, { waitUntil: "domcontentloaded" });
      await page.close();
      return context;
    };

    return browser;
  };
}

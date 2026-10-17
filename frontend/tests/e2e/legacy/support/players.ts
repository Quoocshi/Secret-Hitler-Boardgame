import type { Browser } from "@playwright/test";

// Config loading can run in another process; disable private DOM capture inside each worker too.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export async function independentPlayers(browser: Browser, count: number) {
  const contexts = await Promise.all(
    Array.from({ length: count }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  return {
    contexts,
    pages,
    close: () => Promise.all(contexts.map((context) => context.close())),
  };
}

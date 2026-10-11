import type { Browser } from "@playwright/test";
export async function players(browser: Browser, count: 5 | 10) {
 const contexts = await Promise.all(Array.from({ length: count }, () => browser.newContext()));
 const pages = await Promise.all(contexts.map(c => c.newPage()));
 return { contexts, pages, close: async () => { await Promise.all(contexts.map(c => c.close())); } };
}

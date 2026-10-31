import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

declare global {
  interface Window {
    soundStarts: number;
    soundDecoded: number;
  }
}

test("all eleven sound assets decode in the browser", async ({ page }) => {
  await page.goto("/");
  const durations = await page.evaluate(async () => {
    const context = new AudioContext();
    const names = [
      "softui.wav",
      "hardui.wav",
      "card-flip.mp3",
      "paper_quick.wav",
      "3_policy.mp3",
      "notify.wav",
      "error.wav",
      "knock.mp3",
      "gavel_game_start.mp3",
      "gavel_x1.mp3",
      "gunshot.mp3",
    ];
    try {
      return await Promise.all(
        names.map(async (name) => {
          const response = await fetch("/sound/" + name);
          if (!response.ok) {
            throw new Error("Missing sound asset");
          }
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer(),
          );
          return buffer.duration;
        }),
      );
    } finally {
      await context.close();
    }
  });
  expect(durations).toHaveLength(11);
  expect(durations.every((duration) => duration > 0)).toBe(true);
});

test("gesture unlock, mute, preferences and reload do not replay game sounds", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.soundStarts = 0;
    window.soundDecoded = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      window.soundStarts++;
      return start.apply(this, args);
    };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (data, success, failure) {
      return decode.call(this, data, success, failure).then((buffer) => {
        window.soundDecoded++;
        return buffer;
      });
    };
  });
  await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION", myRole: "LIBERAL" }),
  );
  expect(await page.evaluate(() => window.soundStarts)).toBe(0);
  // First gesture primes playback; an unloaded click is intentionally discarded.
  await page.getByRole("slider", { name: "Âm lượng hiệu ứng" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => page.evaluate(() => window.soundDecoded)).toBe(11);
  await page
    .getByRole("button", { name: "Lật thẻ vai trò", exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => window.soundStarts)).toBe(1);
  await page.getByRole("button", { name: "Tắt âm thanh", exact: true }).click();
  await page
    .getByRole("button", { name: "Úp thẻ vai trò", exact: true })
    .click();
  expect(await page.evaluate(() => window.soundStarts)).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Bật âm thanh", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.soundStarts)).toBe(0);
  await page.getByRole("button", { name: "Bật âm thanh", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.soundDecoded)).toBe(11);
  await page
    .getByRole("button", { name: "Lật thẻ vai trò", exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => window.soundStarts)).toBe(1);
});

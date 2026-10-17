import { expect, test } from "@playwright/test";
import { fixtureGroup, confirm, apiUrl } from "./support/fixtures";
import { syncGroup, ownState } from "./support/room";
import {
  observeRenders,
  calibrate,
  readyRecipients,
  renders,
  type TimingSample,
} from "./support/timing";
test.setTimeout(180000);
test("30 accepted changes: maximum commit-to-render latency over frozen recipients", async ({
  browser,
  request,
}, testInfo) => {
  const group = await fixtureGroup(browser, request, "nomination", 10);
  try {
    await group.pages[0]
      .getByLabel("Ứng viên Thủ tướng")
      .selectOption(group.players[2].playerId);
    await confirm(group.pages[0], "Đề cử");
    await syncGroup(group.pages);
    await Promise.all(group.pages.map(observeRenders));
    const clocks = await Promise.all(group.pages.map(calibrate));
    const identities = await Promise.all(
      group.pages.map(async (p) => (await ownState(p)).myPlayerId),
    );
    const measurements: {
      actionId: string;
      version: number;
      commitTime: number;
      recipients: {
        recipient: string;
        renderTime: number | null;
        latencyMs: number | null;
        uncertaintyMs: number;
      }[];
      latencyMs: number | null;
      passed: boolean;
    }[] = [];
    for (let i = 0; i < 30; i++) {
      const before = await syncGroup(group.pages);
      await readyRecipients(group.pages, request, before.stateVersion);
      await group.pages[0]
        .getByRole("button", {
          name: i % 2 === 0 ? "JA — Đồng ý" : "NEIN — Phản đối",
          exact: true,
        })
        .click();
      const response = await request.get(
        apiUrl + "/__test/timing/" + group.roomCode,
      );
      expect(response.ok()).toBe(true);
      const all: TimingSample[] = await response.json();
      await expect
        .poll(async () => {
          const response = await request.get(
            apiUrl + "/__test/timing/" + group.roomCode,
          );
          const samples: TimingSample[] = await response.json();
          return samples.some((s) => s.version === before.stateVersion + 1);
        })
        .toBe(true);
      const sample = (all.find((s) => s.version === before.stateVersion + 1) ??
        (
          (await (
            await request.get(apiUrl + "/__test/timing/" + group.roomCode)
          ).json()) as TimingSample[]
        ).find((s) => s.version === before.stateVersion + 1))!;
      expect(sample.recipients.slice().sort()).toEqual(
        identities.slice().sort(),
      );
      const deadline = Date.now() + 3000;
      let observed = await Promise.all(group.pages.map(renders));
      while (
        observed.some(
          (list) => !list.some((r) => r.version >= sample.version),
        ) &&
        Date.now() < deadline
      ) {
        await group.pages[0].waitForTimeout(20);
        observed = await Promise.all(group.pages.map(renders));
      }
      const recipients = sample.recipients.map((id) => {
        const index = identities.indexOf(id);
        const render = observed[index].find((r) => r.version >= sample.version);
        const clock = clocks[index];
        const renderTime = render ? render.time + clock.offset : null;
        return {
          recipient: "P" + (index + 1),
          renderTime,
          latencyMs:
            renderTime === null ? null : renderTime - sample.commitTime,
          uncertaintyMs: clock.uncertainty,
        };
      });
      const latency = recipients.some((r) => r.latencyMs === null)
        ? null
        : Math.max(...recipients.map((r) => r.latencyMs! + r.uncertaintyMs));
      measurements.push({
        actionId: sample.actionId,
        version: sample.version,
        commitTime: sample.commitTime,
        recipients,
        latencyMs: latency,
        passed:
          latency !== null &&
          latency <= 2000 &&
          recipients.every((r) => r.latencyMs! >= -r.uncertaintyMs),
      });
    }
    const finalClocks = await Promise.all(group.pages.map(calibrate));
    for (let i = 0; i < clocks.length; i++)
      {expect(Math.abs(finalClocks[i].offset - clocks[i].offset)).toBeLessThan(
        clocks[i].uncertainty + finalClocks[i].uncertainty + 5,
      );}
    await testInfo.attach("commit-render-timing", {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
    const passing = measurements.filter((sample) => sample.passed).length;
    console.log(
      "Commit-to-render",
      JSON.stringify({
        samples: measurements.length,
        passing,
        required: Math.ceil(0.95 * measurements.length),
        maxMs: Math.max(...measurements.map((s) => s.latencyMs ?? Infinity)),
        maxClockUncertaintyMs: Math.max(...clocks.map((c) => c.uncertainty)),
      }),
    );
    expect(passing).toBeGreaterThanOrEqual(
      Math.ceil(0.95 * measurements.length),
    );
  } finally {
    await group.close();
  }
});

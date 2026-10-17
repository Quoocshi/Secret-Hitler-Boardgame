import { expect, test } from "@playwright/test";
import { fixtureGroup, confirm } from "./support/fixtures";
import { ownState, syncGroup, voteAll } from "./support/room";

for (const scenario of [
  "near-liberal-win",
  "near-fascist-win",
  "near-hitler-elected",
  "near-hitler-executed",
])
  {test(
    "authoritative result and new room isolation: " + scenario,
    async ({ browser, request }) => {
      const group = await fixtureGroup(browser, request, scenario);
      try {
        const [president, chancellor] = group.pages;
        await syncGroup(group.pages);
        if (scenario === "near-hitler-elected") {
          await president
            .getByLabel("Ứng viên Thủ tướng")
            .selectOption(group.players[1].playerId);
          await confirm(president, "Đề cử");
          await voteAll(group.pages, "JA");
        } else if (scenario === "near-hitler-executed") {
          await president
            .getByLabel("Mục tiêu quyền lực")
            .selectOption(group.players[1].playerId);
          await confirm(president, "Xử bắn");
        } else {
          await chancellor
            .getByRole("button", {
              name:
                scenario === "near-liberal-win"
                  ? "Lá 2 — Tự do"
                  : "Lá 1 — Phát xít",
              exact: true,
            })
            .click();
          await confirm(chancellor, "Ban hành lá đã chọn");
        }
        const result = await syncGroup(group.pages);
        expect(result.currentPhase).toBe("GAME_OVER");
        expect(result.winner).toBe(
          scenario === "near-liberal-win" || scenario === "near-hitler-executed"
            ? "LIBERAL"
            : "FASCIST",
        );
        expect(result.winReason).toBeTruthy();
        for (const page of group.pages) {
          await expect(page.getByTestId("game-result")).toContainText(
            result.winner === "LIBERAL"
              ? "Phe Tự do chiến thắng"
              : "Phe Phát xít chiến thắng",
          );
          await expect(page.getByTestId("win-reason")).toHaveText(
            result.winReason!,
          );
          await expect(page.getByTestId("hand-card")).toHaveCount(0);
          await expect(
            page.getByText("LƯỢT CỦA BẠN", { exact: true }),
          ).toHaveCount(0);
          await expect(page.getByTestId("private-info")).toHaveCount(0);
          expect(
            (await ownState(page)).players.every(
              (player) => !Object.hasOwn(player, "role"),
            ),
          ).toBe(true);
        }
        await confirm(president, "Về trang đầu");
        await expect(president.getByLabel("Tên của bạn")).toHaveValue("P1");
        await president
          .getByRole("button", { name: "Tạo phòng", exact: true })
          .click();
        await expect(president.getByTestId("connection")).toHaveText(
          "Đã đồng bộ",
        );
        await expect(president.getByTestId("member-count")).toHaveText("1/10");
        expect((await ownState(president)).myRole).toBeNull();
        await expect(president.getByTestId("game-result")).toHaveCount(0);
      } finally {
        await group.close();
      }
    },
  );}

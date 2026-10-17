import { expect, it } from "vitest";
import { errorMessage, legacyApiError } from "@/lib/api/errors";

it("explains that started and finished rooms reject removed members joining again", () => {
  const error = legacyApiError(
    { message: "Trận đấu đã bắt đầu hoặc đã kết thúc" },
    400,
  );

  expect(error.code).toBe("ROOM_STARTED");
  expect(errorMessage(error)).toContain("hoặc kết thúc");
  expect(errorMessage(error)).toContain("Trở lại phòng chờ");
  expect(errorMessage(error)).toContain("mã phòng cũ");
});

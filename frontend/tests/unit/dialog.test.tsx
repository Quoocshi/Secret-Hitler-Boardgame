import { beforeAll, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
it("traps keyboard focus and never confirms on cancel", () => {
  const cancel = vi.fn();
  const confirm = vi.fn();
  render(
    <ConfirmDialog title="Đề cử" onCancel={cancel} onConfirm={confirm}>
      Chọn Bình
    </ConfirmDialog>,
  );
  const buttons = screen.getAllByRole("button");
  expect(buttons[0]).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
  expect(buttons[1]).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
  expect(buttons[0]).toHaveFocus();
  fireEvent.click(buttons[0]);
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
});

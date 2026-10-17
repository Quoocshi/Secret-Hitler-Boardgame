import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { StatusNotice } from "@/components/ui/StatusNotice";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("dismisses after five seconds without restarting on identical room updates", () => {
  const dismiss = vi.fn();
  const notice = (
    <StatusNotice
      message="Bàn chơi đã cập nhật."
      onDismiss={dismiss}
      autoDismissMs={5000}
    />
  );
  const { rerender } = render(notice);
  act(() => vi.advanceTimersByTime(3000));
  rerender(
    <StatusNotice
      message="Bàn chơi đã cập nhật."
      onDismiss={dismiss}
      autoDismissMs={5000}
    />,
  );
  act(() => vi.advanceTimersByTime(1999));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(dismiss).toHaveBeenCalledOnce();
});

it("allows clicking the notice to remove it immediately", () => {
  function Example() {
    const [message, setMessage] = useState<string | null>(
      "Bàn chơi đã cập nhật.",
    );
    return (
      <StatusNotice message={message} onDismiss={() => setMessage(null)} />
    );
  }
  render(<Example />);
  fireEvent.click(screen.getByRole("button", { name: /Đóng thông báo/ }));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("cancels an old dismissal timer when an error replaces the update notice", () => {
  const dismiss = vi.fn();
  const { rerender, unmount } = render(
    <StatusNotice
      message="Bàn chơi đã cập nhật."
      onDismiss={dismiss}
      autoDismissMs={5000}
    />,
  );
  act(() => vi.advanceTimersByTime(4000));
  rerender(<StatusNotice message="Mất kết nối." error />);
  act(() => vi.advanceTimersByTime(5000));
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Mất kết nối.");
  unmount();
  act(() => vi.runAllTimers());
  expect(dismiss).not.toHaveBeenCalled();
});

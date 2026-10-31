import { useEffect, useRef } from "react";
import { Button } from "./Button";
export function ConfirmDialog({
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Xác nhận",
}: {
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocusedElement =
      document.activeElement as HTMLElement | null;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      dialog?.close();
      previouslyFocusedElement?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") {
          return;
        }
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            "button, input, select, [tabindex='0']",
          ) ?? [],
        ).filter((element) => !element.hasAttribute("disabled"));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <div>{children}</div>
      <div className="dialog-actions">
        <Button onClick={onCancel}>Hủy</Button>
        <Button className="primary" sound="hardui" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

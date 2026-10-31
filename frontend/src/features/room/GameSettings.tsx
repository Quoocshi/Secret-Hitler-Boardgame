import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SoundControls } from "@/components/ui/SoundControls";
import { LeaveButton } from "./LeaveButton";
import { useRoomSession } from "./RoomSessionProvider";
import "./game-settings.css";

const VIEWPORT_MARGIN = 12;
const TRIGGER_GAP = 8;

function positionSettings(trigger: HTMLElement, panel: HTMLElement) {
  const bounds = trigger.getBoundingClientRect();
  const panelBounds = panel.getBoundingClientRect();
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(
      bounds.right - panelBounds.width,
      innerWidth - panelBounds.width - VIEWPORT_MARGIN,
    ),
  );
  const below = bounds.bottom + TRIGGER_GAP;
  const top =
    below + panelBounds.height <= innerHeight - VIEWPORT_MARGIN
      ? below
      : Math.max(
          VIEWPORT_MARGIN,
          bounds.top - TRIGGER_GAP - panelBounds.height,
        );
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

export function GameSettings({ showLeave = false }: { showLeave?: boolean }) {
  const { state, leave } = useRoomSession();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  function closeSettings() {
    panelRef.current?.hidePopover();
    setOpen(false);
    triggerRef.current?.focus();
  }

  function toggleSettings() {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) {
      return;
    }
    if (panel.matches(":popover-open")) {
      closeSettings();
      return;
    }
    panel.showPopover();
    positionSettings(trigger, panel);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const reposition = () => {
      if (triggerRef.current && panelRef.current) {
        positionSettings(triggerRef.current, panelRef.current);
      }
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  return (
    <div className="game-settings">
      <Button
        ref={triggerRef}
        className="settings-trigger"
        sound="paper"
        aria-label="Cài đặt"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={toggleSettings}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/settings.svg`}
          alt=""
          width="24"
          height="24"
          draggable={false}
        />
      </Button>
      <div
        ref={panelRef}
        id={panelId}
        className="settings-panel"
        popover="auto"
        role="dialog"
        aria-labelledby={`${panelId}-title`}
        onToggle={(event) =>
          setOpen((event.nativeEvent as ToggleEvent).newState === "open")
        }
      >
        <div className="settings-heading">
          <h2 id={`${panelId}-title`}>Cài đặt</h2>
          <Button
            className="settings-close"
            aria-label="Đóng cài đặt"
            onClick={closeSettings}
          >
            ×
          </Button>
        </div>
        <p className="eyebrow">ÂM THANH</p>
        <SoundControls />
        {showLeave && (
          <div className="settings-leave">
            <LeaveButton
              onLeave={leave}
              onOpen={closeSettings}
              disabled={state.connection === "leaving"}
              localOnly={["expired", "removed", "duplicate"].includes(
                state.connection,
              )}
              label={
                state.connection === "removed" ? "Về trang đầu" : "Rời phòng"
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

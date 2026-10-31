import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { PlayerView } from "@/lib/game/types";
import { chancellorEligibility } from "@/lib/game/permissions";
import { gameAssets } from "@/lib/game/presentation";
import { Button } from "@/components/ui/Button";
import { audioManager } from "@/lib/audio/audio-manager";

export function ChancellorPicker({
  snapshot,
  value,
  enabled,
  onChange,
}: {
  snapshot: PlayerView;
  value: string;
  enabled: boolean;
  onChange: (playerId: string) => void;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const candidates = snapshot.players
    .map((player) => ({
      player,
      permission: chancellorEligibility(snapshot, player.id),
    }))
    .sort(
      (first, second) =>
        Number(second.permission.allowed) - Number(first.permission.allowed),
    );
  const available = candidates.filter(
    (candidate) => candidate.permission.allowed,
  );
  const selected = snapshot.players.find((player) => player.id === value);

  function positionPopover() {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) {
      return;
    }
    const bounds = trigger.getBoundingClientRect();
    const margin = 12;
    const gap = 6;
    const width = Math.min(
      Math.max(bounds.width, 300),
      window.innerWidth - margin * 2,
    );
    const spaceBelow = window.innerHeight - bounds.bottom - gap - margin;
    const spaceAbove = bounds.top - gap - margin;
    const placeBelow = spaceBelow >= 240 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      0,
      Math.min(400, placeBelow ? spaceBelow : spaceAbove),
    );
    popover.style.width = `${width}px`;
    popover.style.maxHeight = `${maxHeight}px`;
    popover.style.left = `${Math.max(margin, Math.min(bounds.left, window.innerWidth - width - margin))}px`;
    popover.style.top = `${placeBelow ? bounds.bottom + gap : Math.max(margin, bounds.top - gap - popover.getBoundingClientRect().height)}px`;
  }

  function closePicker(restoreFocus = true) {
    popoverRef.current?.hidePopover();
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function openPicker() {
    if (!enabled) {
      return;
    }
    setActiveId(
      available.find((candidate) => candidate.player.id === value)?.player.id ??
        available[0]?.player.id ??
        "",
    );
    // The native top layer avoids clipping by the desktop action column's scroll area.
    popoverRef.current?.showPopover();
    positionPopover();
    setOpen(true);
    audioManager.play("paper");
  }

  function choose(playerId: string) {
    if (!enabled || !chancellorEligibility(snapshot, playerId).allowed) {
      return;
    }
    if (value !== playerId) {
      audioManager.play("softui");
    }
    onChange(playerId);
    closePicker();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closePicker();
    } else if (event.key === "Tab" && open) {
      closePicker(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openPicker();
        return;
      }
      if (available.length === 0) {
        return;
      }
      const currentIndex = available.findIndex(
        (candidate) => candidate.player.id === activeId,
      );
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + available.length) % available.length;
      setActiveId(available[nextIndex]?.player.id ?? "");
    } else if ((event.key === "Home" || event.key === "End") && open) {
      event.preventDefault();
      const candidate = event.key === "Home" ? available[0] : available.at(-1);
      setActiveId(candidate?.player.id ?? "");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        choose(activeId);
      } else {
        openPicker();
      }
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && activeId) {
      document
        .getElementById(`${listId}-${activeId}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeId, listId]);

  useEffect(() => {
    if (!enabled) {
      popoverRef.current?.hidePopover();
    }
  }, [enabled]);

  return (
    <div className="chancellor-picker">
      <label id={`${listId}-label`} htmlFor="nominee">
        Ứng viên Thủ tướng
      </label>
      <Button
        sound={false}
        id="nominee"
        ref={triggerRef}
        className="candidate-trigger"
        role="combobox"
        aria-labelledby={`${listId}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && activeId ? `${listId}-${activeId}` : undefined
        }
        disabled={!enabled}
        onClick={() => (open ? closePicker() : openPicker())}
        onKeyDown={handleKeyDown}
      >
        <img src={gameAssets.chancellor} alt="" width="24" height="24" />
        <span>{selected?.nickname ?? "Chọn người đủ điều kiện"}</span>
        <span className="candidate-chevron" aria-hidden="true" />
      </Button>
      <div
        ref={popoverRef}
        popover="auto"
        className="candidate-popover"
        onToggle={(event) =>
          setOpen((event.nativeEvent as ToggleEvent).newState === "open")
        }
      >
        <div className="candidate-list-heading">
          <strong>Chọn ứng viên</strong>
          <span>{available.length} người đủ điều kiện</span>
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-label`}
          className="candidate-list"
        >
          {candidates.map(({ player, permission }) => (
            <li
              key={player.id}
              id={`${listId}-${player.id}`}
              role="option"
              aria-selected={value === player.id}
              aria-disabled={!permission.allowed}
              data-player-id={player.id}
              data-active={activeId === player.id}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => permission.allowed && setActiveId(player.id)}
              onClick={() => choose(player.id)}
            >
              <span className="candidate-avatar" aria-hidden="true">
                {player.nickname.slice(0, 1).toUpperCase()}
              </span>
              <span className="candidate-description">
                <strong>
                  {player.nickname}
                  {player.id === snapshot.myPlayerId && " (Bạn)"}
                </strong>
                <span>
                  {permission.allowed ? "Có thể đề cử" : permission.reason}
                </span>
              </span>
              {value === player.id && (
                <span className="candidate-selected" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

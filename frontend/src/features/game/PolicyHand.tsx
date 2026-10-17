import type { Policy } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";

interface PolicyHandProps {
  cards: Policy[];
  selected?: number | null;
  onSelect?: (index: number) => void;
  enabled?: boolean;
}

export function PolicyHand({
  cards,
  selected,
  onSelect,
  enabled = true,
}: PolicyHandProps) {
  return (
    <div className="policy-hand" aria-label="Lá chính sách riêng">
      {cards.map((card, index) => {
        const cardNumber = index + 1;
        const policyClass =
          card === "LIBERAL" ? "liberal-card" : "fascist-card";
        const cardClass = `policy-card ${policyClass}`;
        const isSelected = selected === index;

        if (!onSelect) {
          return (
            <div key={index} data-testid="hand-card" className={cardClass}>
              <span>LÁ {cardNumber}</span>
              <strong>{policyLabels[card]}</strong>
            </div>
          );
        }

        return (
          <button
            key={index}
            data-testid="hand-card"
            className={`${cardClass} ${isSelected ? "selected" : ""}`}
            aria-pressed={isSelected}
            disabled={!enabled}
            onClick={() => onSelect(index)}
            aria-label={`Lá ${cardNumber} — ${policyLabels[card]}`}
          >
            <span>LÁ {cardNumber}</span>
            <strong>{policyLabels[card]}</strong>
            {isSelected && <small>Đã chọn</small>}
          </button>
        );
      })}
    </div>
  );
}

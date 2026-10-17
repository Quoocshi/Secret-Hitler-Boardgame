import type { PlayerView } from "@/lib/game/types";
import { legacyView } from "./legacy-view";

export const view = (overrides: Partial<PlayerView> = {}): PlayerView =>
  legacyView(overrides);

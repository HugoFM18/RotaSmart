import { create } from "zustand";
import type { Priorities } from "./engine";

export type LayerId = "ndvi" | "precip" | "temp" | null;

type Store = {
  selected: string | null;
  priorities: Priorities;
  scenario: { rain: number; temp: number };
  layer: LayerId;
  setSelected: (id: string | null) => void;
  setPriority: (key: keyof Priorities, value: number) => void;
  setScenario: (scenario: { rain: number; temp: number }) => void;
  setLayer: (layer: LayerId) => void;
  resetScenario: () => void;
};

export const DEFAULT_PRIORITIES: Priorities = {
  water: 70,
  income: 50,
  risk: 60,
  soil: 65,
  labor: 40,
};

export const useStore = create<Store>((set) => ({
  selected: "neiva",
  priorities: DEFAULT_PRIORITIES,
  scenario: { rain: 0, temp: 0 },
  layer: null,
  setSelected: (id) => set({ selected: id }),
  setPriority: (key, value) =>
    set((s) => ({ priorities: { ...s.priorities, [key]: value } })),
  setScenario: (scenario) => set({ scenario }),
  setLayer: (layer) => set({ layer }),
  resetScenario: () => set({ scenario: { rain: 0, temp: 0 } }),
}));

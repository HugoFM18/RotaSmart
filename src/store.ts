import { create } from "zustand";
import type { CropId, Priorities } from "./engine";

type Store = {
  lat: number;
  lon: number;
  place: string | null;
  crop: CropId;
  priorities: Priorities;
  scenario: { rain: number; temp: number };
  flyToken: number;
  setPoint: (lat: number, lon: number) => void;
  focusPoint: (lat: number, lon: number, place?: string | null) => void;
  setPlace: (place: string | null) => void;
  setCrop: (crop: CropId) => void;
  setPriority: (key: keyof Priorities, value: number) => void;
  setScenario: (scenario: { rain: number; temp: number }) => void;
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
  lat: 2.9345,
  lon: -75.2809,
  place: "Neiva, Huila, Colombia",
  crop: "maiz",
  priorities: DEFAULT_PRIORITIES,
  scenario: { rain: 0, temp: 0 },
  flyToken: 0,

  setPoint: (lat, lon) => set({ lat, lon }),
  focusPoint: (lat, lon, place = null) =>
    set((s) => ({ lat, lon, place, flyToken: s.flyToken + 1 })),
  setPlace: (place) => set({ place }),
  setCrop: (crop) => set({ crop }),
  setPriority: (key, value) =>
    set((s) => ({ priorities: { ...s.priorities, [key]: value } })),
  setScenario: (scenario) => set({ scenario }),
  resetScenario: () => set({ scenario: { rain: 0, temp: 0 } }),
}));

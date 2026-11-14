import { create } from "zustand";
import type { CropId, Priorities } from "./engine";

export type BBox = [number, number, number, number]; // [sur, oeste, norte, este]

type Store = {
  lat: number;
  lon: number;
  place: string | null;
  polygon: any | null;
  bbox: BBox | null;
  crop: CropId;
  priorities: Priorities;
  scenario: { rain: number; temp: number };
  flyToken: number;
  areaStatus: "idle" | "loading" | "ready" | "unavailable";
  setAreaStatus: (status: "idle" | "loading" | "ready" | "unavailable") => void;
  setPoint: (lat: number, lon: number) => void;
  focusArea: (
    lat: number,
    lon: number,
    place: string | null,
    polygon: any | null,
    bbox: BBox | null,
  ) => void;
  setPlace: (place: string | null) => void;
  setArea: (polygon: any | null, bbox: BBox | null, place: string | null) => void;
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
  polygon: null,
  bbox: null,
  crop: "maiz",
  priorities: DEFAULT_PRIORITIES,
  scenario: { rain: 0, temp: 0 },
  flyToken: 0,
  areaStatus: "idle",
  setAreaStatus: (areaStatus) => set({ areaStatus }),

  setPoint: (lat, lon) => set({ lat, lon, place: null, polygon: null, bbox: null, areaStatus: "idle" }),
  focusArea: (lat, lon, place, polygon, bbox) =>
    set((s) => ({ lat, lon, place, polygon, bbox, areaStatus: polygon ? "ready" : "idle", flyToken: s.flyToken + 1 })),
  setPlace: (place) => set({ place }),
  setArea: (polygon, bbox, place) =>
    set((s) => ({ polygon, bbox, place, areaStatus: polygon ? "ready" : "unavailable", flyToken: s.flyToken + 1 })),
  setCrop: (crop) => set({ crop }),
  setPriority: (key, value) =>
    set((s) => ({ priorities: { ...s.priorities, [key]: value } })),
  setScenario: (scenario) => set({ scenario }),
  resetScenario: () => set({ scenario: { rain: 0, temp: 0 } }),
}));

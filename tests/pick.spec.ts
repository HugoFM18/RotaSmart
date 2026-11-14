import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../src/store";

vi.mock("../src/site", () => ({ fetchArea: vi.fn() }));
vi.mock("../src/i18n", () => ({ default: { resolvedLanguage: "es" } }));

import { fetchArea } from "../src/site";
import { pickLocation } from "../src/pick";

describe("map boundary selection", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useStore.setState({ lat: 0, lon: 0, place: null, polygon: null, bbox: null, areaStatus: "idle" });
  });

  it("marks the clicked point immediately and then stores its boundary", async () => {
    const polygon = { type: "Polygon", coordinates: [[[-76, 2], [-75, 2], [-75, 3], [-76, 2]]] };
    vi.mocked(fetchArea).mockResolvedValue({ polygon, bbox: [2, -76, 3, -75], name: "Region" });
    pickLocation(2.5, -75.5);
    expect(useStore.getState().lat).toBe(2.5);
    await vi.waitFor(() => expect(useStore.getState().areaStatus).toBe("ready"), { timeout: 2000 });
    expect(useStore.getState().polygon).toEqual(polygon);
  });

  it("reports unavailable boundaries instead of remaining in loading state", async () => {
    vi.mocked(fetchArea).mockResolvedValue(null);
    pickLocation(4, -74);
    await vi.waitFor(() => expect(useStore.getState().areaStatus).toBe("unavailable"), { timeout: 2500 });
  });

  it("does not overwrite a location selected while an old request was in flight", async () => {
    let resolve!: (value: any) => void;
    vi.mocked(fetchArea).mockReturnValue(new Promise((done) => { resolve = done; }));
    pickLocation(3, -75);
    await vi.waitFor(() => expect(fetchArea).toHaveBeenCalled(), { timeout: 2500 });
    useStore.getState().focusArea(8, -70, "New region", null, null);
    resolve({ polygon: null, bbox: [2, -76, 4, -74], name: "Old region" });
    await Promise.resolve();
    expect(useStore.getState().place).toBe("New region");
    expect(useStore.getState().bbox).toBeNull();
  });
});

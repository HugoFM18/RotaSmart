import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStore } from "../src/store";
import { pickLocation } from "../src/pick";

const mocks = vi.hoisted(() => ({ localArea: vi.fn(), fetchArea: vi.fn() }));
vi.mock("../src/map/boundaries", () => ({ localArea: mocks.localArea }));
vi.mock("../src/site", () => ({ fetchArea: mocks.fetchArea }));
vi.mock("../src/i18n", () => ({ default: { resolvedLanguage: "es" } }));

beforeEach(() => {
  mocks.localArea.mockReset();
  mocks.localArea.mockResolvedValue(null);
  mocks.fetchArea.mockReset();
  useStore.setState({ lat: 2.9, lon: -75.2, polygon: null, bbox: null, place: null, flyToken: 0, areaStatus: "idle" });
});

describe("map selection requests", () => {
  it("marks the clicked point immediately and then stores its boundary", async () => {
    const polygon = { type: "Polygon", coordinates: [[[-76, 2], [-75, 2], [-75, 3], [-76, 2]]] };
    mocks.fetchArea.mockResolvedValue({ polygon, bbox: [2, -76, 3, -75], name: "Region" });
    pickLocation(2.5, -75.5);
    expect(useStore.getState().lat).toBe(2.5);
    expect(useStore.getState().areaStatus).toBe("loading");
    await vi.waitFor(() => expect(useStore.getState().areaStatus).toBe("ready"), { timeout: 2500 });
    expect(useStore.getState().polygon).toEqual(polygon);
  });

  it("reports unavailable boundaries instead of remaining in loading state", async () => {
    mocks.fetchArea.mockResolvedValue(null);
    pickLocation(4, -74);
    await vi.waitFor(() => expect(useStore.getState().areaStatus).toBe("unavailable"), { timeout: 2500 });
  });

  it("does not overwrite a search at another coordinate with an old network response", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.fetchArea.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    pickLocation(3, -75);
    await vi.waitFor(() => expect(mocks.fetchArea).toHaveBeenCalled(), { timeout: 2500 });
    useStore.getState().focusArea(8, -70, "New region", null, null);
    finish({ polygon: null, bbox: [2, -76, 4, -74], name: "Old region" });
    await Promise.resolve();
    expect(useStore.getState().place).toBe("New region");
    expect(useStore.getState().bbox).toBeNull();
  });

  it("keeps the newest selected area when an earlier request finishes later", async () => {
    let finishFirst: (value: unknown) => void = () => {};
    mocks.localArea.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockResolvedValueOnce({ polygon: null, bbox: [1, -77, 3, -75], name: "Latest area" });
    pickLocation(3, -75);
    pickLocation(2, -76);
    await vi.waitFor(() => expect(useStore.getState().place).toBe("Latest area"));
    finishFirst({ polygon: null, bbox: [2, -76, 4, -74], name: "Old area" });
    await Promise.resolve();
    expect(useStore.getState().place).toBe("Latest area");
    expect(mocks.fetchArea).not.toHaveBeenCalled();
  });

  it("does not replace a search selection with an older map request at the same coordinate", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.localArea.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    pickLocation(3, -75);
    useStore.getState().focusArea(3, -75, "Search result", null, [2, -76, 4, -74]);
    finish({ polygon: null, bbox: [2, -76, 4, -74], name: "Old map result" });
    await Promise.resolve();
    expect(useStore.getState().place).toBe("Search result");
  });
});

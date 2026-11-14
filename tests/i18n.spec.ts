import { describe, it, expect } from "vitest";
import es from "../src/i18n/es.json";
import en from "../src/i18n/en.json";

const flat = (obj: any, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe("i18n", () => {
  it("es y en tienen exactamente las mismas claves", () => {
    expect(flat(es).sort()).toEqual(flat(en).sort());
  });
});

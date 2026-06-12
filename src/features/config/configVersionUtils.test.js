import { describe, test, expect } from "vitest";
import { compareAppVersions } from "./configVersionUtils.js";

describe("compareAppVersions — igualdad", () => {
  test("misma versión → 0", () => {
    expect(compareAppVersions("6.0.50", "6.0.50")).toBe(0);
  });

  test("versiones con dos segmentos iguales → 0", () => {
    expect(compareAppVersions("2.0", "2.0")).toBe(0);
  });

  test("versiones con un segmento iguales → 0", () => {
    expect(compareAppVersions("3", "3")).toBe(0);
  });
});

describe("compareAppVersions — mayor", () => {
  test("MAJOR mayor → > 0", () => {
    expect(compareAppVersions("7.0.0", "6.0.0")).toBeGreaterThan(0);
  });

  test("MINOR mayor → > 0", () => {
    expect(compareAppVersions("6.1.0", "6.0.50")).toBeGreaterThan(0);
  });

  test("PATCH mayor → > 0", () => {
    expect(compareAppVersions("6.0.51", "6.0.50")).toBeGreaterThan(0);
  });

  test("6.0.10 > 6.0.9 (no lexicográfico)", () => {
    expect(compareAppVersions("6.0.10", "6.0.9")).toBeGreaterThan(0);
  });

  test("6.0.100 > 6.0.99", () => {
    expect(compareAppVersions("6.0.100", "6.0.99")).toBeGreaterThan(0);
  });
});

describe("compareAppVersions — menor", () => {
  test("MAJOR menor → < 0", () => {
    expect(compareAppVersions("5.9.9", "6.0.0")).toBeLessThan(0);
  });

  test("MINOR menor → < 0", () => {
    expect(compareAppVersions("6.0.49", "6.1.0")).toBeLessThan(0);
  });

  test("PATCH menor → < 0", () => {
    expect(compareAppVersions("6.0.49", "6.0.50")).toBeLessThan(0);
  });

  test("6.0.9 < 6.0.10 (no lexicográfico)", () => {
    expect(compareAppVersions("6.0.9", "6.0.10")).toBeLessThan(0);
  });
});

describe("compareAppVersions — versiones inusuales", () => {
  test("versión ausente (null/undefined) equivale a '0.0.0' y es menor que cualquier versión real", () => {
    expect(compareAppVersions("6.0.50", null)).toBeGreaterThan(0);
    expect(compareAppVersions("6.0.50", undefined)).toBeGreaterThan(0);
    expect(compareAppVersions("1.0.0", "")).toBeGreaterThan(0);
  });

  test("cadena vacía → equivale a 0.0.0", () => {
    expect(compareAppVersions("", "")).toBe(0);
    expect(compareAppVersions("0.0.0", "")).toBe(0);
  });

  test("versión con solo dos segmentos: '6.1' equivale a '6.1.0'", () => {
    expect(compareAppVersions("6.1", "6.1.0")).toBe(0);
    expect(compareAppVersions("6.2", "6.1.9")).toBeGreaterThan(0);
  });
});

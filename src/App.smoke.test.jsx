import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import App from "./App.jsx";

describe("App smoke", () => {
  test("renders without crashing", () => {
    expect(() => renderToString(<App />)).not.toThrow();
  }, 30000);
});

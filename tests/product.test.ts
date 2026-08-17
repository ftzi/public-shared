import { describe, expect, test } from "bun:test";

import { action, component, product, region, screen, system } from "../product/product.ts";

describe("product graph model", () => {
  test("models nested layout regions inside one routed screen", () => {
    const button = component({
      description: "A button rendered inside the nested action region.",
      testId: "action-button",
    });
    const actionRegion = region({
      components: { button },
      description: "A nested region containing actions for the current view.",
      regions: {},
    });
    const screenRegion = region({
      components: {},
      description: "The main workspace region for this screen.",
      regions: { actionRegion },
    });
    const save = action({
      description: "Persists the current workspace state.",
      outcomes: { saved: {} },
    });
    const workspace = system({
      actions: { save },
      description: "The workspace persistence system.",
    });
    const app = product({
      description: "A product with one routed screen and nested layout regions.",
      screens: {
        workspace: screen({
          description: "The workspace screen.",
          regions: { screenRegion },
          route: "/",
        }),
      },
      systems: { workspace },
    });

    expect(app.screens.workspace.regions.screenRegion.regions.actionRegion.components.button).toBe(
      button,
    );
    expect(app.screens.workspace.route).toBe("/");
  });
});

// @ts-expect-error Graph declarations require a plain-language description.
const missingActionDescription = action({ outcomes: {} });
void missingActionDescription;

// @ts-expect-error Graph declarations require a plain-language description.
const missingComponentDescription = component({});
void missingComponentDescription;

// @ts-expect-error Graph declarations require a plain-language description.
const missingRegionDescription = region({ components: {}, regions: {} });
void missingRegionDescription;

// @ts-expect-error Graph declarations require a plain-language description.
const missingScreenDescription = screen({ regions: {}, route: "/" });
void missingScreenDescription;

// @ts-expect-error Screens own regions rather than direct components.
screen({ components: {}, description: "Screen.", regions: {}, route: "/" });

// @ts-expect-error Graph declarations require a plain-language description.
const missingSystemDescription = system({ actions: {} });
void missingSystemDescription;

// @ts-expect-error Graph declarations require a plain-language description.
const missingProductDescription = product({ screens: {}, systems: {} });
void missingProductDescription;

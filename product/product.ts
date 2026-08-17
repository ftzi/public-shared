type TestRef = {
  readonly kind: "unit" | "playwright" | "maestro" | "visual" | "a11y";
  readonly path: string;
};

// A captured screenshot of a node, per platform. `kind` says which surface
// the screenshot shows (mobile = native app, web = browser); `path` points
// at the screenshot file or the spec that captures it.
type ScreenshotRef = {
  readonly kind: "mobile" | "web";
  readonly path: string;
};

type Metadata = {
  // Plain-language intent: why this exists, what it costs, what it is for.
  // The graph is the design-review surface — every declaration MUST carry a
  // description so complexity is visible before it lands (see the
  // 1-product-audit skill).
  readonly description: string;
  readonly skills?: readonly string[];
  readonly tests?: readonly TestRef[];
  readonly screenshots?: readonly ScreenshotRef[];
};

type Outcome = {
  readonly tests?: readonly TestRef[];
};

type OutcomeHandler = {
  readonly navigatesTo?: Screen;
  readonly show?: Component | Region;
};

export type Action = Metadata & {
  readonly kind: "action";
  readonly calls?: readonly Action[];
  readonly outcomes: Readonly<Record<string, Outcome>>;
};

export type System = Metadata & {
  readonly kind: "system";
  readonly provider?: string;
  readonly actions: Readonly<Record<string, Action>>;
};

export type Component = Metadata & {
  readonly kind: "component";
  readonly testId?: string;
  readonly triggers?: Action;
  readonly on?: Readonly<Record<string, OutcomeHandler>>;
};

export type Region = Metadata & {
  readonly kind: "region";
  readonly components: Readonly<Record<string, Component>>;
  readonly regions: Readonly<Record<string, Region>>;
};

export type Screen = Metadata & {
  readonly kind: "screen";
  readonly route: string;
  readonly regions: Readonly<Record<string, Region>>;
};

export type Product = Metadata & {
  readonly kind: "product";
  readonly systems: Readonly<Record<string, System>>;
  readonly screens: Readonly<Record<string, Screen>>;
};

export const action = (input: Omit<Action, "kind">): Action => ({
  kind: "action",
  ...input,
});

export const system = (input: Omit<System, "kind">): System => ({
  kind: "system",
  ...input,
});

export const component = (input: Omit<Component, "kind">): Component => ({
  kind: "component",
  ...input,
});

export const region = (input: Omit<Region, "kind">): Region => ({
  kind: "region",
  ...input,
});

export const screen = (input: Omit<Screen, "kind">): Screen => ({
  kind: "screen",
  ...input,
});

export const product = (input: Omit<Product, "kind">): Product => ({
  kind: "product",
  ...input,
});

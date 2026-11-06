import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/use-vehicle-catalog", () => ({ useVehicleCatalog: () => ({ failed: false,
  data: { makes: ["Rusi"], models: ["Surf"], engines: [{ label: "125cc 4-stroke (nominal)" }], hasUnverifiedYears: true },
}) }));
import { VehiclePicker } from "./vehicle-picker";

describe("vehicle picker custom details", () => {
  it("preserves a saved custom motorcycle model and engine on mount", () => {
    const change=vi.fn();
    render(<VehiclePicker category="motorcycle" year="2023" make="Rusi" model="Custom Surf build" engine="110cc replacement" onChange={change} />);
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByText("Custom Surf build")).toBeInTheDocument();
    expect(screen.getByText(/no documented year range/)).toBeInTheDocument();
  });
});

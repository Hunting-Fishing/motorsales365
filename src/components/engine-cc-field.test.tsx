import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EngineCcField } from "./engine-cc-field";

describe("manual engine CC", () => {
  it("accepts decimals independently of model/trim and allows clearing", () => {
    const change = vi.fn();
    const { rerender } = render(<EngineCcField value="" onChange={change} />);
    const input = screen.getByLabelText("Engine size (CC, optional)");
    fireEvent.change(input, { target: { value: "171.7" } });
    expect(change).toHaveBeenLastCalledWith("171.7");
    rerender(<EngineCcField value="171.7" onChange={change} />);
    expect(input).toHaveValue(171.7);
    fireEvent.change(input, { target: { value: "" } });
    expect(change).toHaveBeenLastCalledWith("");
    expect(input).not.toBeRequired();
  });
});

import { describe, expect, it, vi } from "vitest";
import { withReceiptAbort } from "./receipt-abort";

describe("receipt chunk loading cancellation", () => {
  it("returns successful values without a signal", async () => {
    await expect(withReceiptAbort(Promise.resolve(7))).resolves.toBe(7);
  });
  it("rejects immediately while a chunk is stalled", async () => {
    const controller = new AbortController();
    const pending = withReceiptAbort(new Promise(() => {}), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
  it("handles late rejection after cancellation", async () => {
    const controller = new AbortController();
    let fail!: (error: Error) => void;
    const chunk = new Promise<never>((_resolve, reject) => {
      fail = reject;
    });
    const pending = withReceiptAbort(chunk, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    fail(new Error("Late network failure"));
    await chunk.catch(() => {});
  });
  it("does not return a late success to an already cancelled caller", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(withReceiptAbort(Promise.resolve(7), controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
  it("removes listeners when loading fails or succeeds", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    await expect(withReceiptAbort(Promise.resolve(7), controller.signal)).resolves.toBe(7);
    await expect(
      withReceiptAbort(Promise.reject(new Error("Network failed")), controller.signal),
    ).rejects.toThrow("Network failed");
    expect(remove).toHaveBeenCalledTimes(2);
  });
});

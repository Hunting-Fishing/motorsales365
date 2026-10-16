import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createReceiptCommandIngress } from "./receipt-command-ingress.server";

// Only receipt-expense recording uses this ingress. The original Request and
// bearer-bound capability are captured before TanStack shallow-merges context.
// This establishes command custody, not native shop/financial authorization.
export const receiptCommandMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const context = await createReceiptCommandIngress(request);
    return next({ context });
  },
);

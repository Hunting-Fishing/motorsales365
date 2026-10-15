import { z } from "zod";

export const MAX_CHAT_MEMBERS = 100;
export const MAX_CHAT_TITLE_LENGTH = 80;
export const CHAT_COMMAND_FAILURE =
  "Could not confirm this request. Refresh messages before trying again.";

const uuid = z.string().uuid();
const actor = { expectedAccountId: uuid };
const thread = { ...actor, threadId: uuid };
const memberIds = z.array(uuid).min(1).max(MAX_CHAT_MEMBERS);
const sameUuid = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

export const chatCommandInput = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...actor,
        kind: z.literal("create"),
        title: z.string().trim().min(1).max(MAX_CHAT_TITLE_LENGTH),
        memberIds,
      })
      .strict(),
    z.object({ ...thread, kind: z.literal("invite"), memberIds }).strict(),
    z.object({ ...thread, kind: z.literal("respond"), accept: z.boolean() }).strict(),
    z.object({ ...thread, kind: z.literal("leave") }).strict(),
    z.object({ ...thread, kind: z.literal("mark_read") }).strict(),
    z.object({ ...thread, kind: z.literal("mark_unread") }).strict(),
  ])
  .superRefine((input, context) => {
    if (input.kind !== "create" && input.kind !== "invite") return;
    const ids = input.memberIds.map((id) => id.toLowerCase());
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => sameUuid(id, input.expectedAccountId))
    ) {
      context.addIssue({ code: "custom", message: "Choose distinct members other than yourself." });
    }
  });

export type ChatCommandInput = z.infer<typeof chatCommandInput>;

const resultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("created"), threadId: uuid }).strict(),
  z
    .object({
      kind: z.literal("invited"),
      threadId: uuid,
      insertedCount: z.number().int().min(0).max(2_147_483_647),
    })
    .strict(),
  z
    .object({
      kind: z.literal("acknowledged"),
      operation: z.enum(["respond", "leave", "mark_read", "mark_unread"]),
      threadId: uuid,
      effect: z.literal("unverified"),
    })
    .strict(),
]);

export type ChatCommandResult = z.infer<typeof resultSchema>;

export function parseChatCommandResult(raw: unknown, input: ChatCommandInput): ChatCommandResult {
  try {
    const request = chatCommandInput.parse(input);
    const result = resultSchema.parse(raw);
    if (request.kind === "create") {
      if (result.kind !== "created") throw new Error();
    } else if (request.kind === "invite") {
      if (
        result.kind !== "invited" ||
        !sameUuid(result.threadId, request.threadId) ||
        result.insertedCount > request.memberIds.length
      ) {
        throw new Error();
      }
    } else if (
      result.kind !== "acknowledged" ||
      result.operation !== request.kind ||
      !sameUuid(result.threadId, request.threadId)
    ) {
      throw new Error();
    }
    return result;
  } catch {
    // A malformed acknowledgement can follow a committed write. Do not expose
    // private parser details or describe validation failure as a rollback.
    throw new Error(CHAT_COMMAND_FAILURE);
  }
}

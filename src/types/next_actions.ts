import z from "zod";
import { FollowUpStatus } from "../app/generated/prisma/enums";

export const NextActionSchema = z.object({
    label: z
        .string({ error: "Label is required" })
        .trim()
        .min(2, "Label must be at least 2 characters long")
        .max(50, "Label too long"),

    formId: z
        .string({ error: "Form ID is required" })
        .trim(),

    status: z.enum(FollowUpStatus, {
        error: "Status is required",
    }),
})

export type NextActionType = z.infer<typeof NextActionSchema>

import z from "zod";
import { FollowUpStatus } from "../app/generated/prisma/enums";

export const NextActionSchema = z.object({
    formId: z
        .string({ error: "Form ID is required" })
        .trim(),
    actions: z.array(z.object({
        id: z
            .uuid()
            .optional()
            .or(z.literal("")),
        label: z
            .string({ error: "Label is required" })
            .trim()
            .min(2, "Label must be at least 2 characters long")
            .max(50, "Label too long"),

        status: z.enum(FollowUpStatus, {
            error: "Status is required",
        }),
        isDefault: z.boolean().optional().default(true),
        order: z.number().optional(),
    }))
})

export type NextActionType = z.infer<typeof NextActionSchema>

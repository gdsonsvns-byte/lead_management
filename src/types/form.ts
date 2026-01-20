import { z } from "zod"

export const formFieldSchema = z
    .object({
        label: z
            .string({ error: "Label is required" })
            .trim()
            .min(1, "Label cannot be empty")
            .max(100, "Label too long"),

        type: z.enum([
            "text",
            "email",
            "textarea",
            "select",
            "radio",
            "checkbox",
            "number",
            "date",
            "file",
        ], { error: "Field type is required" }),

        required: z.boolean().default(false),

        options: z.array(
            z.string()
                .trim()
                .min(1, "Option cannot be empty")
                .max(50, "Option too long")
        ).optional(),

        order: z.number().int().min(0).optional(),
    })
    .refine(
        (field) => {
            if (["radio", "select", "checkbox"].includes(field.type)) {
                return field.options && field.options.length > 0
            }
            return true
        },
        {
            message: "Options are required for select, radio, and checkbox fields",
            path: ["options"],
        }
    )

export const updateFormFieldSchema = z
    .object({
        id: z.string().uuid().optional(),
        label: z
            .string({ error: "Label is required" })
            .trim()
            .min(1, "Label cannot be empty")
            .max(100, "Label too long"),

        type: z.enum([
            "text",
            "email",
            "textarea",
            "select",
            "radio",
            "checkbox",
            "number",
            "date",
            "file",
        ], { error: "Field type is required" }),
        formId: z.string().optional(),
        required: z.boolean().default(false),

        options: z.array(
            z.string()
                .trim()
                .min(1, "Option cannot be empty")
                .max(50, "Option too long")
        ).optional(),
        optionsText: z.string().optional(),
        order: z.number().int().min(0).optional(),
    })
    .refine(
        (field) => {
            if (["radio", "select", "checkbox"].includes(field.type)) {
                return field.options && field.options.length > 0
            }
            return true
        },
        {
            message: "Options are required for select, radio, and checkbox fields",
            path: ["options"],
        }
    )


export const createFormSchema = z.object({
    title: z
        .string({ error: "Form title is required" })
        .trim()
        .min(3, "Title must be at least 3 characters long")
        .max(100, "Title too long"),

    description: z
        .string()
        .trim()
        .max(500, "Description too long")
        .optional(),

    fields: z
        .array(formFieldSchema)
        .min(1, "At least one field is required")
        .max(100, "Too many fields in one form")
        .optional(),
})

export const updateFormSchema = z.object({
    title: z
        .string({ error: "Form title is required" })
        .trim()
        .min(3, "Title must be at least 3 characters long")
        .max(100, "Title too long"),

    description: z
        .string()
        .trim()
        .max(500, "Description too long")
        .optional(),

    fields: z.array(updateFormFieldSchema).optional(),
})

export const userId = z.object({
    formId: z.uuid({ error: "Invalid formId" }),
    userIds: z
        .array(z.uuid({ error: "Invalid userId" }))
        .min(1, { error: "At least one userId is required" })
        .max(50, { error: "You can assign max 50 users at once" }),
})




export type FormFieldsSchema = z.infer<typeof formFieldSchema>
export type FormSchema = z.infer<typeof createFormSchema>
export type UpdateFormSchema = z.infer<typeof updateFormSchema>
export type UpdateFormFields = z.infer<typeof updateFormFieldSchema>
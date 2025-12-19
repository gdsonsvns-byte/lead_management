import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { updateFormSchema } from "@/src/types/form";
import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { v2 as cloudinary } from "cloudinary";
import { extractCloudinaryInfo } from "@/src/lib/extractCloudinaryInfo";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }
        // const user = await verifyRole(["ADMIN", "SUPERADMIN"])
        const { formId } = await params

        if (!formId || formId.trim() === "") {
            return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
        }

        const form = await prisma.form.findFirst({
            where: { id: formId },
            include: { fields: true },
        })
        if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 })

        return NextResponse.json({ form })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Error fetching form" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }
        const user = await verifyRole(["ADMIN", "SUPERADMIN"])
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const { formId } = await params

        if (!formId || formId.trim() === "") {
            return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
        }

        const form = await prisma.form.findUnique({
            where: { id: formId },
            select: { id: true, accountId: true }
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        if (user.role === "ADMIN" && form.accountId !== user.accountId) {
            return NextResponse.json(
                { error: "You do not have permission to delete this form." },
                { status: 403 }
            );
        }

        const answers = await prisma.responseAnswer.findMany({
            where: {
                field: {
                    formId: form.id
                }
            }
        });

        const cloudinaryFiles: { public_id: string; resource_type: string }[] = [];
        for (const ans of answers) {
            if (!ans.value) continue;

            let values: string[] = [];
            if (ans.value.startsWith("[")) {
                try {
                    values = JSON.parse(ans.value);
                } catch {
                    continue;
                }
            } else if (ans.value.startsWith("http")) {
                values = [ans.value];
            }

            for (const url of values) {
                const info = extractCloudinaryInfo(url);
                if (info) {
                    cloudinaryFiles.push(info);
                }
            }
        }
        for (const file of cloudinaryFiles) {
            try {
                await cloudinary.uploader.destroy(file.public_id, {
                    resource_type: file.resource_type
                });
            } catch (err) {
                console.error("Cloudinary delete error:", err);
            }
        }

        await prisma.$transaction([
            prisma.responseAnswer.deleteMany({
                where: {
                    response: {
                        formId: form.id
                    }
                }
            }),
            prisma.response.deleteMany({
                where: { formId: form.id }
            }),
            prisma.formField.deleteMany({
                where: { formId: form.id }
            }),
            prisma.form.delete({
                where: { id: form.id }
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Error deleting form" }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN"])
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const contentLength = Number(req.headers.get("content-length") || 0)
        if (contentLength > 50_000) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 })
        }

        const { formId } = await params
        if (!formId || formId.trim() === "") {
            return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
        }

        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: { fields: true },
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        if (user.role === "ADMIN" && form.accountId !== user.accountId) {
            return NextResponse.json(
                { error: "You do not have permission to update this form." },
                { status: 403 }
            );
        }

        const body = await req.json()
        const parsed = updateFormSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { title, description, fields } = parsed.data
        const cleanTitle = title.trim()
        const cleanDescription = description?.trim() || ""

        const slugBase = slugify(cleanTitle, { lower: true, strict: true })
        const slug = `${slugBase}-${Date.now()}`

        const updatedForm = await prisma.$transaction(async (tx) => {

            const newForm = await tx.form.update({
                where: { id: form.id },
                data: {
                    title: cleanTitle,
                    description: cleanDescription,
                    slug,
                },
            })

            const existingIds = form.fields.map((f) => f.id)
            const incomingIds = fields?.map((f: any) => f.id).filter(Boolean) || []

            const toDelete = existingIds.filter((id) => !incomingIds.includes(id))

            if (toDelete.length > 0) {

                const answers = await tx.responseAnswer.findMany({
                    where: { fieldId: { in: toDelete } }
                });

                const cloudinaryFiles: { resource_type: string; public_id: string }[] = [];

                for (const ans of answers) {
                    if (!ans.value) continue;

                    let urls: string[] = [];

                    if (ans.value.startsWith("[")) {
                        try { urls = JSON.parse(ans.value); } catch { }
                    } else if (ans.value.startsWith("http")) {
                        urls = [ans.value];
                    }

                    for (const url of urls) {
                        const info = extractCloudinaryInfo(url);
                        if (info) cloudinaryFiles.push(info);
                    }
                }

                for (const file of cloudinaryFiles) {
                    try {
                        await cloudinary.uploader.destroy(file.public_id, {
                            resource_type: file.resource_type,
                        });
                    } catch (err) {
                        console.error("Cloudinary delete error:", err);
                    }
                }

                await tx.responseAnswer.deleteMany({
                    where: { fieldId: { in: toDelete } }
                });

                await tx.response.deleteMany({
                    where: {
                        formId: form.id,
                        answers: { none: {} }
                    }
                });

                await tx.formField.deleteMany({
                    where: { id: { in: toDelete } }
                });
            }

            for (const [index, f] of (fields || []).entries()) {
                const cleanLabel = f.label.trim()

                if (f.id) {
                    await tx.formField.update({
                        where: { id: f.id },
                        data: {
                            label: cleanLabel,
                            type: f.type,
                            required: f.required ?? false,
                            options: f.options ? JSON.stringify(f.options) : undefined,
                            order: f.order ?? index + 1,
                        },
                    })
                } else {
                    await tx.formField.create({
                        data: {
                            formId: form.id,
                            label: cleanLabel,
                            type: f.type,
                            required: f.required ?? false,
                            options: f.options ? JSON.stringify(f.options) : undefined,
                            order: f.order ?? index + 1,
                        },
                    })
                }
            }

            const result = await tx.form.findUnique({
                where: { id: form.id },
                include: { fields: true },
            })

            return result
        })

        return NextResponse.json({ success: true, form: updatedForm }, { status: 200 })

    } catch (err) {
        console.error("PATCH /forms/:id error:", err)
        return NextResponse.json({ error: "Failed to update form" }, { status: 500 })
    }
}
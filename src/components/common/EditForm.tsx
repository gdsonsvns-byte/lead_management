'use client';

import { ClipboardListIcon, X, PlusIcon } from "lucide-react";
import Spinner from "../ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import Input from "../ui/Input";
import FieldItem from "../FieldItem";
import toast from "react-hot-toast";

interface CreateFormPayload {
    title: string;
    description: string;
    fields: FormField[];
}

interface FormField {
    id?: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    optionsText?: string;
    order?: number;
}

export interface FormData {
    id: string;
    formsId: string;
    userId: string;
    title: string;
    description: string | null;
    slug: string;
    createdAt: string;
    accountId: string;
    fields: FormField[];
}

export interface FormResponse {
    form: FormData;
}

export default function EditForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [fields, setFields] = useState<FormField[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const formId = searchParams.get("update");
    const hasFormId = !!formId;

    const { data, isLoading, isError } = useQuery<FormResponse>({
        queryKey: ["update-form", formId],
        queryFn: async () => {
            const res = await axios.get<FormResponse>(`/api/v1/form/${formId}`, {
                withCredentials: true,
            });

            setTitle(res.data.form.title ?? "");
            setDescription(res.data.form.description ?? "");

            const mappedFields = res.data.form.fields
                .sort((a: any, b: any) => a.order - b.order)
                .map((f: any) => ({
                    id: f.id,
                    label: f.label,
                    type: f.type,
                    required: f.required,
                    order: f.order,
                    options: f.options ? JSON.parse(f.options) : [],
                    optionsText: f.options ? JSON.parse(f.options).join(", ") : "",
                }));

            setFields(mappedFields);
            return res.data;
        },
        enabled: !!formId,
    });


    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("update");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const addField = () => {
        setFields((prev) => [
            ...prev,
            {
                label: "",
                type: "text",
                required: false,
                options: [],
                optionsText: "",
                order: prev.length + 1,
            },
        ]);
    };

    const removeField = (indexToRemove: number) => {
        setFields((prev) => {
            const updated = prev.filter((_, i) => i !== indexToRemove);
            return updated.map((field, index) => ({
                ...field,
                order: index + 1,
            }));
        });
    };


    const updateField = (index: number, updates: Partial<FormField>) => {
        setFields((prev) =>
            prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
        );
    };

    const mutation = useMutation({
        mutationFn: async (payload: CreateFormPayload) => {
            const res = await axios.patch(`/api/v1/form/${formId}`, payload, {
                withCredentials: true,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["view-form", formId] });
            setMessage({ type: "success", text: "Form updated successfully!" });
            toast.success('Form updated successfully!', {
                duration: 5000
            });
            queryClient.invalidateQueries({ queryKey: ["view-form", formId] });
            queryClient.invalidateQueries({ queryKey: ["update-form"] });
            queryClient.invalidateQueries({ queryKey: ["forms"] });
            setTimeout(closeModal, 800);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || "Update failed";
            setMessage({ type: "error", text: msg });
            toast.error(msg, {
                duration: 5000
            });
        },
    });

    const handleSave = () => {
        if (!title.trim()) {
            setFieldErrors({ title: ["Title is required"] });
            return;
        }

        mutation.mutate({
            title,
            description,
            fields: fields.map((f, i) => ({
                ...f,
                order: f.order ?? i + 1,
            })),
        });
    };

    if (!hasFormId) return null;

    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">

                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close View Form Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    <ClipboardListIcon size={20} />
                    Edit Form
                </h1>

                {isLoading && (
                    <div className="py-10 flex justify-center">
                        <Spinner />
                    </div>
                )}

                {isError && (
                    <p className="text-center text-red-600 py-8">
                        Failed to load form details.
                    </p>
                )}

                {
                    !isLoading && data && (
                        <>

                            <div className="mt-6">
                                <Input
                                    type="text"
                                    label="Form Name"
                                    placeholder="Enter form name"
                                    leftIcon={<ClipboardListIcon size={18} />}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                {fieldErrors.title && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.title[0]}</p>
                                )}
                            </div>

                            <div className="mt-4">
                                <Input
                                    type="text"
                                    label="Description"
                                    placeholder="Short description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="mt-6">
                                <h2 className="font-medium text-lg mb-2">Fields</h2>

                                {fields.map((field, index) => (
                                    <FieldItem
                                        key={field.id || index}
                                        index={index}
                                        field={field}
                                        updateField={updateField}
                                        removeField={removeField}
                                    />
                                ))}

                                <div className="flex items-center justify-between mt-5">
                                    <h2 className="font-medium text-zinc-800">Fields</h2>

                                    <button
                                        className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2"
                                        onClick={addField}
                                    >
                                        Add Field <PlusIcon size={16} />
                                    </button>
                                </div>
                            </div>

                            <button
                                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
                                // onClick={() => console.log(fields)}
                                onClick={handleSave}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? <Spinner color="white" /> : "Save Changes"}
                                {/* Save Changes */}
                            </button>

                            {message && (
                                <p
                                    className={`mt-3 text-center ${message.type === "success" ? "text-green-600" : "text-red-600"
                                        }`}
                                >
                                    {message.text}
                                </p>
                            )}
                        </>
                    )
                }
            </div>
        </section>
    );
}

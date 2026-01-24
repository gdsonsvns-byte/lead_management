'use client';
import { X } from "lucide-react";
import Spinner from "../ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MenuItem, TextField } from "@mui/material";
import { FollowUpStatus, Role } from "@/src/app/generated/prisma/enums";
import { useAuth } from "@/src/hooks/useAuth";

interface Field {
    id: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string | null;
    order?: number;
}
export default function ViewForm({ account_id }: { account_id?: string }) {
    const { user } = useAuth();
    const isAdmin = user && (user?.role === "ADMIN" || user?.role === "SUPERADMIN");
    const searchParams = useSearchParams();
    const router = useRouter();
    const formId = searchParams.get("view");
    const hasFormId = !!formId;
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [initialFollowUp, setInitialFollowUp] = useState({
        nextAction: "",
        nextFollowUpDate: "",
    });

    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const handleChange = (field: Field, value: any) => {
        setFormValues((prev) => ({
            ...prev,
            [field.id]: value,
        }));
    };

    const { data, isLoading, isError } = useQuery<MainForm>({
        queryKey: ["view-form", formId],
        queryFn: async () => {
            const res = await axios.get<MainForm>(`/api/v1/form/${formId}/internal?account_id=${account_id ?? ""}`, {
                withCredentials: true,
            });
            return res.data;
        },
        enabled: hasFormId,
        staleTime: 1000 * 60 * 60,
    });

    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("view");
        router.replace(`?${params.toString()}`, { scroll: false });
        setMessage(null);
    };

    const toggleUser = (userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const sortOptions = (options: string[]) =>
        options.slice().sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));


    const renderField = (field: Field, options: string[]) => {
        const baseClass =
            "w-full border border-zinc-300 rounded-lg px-3 py-2 outline-none text-sm bg-white";

        switch (field.type) {
            case "text":
            case "email":
            case "number":
            case "date":
                return (
                    <input
                        type={field.type}
                        placeholder={`${field.label}${field.required ? '*' : ''}`}
                        className={baseClass}
                        onChange={(e) => handleChange(field, e.target.value)}
                        required={field.required}
                    />
                );

            case "textarea":
                return (
                    <textarea
                        placeholder={`${field.label}${field.required ? '*' : ''}`}
                        rows={3}
                        className={baseClass}
                        onChange={(e) => handleChange(field, e.target.value)}
                        required={field.required}
                    />
                );

            case "file":
                return (
                    <input
                        type="file"
                        className={baseClass}
                        multiple
                        onChange={(e) => handleChange(field, e.target.files)}
                        required={field.required}
                    />
                );

            case "select":
                return (
                    <select
                        className={baseClass}
                        onChange={(e) => handleChange(field, e.target.value)}
                        required={field.required}
                    >
                        <option value="">Select...</option>
                        {sortOptions(options).map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );

            case "radio":
                return (
                    <div className="flex flex-col gap-2">
                        {options.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    onChange={() => handleChange(field, opt)}
                                    required={field.required}
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case "checkbox":
                return (
                    <div className="flex flex-col gap-2">
                        {options.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    value={opt}
                                    required={field.required}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setFormValues((prev) => {
                                            const prevValues = prev[field.id] || [];
                                            return {
                                                ...prev,
                                                [field.id]: checked
                                                    ? [...prevValues, opt]
                                                    : prevValues.filter((v: string) => v !== opt),
                                            };
                                        });
                                    }}
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            default:
                return <p className="text-zinc-500 text-sm">Unsupported field type</p>;
        }
    };

    const submitMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await axios.post(
                `/api/v1/form/${formId}/response/internal?account_id=${account_id ?? ""}`,
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return res.data;
        },
        onSuccess: () => {
            setMessage({ type: "success", text: "Form data submitted successfully!" });
            toast.success('Form updated successfully!', {
                duration: 5000
            });
            setTimeout(closeModal, 500);
            setFormValues({})
            setSelectedUserIds([])
            setInitialFollowUp({
                nextAction: "",
                nextFollowUpDate: "",
            })
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || "Data submission failed";
            setMessage({ type: "error", text: msg });
            toast.error('Update failed. Try again.', {
                duration: 5000
            });
        },
    });

    const handleTestSubmit = () => {
        const formData = new FormData();
        Object.entries(formValues).forEach(([fieldId, value]) => {
            if (value instanceof FileList) {
                for (let i = 0; i < value.length; i++) {
                    formData.append(fieldId, value[i]);
                }
            } else if (Array.isArray(value)) {
                value.forEach((v) => formData.append(fieldId, v));
            } else {
                formData.append(fieldId, value);
            }
        });
        if (initialFollowUp?.nextAction) {
            formData.append("nextAction", initialFollowUp.nextAction);
            formData.append("nextFollowStatus", data?.form.nextActions?.find((a) => a.label === initialFollowUp.nextAction)?.status!);
        }
        if (initialFollowUp?.nextFollowUpDate) {
            formData.append("nextFollowUpDate", initialFollowUp.nextFollowUpDate);
        }
        if (selectedUserIds.length) {
            formData.append("selectedUserId", JSON.stringify(selectedUserIds))
        }
        // console.log(initialFollowUp);
        submitMutation.mutate(formData);
    };

    const selectedAction = useMemo(
        () =>
            data?.form?.nextActions?.find(
                (a) => a.label === initialFollowUp.nextAction
            ),
        [data?.form.nextActions, initialFollowUp.nextAction]
    );

    if (!hasFormId) return null;

    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">

                <>
                    <button
                        className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                        onClick={closeModal}
                        aria-label="Close View Form Modal"
                    >
                        <X size={18} className="text-zinc-700" />
                    </button>

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

                </>

                {!isLoading && data && (
                    <>
                        <h2 className="text-2xl font-semibold text-zinc-800 mb-1">
                            {data.form.title}
                        </h2>

                        <p className="text-sm text-zinc-600 mb-6">
                            {data.form.description || "No description provided."}
                        </p>

                        <div className="space-y-3 animate-fadeIn">
                            {[...data.form.fields].sort((a: Field, b: Field) => (a.order ?? 0) - (b.order ?? 0)).map((field: Field, index: number) => {
                                let options: string[] = [];

                                if (field.options) {
                                    try {
                                        options = JSON.parse(field.options);
                                    } catch {
                                        options = [];
                                    }
                                }

                                return (
                                    <div
                                        key={field.id}
                                        className="p-4 rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm hover:shadow-md transition-all duration-200 group opacity-0 animate-slideUp"
                                        style={{ animationDelay: `${index * 0.08}s` }}
                                    >
                                        <div className="flex justify-between mb-2">
                                            {options.length > 0 ? <label
                                                className={`relative text-sm text-zinc-800 group-hover:text-black transition ${field.required
                                                    ? "after:content-['*'] after:text-red-600 after:ml-1"
                                                    : ""
                                                    }`}
                                            >
                                                {field.label}
                                            </label> : ""}
                                        </div>

                                        <div className="transform group-hover:scale-[1.01] transition-transform">
                                            {renderField(field, options)}
                                        </div>

                                    </div>
                                );
                            })}

                            <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm hover:shadow-md transition-all duration-200 group opacity-0 animate-slideUp flex flex-col gap-8"
                            >
                                <span>Initial Follow Up Details</span>
                                <div className="flex flex-col sm:flex-row gap-5">
                                    <TextField
                                        label="Next Action"
                                        select
                                        value={initialFollowUp.nextAction}
                                        onChange={(e) => {
                                            const selectedLabel = e.target.value;
                                            setInitialFollowUp((prev) => ({
                                                ...prev,
                                                nextAction: selectedLabel
                                            }));
                                            const selectedAction = data.form.nextActions.find(
                                                (a) => a.label === selectedLabel
                                            );

                                            if (
                                                selectedAction?.status === "COMPLETED" ||
                                                selectedAction?.status === "CANCELLED"
                                            ) {
                                                setInitialFollowUp((prev) => ({
                                                    ...prev,
                                                    nextFollowUpDate: ""
                                                }));
                                            }
                                        }}
                                        SelectProps={{ native: true }}
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                    >
                                        <option value="">Select status</option>

                                        {data.form.nextActions.map((action) => (
                                            <option key={action.id} value={action.label}>
                                                {action.label}
                                            </option>
                                        ))}
                                    </TextField>

                                    {selectedAction &&
                                        selectedAction.status !== "COMPLETED" &&
                                        selectedAction.status !== "CANCELLED" && (
                                            <TextField
                                                label="Next Follow-Up Date"
                                                type="date"
                                                value={initialFollowUp.nextFollowUpDate}
                                                onChange={(e) => {
                                                    setInitialFollowUp((prev) => ({
                                                        ...prev,
                                                        nextFollowUpDate: e.target.value
                                                    }));
                                                }}
                                                InputLabelProps={{ shrink: true }}
                                                fullWidth
                                            />
                                        )}
                                </div>

                            </div>

                            {isAdmin && <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm hover:shadow-md transition-all duration-200 group opacity-0 animate-slideUp flex flex-col gap-8"
                            >
                                <span> Assign this lead to user.</span>
                                <div className="flex flex-col gap-2">
                                    {data.users.map((user) => (
                                        <label
                                            key={user.id}
                                            className="flex items-center justify-between border border-blue-500 rounded-lg px-4 py-3 cursor-pointer hover:bg-zinc-50 transition"
                                        >
                                            <div>
                                                <p className="font-medium text-sm">{user.name}</p>
                                                <p className="text-xs text-zinc-500">{user.email}</p>
                                                <span className="text-xs text-blue-600 font-medium">
                                                    {user.role}
                                                </span>
                                            </div>

                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={() => toggleUser(user.id)}
                                                className="w-5 h-5 accent-blue-600 cursor-pointer"
                                            />
                                        </label>
                                    ))}

                                </div>
                            </div>}
                        </div>

                        <div className="space-y-3 animate-fadeIn mt-5">
                            <button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg cursor-pointer"
                                onClick={handleTestSubmit}
                                disabled={submitMutation.isPending}
                            >
                                {submitMutation.isPending ? <Spinner color="white" /> : "Submit Test Data"}
                            </button>

                        </div>

                        {message && (
                            <p
                                className={`mt-3 text-center ${message.type === "success" ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {message.text}
                            </p>
                        )}
                    </>
                )}

            </div>
        </section>
    );
}

interface MainForm {
    form: Form
    users: Users[]
}
interface Users {
    id: string;
    name: string;
    email: string;
    role: Role
}
export interface Form {
    id: string;
    formsId: string;
    userId: string;
    accountId: string;
    title: string;
    description: string;
    slug: string;
    adminWhatsappCampaignName: string;
    userWhatsappCampaignName: string;
    createdAt: string;
    fields: FormField[];
    nextActions: NextAction[];
}
export interface NextAction {
    id: string;
    label: string;
    status: FollowUpStatus;
}
export interface FormField {
    id: string;
    formId: string;
    label: string;
    type: string;
    options: string;
    required: boolean;
    order: number;
}


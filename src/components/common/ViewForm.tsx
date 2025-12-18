'use client';
import { X } from "lucide-react";
import Spinner from "../ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";

interface Field {
    id: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string | null;
}

export default function ViewForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const formId = searchParams.get("view");
    const hasFormId = !!formId;
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const handleChange = (field: Field, value: any) => {
        setFormValues((prev) => ({
            ...prev,
            [field.id]: value,
        }));
    };

    const { data, isLoading, isError } = useQuery({
        queryKey: ["view-form", formId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/form/${formId}`, {
                withCredentials: true,
            });
            return res.data.form;
        },
        enabled: hasFormId,
        staleTime: 1000 * 60 * 60,
    });

    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("view");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

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
                        {options.map((opt) => (
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
                `/api/v1/form/${formId}/response`,
                formData,
                { withCredentials: true }
            );
            return res.data;
        },
        onSuccess: () => {
            setMessage({ type: "success", text: "Form data submitted successfully!" });
            toast.success('Form updated successfully!', {
                duration: 5000
            });
            setTimeout(closeModal,500);
            setFormValues({})
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

        submitMutation.mutate(formData);
    };


    if (!hasFormId) return null;

    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start p-10 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">

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

                {!isLoading && data && (
                    <>
                        <h2 className="text-2xl font-semibold text-zinc-800 mb-1">
                            {data.title}
                        </h2>

                        <p className="text-sm text-zinc-600 mb-6">
                            {data.description || "No description provided."}
                        </p>

                        <div className="space-y-3 animate-fadeIn">
                            {data.fields.map((field: Field, index: number) => {
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
                                        {options.length > 0 &&
                                            <div className="flex justify-between mb-2">
                                                <label 
                                                className={`relative text-sm text-zinc-800 group-hover:text-black transition ${field.required ? "after:content-['*'] after:text-red-600 after:ml-1" : ""} `}
                                                >
                                                    {field.label}
                                                </label>
                                                {/* {field.required && (
                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                                    Required
                                                </span>
                                            )} */}
                                            </div>
                                        }


                                        <div className="transform group-hover:scale-[1.01] transition-transform">
                                            {renderField(field, options)}
                                        </div>
                                    </div>
                                );
                            })}

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

"use client";
import { FollowUpStatus } from "@/src/app/generated/prisma/enums";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Spinner from "../ui/spinner";
import { useState } from "react";
import toast from "react-hot-toast";



interface Actions {
    title: string;
    description: string;
    actions: {
        id: string,
        label: string,
        status: FollowUpStatus,
    }[]
}

export default function ManageResponse() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const formId = searchParams.get("form_id");
    const hasFormId = !!formId;
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    const isSelected = (id: string) => selectedIds.includes(id);
    const statusColor = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return "bg-green-100 text-green-700";
            case "CANCELLED":
                return "bg-red-100 text-red-700";
            case "SKIPPED":
                return "bg-yellow-100 text-yellow-700";
            default:
                return "bg-blue-100 text-blue-700";
        }
    };


    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("form_id");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const { data, isLoading, isError } = useQuery<Actions>({
        queryKey: ["view-response", formId],
        queryFn: async () => {
            const res = await axios.get<Actions>(`/api/v1/followup/actions`, {
                params: {
                    form_id: formId,
                },
                withCredentials: true,
            });
            return res.data;
        },
        enabled: hasFormId,
        staleTime: 1000 * 60 * 60,
    });

    const { mutateAsync: deleteSelected, isPending: isDeleting } = useMutation({
        mutationFn: async () => {
            const res = await axios.delete(`/api/v1/followup/actions`, {
                data: {
                    formId: formId,
                    ids: selectedIds,
                },
                withCredentials: true,
            });
            return res.data;
        },
        onSuccess: async () => {
            toast.success("Follow up actions deleted successfully");
            await queryClient.invalidateQueries({
                queryKey: ["view-response", formId],
            });
            setSelectedIds([]);
        },
        onError: (err: AxiosError) => {
            toast.error(
                ((err.response?.data as any)?.error) ?? err.message
            );
        },
    });
    function handleDeleteSelected() {
        deleteSelected();
    }

    if (!hasFormId) return null;
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative overflow-hidden">
                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close View Form Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>
                <>
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
                        isDeleting && (
                            <div className="absolute inset-0 flex justify-center items-center bg-black/10 z-5">
                                <Spinner />
                            </div>
                        )
                    }
                </>

                {!isLoading && data && (
                    <div className="p-4">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-zinc-900">
                                {data.title}
                            </h2>
                            <p className="text-sm text-zinc-600 mt-1">
                                {data.description || "No description provided."}
                            </p>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="my-6 flex items-center justify-between animate-fadeIn">
                                <span className="text-sm text-zinc-600">
                                    {selectedIds.length} selected
                                </span>

                                <button
                                    onClick={handleDeleteSelected}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                                >
                                    {isDeleting ? <Spinner /> : "Delete Selected"}
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {data.actions.map((action) => (
                                <div
                                    key={action.id}
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 transition
                                         ${isSelected(action.id)
                                            ? "border-blue-400 bg-blue-50"
                                            : "border-zinc-200 hover:bg-zinc-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isSelected(action.id)}
                                            onChange={() => toggleSelect(action.id)}
                                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                        />

                                        <span className="text-sm font-medium text-zinc-800">
                                            {action.label}
                                        </span>
                                    </div>

                                    <span
                                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(
                                            action.status
                                        )}`}
                                    >
                                        {action.status}
                                    </span>
                                </div>
                            ))}
                        </div>


                    </div>
                )}


            </div>
        </section>
    )
}

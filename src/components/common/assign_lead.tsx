"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Spinner from "../ui/spinner";
import toast from "react-hot-toast";

interface Props {
    open: boolean;
    onClose: () => void;
    formId: string;
    responseId: string | null;
    account_id?: string;
    currentState: string;
    page: number;
    pageSize: number;
}

interface User {
    users: {
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string,
        hasResponseAccess: boolean
    }[]
}


export default function AssignLead({ open, onClose, formId, responseId, account_id, currentState, page, pageSize }: Props) {
    const queryClient = useQueryClient();
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const { data, isLoading, isError, isFetching, error } = useQuery<User>({
        queryKey: ["responses", formId, account_id, responseId],
        queryFn: async () => {
            const res = await axios.get<User>(`/api/v1/form/users`, {
                params: { account_id: account_id ?? "", form_id: formId, response_id: responseId },
                withCredentials: true,
            });
            return res.data;
        },
        enabled: open,
    });

    const toggleUser = (userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            return axios.patch("/api/v1/form/response/assign",
                {
                    formId,
                    responseId,
                    userIds: selectedUserIds,
                },
                { withCredentials: true }
            );
        },
        onSuccess: async (data) => {
            onClose()
            setSelectedUserIds([])
            toast.success(data.data?.message);
            await queryClient.invalidateQueries({
                queryKey: ["form_responses", formId, page, pageSize, currentState],
            });
        },
        onError(error: any) {
            toast.error(error?.response?.data?.error || "Something went wrong");
        },
    });
    useEffect(() => {
        if (data?.users) {
            const preSelected = data.users
                .filter((u) => u.hasResponseAccess)
                .map((u) => u.id);

            setSelectedUserIds(preSelected);
        }
    }, [data]);

    if (!open) return null;
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">
                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={() => (onClose(), setSelectedUserIds([]))}
                    aria-label="Close View Form Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                <h2 className="text-xl font-semibold mb-1">Assign User</h2>
                <p className="text-sm text-zinc-500 mb-6">
                    Assign user to this particular lead to manage it.
                </p>
                <>
                    {(isLoading || isFetching) && (
                        <div className="flex justify-center py-10">
                            <Spinner />
                        </div>
                    )}

                    {isError && (
                        <p className="text-red-500 text-sm">
                            {error.message ?? ""}
                        </p>
                    )}

                    {data?.users && data?.users.length <= 0 && (
                        <p className="text-red-500 text-sm">
                            Other user do not have permission to this form.
                        </p>
                    )}
                </>

                <div className="space-y-3 max-h-[360px] overflow-auto">
                    {data?.users && data.users.length > 0 && data?.users.map((user) => (
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

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={() => (onClose(), setSelectedUserIds([]))}
                        className="px-4 py-2 rounded-md bg-zinc-800 text-white text-sm cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => mutate()}
                        disabled={isPending || selectedUserIds.length <= 0}
                        className="px-5 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-500/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {isPending && <Spinner color="white" />}
                        Assign
                    </button>
                </div>
            </div>
        </section>
    )
}

"use client";

import { Role } from "@/src/app/generated/prisma/enums";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Spinner from "../ui/spinner";
import toast from "react-hot-toast";

export default function ManageAccess() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const accountId = searchParams.get("account_id");
    const formId = searchParams.get("f_id");
    const hasAccountId = !!accountId || !!formId;
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        setSelectedUserIds([]);
        params.delete("account_id");
        params.delete("f_id");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const { data, isLoading, isError } = useQuery<Response>({
        queryKey: ["view-users", accountId, formId],
        queryFn: async () => {
            const res = await axios.get<Response>(`/api/v1/auth/users?account_id=${accountId}&form_id=${formId}`, {
                withCredentials: true,
            });
            return res.data
        },
        enabled: hasAccountId,
    });
    useEffect(() => {
        if (data?.users) {
            const preSelected = data.users
                .filter((u) => u.hasAccess)
                .map((u) => u.id);

            setSelectedUserIds(preSelected);
        }
    }, [data]);

    const toggleUser = (userId: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };
    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            return axios.patch("/api/v1/form/access",
                {
                    formId,
                    userIds: selectedUserIds,
                },
                { withCredentials: true }
            );
        },
        onSuccess: (data) => {
            closeModal();
            toast.success(data.data?.message);
        },
    });
    if (!hasAccountId) return null;
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">
                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close View Form Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                <h2 className="text-xl font-semibold mb-1">Manage Access</h2>
                <p className="text-sm text-zinc-500 mb-6">
                    Select users who should have access to this form
                </p>
                <>
                    {isLoading && (
                        <div className="flex justify-center py-10">
                            <Spinner />
                        </div>
                    )}

                    {isError && (
                        <p className="text-red-500 text-sm">
                            Failed to load users
                        </p>
                    )}
                </>

                <div className="space-y-3 max-h-[360px] overflow-auto">
                    {data?.users.map((user) => (
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
                        onClick={closeModal}
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
                        Save Access
                    </button>
                </div>
            </div>
        </section>
    )
}


interface Response {
    success: boolean;
    count: number,
    users: {
        id: string;
        name: string;
        email: string;
        role: Role;
        createdAt: string
        hasAccess: boolean
    }[]
}
"use client";
import { AccountSummaryResponse } from "@/src/types/auth";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

export default function ProfileView({ accountId }: { accountId?: string }) {
    const currentPath = usePathname()
    const { data, isLoading, error } = useQuery<AccountSummaryResponse>({
        queryKey: ["view-profile", accountId],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/auth/me?account_id=${accountId ?? ''}`, {
                withCredentials: true,
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 60,
    });

    if (isLoading)
        return (
            <div className="flex items-center justify-center p-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );

    if (error)
        return (
            <p className="text-red-500 p-6 text-center">
                Failed to load account information.
            </p>
        );

    if (!data) return null;

    const account = data.data;

    return (
        <div className="w-full space-y-5">
            <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                        {data.initials}
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">
                            {account.businessName}
                        </h1>
                        <p className="text-gray-500">{account.email}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-xl bg-white shadow">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Account Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow label="Business Name" value={account.businessName} />
                    <InfoRow label="Phone" value={account.phone} />
                    <InfoRow label="Location" value={account.location} />
                    <InfoRow label="Email" value={account.email} />
                    <InfoRow
                        label="Created At"
                        value={new Date(account.createdAt).toLocaleDateString()}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-6 rounded-xl bg-white shadow flex flex-col items-start">
                    <p className="text-gray-500">Total Users</p>
                    <p className="text-3xl font-semibold">{account._count.users}</p>
                </div>

                <div className="p-6 rounded-xl bg-white shadow flex flex-col items-start">
                    <p className="text-gray-500">Total Forms</p>
                    <p className="text-3xl font-semibold">{account._count.forms}</p>
                </div>

                <div className="p-6 rounded-xl bg-white shadow flex flex-col items-start">
                    <p className="text-gray-500">Total Responses</p>
                    <p className="text-3xl font-semibold">{data.total_response}</p>
                </div>
            </div>

            <div className="p-6 rounded-xl bg-white shadow">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Users
                </h2>

                <div className="space-y-3">
                    {account.users.map((u) => (
                        <div
                            key={u.id}
                            className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                        >
                            <p className="text-gray-800 font-medium">{u.name}</p>
                            <p className="text-gray-500 text-sm">{u.email}</p>
                            <span className="mt-1 inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                                {u.role}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <Toaster />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-gray-500 text-sm">{label}</span>
            <span className="text-gray-800 font-medium">{value || "—"}</span>
        </div>
    );
}

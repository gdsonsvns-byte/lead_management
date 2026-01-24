"use client";
import { AccountSummaryResponse, ManagerResponse, NormalizedAccount } from "@/src/types/auth";
import { Button } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Pencil, Settings, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import GenerateApiKey from "./generate_api_key";
import { Suspense, useState } from "react";
import ShowApiToken from "./show_api_toke";
import Spinner from "../ui/spinner";
import UpdatePassword from "../UpdatePassword";
import { useAuth } from "@/src/hooks/useAuth";
import UpdateUser from "./update_user";

export default function ProfileView({ accountId }: { accountId?: string }) {
    const { user } = useAuth()
    const isAdmin = user && (user?.role === "ADMIN" || user?.role === "SUPERADMIN");
    const currentPath = usePathname()
    const queryClient = useQueryClient();
    const [openFormModal, setOpenFormModal] = useState(false);
    const [openTokenModal, setOpenTokenModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [apiKey, setapiKey] = useState({
        message: "",
        token: "",
    });
    const { data, isLoading, error } = useQuery<NormalizedAccount>({
        queryKey: ["view-profile", accountId],
        queryFn: async () => {
            const res = await axios.get<AccountSummaryResponse | ManagerResponse>(`/api/v1/auth/me?account_id=${accountId ?? ""}`,
                {
                    withCredentials: true,
                }
            );

            const apiData = res.data;
            if ("user" in apiData) {
                return {
                    account: apiData.account,
                    users: [apiData.user],
                    initials: apiData.initials,
                };
            }
            return {
                account: apiData.data,
                users: apiData.data.users,
                forms: apiData.data.forms,
                counts: apiData.data._count,
                initials: apiData.initials,
                total_response: apiData.total_response,
            };
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (user_id: string) => {
            setDeletingId(user_id);
            return await axios.delete(`/api/v1/auth/users/${user_id}`, {
                withCredentials: true,
            });
        },
        onSuccess: () => {
            toast.success('User deleted successfully', {
                duration: 4000
            });
            queryClient.invalidateQueries({ queryKey: ["view-profile", accountId] });
        },
        onSettled: () => {
            setDeletingId(null);
        },
        onError: () => {
            toast.error('Something went wrong, can\'t delete the User.', {
                duration: 4000
            });
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }
    if (error || !data) {
        return (
            <p className="text-red-500 p-6 text-center">
                Failed to load account information.
            </p>
        );
    }
    const account = data.account;
    const counts = data.counts;
    const users = data.users;
    const displayName = !isAdmin ? data.users[0]?.name : account.businessName;

    return (
        <div className="w-full space-y-5">
            <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow">
                <div className="flex sm:items-center sm:flex-row items-start flex-col gap-4 w-full">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-semibold">
                        {data.initials}
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">
                            {displayName}
                        </h1>
                        <p className="text-gray-500">{isAdmin ? account.email : data.users[0]?.email}</p>
                    </div>
                    {
                        isAdmin && currentPath !== '/system_admin/setting' && (
                            <div className="ml-auto">
                                <Button variant="contained" onClick={() => setOpenFormModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-300 ease-in-out">
                                    <Settings className="w-4 h-4" />
                                    Generate API Key
                                </Button>
                            </div>
                        )
                    }
                </div>
            </div>

            <div className="p-6 rounded-xl bg-white shadow">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {isAdmin ? "Account Details" : "Account Owner Detalis"}
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

            {isAdmin && <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-6 rounded-xl bg-white shadow flex flex-col items-start">
                    <p className="text-gray-500">Total Users</p>
                    <p className="text-3xl font-semibold">{counts?.users}</p>
                </div>

                <div className="p-6 rounded-xl bg-white shadow flex flex-col items-start">
                    <p className="text-gray-500">Total Forms</p>
                    <p className="text-3xl font-semibold">{counts?.forms}</p>
                </div>

                <div className="p-6 rounded-xl bg-white shadow flex flex-col items-start">
                    <p className="text-gray-500">Total Responses</p>
                    <p className="text-3xl font-semibold">{data.total_response}</p>
                </div>
            </div>}

            {isAdmin && <div className="p-6 rounded-xl bg-white shadow">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Users
                </h2>

                <div className="space-y-3">
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className="relative p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                        >
                            <p className="text-gray-800 font-medium">{u.name}</p>
                            <p className="text-gray-500 text-sm">{u.email}</p>
                            <span className="mt-1 inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                                {u.role}
                            </span>
                            <div className="absolute right-2 top-2 ml-auto flex gap-2">
                                {
                                    u.role !== "SUPERADMIN" && (
                                        <>
                                            <button
                                                onClick={() => (setEditUserId(u.id))}
                                                disabled={editUserId === u.id}
                                                className="bg-blue-100 text-blue-500 px-2 py-2 rounded hover:text-white hover:bg-blue-600 transition duration-300 ease-in-out cursor-pointer  ">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteMutation.mutate(u.id)}
                                                disabled={deletingId === u.id}
                                                className="bg-red-100 text-red-500 px-2 py-2 rounded hover:text-white hover:bg-red-600 transition duration-300 ease-in-out cursor-pointer  ">
                                                {
                                                    deletingId === u.id ? (
                                                        <Spinner color="white" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )
                                                }
                                            </button>
                                        </>
                                    )
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>}

            <UpdatePassword />
            {openFormModal && <GenerateApiKey setOpenFormModal={setOpenFormModal} apiKey={apiKey} setapiKey={setapiKey} setOpenTokenModal={setOpenTokenModal} />}
            {openTokenModal && <ShowApiToken setOpenTokenModal={setOpenTokenModal} apiKey={apiKey} />}
            <Suspense fallback={<Spinner />}>
                <UpdateUser
                    selectedId={editUserId}
                    setSelectedId={() => setEditUserId(null)}
                    accountId={accountId ?? ""}
                />
            </Suspense>
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

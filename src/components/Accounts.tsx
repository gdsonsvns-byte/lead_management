"use client";

import { Suspense, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import Spinner from "./ui/spinner";
import { generateNameInitials } from "../lib/generatePassword";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle, XCircle } from "lucide-react";
import AccountDropDown from "./AccountDropDown";
import { Toaster } from "react-hot-toast";
import AddWhatsappAPIKey from "./add_whatsapp_api_key";


interface Account {
    id: string;
    email: string;
    businessName: string | null;
    phone: string | null;
    location: string | null;
    whatsappApiKey: string | null;
    createdAt: string;
}

interface AccountsResponse {
    users: Account[];
    page: number;
    limit: number;
    totalUsers: number;
    pageCount: number;
    hasMore: boolean;
    nextPage: number | null;
    prevPage: number | null;
}

async function fetchAccounts(page: number, limit: number = 10): Promise<AccountsResponse> {
    const res = await axios.get(
        `/api/v1/auth/accounts?page=${page}&limit=${limit}`,
        { withCredentials: true }
    );
    return res.data;
}

export default function Accounts() {
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ["accounts", page, limit],
        queryFn: () => fetchAccounts(page, limit),
        placeholderData: (prev) => prev,
        retry: 1,
    });

    return (
        <div className="relative w-full flex flex-col gap-8">
            {isLoading && (
                <div className="w-full flex justify-center py-20">
                    <Spinner />
                </div>
            )}
            {isError && (
                <p className="text-red-500 text-center py-5 text-lg font-medium">
                    Failed to load accounts.
                </p>
            )}
            {!isLoading && data?.users?.length === 0 && (
                <p className="text-gray-500 text-center py-20 text-xl font-medium">
                    No accounts found. Create a new one.
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data?.users?.map((acc) => {
                    const isConnected = !!acc.whatsappApiKey;

                    return (
                        <div
                            key={acc.id}
                            className="relative rounded-2xl bg-white p-6 shadow-md border border-zinc-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col gap-4"
                        >
                            <div
                                className=" pointer-events-none select-none
                                absolute top-5 right-5 w-12 h-12 rounded-full 
                                bg-linear-to-br from-blue-500 to-blue-700 
                                text-white flex items-center justify-center 
                                font-bold text-lg shadow-md
                            "
                            >
                                {generateNameInitials(acc.businessName)}
                            </div>

                            <h2 className="text-xl font-semibold text-zinc-800">
                                {acc.businessName || "Unnamed Business"}
                            </h2>

                            <div className="flex flex-col gap-1 text-sm text-zinc-600">
                                <p>
                                    <span className="font-medium text-zinc-700">Email:</span>{" "}
                                    {acc.email}
                                </p>

                                <p>
                                    <span className="font-medium text-zinc-700">Phone:</span>{" "}
                                    {acc.phone || "N/A"}
                                </p>

                                <p>
                                    <span className="font-medium text-zinc-700">Location:</span>{" "}
                                    {acc.location || "N/A"}
                                </p>

                            </div>

                            <div className="flex items-center gap-2 group w-max"
                                title={isConnected ? "API connected" : "API key missing"}
                            >
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}
                                >
                                    {isConnected ? <CheckCircle className="w-3 h-3 text-green-600" /> :
                                        <XCircle className="w-3 h-3 text-red-600" />}
                                    {isConnected ? "Connected" : "Pending"}
                                </span>

                                {!isConnected && (
                                    <Link href={`?add_wap_key=${acc.id}`}
                                        onClick={() => console.log("Open connect modal")}
                                        className="text-xs text-blue-600 underline hover:text-blue-800"
                                    >
                                        Connect Now
                                    </Link>
                                )}
                            </div>

                            <p className="text-xs text-zinc-400 mt-2">
                                Created • {new Date(acc.createdAt).toLocaleDateString()}
                            </p>

                            <div className="relative w-full flex items-center justify-between mt-4">
                                <AccountDropDown details={acc} page={page} limit={limit} />
                                <Link
                                    href={`/system_admin/accounts/${acc.id}`}
                                    className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:underline group w-max"
                                >
                                    View Profile
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>
                    )
                })}
            </div>

            {data?.totalUsers && data.totalUsers > limit && (
                <div className="flex items-center gap-4 mt-4 justify-center">

                    <button
                        disabled={!data.prevPage}
                        onClick={() => setPage((p) => p - 1)}
                        className={`
                            px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium 
                            transition-all 
                            ${!data.prevPage
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gray-300"}
                        `}
                    >
                        Previous
                    </button>

                    <span className="font-medium text-zinc-700">
                        Page {data.page} / {data.pageCount}
                    </span>

                    <button
                        disabled={!data.nextPage}
                        onClick={() => setPage((p) => p + 1)}
                        className={`
                            px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium 
                            transition-all 
                            ${!data.nextPage
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gray-300"}
                        `}
                    >
                        Next
                    </button>

                </div>
            )}
            <Toaster />
            <Suspense fallback={<Spinner />} >
                <AddWhatsappAPIKey page={page} limit={limit} />
            </Suspense>
        </div>
    );
}

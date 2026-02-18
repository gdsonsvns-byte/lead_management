'use client';
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Spinner from "../ui/spinner";
import { useState } from "react";
import { generateNameInitials } from "@/src/lib/generatePassword";
import { ChevronLeft, ChevronRight, Eye, Mail, Phone } from "lucide-react";
import ViewAccountDetails from "./view_account_details";

type Response = {
    accounts: Data[]
    page: number,
    limit: number,
    totalaccount: number,
    pageCount: number,
    hasMore: boolean,
    nextPage: boolean | null,
    prevPage: boolean | null
}

type Data = {
    id: string,
    businessName: string,
    email: string;
    phone: string;
    users: {
        id: string,
        name: string,
        role: string,
        email: string,
    }[],
    _count: {
        users: number;
        forms: number;
    }
}

export default function SystemDashboardAccountsDetails() {
    const [selectedUser, setSelectedUser] = useState<null | Data>(null);
    const [paginationModel, setPaginationModel] = useState({ pageSize: 20, page: 0 });

    const { data, error, isError, isFetching, isLoading } = useQuery<Response>({
        queryKey: ["system_admin", "dashboard", "accounts", paginationModel.page, paginationModel.pageSize,],
        queryFn: async function () {
            const res = await axios.get<Response>('/api/v1/system/dashboard/accounts', {
                params: { page: paginationModel.page + 1, limit: paginationModel.pageSize },
                withCredentials: true,
            });
            return res.data;
        },
        retry: 1,
        placeholderData: (old) => old,
    })

    return (
        <div className='mt-8'>
            <div className='w-full flex flex-col gap-6'>
                <div className='flex flex-col'>
                    <h2 className='font-semibold text-zinc-700 text-lg font-mono capitalize'>
                        Accounts
                    </h2>
                    <span className='text-xs font-mono text-gray-700'>
                        List of all Accounts
                    </span>
                </div>

                <div className='relative w-full min-h-80 max-h-110 h-full border border-black/10 rounded-lg overflow-y-auto flex flex-col'>
                    <>
                        {
                            (isFetching || isLoading) && <div className="flex-1 flex items-center justify-center">
                                <Spinner />
                            </div>
                        }
                        {isError &&
                            <div className="flex-1 flex items-center justify-center">
                                {error.message}
                            </div>
                        }
                    </>

                    {
                        data && data.accounts?.map((items, idx) => (
                            <div
                                key={items.id}
                                className={`w-full flex items-center justify-between py-3 px-4 bg-white ${idx === 0 ? "border-none" : "border-t"} border-black/10 cursor-pointer hover:bg-gray-50 transition-all duration-300 ease-in-out group`}
                            >
                                <div className="flex gap-3 items-center max-w-85 w-full">
                                    <div className="size-10 bg-blue-600 text-white font-mono flex items-center justify-center rounded-full select-none">
                                        <span className="text-xs">
                                            {
                                                generateNameInitials(items.businessName)
                                            }
                                        </span>
                                    </div>
                                    <span className="font-mono font-medium text-sm text-zinc-700">
                                        {items.businessName}
                                    </span>
                                </div>

                                <span className="flex-1 flex gap-1 items-center text-zinc-700 text-xs">
                                    <Mail size={14} strokeWidth={1.5} />
                                    {items.email}
                                </span>
                                <span className="flex-1 flex gap-1 items-center text-zinc-700 text-xs">
                                    <Phone size={14} strokeWidth={1.5} />
                                    {items.phone}
                                </span>
                                <button className="cursor-pointer size-8 flex items-center justify-center shrink-0 bg-slate-50 rounded-md group-hover:bg-white transition-all duration-300 ease-in-out border border-black/10"
                                    onClick={() => setSelectedUser(items)}
                                >
                                    <Eye className="text-zinc-700" size={16} strokeWidth={1.5} />
                                </button>
                            </div>
                        ))
                    }
                    {
                        data && data.totalaccount > paginationModel.pageSize &&
                        <div className="absolute inset-x-0 w-full bottom-0 bg-white z-10 border-t border-black/10 px-4 py-3">
                            <div className="flex items-center gap-4 justify-end">
                                <button
                                    disabled={data?.prevPage || isFetching}
                                    onClick={() => setPaginationModel((p) => ({ ...p, page: p.page - 1 }))}
                                    className={`size-8 rounded-full flex items-center justify-center bg-gray-100  not-last:transition-all ${!data?.prevPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer"}`}
                                >
                                    <ChevronLeft size={14} />
                                </button>

                                <span className="font-medium text-zinc-700 text-sm">
                                    Page {data?.page} / {data?.pageCount}
                                </span>

                                <button
                                    disabled={!data?.nextPage || isFetching}
                                    onClick={() => setPaginationModel((p) => ({ ...p, page: p.page + 1 }))}
                                    className={`size-8 rounded-full flex items-center justify-center bg-gray-100 transition-all ${!data?.nextPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer"}`}
                                >
                                    <ChevronRight size={14} />
                                </button>

                            </div>
                        </div>
                    }
                </div>
            </div>
            {
                selectedUser &&
                <ViewAccountDetails
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            }
        </div>
    )
}

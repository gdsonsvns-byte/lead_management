"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Building2, ClipboardList, Inbox, UserCheck } from "lucide-react";
import Spinner from "./ui/spinner";

type Response = {
    success: boolean;
    data: {
        accounts: number;
        users: number;
        forms: number;
        responses: number
    }
}

export default function DashboardCard() {

    const { data, error, isError, isFetching, isLoading } = useQuery<Response>({
        queryKey: ["system_admin", "dashboard"],
        queryFn: async function () {
            const res = await axios.get<Response>('/api/v1/system/dashboard', {
                withCredentials: true,
            });
            return res.data;
        }
    })
    return (
        <div className="relative w-full flex flex-col gap-8">
            {isError && (
                <p className="text-red-500 text-center py-5 text-lg font-medium">
                    Failed to load data at this moment.
                </p>
            )}
            <div className='w-full grid grid-cols-1 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-3'>
                <Accounts isFetching={isFetching} isLoading={isLoading} data={data!} />
                <Users isFetching={isFetching} isLoading={isLoading} data={data!} />
                <Forms isFetching={isFetching} isLoading={isLoading} data={data!} />
                <Responses isFetching={isFetching} isLoading={isLoading} data={data!} />
            </div>
        </div>
    )
}

interface Props {
    isLoading: boolean;
    isFetching: boolean;
    data: Response;
}
function Accounts({ isFetching, isLoading, data }: Props) {
    return (
        <div className='w-full min-h-36 rounded-xl bg-white border border-black/5 p-4 flex flex-col items-start justify-between gap-5 transition-all duration-300 ease-in-out hover:shadow-[0_4px_12px_rgb(50,0,0,0.09)]'>
            <div className="w-full flex items-center justify-between">
                <span className="text-black font-medium ">
                    Total Accounts
                </span>
                <Building2 size={24} className="text-zinc-800 shrink-0" strokeWidth={1} />
            </div>
            <div className="flex flex-col gap-5">
                <span className="block w-max font-mono text-5xl font-medium text-zinc-700">
                    {(isLoading || isFetching) ? <Spinner /> : data?.data.accounts}
                </span>
                <div className="flex flex-col gap-">
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                        10 - Active Accounts
                        <span className="shrink-0 size-1 rounded-full bg-green-500 animate-pulse" />
                    </span>
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                        10 - Deactivated Accounts
                        <span className="shrink-0 size-1 rounded-full bg-red-500 animate-pulse" />
                    </span>
                </div>
            </div>
        </div>
    )
}
function Users({ isFetching, isLoading, data }: Props) {
    return (
        <div className='w-full min-h-36 rounded-xl bg-white border border-black/5 p-4 flex flex-col items-start justify-between gap-5 transition-all duration-300 ease-in-out hover:shadow-[0_4px_12px_rgb(50,0,0,0.09)]'>
            <div className="w-full flex items-center justify-between">
                <span className="text-black font-medium">
                    Total Users
                </span>
                <UserCheck size={24} className="text-zinc shrink-0" strokeWidth={1} />
            </div>
            <div className="flex flex-col gap-5">
                <span className="block w-max font-mono text-5xl font-medium text-zinc-700">
                    {(isLoading || isFetching) ? <Spinner /> : data?.data.users}
                </span>
                <div className="flex flex-col gap-">
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                        10 - Active Users
                        <span className="shrink-0 size-1 rounded-full bg-green-500 animate-pulse" />
                    </span>
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                        10 - Deactivated Users
                        <span className="shrink-0 size-1 rounded-full bg-red-500 animate-pulse" />
                    </span>
                </div>
            </div>
        </div>
    )
}
function Forms({ isFetching, isLoading, data }: Props) {
    return (
        <div className='w-full min-h-36 rounded-xl bg-white border border-black/5 p-4 flex flex-col items-start justify-between gap-5 transition-all duration-300 ease-in-out hover:shadow-[0_4px_12px_rgb(50,0,0,0.09)]'>
            <div className="w-full flex items-center justify-between">
                <span className="text-black font-medium">
                    Total Forms
                </span>
                <ClipboardList size={24} className="text-zinc shrink-0" strokeWidth={1} />
            </div>
            <div className="flex flex-col gap-5">
                <span className="block w-max font-mono text-5xl font-medium text-zinc-700">
                    {(isLoading || isFetching) ? <Spinner /> : data?.data.forms}
                </span>
                <div className="flex flex-col gap-">
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                        10 - Active Forms
                        <span className="shrink-0 size-1 rounded-full bg-green-500 animate-pulse" />
                    </span>
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                        10 - Deactivated Forms
                        <span className="shrink-0 size-1 rounded-full bg-red-500 animate-pulse" />
                    </span>
                </div>
            </div>
        </div>
    )
}
function Responses({ isFetching, isLoading, data }: Props) {
    return (
        <div className='w-full min-h-36 rounded-xl bg-white border border-black/5 p-4 flex flex-col items-start  gap-5 transition-all duration-300 ease-in-out hover:shadow-[0_4px_12px_rgb(50,0,0,0.09)]'>
            <div className="w-full flex items-center justify-between">
                <span className="text-black font-medium">
                    Total Responses
                </span>
                <Inbox size={24} className="text-zinc-800 shrink-0" strokeWidth={1} />
            </div>
            <div className="flex flex-col gap-5">
                <span className="block w-max font-mono text-5xl font-medium text-zinc-700">
                    {(isLoading || isFetching) ? <Spinner /> : data?.data.responses}
                </span>
            </div>
        </div>
    )
}
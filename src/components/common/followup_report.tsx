'use client';
import { FollowUp, FollowUpListResponse } from "@/src/types/report";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import Spinner from "../ui/spinner";
import { Calendar, Clock, Mail, MoveLeft, NotebookPen } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";


export default function FollowupReport({ id, date }: { id: string, date: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams()
    const [currentDate, setCurrentDate] = useState<string>(date);
    const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
    const { data, isLoading, isError, isFetching, error } = useQuery<FollowUpListResponse>({
        queryKey: ["follow_up_report", id, currentDate],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/followup/report`, {
                params: { id, date: currentDate, page: paginationModel.page + 1, limit: paginationModel.pageSize },
                withCredentials: true,
            });
            return res.data;
        },
        retry: 1,
        placeholderData: (old) => old,
    });

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/dashboard");
        }
    };
    return (
        <div className="w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-5 justify-between md:items-center items-start mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 shrink-0 bg-white rounded-full flex items-center justify-center border border-gray-400 cursor-pointer hover:bg-gray-100 transition duration-300 ease-in-out"
                        onClick={handleBack}
                    >
                        <MoveLeft size={16} />
                    </div>
                    <h1 className="font-bold text-zinc-800 text-xl">
                        {data?.followUps?.[0]?.response?.form?.title}
                    </h1>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => {
                            const newDate = e.target.value;
                            setCurrentDate(newDate);
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("date", newDate);
                            router.replace(`${pathname}?${params.toString()}`);
                        }}
                        className="border border-gray-300 rounded-md p-1.5"
                        disabled={isFetching}
                    />
                </div>
            </div>
            {
                data?.followUps?.length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                        No follow-ups found
                    </div>
                )
            }
            {isLoading && (
                <div className="flex justify-center py-20">
                    <Spinner />
                </div>
            )}
            {isFetching && !isLoading && (
                <div className="absolute inset-0 bg-white/60 flex justify-center items-center z-10">
                    <Spinner />
                </div>
            )}
            {isError && (
                <div className="flex justify-center py-20">
                    <h1 className="text-red-600 font-bold text-xl">
                        {error?.message}
                    </h1>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {data?.followUps?.map((followUp: FollowUp) => (
                    <FollowUpCard key={followUp.id} followUp={followUp} />
                ))}
            </div>
            {data && data.totalResponse > paginationModel.pageSize && (
                <div className="flex items-center gap-4 mt-6 justify-center">
                    <button
                        disabled={!data.prevPage || isFetching}
                        onClick={() => setPaginationModel((p) => ({ ...p, page: p.page - 1 }))}
                        className={`px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium transition-all ${!data.prevPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"}`}
                    >
                        Previous
                    </button>

                    <span className="font-medium text-zinc-700">
                        Page {data.page} / {data.pageCount}
                    </span>

                    <button
                        disabled={!data.nextPage || isFetching}
                        onClick={() => setPaginationModel((p) => ({ ...p, page: p.page + 1 }))}
                        className={`px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium transition-all ${!data.nextPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"}`}
                    >
                        Next
                    </button>

                </div>
            )}
        </div>
    )
}

function FollowUpCard({ followUp }: { followUp: FollowUp }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between">
                <div>
                    {/* <p className="text-sm font-semibold text-gray-800">
                        {followUp.response.form.title}
                    </p> */}
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Calendar size={14} /> {new Date(followUp.createdAt).toLocaleString()}
                    </p>
                </div>

                <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${followUp.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                        }`}
                >
                    {followUp.status}
                </span>
            </div>

            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <Mail size={14} />
                <span>{followUp.type.replace("_", " ")}</span>
            </div>
            {followUp.note && (
                <p className="mt-1 text-sm text-gray-700 flex items-center gap-2">
                    <NotebookPen size={14} /> {followUp.note}
                </p>
            )}

            <div className="mt-4 flex flex-col gap-x-4 gap-y-2 text-sm">
                {followUp.response.answers.map((ans, idx) => (
                    <div key={idx}>
                        <p className="text-gray-500 text-xs">{ans.field.label}</p>
                        <p className="text-gray-800 font-medium">
                            {ans.value || "-"}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-gray-500">
                <span>Added by: {followUp.addedBy.name}</span>
                <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Follow-up
                </span>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                <span>Next Follow-up</span>
                <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(followUp.nextFollowUpDate).toDateString()}
                </span>
            </div>
        </div>
    );
}
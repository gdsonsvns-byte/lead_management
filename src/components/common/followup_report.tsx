'use client';
import { FollowUp, FollowUpListResponse } from "@/src/types/report";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import Spinner from "../ui/spinner";
import { Calendar, Clock, Mail, NotebookPen } from "lucide-react";


export default function FollowupReport({ id, date }: { id: string, date: string }) {
    const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
    const { data, isLoading, isError, isFetching, error } = useQuery<FollowUpListResponse>({
        queryKey: ["follow_up_report", id, date],
        queryFn: async () => {
            const res = await axios.get(`/api/v1/followup/report`, {
                params: { id, date, page: paginationModel.page + 1, limit: paginationModel.pageSize },
                withCredentials: true,
            });
            return res.data;
        },
        retry: 1,
        placeholderData: (old) => old,
    });
    if (data?.followUps?.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10">
                No follow-ups found
            </div>
        );
    }
    return (
        <div className="w-full overflow-hidden">
            <div className="flex justify-between items-center mb-5">
                <h1 className="font-bold text-zinc-800 text-xl">
                    {data?.followUps?.[0]?.response?.form?.title}
                </h1>
            </div>
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
        </div>
    )
}

function FollowUpCard({ followUp }: { followUp: FollowUp }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-800">
                        {followUp.response.form.title}
                    </p>
                    <p className="text-sm mt-3 text-gray-700 flex items-center gap-2">
                        <Calendar size={14}/> {new Date(followUp.createdAt).toLocaleString()}
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
                    <NotebookPen size={14}/> {followUp.note}
                </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {followUp.response.answers.map((ans, idx) => (
                    <div key={idx}>
                        <p className="text-gray-500 text-xs">{ans.field.label}</p>
                        <p className="text-gray-800 font-medium truncate">
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
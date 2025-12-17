"use client";
import { Suspense, useState } from "react";
import axios, { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import Spinner from "./ui/spinner";
import Link from "next/link";
import { ArrowRight, ListChecks, CalendarDays, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import ViewForm from "./common/ViewForm";
import { Toaster } from 'react-hot-toast';
import EditForm from "./common/EditForm";
import FormDropDown from "./FormDropDown";
import ConfigureWapCampaign from "./common/configure_whatsapp_campaign_for_user_and_admin";

interface FormField {
    id: string;
    formId: string;
    label: string;
    type: string;
    options: string;
    required: boolean;
    order: number;
}

interface FormItem {
    id: string;
    formsId: string;
    userId: string;
    title: string;
    description: string;
    slug: string;
    createdAt: string;
    adminWhatsappCampaignName?: string,
    userWhatsappCampaignName?: string,
    accountId: string;
    fields: FormField[];
}

interface FormsResponse {
    response: {
        forms: FormItem[];
        page: number;
        limit: number;
        totalForm: number;
        pageCount: number;
        hasMore: boolean;
        nextPage: number | null;
        prevPage: number | null;
    };
}

async function fetchForms(page: number, limit: number = 10, accountId: string): Promise<FormsResponse> {
    const res = await axios.get(`/api/v1/form?page=${page}&limit=${limit}&account_id=${accountId}`, {
        withCredentials: true,
    });
    return res.data;
}

export default function FormsList({ accountId }: { accountId?: string }) {
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["forms", page, limit, accountId],
        queryFn: () => fetchForms(page, limit, accountId ?? ''),
        placeholderData: (prev) => prev,
        retry: 1,
    });

    const forms = data?.response?.forms ?? [];
    const pagination = data?.response;

    if (isLoading) {
        return (
            <div className="w-full flex justify-center py-20">
                <Spinner />
            </div>
        );
    }

    if (isError) {
        const errMsg = (error as AxiosError<{ error: string }>)?.response?.data?.error ??
            "Something went wrong.";

        return (
            <p className="text-red-500 text-center py-10 text-lg font-medium">
                {errMsg}
            </p>
        );
    }
    if (forms.length === 0) {
        return (
            <p className="text-gray-500 text-center py-20 text-xl font-medium">
                No forms found. Create a new one.
            </p>
        );
    }
    return (
        <div className="relative w-full flex flex-col gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {forms.map((form: FormItem) => (
                    <div
                        key={form.id}
                        className="relative rounded-2xl bg-white p-6 shadow-md border border-zinc-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col gap-4"
                    >
                        <div className="absolute top-5 right-5 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">
                            {form.formsId.split("-")[0]}-{form.formsId.split("-")[1]}
                        </div>

                        <h2
                            className="text-xl font-semibold text-zinc-800 truncate max-w-[180px]"
                            title={form.title}
                        >
                            {form.title}
                        </h2>


                        <p className="text-sm text-zinc-600 line-clamp-2">
                            {form.description || "No description"}
                        </p>

                        <div className="flex flex-row gap-1 mt-2">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${form.adminWhatsappCampaignName ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"} `}
                                    title={
                                        form.adminWhatsappCampaignName
                                            ? "Admin WhatsApp campaign connected"
                                            : "Admin WhatsApp campaign missing"
                                    }
                                >
                                    {form.adminWhatsappCampaignName ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                    ) : (
                                        <XCircle className="w-3 h-3 text-red-600" />
                                    )}
                                    Admin: {form.adminWhatsappCampaignName ? "Connected" : "Pending"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${form.userWhatsappCampaignName ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                                    title={
                                        form.userWhatsappCampaignName
                                            ? "User WhatsApp campaign connected"
                                            : "User WhatsApp campaign missing"
                                    }
                                >
                                    {form.adminWhatsappCampaignName ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                    ) : (
                                        <XCircle className="w-3 h-3 text-red-600" />
                                    )}
                                    User: {form.userWhatsappCampaignName ? "Connected" : "Pending"}
                                </span>
                            </div>
                        </div>

                        {!form.adminWhatsappCampaignName && !form.userWhatsappCampaignName && <div>
                            <Link
                                href={`?configure_wap=${form.id}`}
                                className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium border border-blue-600 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition"
                            >
                                Configure
                            </Link>
                        </div>}

                        <div className="flex items-center gap-2 text-sm text-zinc-700 mt-2">
                            <ListChecks className="w-4 h-4" />
                            <span>{form.fields.length} Fields</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-zinc-700">
                            <CalendarDays className="w-4 h-4" />
                            <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center justify-between mt-8">
                            <FormDropDown formData={form} />

                            <Link
                                href={`forms/view?id=${form.id}`}
                                className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:underline group w-max"
                                title="View Form Response"
                            >
                                Form Response
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {pagination?.totalForm && pagination.totalForm > limit && (
                <div className="flex items-center gap-4 mt-6 justify-center">

                    <button
                        disabled={!pagination.prevPage}
                        onClick={() => setPage((p) => p - 1)}
                        className={`px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium transition-all ${!pagination.prevPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"}`}
                    >
                        Previous
                    </button>

                    <span className="font-medium text-zinc-700">
                        Page {pagination.page} / {pagination.pageCount}
                    </span>

                    <button
                        disabled={!pagination.nextPage}
                        onClick={() => setPage((p) => p + 1)}
                        className={`px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium transition-all ${!pagination.nextPage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-300"}`}
                    >
                        Next
                    </button>

                </div>
            )}
            <Suspense fallback={<Spinner />} >
                <ViewForm />
                <EditForm />
                <Toaster />
                <ConfigureWapCampaign
                    page={page}
                    limit={limit}
                    accountId={accountId}
                />
            </Suspense>
        </div>
    );
}

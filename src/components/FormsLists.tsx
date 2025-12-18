"use client";
import { Suspense, useState } from "react";
import axios, { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import Spinner from "./ui/spinner";
import Link from "next/link";
import { ArrowRight, ListChecks, CalendarDays, MessageCircle, CheckCircle, XCircle, UserRoundCog, PenLineIcon, Pen } from "lucide-react";
import ViewForm from "./common/ViewForm";
import { Toaster } from 'react-hot-toast';
import EditForm from "./common/EditForm";
import FormDropDown from "./FormDropDown";
import ConfigureWapCampaign from "./common/configure_whatsapp_campaign_for_user_and_admin";

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
    _count: {
        fields: number;
    };
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
                        className="group relative flex flex-col justify-between gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                    >
                        <div className="flex flex-col gap-5">
                            <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow">
                                {form.formsId.split("-")[0]}-{form.formsId.split("-")[1]}
                            </div>

                            <div>
                                <h2
                                    className="max-w-[220px] truncate text-lg font-semibold text-zinc-800"
                                    title={form.title}
                                >
                                    {form.title}
                                </h2>
                                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                                    {form.description || "No description"}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${form.adminWhatsappCampaignName
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-600"
                                        }`}
                                    title={
                                        form.adminWhatsappCampaignName
                                            ? "Admin WhatsApp campaign connected"
                                            : "Admin WhatsApp campaign missing"
                                    }
                                >
                                    {form.adminWhatsappCampaignName ? (
                                        <CheckCircle className="h-3 w-3" />
                                    ) : (
                                        <XCircle className="h-3 w-3" />
                                    )}
                                    Admin
                                </span>

                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${form.userWhatsappCampaignName
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-600"
                                        }`}
                                    title={
                                        form.userWhatsappCampaignName
                                            ? "User WhatsApp campaign connected"
                                            : "User WhatsApp campaign missing"
                                    }
                                >
                                    {form.userWhatsappCampaignName ? (
                                        <CheckCircle className="h-3 w-3" />
                                    ) : (
                                        <XCircle className="h-3 w-3" />
                                    )}
                                    User
                                </span>
                            </div>

                            {!form.adminWhatsappCampaignName && !form.userWhatsappCampaignName && (
                                <div>
                                    <Link
                                        href={`?configure_wap=${form.id}`}
                                        className="inline-flex items-center rounded-full border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-600 hover:text-white"
                                    >
                                        Configure WhatsApp
                                    </Link>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 text-sm text-zinc-700">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-zinc-500" />
                                    <span>{form._count.fields} Fields</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-zinc-500" />
                                    <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div className="mt-3 text-sm text-zinc-600 space-y-1">
                                    <div className="flex justify-between">
                                        <span>
                                            Admin ·{" "}
                                            <span className={form.adminWhatsappCampaignName ? "text-emerald-600" : "italic text-zinc-400"}>
                                                {form.adminWhatsappCampaignName ?? "Not Connected"}
                                            </span>
                                        </span>
                                        <Pen className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-700 cursor-pointer" />
                                    </div>

                                    <div className="flex justify-between">
                                        <span>
                                            User ·{" "}
                                            <span className={form.userWhatsappCampaignName ? "text-emerald-600" : "italic text-zinc-400"}>
                                                {form.userWhatsappCampaignName ?? "Not Connected"}
                                            </span>
                                        </span>
                                        <Pen className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-700 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <FormDropDown formData={form} />

                            <Link
                                href={`forms/view?id=${form.id}`}
                                className="group inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                            >
                                Form Response
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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

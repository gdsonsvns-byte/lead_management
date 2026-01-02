"use client";

import { X, MessageCircle } from "lucide-react";
import Input from "../ui/Input";
import Spinner from "../ui/spinner";
import toast from "react-hot-toast";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Props {
    page: number;
    limit: number;
    accountId?: string;
}

export default function ConfigureWapCampaign({ page, limit, accountId }: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const formId = searchParams.get("configure_wap");
    const isOpen = !!formId;

    const [adminCampaign, setAdminCampaign] = useState<string | "">("");
    const [userCampaign, setUserCampaign] = useState<string | "">("");
    const [errorMsg, setErrorMsg] = useState("");

    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("configure_wap");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const mutation = useMutation({
        mutationFn: async () => {
            return axios.patch(`/api/v1/form/${formId}/add_campaigns`, {
                adminWhatsappCampaignName: adminCampaign,
                userWhatsappCampaignName: userCampaign,
            });
        },
        onSuccess: () => {
            toast.success("WhatsApp campaigns updated!");
            queryClient.invalidateQueries({ queryKey: ["forms", page, limit, accountId], });
            setTimeout(closeModal, 500);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || "Update failed";
            setErrorMsg(msg);
            toast.error(msg);
        },
    });

    const handleSave = () => {
        if (!adminCampaign.trim() || !userCampaign.trim()) {
            setErrorMsg("Both campaign names are required.");
            return;
        }
        mutation.mutate();
    };

    if (!isOpen) return null;

    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start md:p-10 p-4 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">

                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    Configure WhatsApp Campaigns
                </h1>

                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-5">
                        <Input
                            label="Admin WhatsApp Campaign Name"
                            placeholder="Example: admin_new_lead_alert"
                            value={adminCampaign}
                            onChange={(e) => setAdminCampaign(e.target.value)}
                            leftIcon={<MessageCircle className="w-4 h-4" />}
                        />

                        <Input
                            label="User WhatsApp Campaign Name"
                            placeholder="Example: user_lead_received"
                            value={userCampaign}
                            onChange={(e) => setUserCampaign(e.target.value)}
                            leftIcon={<MessageCircle className="w-4 h-4" />}
                        />
                    </div>

                    {errorMsg && (
                        <p className="text-red-600 text-sm mt-2">{errorMsg}</p>
                    )}

                    <button
                        className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
                        onClick={handleSave}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending ? (
                            <Spinner color="white" />
                        ) : (
                            "Save Campaigns"
                        )}
                    </button>
                </div>
            </div>
        </section>
    );
}

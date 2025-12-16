"use client";
import { Key, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Input from "./ui/Input";
import Spinner from "./ui/spinner";
import Textarea from "./ui/Textarea";

interface Props {
    page: number;
    limit: number
}

export default function AddWapKeyModal({ page, limit }: Props) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    const accountId = searchParams.get("add_wap_key");
    const isOpen = !!accountId;

    const [apiKey, setApiKey] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("add_wap_key");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await axios.post(
                `/api/v1/auth/accounts/${accountId}/connect_wap`,
                { whatsappApiKey: apiKey },
                { withCredentials: true }
            );
            return res.data;
        },
        onSuccess: () => {
            toast.success("WhatsApp API key added successfully!");
            queryClient.invalidateQueries({ queryKey: ["accounts", page, limit] });
            setTimeout(closeModal, 500);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || "Failed to add API key.";
            setErrorMsg(msg);
            toast.error(msg);
        },
    });

    const handleSave = () => {
        if (!apiKey.trim()) {
            setErrorMsg("API key is required.");
            return;
        }
        mutation.mutate();
    };

    if (!isOpen) return null;
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start p-10 overflow-auto">
            <div className="bg-white w-full max-w-xl rounded-xl shadow-xl p-6 relative">

                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close WhatsApp API Key Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    <Key size={20} />
                    Add WhatsApp API Key
                </h1>

                <div className="mt-4">
                    <Textarea
                        label="WhatsApp API Key"
                        placeholder="Enter your WhatsApp API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        leftIcon={<Key size={18} />}
                    />
                    {errorMsg && (
                        <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
                    )}
                </div>

                <button
                    className=" cursor-pointer mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
                    onClick={handleSave}
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? (
                        <Spinner color="white" />
                    ) : (
                        "Save API Key"
                    )}
                </button>
            </div>
        </section>
    );
}

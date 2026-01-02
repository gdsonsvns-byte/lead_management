'use client';
import { Dispatch, SetStateAction, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation';
import { PenIcon, X } from 'lucide-react';
import Spinner from '../ui/spinner';
import Input from '../ui/Input';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

interface Props {
    setOpenFormModal: Dispatch<SetStateAction<boolean>>;
    apiKey: {
        message: string;
        token: string;
    };
    setapiKey: Dispatch<SetStateAction<{ message: string; token: string }>>;
    setOpenTokenModal: Dispatch<SetStateAction<boolean>>;
}

export default function GenerateApiKey({ setOpenFormModal, apiKey, setapiKey, setOpenTokenModal }: Props) {

    const searchParams = useSearchParams();
    const router = useRouter();
    const accountId = searchParams.get("account_id");
    const [name, setName] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 2000);
    };
    const closeModal = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("account_id");
        router.replace(`?${params.toString()}`, { scroll: false });
        setOpenFormModal(false);
    };

    const CreateAPIKey = useMutation({
        mutationFn: async (name: string) => {
            const response = await axios.post(`/api/v1/auth/generate_access_token?account_id=${accountId ?? ''}`,
                { name },
                {
                    withCredentials: true,
                });
            return response.data;
        },

        onError: (err: AxiosError<any>) => {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                showMessage("error", `${err?.response?.data?.error}`);
            } else {
                showMessage("error", `${err?.response?.data?.error}`);
            }
            toast.error(err?.response?.data?.error, {
                duration: 5000
            });
        },

        onSuccess: (data) => {
            toast.success('API Key generated successfully!', {
                duration: 5000
            });
            showMessage("success", "API Key generated successfully!");
            setapiKey(data);
            setTimeout(() => closeModal(), 700);
            setTimeout(() => setOpenTokenModal(true), 1000);
        },
    });
    const { mutate, isPending } = CreateAPIKey;

    const generateApiKey = () => {
        if (!name.trim()) {
            showMessage("error", "API name is required.");
            return;
        }
        mutate(name);
    };

    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start p-10 overflow-auto">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">
                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close View Form Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                <div className='w-full space-y-3'>
                    <h2 className="text-2xl font-semibold text-zinc-800 mb-1">
                        Generate API Key
                    </h2>
                    <p className="text-sm text-zinc-600 mb-6">
                        Generate a new API key to access your account.
                    </p>
                </div>
                <div className="mt-6">
                    <Input
                        type="text"
                        label="API Name"
                        placeholder="Enter API name"
                        leftIcon={<PenIcon size={18} />}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="mt-6">
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2"
                        onClick={generateApiKey}
                        disabled={isPending}
                    >
                        {isPending ? <Spinner color='white' /> : "Generate API Key"}
                    </button>
                </div>
                {message && (
                    <div
                        className={`mt-4 p-3 rounded-lg text-white ${message.type === "error" ? "bg-red-600" : "bg-green-600"
                            }`}
                    >
                        {message.text}
                    </div>
                )}
            </div>
        </section>
    )
}

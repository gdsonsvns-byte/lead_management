"use client"
import { X } from "lucide-react";
import { useState } from "react";
import Spinner from "../ui/spinner";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";

interface Props {
    selectedId: string | null;
    setSelectedId: () => void;
    accountId: string | null;
}
const ROLES = ["MANAGER", "ADMIN"];

export default function UpdateUser({ selectedId, setSelectedId, accountId }: Props) {
    const [role, setRole] = useState<string>("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const closeModal = () => {
        setMessage(null);
        setRole("");
        setSelectedId();
    };

    const { isPending, mutate } = useMutation({
        mutationFn: async (role: string) => {
            const response = await axios.patch(`/api/v1/auth/users/${selectedId}?account_id=${accountId}`,
                { role: role },
                {
                    withCredentials: true,
                });
            return response.data;
        },
        onError: (err: AxiosError<any>) => {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                setMessage({ type: "error", text: `${err?.response?.data?.error}` });
            } else {
                setMessage({ type: "error", text: `${err?.response?.data?.error}` });
            }
            toast.error(err?.response?.data?.error, {
                duration: 5000
            });
        },

        onSuccess: (data: any) => {
            const successMessage =
                data?.message || "User updated successfully";

            toast.success(successMessage, {
                duration: 5000,
            });

            setMessage({ type: "success", text: successMessage });
        },
    })
    if (!selectedId) return null
    return (
        <section className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start p-10 overflow-auto m-0!">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">
                {/* Close button */}
                <button
                    className="absolute right-4 top-4 w-9 h-9 rounded-full bg-zinc-200 flex justify-center items-center hover:bg-zinc-300 transition cursor-pointer"
                    onClick={closeModal}
                    aria-label="Close Update User Modal"
                >
                    <X size={18} className="text-zinc-700" />
                </button>

                {/* Header */}
                <div className="w-full space-y-2">
                    <h2 className="text-2xl font-semibold text-zinc-800">
                        Update User Role
                    </h2>
                    <p className="text-sm text-zinc-600">
                        Change the role assigned to this user.
                    </p>
                </div>

                {/* Role select */}
                <div className="mt-6">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Select Role
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose role</option>
                        {ROLES.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Action */}
                <div className="mt-6">
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-60"
                        onClick={() => mutate(role)}
                        disabled={isPending}
                    >
                        {isPending ? <Spinner color="white" /> : "Update Role"}
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div
                        className={`mt-4 p-3 rounded-lg text-white ${message.type === "error"
                            ? "bg-red-600"
                            : "bg-green-600"
                            }`}
                    >
                        {message.text}
                    </div>
                )}
            </div>
        </section>
    )
}

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Input from "./ui/Input";

export default function UpdatePassword() {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const passwordMutation = useMutation({
        mutationFn: async () => {
            const res = await axios.patch(
                "/api/v1/auth/update-password",
                form,
                { withCredentials: true }
            );
            return res.data;
        },
        onSuccess: () => {
            toast.success("Password updated successfully");
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.error || "Failed to update password");
        }
    });

    const disableButton = !form.currentPassword || !form.newPassword || !form.confirmPassword || form.newPassword !== form.confirmPassword;

    return (
        <div className="p-6 rounded-xl bg-white shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Update Password
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 gap-y-5">

                <div className="">
                    <Input
                        value={form.currentPassword}
                        type='text'
                        name="currentPassword"
                        label="Current Password"
                        placeholder="Enter old password"
                        onChange={handleChange}
                    />
                </div>

                <div className="flex flex-col">
                    <Input
                        value={form.newPassword}
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        label="New Password"
                        placeholder="Enter new password"
                        rightIcon={
                            showPassword ? (
                                <EyeOff size={18} onClick={() => setShowPassword(false)} />
                            ) : (
                                <Eye size={18} onClick={() => setShowPassword(true)} />
                            )
                        }
                        onChange={handleChange}
                    />
                </div>

                <div className="flex flex-col">
                    <Input
                        value={form.confirmPassword}
                        type='text'
                        name="confirmPassword"
                        label="Confirm Password"
                        placeholder="Confirm password"
                        onChange={handleChange}
                    />
                </div>
                <span />
                <button
                    disabled={disableButton || passwordMutation.isPending}
                    onClick={() => passwordMutation.mutate()}
                    className={`mt-5 py-2.5 col-span-1 md:col-span-2 w-full rounded-lg text-white font-semibold transition 
                        ${disableButton || passwordMutation.isPending
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"}`}
                >
                    {passwordMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                    ) : (
                        "Update Password"
                    )}
                </button>
            </div>
        </div>
    );
}

'use client';
import { ChangeEvent, FormEvent, useState } from "react";
import Input from "../ui/Input";
import { Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { redirect } from "next/navigation";
import Spinner from "../ui/spinner";

export default function ResetPassword({ token }: { token: string }) {
    const [password, setPassword] = useState<string>('')
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const resetPasswordMutation = useMutation({
        mutationFn: async (payload: string): Promise<string> => {
            const response = await axios.post(
                "/api/v1/auth/reset-password",
                {
                    "token": token,
                    "password": payload
                }
            );
            return response.data;
        },
        onSuccess: () => {
            setPassword('');
            setTimeout(() => {
                redirect('/login')
            }, 1500)
        },
    });
    const { mutate, isPending, isError, error, isSuccess } = resetPasswordMutation;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        mutate(password);
    }

    return (
        <form className="relative w-full flex flex-col gap-3" onSubmit={handleSubmit}>
            <Input
                value={password}
                type={showPassword ? "text" : "password"}
                name="password"
                label="New Password"
                placeholder="New Password"
                rightIcon={
                    showPassword ? (
                        <EyeOff size={18} onClick={() => setShowPassword(false)} />
                    ) : (
                        <Eye size={18} onClick={() => setShowPassword(true)} />
                    )
                }
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
            <button
                disabled={isPending}
                role='button'
                className={`w-full bg-blue-600 py-2.5 text-white mt-3 rounded font-medium text-lg ${isPending ? 'cursor-not-allowed' : 'cursor-pointer'} `}
            >
                {isPending ? <Spinner color="white" /> : 'Save'}
            </button>
            {isError && (
                <p className="text-red-500 text-sm mt-1">
                    {((error as AxiosError)?.response?.data as { error?: string })?.error || (error as Error).message}
                </p>
            )}

            {isSuccess && (
                <p className="text-green-500 text-sm mt-1">Password Successfully Reset</p>
            )}
        </form>
    )
}

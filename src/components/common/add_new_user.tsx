"use client";
import { NewUser } from "@/src/types/auth";
import Input from "../ui/Input";
import { ChangeEvent, FormEvent, useState } from "react";
import { Mail, User } from "lucide-react";
import axios, { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import Spinner from "../ui/spinner";
import { useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

const ROLES = [
    { label: "Manager", value: "MANAGER" },
    // { label: "Admin", value: "ADMIN" },
];

type CreateUserPayload = {
    data: NewUser;
    accountId?: string;
};

export default function AddNewUser() {
    const searchParams = useSearchParams();
    const accountId = searchParams.get("account_id") ?? undefined;

    const [formValue, setFormValue] = useState<NewUser>({
        name: "",
        email: "",
        role: "MANAGER",
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setFormValue((prev) => ({
            ...prev,
            [name]: value
        }));

        setFieldErrors((prev) => {
            const { [name]: _, ...rest } = prev;
            return rest;
        });
    }

    const createAccountMutation = useMutation({
        mutationFn: async ({ data, accountId }: CreateUserPayload) => {
            const response = await axios.post(
                "/api/v1/auth/accounts/add_new_user",
                data,
                {
                    ...(accountId && {
                        params: { account_id: accountId },
                    }),
                    withCredentials: true,
                }
            );
            return response.data;
        },

        onError: (err: AxiosError<any>) => {
            toast.error(err.response?.data?.error);
            const apiErrors = err.response?.data?.error;
            if (apiErrors) {
                setFieldErrors(apiErrors);
            }
        },

        onSuccess: (val) => {
            toast.success(val?.message);
            setFieldErrors({});
            setFormValue({
                name: "",
                email: "",
                role: "MANAGER"
            });
        },
    });

    const { mutate, isPending, isSuccess, error } = createAccountMutation;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        mutate({
            data: formValue,
            accountId,
        });
    }
    return (
        <form className="grid grid-cols-3 gap-5" onSubmit={handleSubmit}>
            <Input
                value={formValue.name}
                type="text"
                name="name"
                label="Contact Person Name"
                placeholder="Enter full name"
                leftIcon={<User size={18} />}
                onChange={handleChange}
            />

            <Input
                value={formValue.email}
                type="email"
                name="email"
                label="Email"
                placeholder="Enter email"
                leftIcon={<Mail size={18} />}
                onChange={handleChange}
            />
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                    Role
                </label>

                <select
                    name="role"
                    value={formValue.role}
                    onChange={handleChange}
                    className={`h-11 rounded-md border px-3 text-sm outline-none transition ${fieldErrors.role ? "border-red-500" : "border-gray-300"} focus:border-blue-500`}
                >
                    {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                            {role.label}
                        </option>
                    ))}
                </select>

                {fieldErrors.role && (
                    <p className="text-xs text-red-500">
                        {fieldErrors.role.join(", ")}
                    </p>
                )}
            </div>


            <button
                className="col-span-2 bg-blue-600 py-2.5 text-white mt-3 rounded font-medium text-lg flex items-center justify-center cursor-pointer transition-colors duration-200 ease-in hover:bg-blue-700"
                disabled={isPending}
            >
                {isPending ? <Spinner color="white" /> : "Create Account"}
            </button>

            {isSuccess && (
                <p className="col-span-3 text-green-500">
                    Account created successfully!
                </p>
            )}
            <Toaster />
        </form>
    )
}

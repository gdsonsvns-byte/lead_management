"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import Input from "../ui/Input";
import { User, Mail, Building2, Phone, MapPin, Key } from "lucide-react";
import Spinner from "../ui/spinner";
import Textarea from "../ui/Textarea";

interface AddAccountSchema {
    name: string;
    email: string;
    businessName: string;
    phone: string;
    location: string;
    whatsappApiKey?: string;
}

interface AddAccountResponse {
    success: boolean;
    message: string;
}

export default function AddAccountForm() {

    const [formValue, setFormValue] = useState<AddAccountSchema>({
        name: "",
        email: "",
        businessName: "",
        phone: "",
        location: "",
        whatsappApiKey: ""
    });

    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
        mutationFn: async (payload: AddAccountSchema): Promise<AddAccountResponse> => {
            const response = await axios.post<AddAccountResponse>(
                "/api/v1/auth/accounts/create",
                payload,
                { withCredentials: true }
            );
            return response.data;
        },

        onError: (err: AxiosError<any>) => {
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                setFieldErrors(apiErrors);
            }
        },

        onSuccess: () => {
            setFieldErrors({});
            setFormValue({
                name: "",
                email: "",
                businessName: "",
                phone: "",
                location: "",
                whatsappApiKey: "",
            });
        },
    });

    const { mutate, isPending, isSuccess } = createAccountMutation;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        mutate(formValue);
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
                error={!!fieldErrors.name}
                helperText={fieldErrors.name?.join(", ")}
            />

            <Input
                value={formValue.email}
                type="email"
                name="email"
                label="Email"
                placeholder="Enter email"
                leftIcon={<Mail size={18} />}
                onChange={handleChange}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email?.join(", ")}
            />

            <Input
                value={formValue.businessName}
                type="text"
                name="businessName"
                label="Business Name"
                placeholder="Enter business name"
                leftIcon={<Building2 size={18} />}
                onChange={handleChange}
                error={!!fieldErrors.businessName}
                helperText={fieldErrors.businessName?.join(", ")}
            />
            <Input
                value={formValue.phone}
                type="text"
                name="phone"
                label="Phone Number"
                placeholder="Enter phone number"
                leftIcon={<Phone size={18} />}
                onChange={handleChange}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone?.join(", ")}
            />

            <Input
                value={formValue.location}
                type="text"
                name="location"
                label="Location"
                placeholder="Enter location"
                leftIcon={<MapPin size={18} />}
                onChange={handleChange}
                error={!!fieldErrors.location}
                helperText={fieldErrors.location?.join(", ")}
            />

            <Textarea
                value={formValue.whatsappApiKey}
                name="whatsappApiKey"
                label="WhatsApp Api Key"
                placeholder="Enter WhatsApp Api Key"
                leftIcon={<Key size={18} />}
                onChange={handleChange}
                error={!!fieldErrors.location}
                helperText={fieldErrors.location?.join(", ")}
            />

            <button
                className="col-span-2 bg-blue-600 py-2.5 text-white mt-3 rounded font-medium text-lg flex items-center justify-center cursor-pointer transition-colors duration-200 ease-in hover:bg-blue-700"
            >
                {isPending ? <Spinner color="white" /> : "Create Account"}
            </button>

            {isSuccess && (
                <p className="col-span-3 text-green-500">
                    Account created successfully!
                </p>
            )}

        </form>
    );
}

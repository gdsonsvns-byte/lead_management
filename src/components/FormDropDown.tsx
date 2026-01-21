'use client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { CopyIcon, EyeIcon, InboxIcon, Pencil, SettingsIcon, Trash2Icon, UserCog, ViewIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import Spinner from "./ui/spinner";
import { useAuth } from "../hooks/useAuth";

interface FormItem {
    id: string;
    formsId: string;
    userId: string;
    title: string;
    description: string;
    slug: string;
    createdAt: string;
    accountId: string;
    _count: {
        fields: number;
    };
}
interface Props {
    formData: FormItem
}

export default function FormDropDown({ formData }: Props) {
    const { user } = useAuth()
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [copyLoading, setCopyLoading] = useState<boolean>(false)
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

    function handleCopy(formId: string) {
        setCopyLoading(true);
        if (!formId) {
            return toast.error("Unable to copy link...! try after some time")
        }
        const link = `https://forms.wizards.co.in/${formId}/submit`
        navigator.clipboard.writeText(link)
        setCopyLoading(false);
        return toast("Copied...!")
    }
    const deleteMutation = useMutation({
        mutationFn: async (formId: string) => {
            setDeletingId(formId);
            return await axios.delete(`/api/v1/form/${formId}`, {
                withCredentials: true,
            });
        },
        onSuccess: () => {
            toast.success('Form deleted successfully', {
                duration: 5000
            });
            queryClient.invalidateQueries({ queryKey: ["forms"] });
        },
        onSettled: () => {
            setDeletingId(null);
        },
        onError: (err: AxiosError<any>) => {
            const msg = err?.response?.data?.error || "Something went wrong, can\'t delete the form."
            toast.error(msg, {
                duration: 5000
            });
        }
    });

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <SettingsIcon size={18} className="text-zinc-700 cursor-pointer" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56 bg-white border border-gray-300 mt-3">
                <DropdownMenuGroup>
                    {isAdmin && (
                        <>
                            <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                                <Link
                                    href={`?update=${formData.id}`}
                                    className="flex items-center justify-between"
                                    title="Edit Form"
                                >
                                    Edit Form
                                    <Pencil size={14} className="text-zinc-700" />
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                                <Link
                                    href={`?form_id=${formData.id}`}
                                    className="flex items-center justify-between w-full"
                                >
                                    Manage Response
                                    <InboxIcon size={14} className="text-zinc-700" />

                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                                <Link
                                    href={`?account_id=${formData.accountId}&f_id=${formData.id}`}
                                    className="flex items-center justify-between w-full"
                                >
                                    Manage Access
                                    <UserCog size={14} className="text-zinc-700" />
                                </Link>
                            </DropdownMenuItem>
                        </>
                    )}

                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                        <Link
                            href={`?view=${formData.id}`}
                            className="flex items-center justify-between"
                        >
                            View Form
                            <EyeIcon size={14} className="text-zinc-700" />
                        </Link>

                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                        <button
                            className="flex items-center justify-between w-full"
                            title="Copy Form Link"
                            onClick={() => handleCopy(formData.id)}
                        >
                            Copy Link
                            {
                                copyLoading ? <Spinner /> : <CopyIcon size={14} className="text-zinc-700" />
                            }

                        </button>
                    </DropdownMenuItem>

                    {
                        isAdmin && (
                            <>
                                <DropdownMenuSeparator className="bg-gray-300" />
                                <DropdownMenuItem
                                    title="Delete this form"
                                    onSelect={(e) => e.preventDefault()}
                                    onClick={() => deleteMutation.mutate(formData.id)}
                                    disabled={deletingId === formData.id}
                                    className="text-red-600 cursor-pointer hover:bg-gray-100 flex items-center w-full justify-between"
                                >
                                    Delete Form
                                    {deletingId === formData.id ? (
                                        <Spinner />
                                    ) : (
                                        <Trash2Icon size={14} className="text-zinc-700" />
                                    )}
                                </DropdownMenuItem>
                            </>
                        )
                    }
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

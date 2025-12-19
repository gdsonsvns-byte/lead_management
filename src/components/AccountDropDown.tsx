'use client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { SettingsIcon, Trash2Icon, ViewIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import Spinner from "./ui/spinner";

interface Account {
    id: string;
    email: string;
    businessName: string | null;
    phone: string | null;
    location: string | null;
    createdAt: string;
}
interface Props {
    details: Account;
    page: number;
    limit: number;
}

export default function AccountDropDown({ details, page, limit }: Props) {
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: async (acc_id: string) => {
            setDeletingId(acc_id);
            return await axios.delete(`/api/v1/auth/accounts/${acc_id}`, {
                withCredentials: true,
            });
        },
        onSuccess: () => {
            toast.success('Account deleted successfully', {
                duration: 4000
            });
            queryClient.invalidateQueries({ queryKey: ["accounts", page, limit] });
            setOpen(false);
        },
        onSettled: () => {
            setDeletingId(null);
        },
        onError: () => {
            toast.error('Something went wrong, can\'t delete the Account.', {
                duration: 4000
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
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                        <Link href={`/system_admin/accounts/${details.id}/view`}>
                            View all Forms
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                        <Link href={`/system_admin/accounts/${details.id}/add`}>
                            Add New Form
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-gray-100">
                        <Link href={`/system_admin/accounts/add_new_user?account_id=${details.id}`}>
                            Add New User
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-300" />
                    <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => deleteMutation.mutate(details.id)}
                        disabled={deletingId === details.id}
                        className="text-red-600 cursor-pointer hover:bg-gray-100 flex items-center"
                    >
                        {deletingId === details.id ? (
                            <Spinner />
                        ) : (
                            <Trash2Icon size={14} />
                        )}
                        Delete Account
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

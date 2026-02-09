"use client";

import { generateNameInitials } from "@/src/lib/generatePassword";
import { Mail, Phone, X } from "lucide-react";


type Data = {
    id: string,
    businessName: string,
    email: string;
    phone: string;
    users: {
        id: string,
        name: string,
        role: string,
        email: string,
    }[],
    _count: {
        users: number;
        forms:number;
    }
}
interface Props {
    user: Data | null;
    onClose: () => void;
}

export default function ViewAccountDetails({ user, onClose }: Props) {
    return (
        <div className='fixed inset-0 min-h-screen overflow-y-auto p-10 flex items-center justify-center bg-black/5 z-100 backdrop-blur-xs'>
            <div className='w-full max-w-2xl bg-white rounded-2xl max-h-130 overflow-y-auto xc'>
                <div className="w-full flex items-center justify-between p-5 sticky top-0 bg-white border-b border-black/20">
                    <span className="font-medium text-base text-zinc-800">
                        Account Details
                    </span>
                    <button
                        className="w-9 h-9 rounded-full bg-zinc-100 border border-black/10 flex justify-center items-center hover:bg-zinc-200 transition cursor-pointer"
                        onClick={onClose}
                        aria-label="Close View Form Modal"
                    >
                        <X size={18} className="text-zinc-700" />
                    </button>
                </div>

                <div className="w-full flex justify-between gap-5 p-5">
                    <div className="flex-1 flex flex-col">
                        <span className="text-xl font-semibold text-zinc-800">
                            {user?.businessName}
                        </span>
                        <span className="flex gap-2 items-center mt-2 text-zinc-700">
                            <Mail size={18} strokeWidth={1} />
                            {user?.email}
                        </span>
                        <span className="flex gap-2 items-center mt-0.5 text-zinc-700">
                            <Phone size={18} strokeWidth={1} />
                            {user?.phone}
                        </span>
                    </div>
                    <div className="size-16 bg-blue-600 flex items-center justify-center rounded-full text-white">
                        <span className="text-2xl font-medium">
                            {generateNameInitials(user?.businessName)}
                        </span>
                    </div>
                </div>

                <div className="p-5 grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 border border-black/10 rounded-xl flex flex-col items-start gap-3">
                        <p className="text-gray-500">Total Users</p>
                        <p className="text-3xl font-semibold">{user?._count.users}</p>
                    </div>

                    <div className="p-3 border border-black/10 rounded-xl flex flex-col items-start gap-3">
                        <p className="text-gray-500">Total Forms</p>
                        <p className="text-3xl font-semibold">{user?._count.forms}</p>
                    </div>
                </div>

                <div className="p-5 mt-3">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Users
                    </h2>

                    <div className="space-y-3">
                        {user?.users.map((u) => (
                            <div
                                key={u.id}
                                className="relative p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-gray-800 font-medium">{u.name}</p>
                                    <p className="text-gray-500 text-sm">{u.email}</p>
                                </div>
                                <span className="mt-1 inline-block text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                                    {u.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

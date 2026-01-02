"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { ADMIN_TABS, SYSTEM_ADMIN } from "@/src/constants/adminTabs";
import { Dispatch, SetStateAction } from "react";


export default function Tabs({ setOpen }: { setOpen: Dispatch<SetStateAction<boolean>> }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-1 pl-5 pt-5 overflow-y-auto flex-1">
            {((pathname.startsWith("/admin") ? ADMIN_TABS : SYSTEM_ADMIN)).map((tab) => {
                const isActive = pathname.startsWith(tab.page);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.page}
                        href={tab.page}
                        onClick={() => setOpen(false)}
                        className={cn(
                            "flex items-center gap-2 rounded-l-full px-5 py-3 text-sm transition-all",
                            isActive
                                ? "bg-white text-blue-700 font-medium shadow-sm"
                                : "text-white opacity-80 hover:opacity-100 hover:bg-white/10"
                        )}
                    >
                        <Icon size={16} strokeWidth={2} />
                        <span>{tab.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}

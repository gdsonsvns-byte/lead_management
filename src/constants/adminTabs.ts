import { HomeIcon, FileCode2Icon, ShieldUserIcon, ClipboardPenIcon, LucideIcon, UserCheck, UserRoundPlus, SettingsIcon } from "lucide-react";

type SidebarItem = {
    name: string;
    page: string;
    icon: LucideIcon;
};

export const SYSTEM_ADMIN: SidebarItem[] = [
    {
        name: "Dashboard",
        page: "/system_admin/dashboard",
        icon: HomeIcon,
    },
    {
        name: "Accounts",
        page: "/system_admin/accounts",
        icon: UserCheck,
    },
    {
        name: "Add Account",
        page: "/system_admin/create-account",
        icon: UserRoundPlus,
    },
    {
        name: "Setting",
        page: "/system_admin/setting",
        icon: SettingsIcon,
    },
] as const;

export const ADMIN_TABS: SidebarItem[] = [
    {
        name: "Dashboard",
        page: "/admin/dashboard",
        icon: HomeIcon,
    },
    {
        name: "Forms",
        page: "/admin/forms",
        icon: FileCode2Icon,
    },
    {
        name: "Create Form",
        page: "/admin/create_forms",
        icon: ClipboardPenIcon,
    },
    {
        name: "Add New User",
        page: "/admin/add_user",
        icon: ShieldUserIcon,
    },
    {
        name: "Setting",
        page: "/admin/setting",
        icon: SettingsIcon,
    },
] as const;

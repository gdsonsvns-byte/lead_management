import { HomeIcon, FileCode2Icon, ShieldUserIcon, ClipboardPenIcon, LucideIcon, UserCheck, UserRoundPlus, SettingsIcon, Bell } from "lucide-react";
export type Role = "ADMIN" | "SUPERADMIN" | "MANAGER";
type SidebarItem = {
    name: string;
    page: string;
    icon: LucideIcon;
    roles: Role[]
};

export const SYSTEM_ADMIN: SidebarItem[] = [
    {
        name: "Dashboard",
        page: "/system_admin/dashboard",
        icon: HomeIcon,
        roles: ["SUPERADMIN"],
    },
    {
        name: "Accounts",
        page: "/system_admin/accounts",
        icon: UserCheck,
        roles: ["SUPERADMIN"],
    },
    {
        name: "Add Account",
        page: "/system_admin/create-account",
        icon: UserRoundPlus,
        roles: ["SUPERADMIN"],
    },
    {
        name: "Setting",
        page: "/system_admin/setting",
        icon: SettingsIcon,
        roles: ["SUPERADMIN"],
    },
] as const;

export const ADMIN_TABS: SidebarItem[] = [
    {
        name: "Dashboard",
        page: "/admin/dashboard",
        icon: HomeIcon,
        roles: ["ADMIN", "MANAGER"],
    },
    {
        name: "Follow Up",
        page: "/admin/followup",
        icon: Bell,
        roles: ["ADMIN", "MANAGER"],
    },
    {
        name: "Forms",
        page: "/admin/forms",
        icon: FileCode2Icon,
        roles: ["ADMIN", "MANAGER"],
    },
    {
        name: "Create Form",
        page: "/admin/create_forms",
        icon: ClipboardPenIcon,
        roles: ["ADMIN"],
    },
    {
        name: "Add New User",
        page: "/admin/add_user",
        icon: ShieldUserIcon,
        roles: ["ADMIN"],
    },
    {
        name: "Setting",
        page: "/admin/setting",
        icon: SettingsIcon,
        roles: ["ADMIN", "MANAGER"],
    },
] as const;

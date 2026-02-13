"use client";
import { createContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Role } from "../app/generated/prisma/enums";

type AuthUser = {
    sub: string;
    accountId: string;
    role: Role;
};

type AuthContextType = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function ContextProvider({ children, initialUser }: { children: React.ReactNode, initialUser: AuthUser | null; }) {
    const [user, setUser] = useState<AuthUser | null>(initialUser);

    useEffect(() => {
        if (user) {
            localStorage.removeItem("dashboard_followup_state");
        }

        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("form_") && key.endsWith("_followup_state")) {
                localStorage.removeItem(key);
            }
        });
    }, [user]);

    const logout = () => {
        Cookies.remove("token");
        setUser(null);
    };
    const value = {
        user,
        isAuthenticated: !!user,
        logout,
    }
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

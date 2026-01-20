"use client";
import { createContext, useState } from "react";
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

"use client";

import { createContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import { Role } from "../app/generated/prisma/enums";


const JWT_SECRET = process.env.JWT_SECRET!;
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

function safeVerifyToken(token: string | null) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET) as {
            sub: string;
            accountId: string;
            role: Role;
        };
    } catch {
        return null;
    }
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const token = Cookies.get("token") || null;
        const decoded = safeVerifyToken(token);

        if (decoded) {
            setUser(decoded);
        } else {
            setUser(null);
        }
    }, []);

    const logout = () => {
        Cookies.remove("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

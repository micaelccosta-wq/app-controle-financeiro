import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

interface User {
    name: string;
    email: string;
    picture: string;
    sub: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    setToken: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(localStorage.getItem('auth_token'));

    const setToken = (newToken: string) => {
        localStorage.setItem('auth_token', newToken);
        setTokenState(newToken);
    };

    const logout = () => {
        googleLogout();
        localStorage.removeItem('auth_token');
        setTokenState(null);
        setUser(null);
    };

    useEffect(() => {
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser({
                        name: decoded.name,
                        email: decoded.email,
                        picture: decoded.picture,
                        sub: decoded.sub
                    });
                }
            } catch (e) {
                logout();
            }
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, setToken, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

"use client";
import { createContext, useContext, useState } from 'react';

const MobileNavContext = createContext();

export function MobileNavProvider({ children }) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    return (
        <MobileNavContext.Provider value={{ isMobileNavOpen, setIsMobileNavOpen }}>
            {children}
        </MobileNavContext.Provider>
    );
}

export function useMobileNav() {
    return useContext(MobileNavContext);
}

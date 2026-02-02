import React, { createContext, useContext, useState, useEffect } from 'react';

type SidebarPosition = 'left' | 'right';

interface LayoutState {
    sidebarPosition: SidebarPosition;
    isSidebarOpen: boolean;
    isHeaderVisible: boolean; // For Immersive Mode
    activePanel: 'tabs' | 'ai' | 'history' | 'settings' | null;
    isIncognito: boolean;
}

interface LayoutContextType extends LayoutState {
    toggleSidebar: () => void;
    setSidebarPosition: (pos: SidebarPosition) => void;
    toggleHeader: () => void;
    setImmersiveMode: (enabled: boolean) => void;
    setActivePanel: (panel: LayoutState['activePanel']) => void;
    setIncognito: (enabled: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Persist settings
    const [sidebarPosition, setSidebarPositionState] = useState<SidebarPosition>(() =>
        (localStorage.getItem('tabkeep_layout_sidebar_pos') as SidebarPosition) || 'left'
    );

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [activePanel, setActivePanelState] = useState<LayoutState['activePanel']>('tabs');
    const [isIncognito, setIncognito] = useState(false);

    // Persistence effects
    useEffect(() => {
        localStorage.setItem('tabkeep_layout_sidebar_pos', sidebarPosition);
    }, [sidebarPosition]);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    const setSidebarPosition = (pos: SidebarPosition) => {
        setSidebarPositionState(pos);
    };

    const toggleHeader = () => setIsHeaderVisible(prev => !prev);

    const setImmersiveMode = (enabled: boolean) => {
        setIsHeaderVisible(!enabled);
        setIsSidebarOpen(!enabled);
    };

    const setActivePanel = (panel: LayoutState['activePanel']) => {
        if (activePanel === panel && isSidebarOpen) {
            // Toggle close if clicking same active panel
            setIsSidebarOpen(false);
        } else {
            setActivePanelState(panel);
            setIsSidebarOpen(true);
        }
    };

    return (
        <LayoutContext.Provider value={{
            sidebarPosition,
            isSidebarOpen,
            isHeaderVisible,
            activePanel,
            isIncognito,
            toggleSidebar,
            setSidebarPosition,
            toggleHeader,
            setImmersiveMode,
            setActivePanel,
            setIncognito
        }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

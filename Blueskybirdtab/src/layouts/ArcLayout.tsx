import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import NotesPanel from '@/components/NotesPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useTabs, Tab } from '@/hooks/useTabs';
import { useMemoryAnchors } from '@/hooks/useMemoryAnchors';
import { useNotes } from '@/hooks/useNotes';
import HistoryPanel from '@/components/HistoryPanel';

const ArcLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, profile, signOut } = useAuth();

    // Layout Context
    const {
        isSidebarOpen,
        toggleSidebar,
        sidebarPosition,
        activePanel,
        isHeaderVisible
    } = useLayout();

    // Data Hooks
    const { tabs, removeTab, renameTab, isLoading: tabsLoading } = useTabs(profile?.id);

    const {
        anchors,
        defaultAnchor,
        createAnchor
    } = useMemoryAnchors();

    const { notes, createNote, updateNote, deleteNote } = useNotes(profile?.id);
    const [notesPanelOpen, setNotesPanelOpen] = useState(false);

    // Derived State
    const activeChatId = location.pathname.includes('/chat/')
        ? location.pathname.split('/chat/')[1]
        : null;

    const match = matchPath("/tma/:anchorId/*", location.pathname);
    const urlAnchorId = match?.params.anchorId;

    const activeAnchor = urlAnchorId
        ? anchors.find(a => a.anchor_id === urlAnchorId)
        : defaultAnchor;

    // Handlers
    const handleRenameChat = (id: string, newTitle: string) => {
        renameTab(id, 'chat', newTitle);
    };

    const handleRemoveTab = (id: string, type: 'chat' | 'web') => {
        removeTab(id, type);
        if (type === 'chat' && activeChatId === id) {
            navigate(activeAnchor ? `/tma/${activeAnchor.anchor_id}` : '/');
        }
    };

    const handleSelectTab = (tab: Tab) => {
        if (tab.type === 'chat') {
            navigate(activeAnchor ? `/tma/${activeAnchor.anchor_id}/chat/${tab.id}` : '/');
        } else {
            // Web navigation
            window.dispatchEvent(new CustomEvent('TABKEEP_NAVIGATE_WEB', { detail: { url: tab.url } }));
        }
    };

    const handleNewChat = () => {
        navigate(activeAnchor ? `/tma/${activeAnchor.anchor_id}` : '/');
    };

    const handleCreateAnchor = async (name: string, purpose?: string) => {
        const newAnchor = await createAnchor({ name, purpose });
        if (newAnchor) navigate(`/tma/${newAnchor.anchor_id}`);
        return newAnchor;
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSidebar]);

    return (
        <div className={`flex h-screen w-full bg-[hsl(var(--background))] overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>

            {/* Side Panel (Single Browser-like Sidebar) */}
            {isAuthenticated && isSidebarOpen && (
                <div className={`
                    w-[260px] h-full flex flex-col 
                    ${sidebarPosition === 'right' ? 'border-l' : 'border-r'} 
                    border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-sidebar))] transition-all duration-300
                    shrink-0
                `}>
                    <Sidebar
                        isOpen={true}
                        onToggle={toggleSidebar}
                        tabs={tabs}
                        onRenameChat={handleRenameChat}
                        onRemoveTab={handleRemoveTab}
                        onSelectTab={handleSelectTab}
                        onNewChat={handleNewChat}
                        onLogout={async () => { await signOut(); navigate('/'); }}
                        activeChatId={activeChatId}
                        onOpenNotes={() => setNotesPanelOpen(true)}
                        anchors={anchors}
                        activeAnchor={activeAnchor || undefined}
                        onSelectAnchor={(anchor) => navigate(`/tma/${anchor.anchor_id}`)}
                        onCreateAnchor={handleCreateAnchor}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div className={`
                    flex-1 flex flex-col h-full relative transition-all duration-300 ease-out 
                    ${isAuthenticated && isSidebarOpen ? 'p-0' : 'p-0'} 
                    bg-[hsl(var(--background))] min-h-screen
                `}>
                <div className={`
                        flex-1 flex flex-col relative overflow-hidden 
                        transition-all duration-300
                        min-h-screen
                     `}>

                    {/* Immersive Toggle (Floating) - Only if everything is hidden */}
                    {isAuthenticated && !isSidebarOpen && !isHeaderVisible && (
                        <div className="absolute top-2 left-2 z-50 opacity-0 hover:opacity-100 transition-opacity">
                            <button onClick={toggleSidebar} className="p-2 bg-black/50 text-white rounded-full">
                                <PanelLeft className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Page Content */}
                    <main className="flex-1 overflow-hidden relative z-10 flex flex-col bg-[hsl(var(--background))] min-h-screen">
                        <Outlet context={{ isSidebarOpen, setSidebarOpen: toggleSidebar, activeAnchor, isHeaderVisible }} />
                    </main>

                    {/* Notes Panel */}
                    <NotesPanel
                        isOpen={notesPanelOpen}
                        onClose={() => setNotesPanelOpen(false)}
                        notes={notes}
                        onCreateNote={createNote}
                        onUpdateNote={updateNote}
                        onDeleteNote={deleteNote}
                    />
                </div>
            </div>
        </div>
    );
};

export default ArcLayout;

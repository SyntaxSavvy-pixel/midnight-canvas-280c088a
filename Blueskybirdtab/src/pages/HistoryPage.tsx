
import HistoryPanel from '@/components/HistoryPanel';

const HistoryPage = () => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-4xl h-full border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm bg-[var(--bg-sidebar)]">
                <HistoryPanel />
            </div>
        </div>
    );
};

export default HistoryPage;

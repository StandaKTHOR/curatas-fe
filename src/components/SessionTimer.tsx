import { useAuth } from './AuthContext';

export default function SessionTimer() {
    const { timeLeft, token } = useAuth();

    if (!token || timeLeft === null) return null;

    // Formátování sekund na MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Logika barev: pod 5 minut (300s) zčervená
    const isUrgent = timeLeft < 300;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 border ${
            isUrgent
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                : 'bg-gray-50 border-gray-100 text-gray-500'
        }`}>
            <span className="text-sm font-mono font-bold">{timeString}</span>
            <span className="text-base">{isUrgent ? '⚠️' : '🕒'}</span>

            {/* Tooltip při najetí (volitelné) */}
            <div className="hidden group-hover:block absolute top-10 right-0 bg-black text-white text-[10px] px-2 py-1 rounded">
                Čas do automatického odhlášení
            </div>
        </div>
    );
}
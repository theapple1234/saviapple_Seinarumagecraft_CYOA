
import React from 'react';
import { useCharacterContext } from '../context/CharacterContext';

export const SimplifiedStatsFooter: React.FC = () => {
    const { 
        blessingPoints, 
        fortunePoints, 
        kuriPoints, 
        availableSigilCounts,
        acquiredRunes,
        customSpells,
        language
    } = useCharacterContext();

    const isKo = language === 'ko';

    // Helper logic from PageFour to calculate remaining Runes
    const usedRuhaiCount = customSpells.filter(s => s.description.trim().length > 0).length;
    const availableRuhai = Math.max(0, (acquiredRunes.get('ruhai') || 0) - usedRuhaiCount);
    const mialgrathRunesApplied = customSpells.filter(s => s.mialgrathApplied).length;
    const availableMialgrath = Math.max(0, (acquiredRunes.get('mialgrath') || 0) - mialgrathRunesApplied);

    // Filter to only show sigils/runes that have remaining count > 0
    const sigilItems = [
        { label: isKo ? '카른' : 'Kaarn', count: availableSigilCounts.kaarn, color: 'text-gray-400' },
        { label: isKo ? '퍼르스' : 'Purth', count: availableSigilCounts.purth, color: 'text-green-400' },
        { label: isKo ? '자타스' : 'Juathas', count: availableSigilCounts.juathas, color: 'text-orange-400' },
        { label: isKo ? '주스' : 'Xuth', count: availableSigilCounts.xuth, color: 'text-red-400' },
        { label: isKo ? '신스루' : 'Sinthru', count: availableSigilCounts.sinthru, color: 'text-purple-400' },
        { label: isKo ? '레콜루' : 'Lekolu', count: availableSigilCounts.lekolu, color: 'text-yellow-400' },
        { label: isKo ? '루하이' : 'Ruhai', count: availableRuhai, color: 'text-amber-200' },
        { label: isKo ? '밀그라스' : 'Milgrath', count: availableMialgrath, color: 'text-cyan-400' },
    ].filter(item => item.count > 0);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-md border-t border-gray-800 px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-mono shadow-lg transition-all duration-300">
            {/* Main Points */}
            <div className="flex items-center gap-3 border-r border-gray-700 pr-3">
                <span className="text-emerald-400 font-bold">FP: {fortunePoints}</span>
                <span className="text-purple-400 font-bold">BP: {blessingPoints}</span>
                {kuriPoints > 0 && <span className="text-pink-500 font-bold">KP: {kuriPoints}</span>}
            </div>

            {/* Sigils & Runes */}
            {sigilItems.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    {sigilItems.map(item => (
                        <span key={item.label} className={`${item.color}`}>
                            {item.label}: <span className="font-bold text-white">{item.count}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

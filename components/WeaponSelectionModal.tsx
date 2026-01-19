import React, { useState, useEffect } from 'react';
import { WEAPON_PERKS, COMPANION_PERSONALITY_TRAITS } from '../constants';
import type { WeaponSelections } from '../types';
import { useCharacterContext } from '../context/CharacterContext';
import { db } from '../utils/db'; // Import DB

const calculateWeaponPoints = (selections: WeaponSelections): number => {
    let total = 0;
    if (selections.perks) {
        selections.perks.forEach((count, perkId) => {
            const perk = WEAPON_PERKS.find(p => p.id === perkId);
            if (perk) total += (perk.cost ?? 0) * count;
        });
    }
    if (selections.perks && selections.perks.has('chatterbox') && selections.traits) {
        selections.traits.forEach(traitId => {
            const trait = COMPANION_PERSONALITY_TRAITS.find(t => t.id === traitId);
            if (trait) total += trait.cost ?? 0;
        });
    }
    return total;
};

const hydrateWeaponData = (data: any): WeaponSelections => {
    if (data) {
        return {
            ...data,
            category: Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []),
            perks: data.perks instanceof Map ? data.perks : new Map(Array.isArray(data.perks) ? data.perks : []),
            traits: new Set(data.traits || []),
        };
    }
    return data;
};

interface WeaponSelectionModalProps {
    currentWeaponName: string | null;
    onClose: () => void;
    onSelect: (weaponName: string | null) => void;
    pointLimit?: number;
    title?: string;
    categoryFilter?: string | string[];
    requiredPerkId?: string;
    colorTheme?: 'purple' | 'cyan';
}

export const WeaponSelectionModal: React.FC<WeaponSelectionModalProps> = ({
    currentWeaponName,
    onClose,
    onSelect,
    pointLimit = 20,
    title,
    categoryFilter,
    requiredPerkId,
    colorTheme = 'purple'
}) => {
    const { language } = useCharacterContext();
    const [weaponBuilds, setWeaponBuilds] = useState<Record<string, { points: number }>>({});

    const displayTitle = title || (language === 'ko' ? "무기 할당하기" : "Assign Weapon");

    useEffect(() => {
        const fetchBuilds = async () => {
            try {
                const builds = await db.getReferenceBuildsByType('weapons');
                const buildsWithPoints: Record<string, { points: number }> = {};
                
                for (const build of builds) {
                    const hydratedData = hydrateWeaponData(build.data);
                    
                    if (categoryFilter) {
                        const filterArray = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
                        if (!hydratedData.category.some(c => filterArray.includes(c))) {
                            continue;
                        }
                    }

                    if (requiredPerkId && !hydratedData.perks.has(requiredPerkId)) {
                        continue;
                    }

                    const points = calculateWeaponPoints(hydratedData);
                    buildsWithPoints[build.name] = { points };
                }
                setWeaponBuilds(buildsWithPoints);
            } catch (error) {
                console.error("Failed to parse weapon builds from DB:", error);
            }
        };
        fetchBuilds();
    }, [categoryFilter, requiredPerkId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // ... (rest unchanged)
    const noBuildsMessage = () => {
        let message = language === 'ko' ? "호환되는 무기 빌드가 없습니다. 참고 페이지에서 만들어 보세요." : "No compatible weapon builds found. Go to the Reference Page to create one.";
        if (categoryFilter) {
            const categories = Array.isArray(categoryFilter) ? categoryFilter.join(', ') : categoryFilter;
            message += language === 'ko' ? ` 다음 카테고리 중 하나가 포함되어야 합니다: ${categories.toUpperCase()}.` : ` Make sure it has one of the following categories: ${categories.toUpperCase()}.`;
        }
        if (requiredPerkId) {
            const perk = WEAPON_PERKS.find(p => p.id === requiredPerkId);
            message += language === 'ko' ? ` '${perk ? perk.title : requiredPerkId}' 특성이 있어야 합니다.` : ` Make sure it has the '${perk ? perk.title : requiredPerkId}' perk.`;
        }
        return message;
    };

    const themeClasses = {
        purple: { border: 'border-purple-700/80', headerBorder: 'border-purple-900/50', titleText: 'text-purple-200', closeBtn: 'text-purple-200/70 hover:text-white', infoText: 'text-purple-300/80', selectedItem: 'border-purple-400 ring-2 ring-purple-400/50', hoverItem: 'hover:border-purple-400/50', footerBorder: 'border-purple-900/50' },
        cyan: { border: 'border-cyan-700/80', headerBorder: 'border-cyan-900/50', titleText: 'text-cyan-200', closeBtn: 'text-cyan-200/70 hover:text-white', infoText: 'text-cyan-300/80', selectedItem: 'border-cyan-400 ring-2 ring-cyan-400/50', hoverItem: 'hover:border-cyan-400/50', footerBorder: 'border-cyan-900/50' }
    };

    const currentTheme = themeClasses[colorTheme] || themeClasses.purple;
    const requiredPerkTitle = WEAPON_PERKS.find(p => p.id === requiredPerkId)?.title ?? requiredPerkId;
    const infoText = language === 'ko' ? `${pointLimit} 무기 점수 이하인 무기 빌드를 선택하세요.` : `Select a weapon build that costs ${pointLimit} Weapon Points or less.`;
    const catFilterText = categoryFilter ? (language === 'ko' ? ` 카테고리 필수: ${Array.isArray(categoryFilter) ? categoryFilter.join(', ').toUpperCase() : categoryFilter.toUpperCase()}.` : ` Must have category: ${Array.isArray(categoryFilter) ? categoryFilter.join(' or ').toUpperCase() : categoryFilter.toUpperCase()}.`) : '';
    const perkFilterText = requiredPerkId ? (language === 'ko' ? ` 특성 필수: ${requiredPerkTitle}.` : ` Must have perk: ${requiredPerkTitle}.`) : '';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[101] flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className={`bg-[#100c14] border-2 ${currentTheme.border} rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <header className={`flex items-center justify-between p-4 border-b ${currentTheme.headerBorder}`}>
                    <h2 className={`font-cinzel text-2xl ${currentTheme.titleText}`}>{displayTitle}</h2>
                    <button onClick={onClose} className={`${currentTheme.closeBtn} text-3xl font-bold transition-colors`}>&times;</button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <p className={`text-center text-sm ${currentTheme.infoText} mb-4 italic`}>{infoText}{catFilterText}{perkFilterText}</p>
                    <div className="space-y-3">
                        {Object.keys(weaponBuilds).length > 0 ? (
                            Object.keys(weaponBuilds).map((name) => {
                                const { points } = weaponBuilds[name];
                                const isSelected = name === currentWeaponName;
                                const isDisabled = points > pointLimit;
                                const costColor = isDisabled ? 'text-red-500' : 'text-green-400';
                                return (
                                    <div key={name} onClick={() => !isDisabled && onSelect(name)} className={`p-3 bg-slate-900/70 border rounded-md flex justify-between items-center transition-colors ${isDisabled ? 'border-gray-700 opacity-60 cursor-not-allowed' : isSelected ? `${currentTheme.selectedItem} cursor-pointer` : `border-gray-800 ${currentTheme.hoverItem} cursor-pointer`}`} role="button" aria-disabled={isDisabled} aria-pressed={isSelected}>
                                        <div><h3 className="font-semibold text-white">{name}</h3><p className="text-xs text-gray-400">{isDisabled ? (language === 'ko' ? `비용이 ${pointLimit}점을 초과합니다` : `Cost exceeds ${pointLimit} points`) : (language === 'ko' ? '클릭하여 할당' : 'Click to assign this weapon')}</p></div>
                                        <span className={`font-bold text-lg ${costColor}`}>{points} {language === 'ko' ? 'WP' : 'WP'}</span>
                                    </div>
                                );
                            })
                        ) : (<p className="text-center text-gray-500 italic py-8">{noBuildsMessage()}</p>)}
                    </div>
                </main>
                 <footer className={`p-3 border-t ${currentTheme.footerBorder} text-center`}>
                    <button onClick={() => onSelect(null)} className="px-4 py-2 text-sm font-cinzel bg-gray-800/50 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors">{language === 'ko' ? "할당 해제" : "Clear Assignment"}</button>
                </footer>
            </div>
        </div>
    );
};

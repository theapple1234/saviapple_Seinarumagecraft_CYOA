
import { useMemo } from 'react';
import { 
    PARENT_COST_MAP, SIBLING_COST_PER, parseCost, SIGIL_BP_COSTS
} from './utils';
import * as Constants from '../constants';
import { PageOneState, PageTwoState, PageThreeState, PageFourState, PageFiveState, PageSixState } from './CharacterContextTypes';

interface UseCostCalculationProps {
    selectedDominionId: string | null;
    pageOneState: PageOneState;
    pageTwoState: PageTwoState;
    pageThreeState: PageThreeState;
    pageFourState: PageFourState;
    pageFiveState: PageFiveState;
    pageSixState: PageSixState;
    kpPaidNodes: Map<string, string>;
    miscFpCosts: number;
    selectedLostBlessingNodes: Set<string>;
    buildsRefreshTrigger: number;
    isSandboxMode: boolean;
}

export const useCostCalculation = ({
    selectedDominionId,
    pageOneState,
    pageTwoState,
    pageThreeState,
    pageFourState,
    pageFiveState,
    pageSixState,
    kpPaidNodes,
    miscFpCosts,
    selectedLostBlessingNodes,
    buildsRefreshTrigger,
    isSandboxMode
}: UseCostCalculationProps) => {

    return useMemo(() => {
        let fpGained = 0;
        let fpSpent = 0;
        let bpGained = 0;
        let bpSpent = 0;
        let kpGained = 0;
        let kpSpent = 0;

        // Helpers
        const addFp = (amount: number) => { if (amount > 0) fpGained += amount; else fpSpent += Math.abs(amount); };
        const addBp = (amount: number) => { if (amount > 0) bpGained += amount; else bpSpent += Math.abs(amount); };
        const addKp = (amount: number) => { if (amount > 0) kpGained += amount; else kpSpent += Math.abs(amount); };

        const processCost = (costStr: string | undefined) => {
            if (!costStr) return;
            const { fp, bp } = parseCost(costStr);
            // parseCost returns positive for costs (if "Costs ...") and negative for grants (if "Grants ...")
            // wait, looking at utils.ts parseCost implementation:
            // if "Grants", it returns negative values. If "Costs", positive values.
            // So if fp is negative (grant), we add to Gained. If positive (cost), we add to Spent.
            
            if (fp < 0) fpGained += Math.abs(fp);
            else fpSpent += fp;

            if (bp < 0) bpGained += Math.abs(bp);
            else bpSpent += bp;
        };

        // --- PAGE 1 ---
        // Parents
        const parentCost = PARENT_COST_MAP[pageOneState.numParents] ?? 0;
        if (parentCost < 0) fpGained += Math.abs(parentCost); else fpSpent += parentCost;

        // Siblings
        const siblingCost = pageOneState.numSiblings * SIBLING_COST_PER;
        fpSpent += siblingCost;

        // Traits (Family)
        pageOneState.assignedTraits.forEach(traits => {
            traits.forEach(tId => {
                const t = [...Constants.TRAITS_DATA.positive, ...Constants.TRAITS_DATA.negative].find(i => i.id === tId);
                processCost(t?.cost);
            });
        });

        // House
        const house = Constants.HOUSES_DATA.find(h => h.id === pageOneState.selectedHouseId);
        processCost(house?.cost);
        
        // House Upgrades
        pageOneState.selectedUpgrades.forEach(uId => {
            const u = Constants.HOUSE_UPGRADES_DATA.find(i => i.id === uId);
            if (u) {
                // Special handling for VR Chamber cost type
                if (uId === 'virtual_reality' && pageOneState.vrChamberCostType) {
                    if (pageOneState.vrChamberCostType === 'fp') fpSpent += 5;
                    else bpSpent += 2;
                } else {
                    processCost(u.cost);
                }
            }
        });

        // Extra House Costs
        if (pageOneState.selectedHouseId === 'mansion') {
            fpSpent += pageOneState.mansionExtraSqFt; // 1 FP per 1000 sq ft (counter is raw count)
        }
        if (pageOneState.selectedUpgrades.has('private_island')) {
            fpSpent += pageOneState.islandExtraMiles; // 1 FP per extra mile
        }

        // Vacation Homes
        pageOneState.vacationHomes.forEach(home => {
             // Base cost for extra homes (first one if Moving Out might be free but that's P5 logic)
             // Vacation homes in P1 cost 3 FP each
             fpSpent += 3;

             // House type cost
             const h = Constants.HOUSES_DATA.find(i => i.id === home.houseId);
             processCost(h?.cost);

             // Upgrades
             home.upgradeIds.forEach(uId => {
                const u = Constants.HOUSE_UPGRADES_DATA.find(i => i.id === uId);
                 if (u) {
                    if (uId === 'virtual_reality' && home.vrChamberCostType) {
                        if (home.vrChamberCostType === 'fp') fpSpent += 5;
                        else bpSpent += 2;
                    } else {
                        processCost(u.cost);
                    }
                }
             });

             if (home.houseId === 'mansion') fpSpent += home.mansionExtraSqFt;
             if (home.upgradeIds.has('private_island')) fpSpent += home.islandExtraMiles;
        });

        // True Self & Alter Ego
        pageOneState.selectedTrueSelfTraits.forEach(tId => processCost(Constants.TRUE_SELF_TRAITS.find(i => i.id === tId)?.cost));
        pageOneState.selectedAlterEgoTraits.forEach(tId => processCost(Constants.ALTER_EGO_TRAITS.find(i => i.id === tId)?.cost));
        
        // Uniforms (First free)
        if (pageOneState.selectedUniforms.length > 1) {
            fpSpent += (pageOneState.selectedUniforms.length - 1);
        }

        // Magical Styles
        pageOneState.selectedMagicalStyles.forEach(sId => processCost(Constants.MAGICAL_STYLES_DATA.find(i => i.id === sId)?.cost));

        // --- PAGE 2 ---
        if (!pageOneState.isMultiplayer) {
            processCost(Constants.HEADMASTERS_DATA.find(i => i.id === pageTwoState.selectedHeadmasterId)?.cost);
            pageTwoState.selectedTeacherIds.forEach(tId => processCost(Constants.TEACHERS_DATA.find(i => i.id === tId)?.cost));
            processCost(Constants.DURATION_DATA.find(i => i.id === pageTwoState.selectedDurationId)?.cost);
            pageTwoState.selectedClubIds.forEach(cId => processCost(Constants.CLUBS_DATA.find(i => i.id === cId)?.cost));
            
            pageTwoState.selectedMiscActivityIds.forEach(aId => {
                if (aId !== 'mentor') processCost(Constants.MISC_ACTIVITIES_DATA.find(i => i.id === aId)?.cost);
            });
            
            // Classmates
            pageTwoState.selectedClassmateIds.forEach(cId => {
                const cm = Constants.CLASSMATES_DATA.find(i => i.id === cId);
                if (cm) {
                    let { fp, bp } = parseCost(cm.cost);
                    // Refund logic for same dominion
                    const dom = Constants.DOMINIONS.find(d => d.id === selectedDominionId);
                    if (dom && cm.birthplace.toUpperCase() === dom.title.toUpperCase()) {
                        fp = Math.max(0, fp - 2);
                    }
                    fpSpent += fp;
                    bpSpent += bp;
                }
            });
        }
        
        // Boarding School
        if (pageTwoState.isBoardingSchool && pageOneState.selectedHouseId === 'ragamuffin') {
            fpSpent += 8;
        }

        // Custom Classmates
        pageTwoState.customClassmates.forEach(cc => {
             const opt = Constants.CUSTOM_CLASSMATE_CHOICES_DATA.find(c => c.id === cc.optionId);
             processCost(opt?.cost);
        });

        // Mentors (Page 2 & 5 hybrid logic)
        // If mentor selected here or P5, calculate cost.
        // We use P2 selectedMentors as source of truth.
        pageTwoState.selectedMentors.forEach(mentor => {
             const cost = mentor.cost; // Base FP cost
             fpSpent += (cost * 2);
             bpGained += cost;
        });

        // --- PAGE 3 ---
        // Common Sigils
        const kaarnCount = pageThreeState.acquiredCommonSigils.get('kaarn') ?? 0;
        const purthCount = pageThreeState.acquiredCommonSigils.get('purth') ?? 0;
        const juathasCount = pageThreeState.acquiredCommonSigils.get('juathas') ?? 0;
        const sinthruCount = pageThreeState.acquiredCommonSigils.get('sinthru') ?? 0; // If bought directly

        bpSpent += kaarnCount * SIGIL_BP_COSTS.kaarn;
        bpSpent += purthCount * SIGIL_BP_COSTS.purth;
        bpSpent += juathasCount * SIGIL_BP_COSTS.juathas;
        
        if (!pageThreeState.selectedStarCrossedLovePacts.has('sinthrus_contract')) {
            // Sinthru cost: Depends on Dominion (Shinar = 8, others = 10)
            const sinthruCost = selectedDominionId === 'shinar' ? 8 : 10;
            // Count purchased ones + Lost Blessing usage
            // The context handles `acquiredCommonSigils` for purchased ones.
            // Lost Blessing usage is handled by `selectedLostBlessingNodes` but those are 1 sinthru cost each.
            // If contract is NOT active, we pay BP for purchased Sinthru sigils
            bpSpent += sinthruCount * sinthruCost;
        }
        
        // Special Sigils: Xuth
        const xuthTrials = pageThreeState.selectedSpecialSigilChoices.get('xuth')?.size ?? 0;
        const xuthCost = selectedDominionId === 'valsereth' ? 9 : 12;
        let xuthBp = xuthTrials * xuthCost;
        
        // Jade Emperor Refund logic
        if (pageThreeState.selectedStarCrossedLovePacts.has('jade_emperors_challenge')) {
            if (xuthTrials >= 1) xuthBp -= (xuthCost / 2); // Refund half of one
        }
        // Jade Emperor Extra Buy
        if (pageThreeState.jadeEmperorExtraXuthPurchased) {
            xuthBp += xuthCost;
        }
        // Cheissilith's Bargain: Double Xuth/Purth price
        if (pageThreeState.selectedStarCrossedLovePacts.has('cheissiliths_bargain')) {
            xuthBp *= 2;
            // Double purth cost too (subtracted before, add again)
            bpSpent += purthCount * SIGIL_BP_COSTS.purth; 
        }
        bpSpent += xuthBp;

        // Special Sigils: Lekolu
        let lekoluTotal = 0;
        for (const count of pageThreeState.acquiredLekoluJobs.values()) {
            lekoluTotal += count;
        }
        bpSpent += lekoluTotal * 4;
        fpSpent += lekoluTotal * 6;

        // Special Sigils: Sinthru (Favors)
        // Only if contract is NOT active. If active, Favors are free (but Prereqs might not be).
        // Wait, Favors give Sigils. 
        // The cost is: "Costs -10 BP per favor" to GET the sigil.
        if (!pageThreeState.selectedStarCrossedLovePacts.has('sinthrus_contract')) {
             const sinthruFavors = pageThreeState.selectedSpecialSigilChoices.get('sinthru')?.size ?? 0;
             bpSpent += sinthruFavors * 10;
        }

        // Star Crossed Love Pacts (Costs/Grants from description not explicit usually, but handled here if needed)
        // Evoghos Vow: -50 FP, +50 BP
        if (pageThreeState.selectedStarCrossedLovePacts.has('evoghos_vow')) {
            fpSpent += 50;
            bpGained += 50;
        }
        // Kuri-Odan: -50 BP, +100 KP
        if (pageThreeState.selectedStarCrossedLovePacts.has('kuri_odans_charm')) {
            bpSpent += 50;
            kpGained += 100;
        }

        // KP Usage Calculation
        // Iterate paid nodes and deduct their BP cost, add to KP spent
        kpPaidNodes.forEach((sigilType) => {
            const cost = SIGIL_BP_COSTS[sigilType] || 0;
            let finalCost = cost;
            // Adjust for specific cost modifiers (e.g. Dominion perks, Cheissilith)
            if (sigilType === 'xuth') {
                finalCost = selectedDominionId === 'valsereth' ? 9 : 12;
            }
            if (pageThreeState.selectedStarCrossedLovePacts.has('cheissiliths_bargain')) {
                if (sigilType === 'purth' || sigilType === 'xuth') finalCost *= 2;
                if (sigilType === 'juathas') finalCost = 0;
            }
            // Refund BP, Charge KP
            // Since we sum up ALL sigils from trees/counts in useSigilCalculation -> usedSigilCounts,
            // and `acquiredCommonSigils` stores the inventory, we assume the user bought the sigil with BP first.
            // Wait, the logic in UI is "Purchase with KP". 
            // If purchased with KP, it shouldn't cost BP.
            // The `acquiredCommonSigils` tracks total available. 
            // `kpPaidNodes` tracks which tree nodes are paid by KP.
            // 
            // Correct Logic: 
            // 1. Calculate cost of ALL active tree nodes (sigilTreeCost in hooks).
            // 2. Subtract BP cost for nodes in `kpPaidNodes`.
            // 3. Add KP cost for nodes in `kpPaidNodes`.
            
            // However, the `bpSpent` calculation above relies on `acquiredCommonSigils` (Inventory).
            // The Inventory approach assumes you buy sigils into a pool.
            // KP payment is direct to node.
            // So, for every KP paid node, it consumes a sigil from inventory.
            // If we want to simulate "Paying with KP instead of BP", we effectively refund the BP cost of that sigil.
            
            bpSpent -= finalCost;
            kpSpent += finalCost;
        });
        
        // Dominion Perks (Discounts)
        // Halidew: Juathas -2 BP for Margra (Closed Circuits)
        if (selectedDominionId === 'halidew') {
            const margraNodes = Array.from(pageThreeState.selectedClosedCircuitsSigils).filter(id => {
                const s = Constants.CLOSED_CIRCUITS_SIGIL_TREE_DATA.find(n => n.id === id);
                return s?.imageSrc.includes('juathas');
            });
            bpSpent -= (margraNodes.length * 2);
        }
        // Shinar: Sinthru -2 BP (Lost Hope)
        if (selectedDominionId === 'shinar') {
            const shinarNodes = Array.from(pageThreeState.selectedLostHopeSigils).filter(id => {
                const s = Constants.LOST_HOPE_SIGIL_TREE_DATA.find(n => n.id === id);
                return s?.imageSrc.includes('sinthru');
            });
            bpSpent -= (shinarNodes.length * 2);
        }
        // Unterseeisch: Juathas -2 BP for Fidelia (Lost Hope) - Wait, description says Fidelia.
        if (selectedDominionId === 'unterseeisch') {
            const fideliaNodes = Array.from(pageThreeState.selectedLostHopeSigils).filter(id => {
                const s = Constants.LOST_HOPE_SIGIL_TREE_DATA.find(n => n.id === id);
                return s?.imageSrc.includes('juathas');
            });
            bpSpent -= (fideliaNodes.length * 2);
        }
        // Valsereth: Xuth -3 BP (Any) -> Already handled in Xuth base cost logic above (9 instead of 12)
        
        // Gohwood: Juathas -2 BP for Arabella (Compelling Will)
        if (selectedDominionId === 'gohwood') {
             const arabellaNodes = Array.from(pageThreeState.selectedCompellingWillSigils).filter(id => {
                const s = Constants.COMPELLING_WILL_SIGIL_TREE_DATA.find(n => n.id === id);
                return s?.imageSrc.includes('juathas');
            });
            bpSpent -= (arabellaNodes.length * 2);
        }
        // Palisade: Lekolu -2 BP (Any) -> But Lekolu sigils are jobs (gain resources). 
        // Wait, "Lekolu Sigils cost two less". 
        // In this CYOA, Lekolu sigils are "Jobs" that COST resources to perform? 
        // "Costs -4 BP and -6 FP per job". Yes.
        if (selectedDominionId === 'palisade') {
            // Count total Lekolu jobs
            bpSpent -= (lekoluTotal * 2);
        }
        // Rovines: Juathas -1 BP (Any)
        if (selectedDominionId === 'rovines') {
             // Need to count ALL Juathas nodes selected across all trees
             const allJuathas = [
                 pageThreeState.selectedGoodTidingsTier ? 1 : 0, // Master includes Juathas? No, Standard=Kaarn, Journey=Purth, Master=Xuth. Fireborn is Juathas.
                 // We need to check every tree.
                 ...Array.from(pageThreeState.selectedCompellingWillSigils).filter(id => Constants.COMPELLING_WILL_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedWorldlyWisdomSigils).filter(id => Constants.WORLDLY_WISDOM_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedBitterDissatisfactionSigils).filter(id => Constants.BITTER_DISSATISFACTION_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedLostHopeSigils).filter(id => Constants.LOST_HOPE_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedFallenPeaceSigils).filter(id => Constants.FALLEN_PEACE_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedGraciousDefeatSigils).filter(id => Constants.GRACIOUS_DEFEAT_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedClosedCircuitsSigils).filter(id => Constants.CLOSED_CIRCUITS_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedRighteousCreationSigils).filter(id => Constants.RIGHTEOUS_CREATION_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
                 ...Array.from(pageThreeState.selectedStarCrossedLoveSigils).filter(id => Constants.STAR_CROSSED_LOVE_SIGIL_TREE_DATA.find(s=>s.id===id)?.imageSrc.includes('juathas')),
             ].length;
             bpSpent -= allJuathas;
        }
        // Jipangu: -1 BP for Drysdea (Righteous Creation)
        if (selectedDominionId === 'jipangu') {
            const drysdeaCount = pageThreeState.selectedRighteousCreationSigils.size; // "Sigils cost one less", implies all sigils
            bpSpent -= drysdeaCount;
        }

        // Cheissilith's Bargain: Juathas Free
        if (pageThreeState.selectedStarCrossedLovePacts.has('cheissiliths_bargain')) {
             // Find total Juathas cost and subtract it (refund)
             // Using similar logic to Rovines but more robust if we had a centralized 'used' map
             // Simply: Calculate total Juathas used, multiply by 8, subtract from BP spent.
             const totalJuathas = pageThreeState.usedSigilCounts.juathas;
             bpSpent -= (totalJuathas * 8);
        }

        // --- PAGE 4 ---
        // Runes
        const ruhaiCount = pageFourState.acquiredRunes.get('ruhai') ?? 0;
        const mialgrathCount = pageFourState.acquiredRunes.get('mialgrath') ?? 0;
        const ruhaiCost = Constants.LIMITLESS_POTENTIAL_RUNES_DATA[0].cost; // "Costs 8 BP"
        const mialgrathCost = Constants.LIMITLESS_POTENTIAL_RUNES_DATA[1].cost; // "Costs 16 BP"

        // Parse costs
        const { bp: rBp } = parseCost(ruhaiCost || '');
        const { bp: mBp } = parseCost(mialgrathCost || '');
        
        let totalRuhaiBp = rBp * ruhaiCount;
        let totalMialBp = mBp * mialgrathCount;

        // KP Logic for Runes (Page 4 Toggles)
        // The `pageFourState.customSpells` tracks individual payment status
        pageFourState.customSpells.forEach((spell: any) => {
             if (spell.isRuhaiKpPaid) {
                 totalRuhaiBp -= rBp;
                 kpSpent += rBp;
             }
             if (spell.mialgrathApplied && spell.isMilgrathKpPaid) {
                 totalMialBp -= mBp;
                 kpSpent += mBp;
             }
        });
        
        bpSpent += totalRuhaiBp;
        bpSpent += totalMialBp;

        // --- PAGE 5 ---
        // Allmillor
        pageFiveState.selectedAllmillorIds.forEach(id => processCost(Constants.ALLMILLOR_CHOICES_DATA.find(i => i.id === id)?.cost));
        // Career Goals
        pageFiveState.selectedCareerGoalIds.forEach(id => {
             const goals = Object.values(Constants.CAREER_GOALS_DATA).flat() as any[];
             const goal = goals.find(g => g.id === id);
             processCost(goal?.cost);
        });
        // Colleagues
        pageFiveState.selectedColleagueIds.forEach(id => {
            const c = Constants.COLLEAGUES_DATA.find(i => i.id === id);
            if (c) {
                let { fp, bp } = parseCost(c.cost);
                // Refund logic for same dominion
                const dom = Constants.DOMINIONS.find(d => d.id === selectedDominionId);
                if (dom && c.birthplace.toUpperCase() === dom.title.toUpperCase()) {
                    fp = Math.max(0, fp - 2);
                }
                fpSpent += fp;
                bpSpent += bp;
            }
        });
        // Custom Colleagues
        pageFiveState.customColleagues.forEach(cc => {
             const opt = Constants.CUSTOM_COLLEAGUE_CHOICES_DATA.find(c => c.id === cc.optionId);
             processCost(opt?.cost);
        });
        // Moving Out Homes
        pageFiveState.movingOutHomes.forEach(home => {
             if (!home.isInherited) {
                 fpSpent += 3; // Base cost for new home
                 const h = Constants.HOUSES_DATA.find(i => i.id === home.houseId);
                 processCost(h?.cost);
             }
             home.upgradeIds.forEach(uId => {
                const u = Constants.HOUSE_UPGRADES_DATA.find(i => i.id === uId);
                 if (u) {
                    if (uId === 'virtual_reality' && home.vrChamberCostType) {
                        if (home.vrChamberCostType === 'fp') fpSpent += 5;
                        else bpSpent += 2;
                    } else {
                        processCost(u.cost);
                    }
                }
             });
             if (home.houseId === 'mansion') fpSpent += home.mansionExtraSqFt;
             if (home.upgradeIds.has('private_island')) fpSpent += home.islandExtraMiles;
        });

        // --- PAGE 6 ---
        // No explicit costs usually, but check
        // ...

        // --- LOST BLESSING (Secret) ---
        // Each node in tree = 1 Sinthru (or BP if Contract)
        const lostNodeCount = selectedLostBlessingNodes.size;
        if (pageThreeState.selectedStarCrossedLovePacts.has('sinthrus_contract')) {
            const sinthruBpCost = selectedDominionId === 'shinar' ? 8 : 10;
            bpSpent += lostNodeCount * sinthruBpCost;
        } else {
            // Already added to sinthru usage count in Page 3 section, so covered by general Sigil calculation?
            // Wait, in Page 3 section above:
            // "if (!pageThreeState.selectedStarCrossedLovePacts.has('sinthrus_contract')) { bpSpent += sinthruCount * sinthruCost; }"
            // sinthruCount comes from acquiredCommonSigils map.
            // The Logic in `useSigilCalculation` adds lost blessing nodes to `used` counts, but doesn't auto-buy them in `acquiredCommonSigils`.
            // So we need to manually account for the COST of the sinthru sigils used here if they weren't "bought" in the map.
            // Actually, the user buys Sinthru sigils in the shop. They are in the map.
            // So `sinthruCount` includes the ones used for Lost Blessing.
            // So it is already covered.
        }

        // Misc Costs
        fpSpent += miscFpCosts;

        // --- SANDBOX OVERRIDE ---
        if (isSandboxMode) {
            return {
                blessingPoints: 999,
                fortunePoints: 999,
                kuriPoints: 999,
                bpGained, bpSpent, fpGained, fpSpent, kpGained, kpSpent
            };
        }

        const blessingPoints = 100 + bpGained - bpSpent;
        const fortunePoints = 100 + fpGained - fpSpent;
        const kuriPoints = kpGained - kpSpent;

        return {
            blessingPoints,
            fortunePoints,
            kuriPoints,
            bpGained, bpSpent, fpGained, fpSpent, kpGained, kpSpent
        };

    }, [
        selectedDominionId,
        pageOneState, pageTwoState, pageThreeState, pageFourState, pageFiveState, pageSixState,
        kpPaidNodes, miscFpCosts, selectedLostBlessingNodes, buildsRefreshTrigger, isSandboxMode
    ]);
};

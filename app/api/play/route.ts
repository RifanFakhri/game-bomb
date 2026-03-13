import { NextResponse } from 'next/server';
import crypto from 'crypto';

// PRNG Seed Generator (Server-side Secure)
const generateSeed = () => crypto.randomBytes(16).toString('hex');

// Helpers for bomb generation
const getBombCount = (lvl: number) => {
    if (lvl >= 1 && lvl <= 4) return 1;    // Level 1-4: 1 Bomb
    if (lvl >= 5 && lvl <= 7) return 2;    // Level 5-7: 2 Bombs
    if (lvl >= 8 && lvl <= 9) return 3;    // Level 8-9: 3 Bombs
    if (lvl === 10) return 4;             // Level 10: 4 Bombs
    return 1;
};

const generateBombsForLevel = (lvl: number) => {
    const count = getBombCount(lvl);
    const indices = [0, 1, 2, 3, 4];
    const bombs: number[] = [];
    const temp = [...indices];
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * temp.length);
        bombs.push(temp.splice(idx, 1)[0]);
    }
    return bombs;
};

export async function POST(request: Request) {
    const { level, bet, initialBet, action, index } = await request.json();

    if (action === 'reveal') {
        const allBombs: Record<number, number[]> = {};
        for (let i = 1; i <= 10; i++) {
            allBombs[i] = generateBombsForLevel(i);
        }
        return NextResponse.json({ allBombs });
    }
    
    // 1. ADAPTIVE RTP (Dynamic Odds Adjustment)
    let rtpAdjustment = 1.0; 
    
    // LEVEL DECAY (Difficulty Progressif)
    // RTP turun 4% setiap naik level agar semakin tinggi level, semakin "ketat" algoritmanya.
    const levelDecayFactor = 1.0 - ((level - 1) * 0.04);
    rtpAdjustment *= levelDecayFactor;
    
    // DETEKSI LONJAKAN BET (Bet Spike Ratio Detection)
    // ... logic tetap sama tapi ditumpuk dengan levelDecay ...
    if (initialBet && bet > (initialBet * 1.1)) {
        const spikeRatio = bet / initialBet;
        
        if (spikeRatio >= 1.5) rtpAdjustment -= 0.15; 
        if (spikeRatio >= 2.0) rtpAdjustment -= 0.30; 
        if (spikeRatio >= 4.0) rtpAdjustment -= 0.60; 
    }

    
    // Default Absolute Penalty (Tetap ada untuk High Roller)
    if (bet > 50000) rtpAdjustment -= 0.20; 

    
    // 2. WEIGHTED RANDOM ALGORITHM & PSYCHOLOGICAL TRAPS
    let baseBombs = 1;
    if (level >= 1 && level <= 4) baseBombs = 1;
    else if (level >= 5 && level <= 7) baseBombs = 2;
    else if (level >= 8 && level <= 9) baseBombs = 3;
    else if (level >= 10) baseBombs = 4;

    // --- JEBAKAN AWAL (Early Trap Logic) ---
    let psychoTrap = 1.0;
    
    // --- ENHANCED EARLY GUARD (Disiplin Pintu Masuk) ---
    // Meningkatkan kemungkinan kena bomb di Level 1-3 untuk menjaga ritme permainan.
    let earlyGuardProb = 0.12; // 12% standard
    if (initialBet && bet > (initialBet * 1.05)) earlyGuardProb = 0.25; // 25% jika bet naik
    
    const earlyGuardActive = (level <= 3 && Math.random() < earlyGuardProb);
    
    // 3. PSEUDO-RANDOM NUMBER GENERATOR (PRNG) dengan Server Seed
    const seed = generateSeed();
    const hash = crypto.createHmac('sha256', seed)
                       .update(`${level}-${bet}-${Date.now()}`)
                       .digest('hex');
    
    const prngValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;

    // Perhitungan Peluang Akhir
    const effectiveRtp = Math.max(0.15, rtpAdjustment * psychoTrap);
    let finalBombChance = (baseBombs / 5) / effectiveRtp;
    
    if (earlyGuardActive) finalBombChance = Math.max(finalBombChance, 0.82);

    const isBomb = prngValue < Math.min(0.98, finalBombChance);

    // --- CONSISTENT BOMB GENERATION ---
    // Pastikan jika isBomb=true, maka kotak yang diklik ADALAH salah satu bom.
    // Jika isBomb=false, maka kotak yang diklik PASTI bukan bom.
    // Jumlah bom harus TETAP sesuai getBombCount(level).
    
    const generateConsistentBombs = (lvl: number, clickedIdx?: number, forceBomb?: boolean) => {
        const count = getBombCount(lvl);
        const allPositions = [0, 1, 2, 3, 4];
        
        if (clickedIdx !== undefined && forceBomb !== undefined) {
            // Logika untuk level yang sedang dimainkan
            const pool = allPositions.filter(p => p !== clickedIdx);
            
            if (forceBomb) {
                // Sisa bom yang harus diletakkan selain di clickedIdx
                const otherBombsCount = count - 1;
                const shuffled = pool.sort(() => Math.random() - 0.5);
                return [clickedIdx, ...shuffled.slice(0, otherBombsCount)];
            } else {
                // Semua bom harus diletakkan di tempat selain clickedIdx
                const shuffled = pool.sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count);
            }
        } else {
            // Logika random untuk level lain (reveal)
            return allPositions.sort(() => Math.random() - 0.5).slice(0, count);
        }
    };

    const bombIndices = generateConsistentBombs(level, index, isBomb);

    // Jika kalah atau jackpot, berikan semua posisi bom dari lvl 1-10
    let allBombs: Record<number, number[]> | null = null;
    if (isBomb || level >= 10) {
        allBombs = {};
        for (let i = 1; i <= 10; i++) {
            allBombs[i] = (i === level) ? bombIndices : generateConsistentBombs(i);
        }
    }

    return NextResponse.json({
        success: !isBomb,
        bombIndices: bombIndices,
        allBombs: allBombs,
        metadata: {
            seed: hash,
            strategy: "Adaptive-RTP-v4-Consistency",
            rtp: Math.floor(effectiveRtp * 100) + "%",
            risk_level: bet > 10000 || initialBet && bet > initialBet * 1.5 ? "HIGH" : "NORMAL",
            difficulty: baseBombs
        }
    });
}

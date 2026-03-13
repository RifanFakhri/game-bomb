import { NextResponse } from 'next/server';
import crypto from 'crypto';

// PRNG Seed Generator (Server-side Secure)
const generateSeed = () => crypto.randomBytes(16).toString('hex');

export async function POST(request: Request) {
    const { level, bet, initialBet } = await request.json();
    
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
    
    // Jika Early Guard aktif, paksa peluang bomb minimal 80% (Hampir pasti meledak)
    if (earlyGuardActive) finalBombChance = Math.max(finalBombChance, 0.82);

    const isBomb = prngValue < Math.min(0.98, finalBombChance);



    return NextResponse.json({
        success: !isBomb,
        metadata: {
            seed: hash,
            strategy: "Adaptive-RTP-v3-Spike-Control",
            rtp: Math.floor(effectiveRtp * 100) + "%",
            risk_level: bet > 10000 ? "HIGH" : "NORMAL",
            difficulty: baseBombs
        }
    });
}


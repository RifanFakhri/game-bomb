import { NextResponse } from 'next/server';
import crypto from 'crypto';

// PRNG Seed Generator (Server-side Secure)
const generateSeed = () => crypto.randomBytes(16).toString('hex');

export async function POST(request: Request) {
    const { level, bet, initialBet } = await request.json();
    
    // 1. ADAPTIVE RTP (Dynamic Odds Adjustment)
    let rtpAdjustment = 1.0; 
    
    // DETEKSI LONJAKAN BET (Bet Spike Ratio Detection)
    // Membandingkan bet saat ini dengan bet pertama kali (initialBet)
    if (initialBet && bet > initialBet) {
        const spikeRatio = bet / initialBet;
        
        if (spikeRatio >= 1.5) rtpAdjustment -= 0.10; // Naik 1.5x -> Penalty 10%
        if (spikeRatio >= 2.0) rtpAdjustment -= 0.25; // Naik 2x (Martingale) -> Penalty 25%
        if (spikeRatio >= 4.0) rtpAdjustment -= 0.50; // Naik 4x -> Penalty 50%
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
    
    // Toleransi 10%: Jebakan hanya aktif jika bet naik lebih dari 10%
    if (initialBet && bet > (initialBet * 1.1) && level <= 3) {
        // Tuan menaikkan bet secara signifikan? Sistem langsung "menjaga" di pintu masuk.
        psychoTrap = 0.55; // Sedikit lebih ringan (sebelumnya 0.5)
    }

    // Random Early Guard (Diturunkan ke 10% chance agar tidak terlalu sering)
    const earlyGuardActive = (level <= 2 && Math.random() < 0.10); 
// 15% chance force hard early
    
    // 3. PSEUDO-RANDOM NUMBER GENERATOR (PRNG) dengan Server Seed
    const seed = generateSeed();
    const hash = crypto.createHmac('sha256', seed)
                       .update(`${level}-${bet}-${Date.now()}`)
                       .digest('hex');
    
    const prngValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;

    // Perhitungan Peluang Akhir
    const effectiveRtp = Math.max(0.2, rtpAdjustment * psychoTrap);
    let finalBombChance = (baseBombs / 5) / effectiveRtp;
    
    // Jika Early Guard aktif, paksa peluang bomb tinggi
    if (earlyGuardActive) finalBombChance = Math.max(finalBombChance, 0.75);

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


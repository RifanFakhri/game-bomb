"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';

export default function GameComponent() {
    const [balance, setBalance] = useState(50000);
    const [bet, setBet] = useState(1000);
    const [level, setLevel] = useState(1);
    const [gameActive, setGameActive] = useState(false);
    const [message, setMessage] = useState("Siap menganalisa pola?");
    const [lostAt, setLostAt] = useState<{ lvl: number, idx: number } | null>(null);
    const [initialBet, setInitialBet] = useState<number | null>(null);
    const [revealedBombs, setRevealedBombs] = useState<Record<number, number[]>>({});
    const [selectedIndices, setSelectedIndices] = useState<Record<number, number>>({});

    // Multiplier per level
    const multipliers = [0, 1.23, 1.54, 1.93, 2.41, 4.02, 6.69, 11.16, 27.89, 69.74, 348.72];

    const currentMultiplier = multipliers[level - 1] || 0;
    const nextMultiplier = multipliers[level] || 0;

    const handleChoice = async (index: number) => {
        if (!gameActive) return;

        const res = await fetch('/api/play', {
            method: 'POST',
            body: JSON.stringify({ index, bet, level, initialBet: initialBet || bet }),
        });


        const data = await res.json();

        // Simpan index yang dipilih
        setSelectedIndices(prev => ({ ...prev, [level]: index }));

        if (!data.success) {
            setMessage("BOOM! Algoritma mendeteksi bet Tuan.");
            setGameActive(false);
            setLostAt({ lvl: level, idx: index });
            setInitialBet(null);
            // Simpan semua posisi bom jika kalah
            if (data.allBombs) {
                setRevealedBombs(data.allBombs);
            }
        } else {
            if (level >= 10) {
                const win = Math.floor(bet * multipliers[10]);
                setBalance(prev => prev + win);
                setGameActive(false);
                setLevel(11);
                setMessage(`JACKPOT! IDR ${win.toLocaleString()}`);
                if (data.allBombs) {
                    setRevealedBombs(data.allBombs);
                }
            } else {
                setLevel(level + 1);
                setMessage(`Level ${level} aman. Lanjut ke x${multipliers[level + 1]}?`);
            }
        }
    };


    const startGame = () => {
        if (bet > balance) return alert("Saldo tipis!");
        if (bet < 100) return alert("Bet minimal IDR 100!");
        
        // Simpan bet awal sesi untuk deteksi lonjakan (Spike Detection)
        if (initialBet === null) {
            setInitialBet(bet);
        }

        setBalance(prev => prev - bet);
        setGameActive(true);
        setRevealedBombs({});
        setSelectedIndices({});
        setLevel(1);
        setLostAt(null);
        setMessage("Menganalisa Seed...");
    };


    const cashOut = async () => {
        if (level <= 1 || !gameActive) return;
        
        // Ambil semua posisi bom untuk reveal
        const res = await fetch('/api/play', {
            method: 'POST',
            body: JSON.stringify({ action: 'reveal', level, bet, initialBet }),
        });
        const data = await res.json();
        setRevealedBombs(data.allBombs);

        const win = Math.floor(bet * currentMultiplier);
        setBalance(prev => prev + win);
        setGameActive(false);
        setMessage(`Profit: IDR ${win.toLocaleString()}`);
    };



    const totalWinPotential = Math.floor(bet * nextMultiplier);

    return (
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-[500px] backdrop-blur-md bg-opacity-95 my-8">
            <h2 className="text-yellow-500 font-extrabold text-center mb-6 tracking-[0.4em] text-2xl sm:text-3xl uppercase italic">
                Fortune Apple
            </h2>

            <div className="flex justify-between bg-black/60 p-4 sm:p-5 rounded-2xl mb-6 border border-white/5 shadow-inner">
                <div>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">SALDO TUAN</p>
                    <p className="text-green-400 font-mono text-xl sm:text-2xl font-bold">IDR {balance.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">BET AKTIF</p>
                    <div className="flex items-center justify-end">
                        <span className="text-yellow-600 text-xs mr-1">IDR</span>
                        <input
                            type="number"
                            value={bet}
                            onChange={(e) => setBet(Number(e.target.value))}
                            disabled={gameActive}
                            className="bg-transparent text-yellow-500 text-right font-mono outline-none w-24 sm:w-28 text-xl sm:text-2xl font-bold disabled:opacity-50"
                        />
                    </div>
                </div>
            </div>

            {/* Game Board - Dynamic Sizing, No Scroll */}
            <div className="flex flex-col gap-2 mb-8">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((lvl) => (
                    <div key={lvl} className={`flex gap-2 items-center transition-all duration-300 ${lvl === level ? 'opacity-100 scale-[1.03] z-10' : lvl < level ? 'opacity-70' : 'opacity-30'}`}>
                        {/* Level Indicator */}
                        <div className="w-10 sm:w-12 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-500 font-mono leading-none">x{multipliers[lvl]}</span>
                            <span className="text-[8px] text-slate-600 font-bold uppercase">lvl {lvl}</span>
                        </div>
                        {[0, 1, 2, 3, 4].map((i) => {
                            const isSelected = selectedIndices[lvl] === i;
                            const isLostCell = lostAt?.lvl === lvl && lostAt?.idx === i;
                            const isRevealedBomb = !gameActive && revealedBombs[lvl]?.includes(i);
                            const isGameOver = !gameActive;
                            
                            return (
                                <div 
                                    key={i} 
                                    onClick={() => handleChoice(i)} 
                                    className={`flex-1 aspect-square rounded-xl flex items-center justify-center cursor-pointer border-2 transition-all duration-200 shadow-lg
                                        ${isSelected ? (isLostCell ? 'bg-red-500/40 border-red-500 animate-shake shadow-red-500/30 z-20' : 'bg-green-500/20 border-green-500 shadow-green-500/20') : 
                                          isRevealedBomb ? 'bg-slate-800/80 border-slate-500 shadow-inner' :
                                          isGameOver ? 'bg-slate-800/40 border-slate-700' :
                                          lvl === level && gameActive ? 'bg-slate-700 border-yellow-500/70 hover:bg-slate-600 hover:scale-105 shadow-yellow-500/10' :
                                          'bg-slate-800/40 border-slate-700 pointer-events-none'}`}
                                >
                                    {isSelected ? (
                                        isLostCell ? (
                                            <div className="relative w-full h-[80%] scale-125">
                                                <Image src="/bomb2.png" alt="Explosion" fill className="object-contain p-1" priority />
                                            </div>
                                        ) : (
                                            <div className="relative w-full h-[75%] scale-110">
                                                <Image src="/apel.png" alt="Apple" fill className="object-contain p-1" priority />
                                            </div>
                                        )
                                    ) : isRevealedBomb ? (
                                        <div className="relative w-full h-[65%]">
                                            <Image src="/bomb2.png" alt="Bomb" fill className="object-contain p-1" priority />
                                        </div>
                                    ) : isGameOver ? (
                                        <div className="relative w-full h-[65%]">
                                            <Image src="/apel.png" alt="Apple" fill className="object-contain p-1" priority />
                                        </div>
                                    ) : (
                                        <span className="text-xs sm:text-sm font-black text-slate-700">?</span>
                                    )}
                                </div>
                            );

                        })}



                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {gameActive && level > 1 && (
                    <div className="text-center animate-pulse bg-green-500/10 py-2 rounded-xl border border-green-500/20">
                        <p className="text-[10px] sm:text-xs text-green-400 font-black uppercase tracking-widest">Amankan Sekarang:</p>
                        <p className="text-2xl sm:text-3xl font-black text-white font-mono">IDR {Math.floor(bet * currentMultiplier).toLocaleString()}</p>
                    </div>
                )}

                <button
                    onClick={gameActive ? cashOut : startGame}
                    className={`w-full py-5 rounded-[1.5rem] font-black text-xl tracking-[0.2em] transition-all shadow-2xl active:scale-95 uppercase
                        ${gameActive
                            ? 'bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 text-white border-t border-white/20'
                            : 'bg-gradient-to-br from-yellow-400 to-orange-600 hover:from-yellow-300 hover:to-orange-500 text-black border-t border-white/40'}`}
                >
                    {gameActive ? `CASH OUT` : "MULAI MAIN"}
                </button>

                <div className="bg-black/40 py-3 rounded-xl border border-white/5 shadow-inner">
                    <p className="text-center text-xs sm:text-sm text-yellow-500/90 font-bold italic tracking-wide px-4">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}



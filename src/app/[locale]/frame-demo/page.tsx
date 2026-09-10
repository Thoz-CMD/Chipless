"use client";

import { PlayerAvatar } from "@/features/game/player-avatar";
import { PROFILE_FRAMES, FRAME_ORDER } from "@/features/game/profile-frames";
import type { ProfileFrameId } from "@/features/game/profile-frames";

export default function FrameDemoPage() {
  const demoPlayer = {
    uid: "demo-123",
    name: "Demo Player",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          Profile Frame Showcase
        </h1>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FRAME_ORDER.map((frameId) => {
            const frame = PROFILE_FRAMES[frameId];
            
            return (
              <div
                key={frameId}
                className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
              >
                <h3 className="text-lg font-bold text-white">{frame.name}</h3>
                
                {/* Demo Avatar with Frame */}
                <div className="relative">
                  <PlayerAvatar
                    uid={demoPlayer.uid}
                    name={demoPlayer.name}
                    isCurrentUser={false}
                    isDealer={false}
                    isCurrentTurn={false}
                    profileFrame={frame}
                  />
                </div>

                {/* Frame Details */}
                <div className="w-full space-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-4 rounded-full border"
                      style={{ backgroundColor: frame.previewColor }}
                    />
                    <span>Color: {frame.previewColor}</span>
                  </div>
                  
                  {frame.cornerAccents && (
                    <div className="text-center text-cyan-400">✨ Corner Accents</div>
                  )}
                  
                  {frame.pulseAnimation && (
                    <div className="text-center text-purple-400">⚡ Pulse Effect</div>
                  )}
                  
                  {frame.ringStyle && (
                    <div className="text-center text-yellow-400">💎 Ring Glow</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Section */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-black/60 p-8 backdrop-blur-sm">
          <h2 className="mb-6 text-center text-2xl font-bold text-white">
            All Frames Comparison
          </h2>
          
          <div className="flex flex-wrap items-center justify-center gap-8">
            {FRAME_ORDER.map((frameId) => {
              const frame = PROFILE_FRAMES[frameId];
              
              return (
                <div key={frameId} className="flex flex-col items-center gap-2">
                  <PlayerAvatar
                    uid={`${demoPlayer.uid}-${frameId}`}
                    name={frame.name}
                    isCurrentUser={frameId === "neon-hex"}
                    isDealer={frameId === "diamond-elite"}
                    isCurrentTurn={frameId === "cyber-ring"}
                    profileFrame={frame}
                  />
                  <span className="text-xs font-semibold text-gray-300">
                    {frame.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-center">
            <div className="mb-2 text-2xl">💎</div>
            <h3 className="mb-1 font-bold text-cyan-400">Neon Hex</h3>
            <p className="text-xs text-gray-400">
              Futuristic cyan glow with corner accents and pulse animation
            </p>
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-4 text-center">
            <div className="mb-2 text-2xl">👑</div>
            <h3 className="mb-1 font-bold text-yellow-400">Diamond Elite</h3>
            <p className="text-xs text-gray-400">
              Luxury golden frame with triple ring and corner details
            </p>
          </div>

          <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-4 text-center">
            <div className="mb-2 text-2xl">⚡</div>
            <h3 className="mb-1 font-bold text-fuchsia-400">Cyber Ring</h3>
            <p className="text-xs text-gray-400">
              Cyberpunk purple-pink with pulsing multi-layer glow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

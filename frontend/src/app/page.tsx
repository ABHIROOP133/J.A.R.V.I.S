"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VoiceAssistantControlBar,
  BarVisualizer,
  RoomAudioRenderer,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Cpu, Radio, ShieldCheck } from "lucide-react";
import "@livekit/components-styles";

export default function Home() {
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const connectToJarvis = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch(
        `/api/token?room=jarvis-room&username=user-${Math.floor(Math.random() * 1000)}`
      );
      const data = await response.json();
      setToken(data.token);
    } catch (e) {
      console.error(e);
      setIsConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-cyan-500 font-mono overflow-hidden relative selection:bg-cyan-900">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <header className="absolute top-8 left-8 right-8 flex justify-between items-center opacity-80 border-b border-cyan-900/50 pb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 animate-pulse" />
            <h1 className="text-xl tracking-[0.3em] font-bold">J.A.R.V.I.S.</h1>
          </div>
          <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-700">
            <ShieldCheck className="w-4 h-4" />
            SECURE CONNECTION
          </div>
        </header>

        {token === "" ? (
          <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 rounded-full animate-pulse" />
              <button
                onClick={connectToJarvis}
                disabled={isConnecting}
                className="relative group border-2 border-cyan-500/50 hover:border-cyan-400 bg-black/50 backdrop-blur-md px-12 py-6 rounded-full uppercase tracking-[0.3em] font-semibold transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,255,255,0.3)] disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-cyan-500/10 scale-0 group-hover:scale-100 rounded-full transition-transform duration-300 origin-center" />
                <span className="relative z-10 flex items-center gap-3">
                  <Radio className="w-5 h-5" />
                  {isConnecting ? "INITIALIZING..." : "SYSTEM START"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <LiveKitRoom
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            token={token}
            connect={true}
            audio={true}
            video={false}
            className="flex flex-col items-center w-full max-w-4xl gap-12"
            onDisconnected={() => {
              setToken("");
              setIsConnecting(false);
            }}
          >
            <RoomAudioRenderer />
            <JarvisInterface />
          </LiveKitRoom>
        )}
      </div>
    </main>
  );
}

function JarvisInterface() {
  const state = useConnectionState();

  return (
    <div className="w-full flex flex-col items-center justify-center gap-16 animate-in slide-in-from-bottom-12 fade-in duration-1000">
      
      {/* Visualizer Ring */}
      <div className="relative flex items-center justify-center w-64 h-64">
        <div className="absolute inset-0 border border-cyan-900/50 rounded-full animate-[spin_10s_linear_infinite]" />
        <div className="absolute inset-4 border border-cyan-800/40 border-dashed rounded-full animate-[spin_15s_linear_infinite_reverse]" />
        
        {/* Core AI visualizer */}
        <div className="relative z-10 w-full h-full flex items-center justify-center scale-150">
          <BarVisualizer
            state="speaking"
            barCount={7}
            options={{ minHeight: 10 }}
            className="text-cyan-400 opacity-80 mix-blend-screen"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="uppercase tracking-[0.4em] text-xs text-cyan-600 font-semibold">
          {state === ConnectionState.Connected ? "ONLINE - LISTENING" : "ESTABLISHING UPLINK..."}
        </div>
        
        {/* Control Bar (Mute/Disconnect) */}
        <div className="opacity-70 hover:opacity-100 transition-opacity">
          <VoiceAssistantControlBar />
        </div>
      </div>

    </div>
  );
}

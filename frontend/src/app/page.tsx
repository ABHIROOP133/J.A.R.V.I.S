"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BarVisualizer, LiveKitRoom, RoomAudioRenderer, useConnectionState, useVoiceAssistant, useLocalParticipant } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { ArrowUpRight, AudioLines, Circle, Cpu, Mic, MicOff, Radio, ShieldCheck } from "lucide-react";
import "@livekit/components-styles";

type CoreMode = "idle" | "connecting" | "listening" | "speaking";
type Node = { x: number; y: number; z: number; phase: number };
const energy: Record<CoreMode, number> = { idle: .55, connecting: .72, listening: .9, speaking: 1 };

function NeuralCore({ mode = "idle" }: { mode?: CoreMode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    
    // dynamically load Three.js if not present
    if (!(window as any).THREE) {
      const script = document.createElement("script");
      script.src = "https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js";
      script.onload = () => init(containerRef.current!);
      document.head.appendChild(script);
    } else {
      init(containerRef.current!);
    }
    initialized.current = true;
    
    function init(container: HTMLDivElement) {
      const THREE = (window as any).THREE;
      if (!THREE) return;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 24;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      
      const neuralGroup = new THREE.Group();
      scene.add(neuralGroup);

      const ambientLight = new THREE.AmbientLight(0x00f0ff, 0.8);
      scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0x00ffff, 2.5, 50);
      pointLight1.position.set(0, 0, 10);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x0088ff, 1.8, 40);
      pointLight2.position.set(-15, 10, -5);
      scene.add(pointLight2);

      const nodeCount = 140;
      const nodes: any[] = [];
      const nodePositions: number[] = [];
      const clusterRadius = 8.5;

      function createGlowDot() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if(!ctx) return null;
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(0,240,255,0.85)');
        gradient.addColorStop(0.7, 'rgba(0,140,255,0.25)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
      }

      const dotTexture = createGlowDot();

      for (let i = 0; i < nodeCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / nodeCount);
        const theta = Math.sqrt(nodeCount * Math.PI) * phi;
        const r = (0.35 + Math.random() * 0.65) * clusterRadius;
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const vec = new THREE.Vector3(x, y, z);
        nodes.push({
          pos: vec.clone(),
          basePos: vec.clone(),
          phase: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 1.4,
          amp: 0.3 + Math.random() * 0.5
        });
        nodePositions.push(x, y, z);
      }

      const nodesGeometry = new THREE.BufferGeometry();
      nodesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));

      const nodesMaterial = new THREE.PointsMaterial({
        size: 0.9,
        map: dotTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0x00f0ff
      });

      const nodesMesh = new THREE.Points(nodesGeometry, nodesMaterial);
      neuralGroup.add(nodesMesh);

      const coreGeo = new THREE.SphereGeometry(1.6, 24, 24);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x88ffff,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      neuralGroup.add(coreMesh);

      const coreInnerGeo = new THREE.IcosahedronGeometry(1.0, 2);
      const coreInnerMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.85
      });
      const coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
      neuralGroup.add(coreInner);

      const ringGroup = new THREE.Group();
      neuralGroup.add(ringGroup);

      const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.28 });
      const ringGeo1 = new THREE.RingGeometry(10.5, 10.65, 64);
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      ringGroup.add(ring1);

      const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00ffea, wireframe: true, transparent: true, opacity: 0.2 });
      const ringGeo2 = new THREE.RingGeometry(12.0, 12.15, 64);
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.x = Math.PI * 0.35;
      ringGroup.add(ring2);

      const ringMat3 = new THREE.MeshBasicMaterial({ color: 0x0088ff, wireframe: true, transparent: true, opacity: 0.22 });
      const ringGeo3 = new THREE.RingGeometry(13.8, 13.9, 72);
      const ring3 = new THREE.Mesh(ringGeo3, ringMat3);
      ring3.rotation.y = Math.PI * 0.4;
      ringGroup.add(ring3);

      const maxDistance = 4.2;
      const linePositions = new Float32Array(nodeCount * nodeCount * 6);
      const lineColors = new Float32Array(nodeCount * nodeCount * 6);

      const linesGeometry = new THREE.BufferGeometry();
      linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      linesGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

      const linesMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.75
      });

      const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
      neuralGroup.add(linesMesh);

      const starCount = 350;
      const starGeo = new THREE.BufferGeometry();
      const starCoords = [];
      for (let s = 0; s < starCount; s++) {
        starCoords.push((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
      const starMat = new THREE.PointsMaterial({ size: 0.35, color: 0x0088dd, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending });
      const starField = new THREE.Points(starGeo, starMat);
      scene.add(starField);

      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;

      function onMouseMove(e: MouseEvent) {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      }
      window.addEventListener('mousemove', onMouseMove);

      let clock = new THREE.Clock();
      let reqId: number;

      function animate() {
        reqId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        targetX += (mouseX * 0.5 - targetX) * 0.05;
        targetY += (mouseY * 0.5 - targetY) * 0.05;

        neuralGroup.rotation.y = t * 0.18 + targetX;
        neuralGroup.rotation.x = Math.sin(t * 0.12) * 0.2 + targetY;
        neuralGroup.rotation.z = Math.cos(t * 0.08) * 0.1;

        ring1.rotation.z = -t * 0.25;
        ring2.rotation.z = t * 0.15;
        ring3.rotation.x = t * 0.2;

        const scale = 1 + Math.sin(t * 3.0) * 0.08;
        coreMesh.scale.set(scale, scale, scale);
        coreInner.scale.set(1 + Math.cos(t * 4.5) * 0.15, 1 + Math.cos(t * 4.5) * 0.15, 1 + Math.cos(t * 4.5) * 0.15);

        const currentPos = (nodesGeometry.attributes.position as any).array;
        for (let i = 0; i < nodeCount; i++) {
          const node = nodes[i];
          const offset = Math.sin(t * node.speed + node.phase) * node.amp;
          const nx = node.basePos.x * (1 + offset * 0.12);
          const ny = node.basePos.y * (1 + offset * 0.12);
          const nz = node.basePos.z * (1 + offset * 0.12);
          
          currentPos[i * 3] = nx;
          currentPos[i * 3 + 1] = ny;
          currentPos[i * 3 + 2] = nz;
          node.pos.set(nx, ny, nz);
        }
        nodesGeometry.attributes.position.needsUpdate = true;

        let vertexIndex = 0;
        let colorIndex = 0;
        let connectionCount = 0;

        for (let i = 0; i < nodeCount; i++) {
          for (let j = i + 1; j < nodeCount; j++) {
            const dist = nodes[i].pos.distanceTo(nodes[j].pos);
            if (dist < maxDistance) {
              const alpha = 1.0 - dist / maxDistance;
              linePositions[vertexIndex++] = nodes[i].pos.x;
              linePositions[vertexIndex++] = nodes[i].pos.y;
              linePositions[vertexIndex++] = nodes[i].pos.z;
              linePositions[vertexIndex++] = nodes[j].pos.x;
              linePositions[vertexIndex++] = nodes[j].pos.y;
              linePositions[vertexIndex++] = nodes[j].pos.z;

              const intensity = alpha * 0.85;
              lineColors[colorIndex++] = 0.0;
              lineColors[colorIndex++] = intensity * 0.95;
              lineColors[colorIndex++] = intensity;

              lineColors[colorIndex++] = 0.0;
              lineColors[colorIndex++] = intensity * 0.8;
              lineColors[colorIndex++] = intensity * 1.1;
              connectionCount++;
            }
          }
        }

        linesGeometry.setDrawRange(0, connectionCount * 2);
        linesGeometry.attributes.position.needsUpdate = true;
        linesGeometry.attributes.color.needsUpdate = true;

        starField.rotation.y = -t * 0.03;
        renderer.render(scene, camera);
      }
      animate();

      function handleResize() {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener('resize', handleResize);
      
      (container as any)._cleanup = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(reqId);
        container.innerHTML = "";
      };
    }
    
    return () => {
      if (containerRef.current && (containerRef.current as any)._cleanup) {
        (containerRef.current as any)._cleanup();
      }
    };
  }, []);

  return (
    <div className="neural-core" role="img" aria-label="Interactive neural network visualization" style={{ position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
      <div className="neural-halo"/>
      <div className="neural-caption">NEURAL INTERFACE</div>
    </div>
  );
}

export default function Home() {
  const [token, setToken] = useState(""); const [isConnecting, setIsConnecting] = useState(false);
  const connect = async () => { setIsConnecting(true); try { const r = await fetch(`/api/token?room=jarvis-room&username=user-${Math.floor(Math.random()*1000)}`); if (!r.ok) throw new Error("Unable to initialize"); setToken((await r.json()).token); } catch (e) { console.error(e); setIsConnecting(false); } };
  return <main className="app-shell"><div className="atmosphere"/><Header connected={!!token}/>{!token ? <Landing connecting={isConnecting} connect={connect}/> : <LiveKitRoom serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} token={token} connect audio={false} video={false} className="live-session" onDisconnected={()=>{setToken("");setIsConnecting(false);}}><RoomAudioRenderer/><AssistantConsole/></LiveKitRoom>}</main>;
}
function Header({connected}:{connected:boolean}) { return <header className="topbar"><a href="#home" className="brand"><span className="brand-mark">J</span><span>JARVIS</span></a><nav><a href="#home">Home</a><a href="#assistant">Assistant</a><a href="#system">System</a></nav><div className="connection-status"><Circle/><span>{connected ? "Voice link active" : "System ready"}</span></div></header>; }
function Landing({connecting,connect}:{connecting:boolean;connect:()=>void}) { return <section id="home" className="hero"><div className="hero-copy"><p className="eyebrow"><span/> JARVIS // ONLINE</p><h1>Your intelligent<br/>digital assistant.</h1><p className="hero-description">A real-time voice interface engineered to listen, reason, and respond when you need it.</p><div className="hero-actions"><button className="button-primary" onClick={connect} disabled={connecting}><Mic size={17}/>{connecting ? "Establishing link" : "Start conversation"}</button><a className="button-secondary" href="#system">Explore system <ArrowUpRight size={16}/></a></div><p className="privacy-note"><ShieldCheck size={15}/> A private LiveKit voice session opens when you start.</p></div><div className="hero-visual"><NeuralCore mode={connecting ? "connecting" : "idle"}/></div><section id="system" className="system-strip"><div><span>INTERFACE</span><strong>Voice-first</strong></div><div><span>CONNECTION</span><strong>{connecting ? "Initialising" : "On demand"}</strong></div><div><span>SESSION</span><strong>LiveKit secured</strong></div></section></section>; }
function AssistantConsole() { const connection = useConnectionState(); const {state} = useVoiceAssistant(); const connected = connection === ConnectionState.Connected; const label = !connected ? "Connecting" : state === "speaking" ? "Speaking" : state === "listening" ? "Listening" : "Ready"; const mode:CoreMode = !connected ? "connecting" : state === "speaking" ? "speaking" : "listening"; return <section id="assistant" className="assistant-console"><aside className="console-side"><p className="eyebrow"><span/> LIVE SESSION</p><h1>Voice, without the noise.</h1><p>Jarvis joins the room and responds over an encrypted real-time audio connection.</p><div className="state-list"><Status icon={<Radio size={15}/>} label="Voice link" value={connected ? "Connected" : "Connecting"}/><Status icon={<Cpu size={15}/>} label="Assistant" value={label}/><Status icon={<AudioLines size={15}/>} label="Audio output" value={connected ? "Available" : "Waiting"}/></div></aside><div className="session-core"><NeuralCore mode={mode}/><div className="voice-state"><span className="state-dot"/>{label}</div><BarVisualizer state={state} barCount={9} options={{minHeight:6}} className="voice-bars"/><PushToTalkControl className="voice-controls"/></div></section>; }
function Status({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="status-item"><span>{icon}</span><p>{label}<strong>{value}</strong></p></div>; }

function PushToTalkControl({ className }: { className?: string }) {
  const { localParticipant } = useLocalParticipant();
  const [isTransmitting, setIsTransmitting] = useState(false);
  const activeRef = useRef(false);

  const enableMic = useCallback(async () => {
    if (!localParticipant || activeRef.current) return;
    activeRef.current = true;
    setIsTransmitting(true);
    await localParticipant.setMicrophoneEnabled(true);
  }, [localParticipant]);

  const disableMic = useCallback(async () => {
    if (!localParticipant || !activeRef.current) return;
    activeRef.current = false;
    setIsTransmitting(false);
    await localParticipant.setMicrophoneEnabled(false);
  }, [localParticipant]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        enableMic();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        disableMic();
      }
    };
    const handleBlur = () => {
      disableMic();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      disableMic();
    };
  }, [enableMic, disableMic]);

  return (
    <div className={`ptt-container ${className || ""}`}>
      <button
        className={`ptt-button ${isTransmitting ? "active" : "idle"}`}
        onPointerDown={enableMic}
        onPointerUp={disableMic}
        onPointerLeave={disableMic}
        onPointerCancel={disableMic}
        onContextMenu={(e) => e.preventDefault()}
        aria-pressed={isTransmitting}
        title="Hold Spacebar or Click to speak"
      >
        <span className="ptt-icon">
          {isTransmitting ? <Mic size={18} /> : <MicOff size={18} />}
        </span>
        <span className="ptt-label">
          {isTransmitting ? "Release to Send" : "Push to Talk"}
        </span>
      </button>
    </div>
  );
}
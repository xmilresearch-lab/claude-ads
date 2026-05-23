import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import {
  Zap, Shield, Globe, Gamepad2, Trophy, Users, Star, ArrowRight, Flame, Cpu, Map,
  X, Check, Copy, Wallet, AlertCircle, CheckCircle, RefreshCw, ExternalLink,
} from "lucide-react";

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const T = {
  bgVoid:    "#07090B",
  bgSurface: "#0D1117",
  bgRaised:  "#131920",
  border:    "rgba(255,255,255,0.07)",
  accent:    "#FF6500",
  accentAlt: "#FF8C38",
  accentDim: "rgba(255,101,0,0.14)",
  primary:   "#EEEEF0",
  secondary: "#7E8899",
  muted:     "#3D4655",
};
const glowSm = `0 0 16px rgba(255,101,0,0.35), 0 0 40px rgba(255,101,0,0.15)`;
const glowMd = `0 0 30px rgba(255,101,0,0.45), 0 0 70px rgba(255,101,0,0.18)`;

// ─── Web3 Config ──────────────────────────────────────────────────────────────
const EVM_RECEIVER = "0x742d35Cc6634C0532925a3b844Bc9e7595f0f0A1"; // demo address

const TOKENS = {
  ETH:  { id:"ETH",  name:"Ethereum",      symbol:"ETH",  icon:"⟠", color:"#627EEA", bg:"rgba(98,126,234,0.12)",  network:"evm", decimals:18 },
  USDC: { id:"USDC", name:"USD Coin",       symbol:"USDC", icon:"◎", color:"#2775CA", bg:"rgba(39,117,202,0.12)",  network:"evm", decimals:6,  contract:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  USDT: { id:"USDT", name:"Tether USD",     symbol:"USDT", icon:"₮", color:"#26A17B", bg:"rgba(38,161,123,0.12)",  network:"evm", decimals:6,  contract:"0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  USD1: { id:"USD1", name:"USD1",           symbol:"USD1", icon:"①", color:"#FF8C38", bg:"rgba(255,140,56,0.12)",  network:"evm", decimals:18, contract:"0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0B" },
  BTC:  { id:"BTC",  name:"Bitcoin",        symbol:"BTC",  icon:"₿", color:"#F7931A", bg:"rgba(247,147,26,0.12)",  network:"btc", address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  XRP:  { id:"XRP",  name:"XRP",            symbol:"XRP",  icon:"✕", color:"#00AAE4", bg:"rgba(0,170,228,0.12)",   network:"xrp", address:"rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh", destTag:"1234567" },
};

const RATES = { ETH:3420, BTC:67340, XRP:0.52, USDC:1, USDT:1, USD1:1 };

const PLANS = [
  { id:"explorer", name:"Explorer", price:9.99,  tag:"STARTER",  highlight:false, perks:["50 daily quests","City map access","1× XP multiplier","Basic rewards pool","Community chat"] },
  { id:"warrior",  name:"Warrior",  price:29.99, tag:"POPULAR",   highlight:true,  perks:["Unlimited quests","AR city overlay","3× XP multiplier","Squad & guild features","Priority reward drops","NFT loot access"] },
  { id:"legend",   name:"Legend",   price:99.99, tag:"ELITE",     highlight:false, perks:["Everything in Warrior","10× XP multiplier","City district ownership","Guild creation","VIP events","AI companion priority","Early-access drops"] },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --acc:#FF6500;--acc-alt:#FF8C38;--acc-dim:rgba(255,101,0,0.14);
    --bg0:#07090B;--bg1:#0D1117;--bg2:#131920;
    --border:rgba(255,255,255,0.07);
    --t1:#EEEEF0;--t2:#7E8899;--t3:#3D4655;
    --glow-sm:${glowSm};--glow-md:${glowMd};
  }
  html{scroll-behavior:smooth}
  body{font-family:'DM Sans',sans-serif;background:var(--bg0);color:var(--t1);overflow-x:hidden}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:var(--bg0)}
  ::-webkit-scrollbar-thumb{background:rgba(255,101,0,0.5);border-radius:2px}

  @keyframes floatA{0%,100%{transform:translateY(0px) rotate(0deg)}33%{transform:translateY(-14px) rotate(0.5deg)}66%{transform:translateY(-6px) rotate(-0.3deg)}}
  @keyframes floatB{0%,100%{transform:translateY(-8px) rotate(-0.4deg)}50%{transform:translateY(8px) rotate(0.4deg)}}
  @keyframes floatC{0%,100%{transform:translateY(4px) rotate(0.3deg)}60%{transform:translateY(-10px) rotate(-0.5deg)}}
  @keyframes pulseRing{0%{transform:translate(-50%,-50%) scale(1);opacity:0.7}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}
  @keyframes scanLine{0%{transform:translateY(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(2000%);opacity:0}}
  @keyframes glitchShift{0%,94%,100%{clip-path:none;transform:none}95%{clip-path:inset(30% 0 50% 0);transform:translateX(-4px)}97%{clip-path:inset(60% 0 10% 0);transform:translateX(4px)}99%{clip-path:inset(10% 0 80% 0);transform:translateX(-2px)}}
  @keyframes shimmerSlide{0%{background-position:-200% center}100%{background-position:200% center}}
  @keyframes heroIn{from{opacity:0;transform:translateY(48px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pingScale{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:0.8}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes modalIn{from{opacity:0;transform:scale(0.94) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes successPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}

  .hero-in{animation:heroIn 0.9s cubic-bezier(.22,.68,0,1.2) both}
  .fade-up{animation:fadeUp 0.8s cubic-bezier(.22,.68,0,1.2) both}
  .d1{animation-delay:0.15s}.d2{animation-delay:0.3s}.d3{animation-delay:0.45s}.d4{animation-delay:0.6s}
  .float-a{animation:floatA 5.5s ease-in-out infinite}
  .float-b{animation:floatB 6.2s ease-in-out infinite}
  .float-c{animation:floatC 4.8s ease-in-out infinite}
  .glitch{animation:glitchShift 7s infinite}
  .spin{animation:spin 0.9s linear infinite}

  .orange-grad{
    background:linear-gradient(120deg,var(--acc),var(--acc-alt),#FFBA6A);
    background-size:200% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:shimmerSlide 4s linear infinite;
  }
  .glass{
    background:rgba(13,17,23,0.82);
    backdrop-filter:blur(22px) saturate(160%);
    -webkit-backdrop-filter:blur(22px) saturate(160%);
    border:1px solid rgba(255,255,255,0.08);border-radius:16px;
  }
  .card-hover{transition:transform 0.3s cubic-bezier(.22,.68,0,1.2),border-color 0.3s,box-shadow 0.3s,background 0.3s}
  .card-hover:hover{transform:translateY(-6px);border-color:rgba(255,101,0,0.28)!important;box-shadow:0 24px 48px rgba(0,0,0,0.5),0 0 32px rgba(255,101,0,0.1);background:var(--bg2)!important}

  .btn-acc{
    display:inline-flex;align-items:center;gap:8px;
    background:var(--acc);color:#07090B;
    font-family:'DM Sans',sans-serif;font-weight:600;font-size:0.85rem;
    letter-spacing:0.07em;text-transform:uppercase;
    border:none;padding:14px 30px;border-radius:6px;cursor:pointer;
    transition:transform 0.2s,box-shadow 0.2s,filter 0.2s;
  }
  .btn-acc:hover{transform:translateY(-2px);box-shadow:var(--glow-md);filter:brightness(1.1)}
  .btn-acc:disabled{opacity:0.55;cursor:not-allowed;transform:none}

  .btn-ghost{
    display:inline-flex;align-items:center;gap:8px;
    background:transparent;color:var(--t1);
    font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.85rem;
    letter-spacing:0.05em;text-transform:uppercase;
    border:1px solid var(--border);padding:14px 30px;border-radius:6px;cursor:pointer;
    transition:border-color 0.2s,color 0.2s,box-shadow 0.2s;
  }
  .btn-ghost:hover{border-color:var(--acc);color:var(--acc);box-shadow:0 0 20px rgba(255,101,0,0.12)}

  .nav-link{color:var(--t2);text-decoration:none;font-size:0.875rem;font-weight:500;letter-spacing:0.02em;transition:color 0.2s;position:relative}
  .nav-link::after{content:'';position:absolute;bottom:-3px;left:0;width:0;height:1px;background:var(--acc);transition:width 0.25s}
  .nav-link:hover{color:var(--t1)}.nav-link:hover::after{width:100%}

  .section-tag{font-size:0.62rem;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--acc);margin-bottom:18px;display:block}

  .reveal{opacity:0;transform:translateY(28px);transition:opacity 0.75s ease,transform 0.75s cubic-bezier(.22,.68,0,1.2)}
  .reveal.vis{opacity:1;transform:translateY(0)}

  .scan-line{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,rgba(255,101,0,0.04) 50%,transparent 100%);height:60px;animation:scanLine 8s linear infinite;pointer-events:none;z-index:1}

  /* ── Modal ── */
  .modal-backdrop{position:fixed;inset:0;z-index:800;background:rgba(7,9,11,0.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn 0.2s ease}
  .modal-box{animation:modalIn 0.35s cubic-bezier(.22,.68,0,1.2);max-height:92vh;overflow-y:auto}

  /* ── Crypto option ── */
  .crypto-opt{transition:transform 0.2s cubic-bezier(.22,.68,0,1.2),border-color 0.2s,background 0.2s,box-shadow 0.2s;cursor:pointer}
  .crypto-opt:hover{transform:translateY(-4px)}

  /* ── Plan card ── */
  .plan-card-w3{transition:transform 0.3s cubic-bezier(.22,.68,0,1.2),box-shadow 0.3s,border-color 0.3s;cursor:pointer}
  .plan-card-w3:hover{transform:translateY(-8px)}

  /* ── Address box ── */
  .address-box{
    font-family:'Courier New',monospace;font-size:0.75rem;word-break:break-all;
    background:var(--bg0);border:1px solid var(--border);border-radius:8px;
    padding:14px 80px 14px 16px;color:var(--t2);position:relative;line-height:1.6;
  }
  .copy-btn{
    position:absolute;top:50%;right:10px;transform:translateY(-50%);
    background:var(--acc-dim);border:1px solid rgba(255,101,0,0.25);border-radius:5px;
    color:var(--acc);padding:5px 9px;cursor:pointer;font-size:0.67rem;font-weight:600;
    font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:4px;
    transition:background 0.15s;white-space:nowrap;
  }
  .copy-btn:hover{background:rgba(255,101,0,0.22)}

  /* ── Wallet provider btn ── */
  .wallet-btn{
    width:100%;display:flex;align-items:center;gap:14px;
    background:var(--bg2);border:1px solid var(--border);
    border-radius:12px;padding:16px 20px;cursor:pointer;
    transition:border-color 0.2s,background 0.2s;text-align:left;
  }
  .wallet-btn:hover:not(:disabled){border-color:rgba(255,101,0,0.4);background:var(--bg1)}
  .wallet-btn:disabled{opacity:0.5;cursor:not-allowed}

  @media(max-width:768px){.hide-mobile{display:none!important}.hero-cards{display:none!important}.showcase-grid{grid-template-columns:1fr!important}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
`;

// ─── Utilities ────────────────────────────────────────────────────────────────
function usdToTokenAmount(usdAmount, token) {
  if (token.id === "ETH") {
    const eth = usdAmount / RATES.ETH;
    const weiVia1e15 = BigInt(Math.round(eth * 1e15));
    const wei = weiVia1e15 * BigInt(1000);
    return { display: eth.toFixed(6) + " ETH", hex: "0x" + wei.toString(16) };
  }
  if (token.id === "BTC") {
    const btc = usdAmount / RATES.BTC;
    return { display: btc.toFixed(8) + " BTC", raw: Math.round(btc * 1e8) };
  }
  if (token.id === "XRP") {
    const xrp = usdAmount / RATES.XRP;
    return { display: xrp.toFixed(4) + " XRP", raw: Math.round(xrp * 1e6) };
  }
  // USDC / USDT — 6 decimals
  if (token.decimals === 6) {
    const raw = Math.round(usdAmount * 1e6);
    return { display: usdAmount.toFixed(2) + " " + token.symbol, hex: "0x" + raw.toString(16) };
  }
  // USD1 — 18 decimals (BigInt safe)
  const rawVia1e16 = BigInt(Math.round(usdAmount * 1e16));
  const raw18 = rawVia1e16 * BigInt(100);
  return { display: usdAmount.toFixed(2) + " " + token.symbol, hex: "0x" + raw18.toString(16) };
}

function encodeERC20Transfer(toAddress, amountHex) {
  const selector = "a9059cbb";
  const paddedAddr = toAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const paddedAmt  = amountHex.replace("0x", "").padStart(64, "0");
  return "0x" + selector + paddedAddr + paddedAmt;
}

async function sendEVMPayment(token, amountHex, fromAddress) {
  if (token.id === "ETH") {
    return window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: fromAddress, to: EVM_RECEIVER, value: amountHex, gas: "0x5208" }],
    });
  }
  const data = encodeERC20Transfer(EVM_RECEIVER, amountHex);
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from: fromAddress, to: token.contract, data, gas: "0x30D40" }],
  });
}

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  } else {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }
}

// ─── Wallet Hook ──────────────────────────────────────────────────────────────
function useWallet() {
  const [wallet, setWallet] = useState({ connected: false, address: null, chainId: null });

  const update = useCallback((accounts, chainId) => {
    if (accounts && accounts.length > 0) {
      setWallet({ connected: true, address: accounts[0], chainId });
    } else {
      setWallet({ connected: false, address: null, chainId: null });
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) return { error: "no_metamask" };
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chainId  = await window.ethereum.request({ method: "eth_chainId" });
      update(accounts, chainId);
      return { address: accounts[0], chainId };
    } catch (err) {
      return { error: err.code === 4001 ? "user_rejected" : "connection_failed" };
    }
  }, [update]);

  const disconnect = useCallback(() => {
    setWallet({ connected: false, address: null, chainId: null });
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" })
      .then(accs => {
        if (accs.length > 0)
          eth.request({ method: "eth_chainId" }).then(id => update(accs, id));
      }).catch(() => {});
    const onAccounts = (accs) => update(accs, null);
    const onChain    = (id)   => setWallet(w => ({ ...w, chainId: id }));
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged",    onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged",    onChain);
    };
  }, [update]);

  return { wallet, connect, disconnect };
}

// ─── Three.js City Scene ──────────────────────────────────────────────────────
function useCityScene(mountRef) {
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const W = container.clientWidth, H = container.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090B, 0.018);
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 300);
    camera.position.set(28, 20, 28);
    camera.lookAt(0, 2, 0);
    scene.add(new THREE.AmbientLight(0x0a1020, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 0.4);
    sun.position.set(12, 25, 12); scene.add(sun);
    const orangePt = new THREE.PointLight(0xFF6500, 6, 22);
    orangePt.position.set(0, 9, 0); scene.add(orangePt);
    const bluePt = new THREE.PointLight(0x003AFF, 1.5, 50);
    bluePt.position.set(-22, 4, -22); scene.add(bluePt);
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x080C10, shininess: 60, specular: 0x111833 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const grid = new THREE.GridHelper(60, 48, 0xFF6500, 0x101620);
    grid.material.opacity = 0.25; grid.material.transparent = true; scene.add(grid);
    const bMat = new THREE.MeshPhongMaterial({ color: 0x0C1118, emissive: 0x050810, shininess: 90, specular: 0x223355 });
    const bData = [
      {x:0,z:0,w:3,h:14,d:3},{x:0,z:0,w:1.4,h:18,d:1.4},{x:5,z:1,w:2.2,h:9,d:2.2},
      {x:-5,z:-1,w:2.2,h:10,d:2.2},{x:1,z:5,w:2,h:7,d:2},{x:-2,z:-5,w:2,h:8,d:2},
      {x:8,z:0,w:1.6,h:6,d:1.6},{x:-8,z:2,w:1.6,h:7,d:1.6},{x:4,z:-6,w:1.4,h:5,d:1.4},
      {x:-4,z:6,w:1.4,h:5,d:1.4},{x:10,z:4,w:1.2,h:4,d:1.2},{x:-10,z:-4,w:1.2,h:4,d:1.2},
      {x:2,z:9,w:1,h:3.5,d:1},{x:-2,z:-9,w:1,h:4,d:1},{x:7,z:-8,w:0.9,h:3,d:0.9},
      {x:-7,z:8,w:0.9,h:3,d:0.9},{x:12,z:-2,w:0.8,h:2.5,d:0.8},{x:-12,z:2,w:0.8,h:2.5,d:0.8},
    ];
    bData.forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, bMat);
      mesh.position.set(b.x, b.h / 2, b.z); scene.add(mesh);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xFF6500, transparent: true, opacity: 0.22 });
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      edges.position.copy(mesh.position); scene.add(edges);
    });
    const routeDefs = [
      [new THREE.Vector3(-18,0.06,0), new THREE.Vector3(18,0.06,0)],
      [new THREE.Vector3(0,0.06,-18), new THREE.Vector3(0,0.06,18)],
      [new THREE.Vector3(-14,0.06,-8),new THREE.Vector3(14,0.06,8)],
      [new THREE.Vector3(-12,5,-4),   new THREE.Vector3(12,5,4)],
    ];
    const routeMat = new THREE.LineBasicMaterial({ color: 0xFF6500, transparent: true, opacity: 0.65 });
    routeDefs.forEach(pts => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), routeMat)));
    const podGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const podMat = new THREE.MeshBasicMaterial({ color: 0xFF6500 });
    const pods = routeDefs.map(pts => {
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.userData = { pts, t: Math.random(), speed: 0.003 + Math.random() * 0.004, dir: Math.random() > 0.5 ? 1 : -1 };
      scene.add(pod); return pod;
    });
    const PC = 900;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PC * 3);
    for (let i = 0; i < PC; i++) {
      pPos[i*3]=(Math.random()-0.5)*70; pPos[i*3+1]=Math.random()*30+0.5; pPos[i*3+2]=(Math.random()-0.5)*70;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color:0xFF7A20, size:0.07, transparent:true, opacity:0.45 }));
    scene.add(particles);
    let mx = 0, my = 0;
    const onMove = e => { mx = e.clientX/window.innerWidth-0.5; my = e.clientY/window.innerHeight-0.5; };
    window.addEventListener("mousemove", onMove);
    const onResize = () => {
      const nw = container.clientWidth, nh = container.clientHeight;
      renderer.setSize(nw, nh); camera.aspect = nw/nh; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);
    let t = 0, raf;
    const tick = () => {
      raf = requestAnimationFrame(tick); t += 0.01;
      orangePt.intensity = 5 + Math.sin(t * 1.8) * 1.2;
      pods.forEach(p => {
        p.userData.t += p.userData.speed * p.userData.dir;
        if (p.userData.t >= 1) { p.userData.t = 1; p.userData.dir = -1; }
        if (p.userData.t <= 0) { p.userData.t = 0; p.userData.dir =  1; }
        p.position.lerpVectors(p.userData.pts[0], p.userData.pts[1], p.userData.t);
      });
      particles.rotation.y += 0.00025;
      camera.position.x += (28 + mx * 5 - camera.position.x) * 0.04;
      camera.position.y += (20 - my * 4 - camera.position.y) * 0.04;
      camera.lookAt(0, 2, 0);
      renderer.render(scene, camera);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── Static data ──────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Gamepad2, title: "Quest Engine",   sub: "GAMEPLAY",    desc: "Turn every commute, workout, and meal into a live mission. Dynamic XP for real-world actions." },
  { Icon: Trophy,   title: "Win Real Value", sub: "REWARDS",     desc: "Compete city-wide and globally. Prizes, crypto drops, and exclusive status tiers await." },
  { Icon: Users,    title: "Squad Dynamics", sub: "SOCIAL",      desc: "Assemble your crew. Shared quests, collaborative leaderboards, and guild warfare." },
  { Icon: Zap,      title: "Instant XDrop",  sub: "ECONOMY",     desc: "On-chain reward settlement. Earn, trade, and own your in-game assets — no middleman." },
  { Icon: Map,      title: "Live City Map",  sub: "EXPLORATION", desc: "An AR-powered map layer over your city. Hotspots, dungeons, and hidden loot in the real world." },
  { Icon: Cpu,      title: "AI Companion",   sub: "INTELLIGENCE",desc: "Your personal quest AI. Learns your play style and customizes challenges in real time." },
];
const STATS = [
  { v: "2.4M+", l: "Active Players" },
  { v: "$68M",  l: "Rewards Paid Out" },
  { v: "190+",  l: "Cities Live" },
  { v: "4.97★", l: "App Store Rating" },
];
const ECOSYSTEM = [
  { tag: "GOVERNANCE", title: "Vote on quests & city expansions with your GFL tokens." },
  { tag: "STAKING",    title: "Lock XP to multiply your reward multiplier up to 10×." },
  { tag: "NFT LOOT",   title: "Discover rare digital artifacts tied to real locations." },
  { tag: "GUILDS",     title: "Form guilds, claim city districts, earn passive yield." },
];

// ─── MockQR ───────────────────────────────────────────────────────────────────
function MockQR({ seed = "default", size = 130 }) {
  const cells = 17;
  const hash = seed.split("").reduce((a, c, i) => (a + c.charCodeAt(0) * (i + 1)) | 0, 0);
  const isDark = (r, c) => {
    if (r < 7 && c < 7) return r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4);
    if (r < 7 && c >= cells-7) { const lc=c-(cells-7); return r===0||r===6||lc===0||lc===6||(r>=2&&r<=4&&lc>=2&&lc<=4); }
    if (r >= cells-7 && c < 7) { const lr=r-(cells-7); return lr===0||lr===6||c===0||c===6||(lr>=2&&lr<=4&&c>=2&&c<=4); }
    return ((r*13+c*7+hash+r*c)%3) !== 0;
  };
  const cellPx = (size - 16) / cells;
  return (
    <div style={{ background:"#fff", padding:8, borderRadius:10, display:"inline-block", boxShadow:"0 4px 24px rgba(0,0,0,0.5)" }}>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cells}, ${cellPx}px)`, gridTemplateRows:`repeat(${cells}, ${cellPx}px)` }}>
        {Array.from({ length: cells*cells }, (_, i) => {
          const r = Math.floor(i/cells), c = i%cells;
          return <div key={i} style={{ background: isDark(r,c) ? "#0a0a0a" : "#fff" }} />;
        })}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type="success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  const isErr = type === "error";
  return (
    <div style={{
      position:"fixed", bottom:28, right:28, zIndex:9999,
      display:"flex", alignItems:"center", gap:10,
      background: isErr ? "rgba(43,13,13,0.97)" : "rgba(13,43,26,0.97)",
      border:`1px solid ${isErr ? "rgba(255,80,80,0.3)" : "rgba(0,255,136,0.3)"}`,
      borderRadius:10, padding:"12px 18px",
      color: isErr ? "#FF7070" : "#00FF88",
      fontSize:"0.85rem", fontWeight:500,
      animation:"fadeIn 0.3s ease",
      boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
      maxWidth:320,
    }}>
      {isErr ? <AlertCircle size={15}/> : <Check size={15}/>}
      {message}
    </div>
  );
}

// ─── WalletModal ──────────────────────────────────────────────────────────────
function WalletModal({ onClose, onConnect, hasMetaMask }) {
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState(null);

  const handleMM = async () => {
    setConnecting(true); setErr(null);
    const result = await onConnect();
    setConnecting(false);
    if (result && result.error) {
      setErr(
        result.error === "no_metamask"      ? "MetaMask not detected. Please install the browser extension." :
        result.error === "user_rejected"    ? "Connection rejected. Please try again." :
                                              "Connection failed. Please try again."
      );
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box glass" onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:420, borderRadius:20, padding:"32px 28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div>
            <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"1.1rem" }}>Connect Wallet</div>
            <div style={{ color:T.secondary, fontSize:"0.8rem", marginTop:4 }}>Choose your wallet provider</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.secondary, cursor:"pointer", padding:4 }}><X size={20}/></button>
        </div>

        {err && (
          <div style={{ background:"rgba(255,80,80,0.08)", border:"1px solid rgba(255,80,80,0.22)", borderRadius:8, padding:"10px 14px", color:"#FF8080", fontSize:"0.82rem", marginBottom:16, display:"flex", gap:8, alignItems:"flex-start" }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:2 }}/>{err}
          </div>
        )}

        <button className="wallet-btn" onClick={handleMM} disabled={connecting} style={{ marginBottom:10, color:T.primary }}>
          <div style={{ width:40, height:40, borderRadius:10, background:"#F6851B", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>&#x1F98A;</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:"0.92rem" }}>MetaMask</div>
            <div style={{ color:T.secondary, fontSize:"0.75rem" }}>{hasMetaMask ? "Browser extension detected" : "Install extension required"}</div>
          </div>
          {connecting && <RefreshCw size={16} className="spin" style={{ color:T.accent }}/>}
        </button>

        <button className="wallet-btn" disabled style={{ marginBottom:10, color:T.secondary }}>
          <div style={{ width:40, height:40, borderRadius:10, background:"#3B99FC", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>&#x1F517;</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:"0.92rem", color:T.primary }}>WalletConnect</div>
            <div style={{ fontSize:"0.75rem" }}>Coming soon</div>
          </div>
        </button>

        <button className="wallet-btn" disabled style={{ color:T.secondary }}>
          <div style={{ width:40, height:40, borderRadius:10, background:"#0052FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", fontWeight:700, color:"#fff", flexShrink:0 }}>C</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:"0.92rem", color:T.primary }}>Coinbase Wallet</div>
            <div style={{ fontSize:"0.75rem" }}>Coming soon</div>
          </div>
        </button>

        <p style={{ textAlign:"center", color:T.muted, fontSize:"0.7rem", marginTop:22, lineHeight:1.65 }}>
          By connecting you agree to our Terms &amp; Privacy Policy.<br/>GamefiLyfe never stores your private keys.
        </p>
      </div>
    </div>
  );
}

// ─── PaymentStep ──────────────────────────────────────────────────────────────
function PaymentStep({ token, plan, wallet, txStatus, txHash, txError, onCopy, copied, onEVMPay, onManualConfirm, onConnectWallet, onClose }) {
  const amount = usdToTokenAmount(plan.price, token);
  const isEVM = token.network === "evm";
  const isBTC = token.network === "btc";
  const isXRP = token.network === "xrp";

  if (txStatus === "success") return (
    <div style={{ textAlign:"center", padding:"20px 0" }}>
      <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(0,255,136,0.1)", border:"2px solid rgba(0,255,136,0.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", animation:"successPop 0.5s cubic-bezier(.22,.68,0,1.2) both" }}>
        <CheckCircle size={38} color="#00FF88"/>
      </div>
      <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:800, fontSize:"1.4rem", marginBottom:10 }}>Payment Confirmed!</div>
      <p style={{ color:T.secondary, fontSize:"0.88rem", lineHeight:1.7, maxWidth:"34ch", margin:"0 auto 24px" }}>
        You're now a <span style={{ color:T.primary, fontWeight:600 }}>{plan.name}</span> player. Your quest engine activates shortly.
      </p>
      {txHash && (
        <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:6, color:T.accent, fontSize:"0.78rem", textDecoration:"none", marginBottom:20 }}>
          View on Etherscan <ExternalLink size={12}/>
        </a>
      )}
      <button className="btn-acc" onClick={onClose} style={{ width:"100%", justifyContent:"center", marginTop:12 }}>Start Playing <ArrowRight size={16}/></button>
    </div>
  );

  if (txStatus === "confirming") return (
    <div style={{ textAlign:"center", padding:"24px 0" }}>
      <div style={{ width:80, height:80, borderRadius:"50%", background:T.accentDim, border:`2px solid rgba(255,101,0,0.3)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
        <RefreshCw size={36} color={T.accent} className="spin"/>
      </div>
      <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"1.05rem", marginBottom:10 }}>Confirming Payment…</div>
      <p style={{ color:T.secondary, fontSize:"0.84rem", lineHeight:1.7 }}>Waiting for blockchain confirmation. This usually takes 15–60 seconds.</p>
      {txHash && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:"0.68rem", color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Tx Hash</div>
          <div className="address-box" style={{ fontSize:"0.68rem", paddingRight:16 }}>{txHash.slice(0,22)}…{txHash.slice(-14)}</div>
        </div>
      )}
    </div>
  );

  if (txStatus === "failed") return (
    <div style={{ textAlign:"center", padding:"24px 0" }}>
      <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(255,80,80,0.09)", border:"2px solid rgba(255,80,80,0.28)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
        <AlertCircle size={38} color="#FF5050"/>
      </div>
      <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"1.05rem", marginBottom:10, color:"#FF6060" }}>Transaction Failed</div>
      <p style={{ color:T.secondary, fontSize:"0.84rem", lineHeight:1.7, marginBottom:24 }}>{txError || "Something went wrong. Please try again."}</p>
      <button className="btn-acc" onClick={onEVMPay} style={{ width:"100%", justifyContent:"center" }}>Try Again</button>
    </div>
  );

  return (
    <div>
      {/* Amount banner */}
      <div style={{ background:token.bg, border:`1px solid ${token.color}50`, borderRadius:12, padding:"18px 22px", marginBottom:22, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:"0.7rem", color:T.muted, marginBottom:4 }}>Amount Due</div>
          <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:800, fontSize:"1.25rem", color:token.color }}>{amount.display}</div>
          <div style={{ fontSize:"0.7rem", color:T.secondary, marginTop:2 }}>≈ ${plan.price} USD · {plan.name} Plan</div>
        </div>
        <div style={{ fontSize:"2.4rem", color:token.color }}>{token.icon}</div>
      </div>

      {/* EVM (ETH / USDC / USDT / USD1) */}
      {isEVM && (
        <>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:"0.68rem", color:T.muted, marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase" }}>Payment Address (Ethereum)</div>
            <div className="address-box">{EVM_RECEIVER}
              <button className="copy-btn" onClick={() => onCopy(EVM_RECEIVER)}>
                {copied ? <><Check size={11}/>Copied!</> : <><Copy size={11}/>Copy</>}
              </button>
            </div>
          </div>
          {!wallet.connected ? (
            <button className="btn-acc" onClick={onConnectWallet} style={{ width:"100%", justifyContent:"center", marginBottom:10 }}>
              <Wallet size={15}/> Connect Wallet to Pay
            </button>
          ) : (
            <button className="btn-acc" onClick={onEVMPay} disabled={txStatus==="sending"} style={{ width:"100%", justifyContent:"center", marginBottom:10 }}>
              {txStatus==="sending" ? <><RefreshCw size={14} className="spin"/>Broadcasting…</> : <>&#x1F98A; Pay with MetaMask</>}
            </button>
          )}
          <div style={{ textAlign:"center", color:T.muted, fontSize:"0.7rem", marginBottom:14 }}>or copy address and send manually</div>
          <div style={{ background:"rgba(255,200,0,0.05)", border:"1px solid rgba(255,200,0,0.18)", borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start", color:"#FFD060", fontSize:"0.74rem" }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }}/>
            Ensure you're on <strong style={{ margin:"0 3px" }}>Ethereum Mainnet</strong>. Only send {token.symbol} to this address.
          </div>
        </>
      )}

      {/* BTC */}
      {isBTC && (
        <>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><MockQR seed={token.address} size={130}/></div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:"0.68rem", color:T.muted, marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase" }}>Bitcoin Address (Bech32)</div>
            <div className="address-box">{token.address}
              <button className="copy-btn" onClick={() => onCopy(token.address)}>{copied?<><Check size={11}/>Copied!</>:<><Copy size={11}/>Copy</>}</button>
            </div>
          </div>
          <button className="btn-acc" onClick={onManualConfirm} style={{ width:"100%", justifyContent:"center", marginBottom:12 }}>
            <Check size={15}/> I've Sent the Payment
          </button>
          <div style={{ background:"rgba(247,147,26,0.06)", border:"1px solid rgba(247,147,26,0.2)", borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start", color:"#F7931A", fontSize:"0.74rem" }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }}/>
            Send exactly <strong style={{ margin:"0 3px" }}>{amount.display}</strong> to the address above. BTC confirmations typically take 10–30 minutes.
          </div>
        </>
      )}

      {/* XRP */}
      {isXRP && (
        <>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><MockQR seed={token.address} size={130}/></div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:"0.68rem", color:T.muted, marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase" }}>XRP Address</div>
            <div className="address-box">{token.address}
              <button className="copy-btn" onClick={() => onCopy(token.address)}>{copied?<><Check size={11}/>Copied!</>:<><Copy size={11}/>Copy</>}</button>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:"0.68rem", color:"#FF6060", marginBottom:8, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:700 }}>Destination Tag (Required)</div>
            <div className="address-box" style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, color:T.accent, paddingRight:80 }}>{token.destTag}
              <button className="copy-btn" onClick={() => onCopy(token.destTag)}>{copied?<><Check size={11}/>Copied!</>:<><Copy size={11}/>Copy</>}</button>
            </div>
          </div>
          <button className="btn-acc" onClick={onManualConfirm} style={{ width:"100%", justifyContent:"center", marginBottom:12 }}>
            <Check size={15}/> I've Sent the Payment
          </button>
          <div style={{ background:"rgba(0,170,228,0.06)", border:"1px solid rgba(0,170,228,0.2)", borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start", color:"#00AAE4", fontSize:"0.74rem" }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }}/>
            <strong>Always include the Destination Tag.</strong>&nbsp;Omitting it may result in permanent loss of funds.
          </div>
        </>
      )}
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────
function PaymentModal({ initialPlan, onClose, wallet, onConnectWallet }) {
  const [step, setStep]               = useState(initialPlan ? "currency" : "plan");
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [txStatus, setTxStatus]       = useState("idle");
  const [txHash, setTxHash]           = useState(null);
  const [txError, setTxError]         = useState(null);
  const [copied, setCopied]           = useState(false);

  const tokenList = Object.values(TOKENS);
  const steps = initialPlan ? ["currency","payment"] : ["plan","currency","payment"];
  const stepIdx = steps.indexOf(step);

  const handleCopy = (text) => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const handleEVMPay = async () => {
    if (!wallet.connected) { onConnectWallet(); return; }
    setTxStatus("sending");
    try {
      const { hex } = usdToTokenAmount(selectedPlan.price, selectedToken);
      const hash = await sendEVMPayment(selectedToken, hex, wallet.address);
      setTxHash(hash);
      setTxStatus("confirming");
      setTimeout(() => setTxStatus("success"), 6000);
    } catch (err) {
      setTxError(err.code === 4001 ? "Transaction rejected by user." : (err.message || "Transaction failed."));
      setTxStatus("failed");
    }
  };

  const handleManualConfirm = () => { setTxStatus("confirming"); setTimeout(() => setTxStatus("success"), 4000); };

  const stepTitles = { plan:"Choose Your Plan", currency:"Select Currency", payment:"Complete Payment" };
  const isTerminal = ["success","confirming","failed"].includes(txStatus);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box glass" onClick={e => e.stopPropagation()}
        style={{ width:"100%", maxWidth:520, borderRadius:20, overflow:"hidden", maxHeight:"92vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        {!isTerminal && (
          <div style={{ padding:"20px 26px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              {stepIdx > 0 && txStatus==="idle" && (
                <button onClick={() => { setStep(steps[stepIdx-1]); setTxStatus("idle"); setTxError(null); }}
                  style={{ background:"none", border:"none", color:T.secondary, cursor:"pointer", fontSize:"0.82rem", padding:0 }}>← Back</button>
              )}
              <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"0.92rem" }}>{stepTitles[step]}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ display:"flex", gap:4 }}>
                {steps.map((s,i) => <div key={s} style={{ width:i<=stepIdx?18:6, height:5, borderRadius:3, background:i<=stepIdx?T.accent:T.muted, transition:"width 0.3s,background 0.3s" }}/>)}
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", color:T.secondary, cursor:"pointer", padding:4 }}><X size={17}/></button>
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ padding:"26px 26px", overflowY:"auto", flex:1 }}>

          {/* SELECT PLAN */}
          {step==="plan" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {PLANS.map(p => (
                <div key={p.id} className="plan-card-w3"
                  onClick={() => { setSelectedPlan(p); setStep("currency"); }}
                  style={{ background:p.highlight?T.accentDim:T.bgRaised, border:`1px solid ${p.highlight?"rgba(255,101,0,0.4)":T.border}`, borderRadius:12, padding:"20px 22px", cursor:"pointer", boxShadow:p.highlight?"0 0 30px rgba(255,101,0,0.1)":"none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <span style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:p.highlight?T.accent:T.muted }}>{p.tag}</span>
                      <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"1rem", marginTop:4 }}>{p.name}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:800, fontSize:"1.5rem", color:p.highlight?T.accent:T.primary }}>${p.price}</div>
                      <div style={{ fontSize:"0.68rem", color:T.muted }}>/month</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {p.perks.slice(0,3).map(pk=><span key={pk} style={{ fontSize:"0.7rem", color:T.secondary, background:"rgba(255,255,255,0.04)", borderRadius:4, padding:"3px 8px", border:`1px solid ${T.border}` }}>{pk}</span>)}
                    {p.perks.length>3 && <span style={{ fontSize:"0.7rem", color:T.accent }}>+{p.perks.length-3} more</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SELECT CURRENCY */}
          {step==="currency" && (
            <div>
              {selectedPlan && (
                <div style={{ background:T.bgRaised, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:T.secondary, fontSize:"0.82rem" }}>{selectedPlan.name} Plan</span>
                  <span style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, color:T.accent }}>${selectedPlan.price}/mo</span>
                </div>
              )}
              <div style={{ fontSize:"0.78rem", color:T.secondary, marginBottom:14 }}>Select your preferred cryptocurrency:</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:22 }}>
                {tokenList.map(token => (
                  <div key={token.id} className="crypto-opt"
                    onClick={() => setSelectedToken(token)}
                    style={{ background:selectedToken?.id===token.id?token.bg:T.bgRaised, border:`1px solid ${selectedToken?.id===token.id?token.color+"70":T.border}`, borderRadius:12, padding:"16px 10px", textAlign:"center", boxShadow:selectedToken?.id===token.id?`0 0 22px ${token.color}28`:"none" }}>
                    <div style={{ fontSize:"1.8rem", marginBottom:5, color:token.color }}>{token.icon}</div>
                    <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"0.68rem", color:T.primary }}>{token.symbol}</div>
                    <div style={{ fontSize:"0.6rem", color:T.muted, marginTop:2 }}>{token.name.split(" ")[0]}</div>
                    {RATES[token.id]!==1 && <div style={{ fontSize:"0.58rem", color:T.secondary, marginTop:4 }}>${RATES[token.id]>=1000?(RATES[token.id]/1000).toFixed(1)+"K":RATES[token.id]}</div>}
                  </div>
                ))}
              </div>
              {selectedToken && selectedPlan && (
                <div style={{ background:"rgba(255,101,0,0.06)", border:"1px solid rgba(255,101,0,0.14)", borderRadius:10, padding:"14px 18px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div><div style={{ fontSize:"0.7rem", color:T.muted, marginBottom:2 }}>You'll pay</div><div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, color:T.accent }}>{usdToTokenAmount(selectedPlan.price,selectedToken).display}</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:"0.7rem", color:T.muted, marginBottom:2 }}>USD Value</div><div style={{ fontWeight:600 }}>${selectedPlan.price}</div></div>
                </div>
              )}
              <button className="btn-acc" disabled={!selectedToken} onClick={() => selectedToken && setStep("payment")} style={{ width:"100%", justifyContent:"center", opacity:selectedToken?1:0.45, cursor:selectedToken?"pointer":"not-allowed" }}>
                Continue to Payment <ArrowRight size={15}/>
              </button>
            </div>
          )}

          {/* PAYMENT */}
          {step==="payment" && selectedToken && selectedPlan && (
            <PaymentStep
              token={selectedToken} plan={selectedPlan} wallet={wallet}
              txStatus={txStatus} txHash={txHash} txError={txError}
              copied={copied} onCopy={handleCopy}
              onEVMPay={handleEVMPay} onManualConfirm={handleManualConfirm}
              onConnectWallet={onConnectWallet} onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PricingSection ───────────────────────────────────────────────────────────
function PricingSection({ onSelectPlan }) {
  return (
    <section style={{ padding:"clamp(6rem,12vw,13rem) clamp(1.5rem,5vw,5rem)", maxWidth:1280, margin:"0 auto" }}>
      <div className="reveal" style={{ textAlign:"center", marginBottom:56 }}>
        <span className="section-tag" style={{ display:"inline-block" }}>Pricing</span>
        <h2 style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(2.2rem,5vw,4.5rem)", fontWeight:800, letterSpacing:"-0.03em", lineHeight:0.95, marginBottom:16 }}>
          Pay with <span className="orange-grad">Crypto</span>
        </h2>
        <p style={{ color:T.secondary, fontSize:"0.96rem", maxWidth:"46ch", margin:"0 auto 28px", lineHeight:1.75 }}>
          Fully on-chain payments. No credit cards required. Every plan billed monthly — cancel anytime.
        </p>
        {/* Token badges */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
          {Object.values(TOKENS).map(t => (
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:5, background:t.bg, border:`1px solid ${t.color}40`, borderRadius:20, padding:"5px 12px" }}>
              <span style={{ color:t.color, fontSize:"0.88rem" }}>{t.icon}</span>
              <span style={{ fontSize:"0.68rem", fontWeight:700, fontFamily:"Orbitron,sans-serif", color:t.color }}>{t.symbol}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(272px,1fr))", gap:20, alignItems:"start" }}>
        {PLANS.map((plan,i) => (
          <div key={plan.id} className="reveal plan-card-w3"
            style={{ transitionDelay:`${i*0.1}s`, background:plan.highlight?T.accentDim:T.bgSurface, border:`1px solid ${plan.highlight?"rgba(255,101,0,0.42)":T.border}`, borderRadius:18, padding:"34px 28px", position:"relative", overflow:"hidden", boxShadow:plan.highlight?"0 0 50px rgba(255,101,0,0.12),0 24px 48px rgba(0,0,0,0.4)":"none" }}>
            {plan.highlight && (
              <div style={{ position:"absolute", top:22, right:-26, background:T.accent, color:"#07090B", fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", padding:"5px 34px", transform:"rotate(45deg)" }}>Most Popular</div>
            )}
            <span style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", color:plan.highlight?T.accent:T.muted }}>{plan.tag}</span>
            <div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:800, fontSize:"1.3rem", marginTop:10, marginBottom:6 }}>{plan.name}</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, marginBottom:6 }}>
              <span style={{ fontFamily:"Orbitron,sans-serif", fontWeight:900, fontSize:"2.8rem", lineHeight:1, color:plan.highlight?T.accent:T.primary }}>${plan.price}</span>
              <span style={{ color:T.muted, fontSize:"0.82rem", marginBottom:7 }}>/month</span>
            </div>
            <div style={{ height:1, background:T.border, margin:"18px 0" }}/>
            <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:9, marginBottom:26 }}>
              {plan.perks.map(pk => (
                <li key={pk} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:"0.86rem", color:T.secondary }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, background:plan.highlight?T.accentDim:"rgba(255,255,255,0.05)", border:`1px solid ${plan.highlight?"rgba(255,101,0,0.3)":T.border}`, display:"flex", alignItems:"center", justifyContent:"center", marginTop:1 }}>
                    <Check size={9} color={plan.highlight?T.accent:T.muted}/>
                  </div>
                  {pk}
                </li>
              ))}
            </ul>
            <button className={plan.highlight?"btn-acc":"btn-ghost"} onClick={() => onSelectPlan(plan)} style={{ width:"100%", justifyContent:"center" }}>
              Pay with Crypto <ArrowRight size={14}/>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function GamefiLyfeWeb3() {
  const mountRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ open: false, plan: null });
  const [toast, setToast] = useState(null);
  const { wallet, connect, disconnect } = useWallet();

  useCityScene(mountRef);
  useReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);

  const handleConnectWallet = async () => {
    const result = await connect();
    if (result && result.error) {
      setToast({
        message: result.error === "no_metamask" ? "MetaMask not detected — please install the extension" :
                 result.error === "user_rejected" ? "Wallet connection rejected" : "Connection failed",
        type: "error",
      });
    }
    return result;
  };

  const openPaymentModal = (plan = null) => setPaymentModal({ open: true, plan });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bgVoid, color:T.primary, overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* ── Modals ── */}
      {walletModalOpen && (
        <WalletModal
          onClose={() => setWalletModalOpen(false)}
          onConnect={async () => { const r = await handleConnectWallet(); setWalletModalOpen(false); return r; }}
          hasMetaMask={hasMetaMask}
        />
      )}
      {paymentModal.open && (
        <PaymentModal
          initialPlan={paymentModal.plan}
          onClose={() => setPaymentModal({ open:false, plan:null })}
          wallet={wallet}
          onConnectWallet={() => setWalletModalOpen(true)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)}/>}

      {/* ── NAV ── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 clamp(1.5rem,5vw,5rem)", height:70, background:scrolled?"rgba(7,9,11,0.94)":"transparent", borderBottom:scrolled?`1px solid ${T.border}`:"1px solid transparent", backdropFilter:scrolled?"blur(24px)":"none", transition:"background 0.35s,border-color 0.35s" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:9, background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`, boxShadow:glowSm, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontFamily:"Orbitron,sans-serif", fontWeight:900, fontSize:"1rem", color:"#07090B" }}>G</span>
          </div>
          <span style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"1rem", letterSpacing:"0.04em" }}>game<span style={{ color:T.accent }}>fi</span>lyfe</span>
        </div>
        {/* Nav links */}
        <div className="hide-mobile" style={{ display:"flex", gap:36 }}>
          {["Features","Ecosystem","Pricing","Docs"].map(l => <a key={l} href="#" className="nav-link">{l}</a>)}
        </div>
        {/* Wallet / CTA */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {wallet.connected ? (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:7, background:T.bgRaised, border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 13px", fontSize:"0.78rem" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#00FF88", boxShadow:"0 0 6px #00FF88" }}/>
                <span style={{ fontFamily:"monospace", color:T.primary }}>{shortAddr(wallet.address)}</span>
              </div>
              <button onClick={disconnect} className="btn-ghost hide-mobile" style={{ padding:"8px 14px", fontSize:"0.75rem" }}>Disconnect</button>
              <button className="btn-acc" style={{ padding:"10px 22px", fontSize:"0.78rem" }} onClick={() => openPaymentModal()}>
                Subscribe
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setWalletModalOpen(true)} className="btn-ghost hide-mobile" style={{ padding:"10px 20px", fontSize:"0.78rem" }}>
                <Wallet size={14}/> Connect
              </button>
              <button className="btn-acc" style={{ padding:"10px 22px", fontSize:"0.78rem" }} onClick={() => openPaymentModal()}>
                Get Early Access
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:"relative", height:"100vh", minHeight:680, overflow:"hidden" }}>
        <div ref={mountRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}/>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(to bottom,rgba(7,9,11,0.15) 0%,rgba(7,9,11,0.4) 50%,rgba(7,9,11,1) 100%)" }}/>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 80% 60% at 50% 70%,rgba(255,101,0,0.06) 0%,transparent 70%)" }}/>
        <div className="scan-line"/>

        {/* Floating Cards */}
        <div className="hero-cards">
          <div className="float-a" style={{ position:"absolute", top:"22%", right:"6%", zIndex:10, width:210 }}>
            <div className="glass" style={{ padding:"18px 22px" }}>
              <span className="section-tag" style={{ marginBottom:10 }}>Live Activity</span>
              <div style={{ fontSize:"2rem", fontFamily:"Orbitron,sans-serif", fontWeight:700, lineHeight:1 }}>47,293</div>
              <div style={{ fontSize:"0.76rem", color:T.secondary, marginTop:4 }}>Players Online Now</div>
              <div style={{ marginTop:14, height:3, background:T.bgRaised, borderRadius:2, overflow:"hidden" }}>
                <div style={{ width:"76%", height:"100%", borderRadius:2, background:`linear-gradient(90deg,${T.accent},${T.accentAlt})` }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <span style={{ fontSize:"0.65rem", color:T.muted }}>Server load</span>
                <span style={{ fontSize:"0.65rem", color:T.accent }}>76%</span>
              </div>
            </div>
          </div>
          <div className="float-b" style={{ position:"absolute", top:"38%", left:"4%", zIndex:10, width:196 }}>
            <div className="glass" style={{ padding:"16px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", boxShadow:glowSm, flexShrink:0 }}>&#x26A1;</div>
                <div><div style={{ fontSize:"0.72rem", color:T.secondary, marginBottom:2 }}>XP Earned</div><div style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"1rem", color:T.accent }}>+1,840</div></div>
              </div>
              <div style={{ fontSize:"0.75rem", color:T.primary, fontWeight:500 }}>City Explorer Quest</div>
              <div style={{ fontSize:"0.67rem", color:T.muted, marginTop:2 }}>2 minutes ago · Tier S</div>
            </div>
          </div>
          <div className="float-c" style={{ position:"absolute", bottom:"22%", right:"10%", zIndex:10, width:200 }}>
            <div className="glass" style={{ padding:"16px 20px" }}>
              <span className="section-tag" style={{ marginBottom:10 }}>Leaderboard</span>
              {[{rank:"01",name:"xNova_7",xp:"98.4K"},{rank:"02",name:"Lyfe_Blaze",xp:"91.2K"},{rank:"03",name:"UrbanGhost",xp:"87.6K"}].map(p=>(
                <div key={p.rank} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:"0.62rem", color:T.accent, fontFamily:"Orbitron,sans-serif", fontWeight:700 }}>{p.rank}</span>
                    <span style={{ fontSize:"0.76rem", color:T.primary }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize:"0.7rem", color:T.secondary }}>{p.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ position:"absolute", bottom:"12%", left:0, right:0, zIndex:10, textAlign:"center", padding:"0 clamp(1.5rem,5vw,5rem)" }}>
          <span className="section-tag hero-in" style={{ display:"inline-block" }}>The World's First Gamified Super App</span>
          <h1 className="hero-in d1 glitch" style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(3rem,9vw,8.5rem)", fontWeight:900, letterSpacing:"-0.03em", lineHeight:0.9, marginBottom:22, color:T.primary }}>
            LEVEL UP<br/><span className="orange-grad">YOUR LIFE</span>
          </h1>
          <p className="hero-in d2" style={{ fontSize:"clamp(0.95rem,1.8vw,1.15rem)", color:T.secondary, maxWidth:"52ch", margin:"0 auto 36px", lineHeight:1.75 }}>
            GamefiLyfe overlays a live quest engine on your real world. Every street, every habit, every choice — earn XP, win rewards, own your journey.
          </p>
          <div className="hero-in d3" style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-acc" style={{ fontSize:"0.9rem", padding:"15px 34px" }} onClick={() => openPaymentModal()}>
              Start Playing — Free <ArrowRight size={16}/>
            </button>
            <button className="btn-ghost" style={{ fontSize:"0.9rem", padding:"15px 34px" }}>Explore the Map</button>
          </div>
          <div className="hero-in d4" style={{ marginTop:28, display:"flex", gap:6, justifyContent:"center", alignItems:"center" }}>
            <div style={{ display:"flex" }}>
              {["\u{1F7E0}","\u{1F535}","\u{1F7E3}","\u{1F7E2}","⚫"].map((c,i)=>(
                <div key={i} style={{ width:26, height:26, borderRadius:"50%", background:T.bgRaised, border:`2px solid ${T.bgVoid}`, marginLeft:i>0?-8:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.55rem" }}>{c}</div>
              ))}
            </div>
            <span style={{ fontSize:"0.78rem", color:T.secondary, marginLeft:6 }}>Joined by <span style={{ color:T.primary, fontWeight:600 }}>2.4M+ players</span> worldwide</span>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position:"absolute", bottom:26, left:"50%", transform:"translateX(-50%)", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <div style={{ width:1, height:44, background:`linear-gradient(to bottom,${T.accent},transparent)` }}/>
          <span style={{ fontSize:"0.58rem", color:T.accent, letterSpacing:"0.25em", textTransform:"uppercase" }}>Scroll</span>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, background:T.bgSurface }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(3rem,7vw,7rem) clamp(1.5rem,5vw,5rem)", display:"flex", justifyContent:"space-around", alignItems:"center", flexWrap:"wrap", gap:40 }}>
          {STATS.map((s,i) => (
            <div key={i} className="reveal" style={{ textAlign:"center", transitionDelay:`${i*0.1}s` }}>
              <div style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(2.2rem,5vw,4.2rem)", fontWeight:800, letterSpacing:"-0.02em", lineHeight:1, background:`linear-gradient(120deg,${T.accent},${T.accentAlt},#FFBA6A)`, backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>{s.v}</div>
              <div style={{ fontSize:"0.7rem", color:T.muted, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600, marginTop:8 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding:"clamp(6rem,12vw,13rem) clamp(1.5rem,5vw,5rem)", maxWidth:1280, margin:"0 auto" }}>
        <div className="reveal" style={{ marginBottom:64 }}>
          <span className="section-tag">Core Features</span>
          <h2 style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(2.2rem,5vw,4.8rem)", fontWeight:800, letterSpacing:"-0.03em", lineHeight:0.95, maxWidth:"16ch" }}>
            Everything<br/>in one<br/><span className="orange-grad">arena</span>
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(288px,1fr))", gap:18 }}>
          {FEATURES.map((f,i) => (
            <div key={i} className="reveal card-hover" style={{ background:T.bgSurface, border:`1px solid ${T.border}`, borderRadius:14, padding:"32px 28px", transitionDelay:`${i*0.07}s`, cursor:"pointer" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <div style={{ width:50, height:50, borderRadius:11, background:T.accentDim, border:`1px solid rgba(255,101,0,0.18)`, display:"flex", alignItems:"center", justifyContent:"center", color:T.accent }}><f.Icon size={22}/></div>
                <span style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, paddingTop:2 }}>{f.sub}</span>
              </div>
              <h3 style={{ fontFamily:"Orbitron,sans-serif", fontSize:"1rem", fontWeight:700, marginBottom:12, letterSpacing:"0.02em" }}>{f.title}</h3>
              <p style={{ fontSize:"0.9rem", color:T.secondary, lineHeight:1.72 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHOWCASE ── */}
      <section style={{ padding:"clamp(4rem,10vw,10rem) clamp(1.5rem,5vw,5rem)", maxWidth:1280, margin:"0 auto" }}>
        <div className="showcase-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"clamp(3rem,6vw,8rem)", alignItems:"center" }}>
          <div>
            <span className="section-tag reveal">The Ecosystem</span>
            <h2 className="reveal" style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(2rem,4vw,4rem)", fontWeight:800, letterSpacing:"-0.03em", lineHeight:0.95, marginBottom:28 }}>
              Your city is<br/>your<br/><span className="orange-grad">playground</span>
            </h2>
            <p className="reveal" style={{ color:T.secondary, lineHeight:1.82, fontSize:"0.98rem", maxWidth:"44ch", marginBottom:36 }}>An immersive quest layer maps over your real city. Every street, park, and neighborhood is alive with missions, loot, and rival players — all powered by on-chain economics.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {["Real-world AR quests & missions","On-chain GFL token economy","City-district ownership NFTs","Live AI-matched quest events"].map((item,i)=>(
                <div key={i} className="reveal" style={{ display:"flex", alignItems:"center", gap:12, transitionDelay:`${i*0.08}s` }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:T.accent, flexShrink:0, boxShadow:glowSm }}/>
                  <span style={{ color:T.secondary, fontSize:"0.92rem" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Map card */}
          <div className="reveal" style={{ position:"relative", height:480 }}>
            <div className="glass" style={{ position:"absolute", inset:0, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"Orbitron,sans-serif", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:T.accent }}>Live Map</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#00FF88", boxShadow:"0 0 6px #00FF88" }}/>
                  <span style={{ fontSize:"0.68rem", color:T.secondary }}>San Francisco, CA</span>
                </div>
              </div>
              <div style={{ flex:1, position:"relative", background:"#08090E", overflow:"hidden" }}>
                {[...Array(9)].map((_,i)=><div key={i} style={{ position:"absolute", top:0, bottom:0, left:`${i*12.5}%`, width:1, background:"rgba(255,101,0,0.07)" }}/>)}
                {[...Array(9)].map((_,i)=><div key={i} style={{ position:"absolute", left:0, right:0, top:`${i*12.5}%`, height:1, background:"rgba(255,101,0,0.07)" }}/>)}
                <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 420 320" preserveAspectRatio="none">
                  <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
                  <line x1="40" y1="160" x2="380" y2="160" stroke={T.accent} strokeWidth="1.5" strokeOpacity="0.7" filter="url(#glow)"/>
                  <line x1="210" y1="20" x2="210" y2="300" stroke={T.accent} strokeWidth="1.5" strokeOpacity="0.7" filter="url(#glow)"/>
                  <line x1="40" y1="70" x2="340" y2="240" stroke={T.accent} strokeWidth="1" strokeOpacity="0.45"/>
                  <line x1="100" y1="300" x2="320" y2="40" stroke={T.accent} strokeWidth="1" strokeOpacity="0.45"/>
                  {[[210,160],[100,80],[320,240],[280,110],[140,210],[360,160],[210,55]].map(([cx,cy],i)=>(
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={i===0?7:4} fill={T.accent} opacity={i===0?1:0.75} filter="url(#glow)"/>
                      {i===0&&<circle cx={cx} cy={cy} r={14} fill="none" stroke={T.accent} strokeWidth="1" strokeOpacity="0.4"/>}
                    </g>
                  ))}
                </svg>
                <div className="scan-line"/>
                <div style={{ position:"absolute", top:"50%", left:"50%", width:12, height:12, borderRadius:"50%", background:T.accent, transform:"translate(-50%,-50%)", boxShadow:`0 0 18px ${T.accent},0 0 36px rgba(255,101,0,0.4)`, animation:"pingScale 2s ease-in-out infinite" }}/>
              </div>
              <div style={{ padding:"14px 22px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontSize:"0.62rem", color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Active Quests Nearby</div><div style={{ fontFamily:"Orbitron,sans-serif", fontSize:"1.15rem", fontWeight:700 }}>14 Quests</div></div>
                <button className="btn-acc" style={{ padding:"8px 18px", fontSize:"0.73rem" }}>View All</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <section style={{ padding:"clamp(6rem,12vw,13rem) clamp(1.5rem,5vw,5rem)", background:T.bgSurface, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          <div className="reveal" style={{ marginBottom:60 }}>
            <span className="section-tag">GFL Ecosystem</span>
            <h2 style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(2rem,4.5vw,4.5rem)", fontWeight:800, letterSpacing:"-0.03em", lineHeight:0.95, maxWidth:"18ch" }}>
              Own the game.<br/>Own the <span className="orange-grad">economy.</span>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:16 }}>
            {ECOSYSTEM.map((e,i) => (
              <div key={i} className="reveal card-hover" style={{ background:T.bgRaised, border:`1px solid ${T.border}`, borderRadius:14, padding:"28px 26px", transitionDelay:`${i*0.09}s` }}>
                <span style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", color:T.accent }}>{e.tag}</span>
                <p style={{ fontSize:"0.95rem", color:T.secondary, lineHeight:1.7, marginTop:14 }}>{e.title}</p>
                <div style={{ marginTop:20, display:"flex", alignItems:"center", gap:6, color:T.accent }}>
                  <span style={{ fontSize:"0.75rem", fontWeight:600 }}>Learn more</span><ArrowRight size={13}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING (NEW) ── */}
      <PricingSection onSelectPlan={(plan) => openPaymentModal(plan)}/>

      {/* ── TESTIMONIAL ── */}
      <section style={{ padding:"clamp(6rem,12vw,13rem) clamp(1.5rem,5vw,5rem)", maxWidth:1280, margin:"0 auto", textAlign:"center" }}>
        <div className="reveal">
          <span className="section-tag" style={{ display:"inline-block" }}>Community</span>
          <blockquote style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(1.5rem,3.5vw,3rem)", fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.15, maxWidth:"22ch", margin:"0 auto 36px" }}>
            “Finally an app that makes life feel like a <span className="orange-grad">boss battle.”</span>
          </blockquote>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>&#x26A1;</div>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontWeight:600, fontSize:"0.9rem" }}>xNova_7</div>
              <div style={{ color:T.muted, fontSize:"0.75rem" }}>Rank #1 · San Francisco</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position:"relative", overflow:"hidden", padding:"clamp(7rem,14vw,14rem) clamp(1.5rem,5vw,5rem)", textAlign:"center", background:T.bgSurface, borderTop:`1px solid ${T.border}` }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,101,0,0.07) 0%,transparent 70%)", filter:"blur(50px)", pointerEvents:"none" }}/>
        <div className="reveal">
          <span className="section-tag" style={{ display:"inline-block" }}>Join the Game</span>
          <h2 style={{ fontFamily:"Orbitron,sans-serif", fontSize:"clamp(3rem,8vw,8rem)", fontWeight:900, letterSpacing:"-0.04em", lineHeight:0.88, marginBottom:28 }}>
            READY TO<br/><span className="orange-grad">LEVEL UP?</span>
          </h2>
          <p style={{ color:T.secondary, fontSize:"clamp(0.95rem,1.8vw,1.1rem)", maxWidth:"46ch", margin:"0 auto 42px", lineHeight:1.8 }}>Join 2.4 million players turning ordinary life into an extraordinary adventure. Pay with crypto. Play forever.</p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-acc" style={{ fontSize:"0.95rem", padding:"17px 40px" }} onClick={() => openPaymentModal()}>
              Subscribe with Crypto <ArrowRight size={17}/>
            </button>
            <button className="btn-ghost" style={{ fontSize:"0.95rem", padding:"17px 40px" }}>View Roadmap</button>
          </div>
          <div style={{ display:"flex", gap:12, justifyContent:"center", marginTop:28, flexWrap:"wrap" }}>
            {["App Store ★ 4.97","Google Play ★ 4.96"].map((b,i)=>(
              <div key={i} style={{ padding:"8px 20px", borderRadius:8, background:T.bgRaised, border:`1px solid ${T.border}`, fontSize:"0.78rem", color:T.secondary, fontWeight:500 }}>{b}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(4rem,8vw,8rem) clamp(1.5rem,5vw,5rem) clamp(2rem,4vw,4rem)", display:"grid", gridTemplateColumns:"2fr repeat(3,1fr)", gap:48 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:`linear-gradient(135deg,${T.accent},${T.accentAlt})`, boxShadow:glowSm, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:"Orbitron,sans-serif", fontWeight:900, fontSize:"0.85rem", color:"#07090B" }}>G</span>
              </div>
              <span style={{ fontFamily:"Orbitron,sans-serif", fontWeight:700, fontSize:"0.95rem", letterSpacing:"0.04em" }}>game<span style={{ color:T.accent }}>fi</span>lyfe</span>
            </div>
            <p style={{ color:T.muted, fontSize:"0.875rem", lineHeight:1.75, maxWidth:"28ch" }}>The world's first gamified lifestyle super app. Pay with crypto. Level up your life, every single day.</p>
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              {["\u{1D54F}","📱","🎮","💬"].map((icon,i)=>(
                <button key={i} style={{ width:36, height:36, borderRadius:8, fontSize:"0.8rem", background:T.bgRaised, border:`1px solid ${T.border}`, color:T.secondary, cursor:"pointer", transition:"border-color 0.2s,color 0.2s" }}
                  onMouseEnter={e=>{e.target.style.borderColor=T.accent;e.target.style.color=T.accent;}}
                  onMouseLeave={e=>{e.target.style.borderColor=T.border;e.target.style.color=T.secondary;}}>{icon}</button>
              ))}
            </div>
          </div>
          {[{title:"Product",links:["Features","Roadmap","Changelog","Pricing"]},{title:"Community",links:["Discord","Twitter","Reddit","Leaderboard"]},{title:"Company",links:["About","Blog","Careers","Press"]}].map(col=>(
            <div key={col.title}>
              <div style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, marginBottom:22 }}>{col.title}</div>
              {col.links.map(link=>(
                <a key={link} href="#" style={{ display:"block", color:T.secondary, textDecoration:"none", fontSize:"0.88rem", marginBottom:13, transition:"color 0.2s" }}
                  onMouseEnter={e=>e.target.style.color=T.primary}
                  onMouseLeave={e=>e.target.style.color=T.secondary}>{link}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"18px clamp(1.5rem,5vw,5rem)", maxWidth:1280, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <span style={{ fontSize:"0.72rem", color:T.muted }}>&copy; 2026 GamefiLyfe Inc. All rights reserved.</span>
          <div style={{ display:"flex", gap:22 }}>
            {["Privacy","Terms","Cookies"].map(item=>(
              <a key={item} href="#" style={{ fontSize:"0.72rem", color:T.muted, textDecoration:"none" }}>{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

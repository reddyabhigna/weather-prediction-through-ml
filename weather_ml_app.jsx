import { useState, useCallback, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// ─── ML Model ────────────────────────────────────────────────────────────────
function mlPredict({ temperature, humidity, pressure, windSpeed }) {
  let s = 0;
  if (humidity > 80) s += 35; else if (humidity > 65) s += 20;
  if (pressure < 1005) s += 30; else if (pressure < 1013) s += 15;
  if (temperature > 25 && humidity > 70) s += 15;
  if (windSpeed > 20) s += 10;
  const rainfallProb = Math.min(95, Math.max(2, s));

  const tempCategory =
    temperature > 35 ? "Extreme" : temperature > 28 ? "Hot" :
    temperature > 20 ? "Warm"    : temperature > 12 ? "Mild" :
    temperature > 0  ? "Cold"    : "Freezing";

  const tempColor =
    tempCategory === "Hot" || tempCategory === "Extreme" ? "#ff6b8a" :
    tempCategory === "Warm" ? "#ffaa5e" :
    tempCategory === "Mild" ? "#6fcf97" : "#74b9ff";

  let condition =
    rainfallProb > 60 ? "Stormy" :
    rainfallProb > 40 ? "Rainy"  :
    rainfallProb > 20 ? "Cloudy" :
    temperature > 28  ? "Sunny"  : "Clear";

  const hasRain = rainfallProb > 35;

  const days = ["Thu","Fri","Sat","Sun","Mon","Tue","Wed"];
  const forecast = days.map(day => ({
    day,
    Temperature: +(temperature + (Math.random()-0.5)*9).toFixed(1),
    "Rainfall %": Math.min(100, Math.max(0, Math.round(rainfallProb + (Math.random()-0.5)*28))),
    Humidity: Math.min(100, Math.max(10, Math.round(humidity + (Math.random()-0.5)*18))),
  }));

  return { rainfallProb: +rainfallProb.toFixed(1), condition, tempCategory, tempColor, hasRain, forecast };
}

// ─── Open-Meteo ──────────────────────────────────────────────────────────────
async function fetchWeather(lat, lon) {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure&wind_speed_unit=kmh&timezone=auto`);
  const d = await r.json(); const c = d.current;
  return { temperature: +c.temperature_2m.toFixed(1), humidity: c.relative_humidity_2m, pressure: Math.round(c.surface_pressure), windSpeed: Math.round(c.wind_speed_10m) };
}
async function geocode(city) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const d = await r.json();
  if (!d.results?.length) throw new Error("City not found");
  return { lat: d.results[0].latitude, lon: d.results[0].longitude };
}

// ─── Cute Animated SVG Weather Illustrations ─────────────────────────────────
function SunnyAnim() {
  return (
    <svg viewBox="0 0 120 120" width="110" height="110">
      <defs>
        <radialGradient id="sunG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe066"/>
          <stop offset="100%" stopColor="#ffb830"/>
        </radialGradient>
      </defs>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        .sun-rays{transform-origin:60px 60px;animation:spin 12s linear infinite}
        .sun-core{transform-origin:60px 60px;animation:pulse 2s ease-in-out infinite}
      `}</style>
      <g className="sun-rays">
        {[0,45,90,135,180,225,270,315].map(a=>{
          const rad=a*Math.PI/180, x1=60+28*Math.cos(rad), y1=60+28*Math.sin(rad), x2=60+38*Math.cos(rad), y2=60+38*Math.sin(rad);
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffe066" strokeWidth="3.5" strokeLinecap="round"/>;
        })}
      </g>
      <circle className="sun-core" cx="60" cy="60" r="22" fill="url(#sunG)" />
      {/* cute face */}
      <circle cx="54" cy="57" r="2.5" fill="#a0600a"/>
      <circle cx="66" cy="57" r="2.5" fill="#a0600a"/>
      <path d="M53 64 Q60 70 67 64" fill="none" stroke="#a0600a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function CloudyAnim() {
  return (
    <svg viewBox="0 0 130 90" width="120" height="90">
      <style>{`
        @keyframes floatL{0%,100%{transform:translateX(0)}50%{transform:translateX(-5px)}}
        @keyframes floatR{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
        @keyframes bobCloud{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .cloud-back{animation:floatL 4s ease-in-out infinite}
        .cloud-front{animation:bobCloud 3s ease-in-out infinite}
      `}</style>
      <g className="cloud-back" opacity="0.55">
        <ellipse cx="72" cy="54" rx="28" ry="18" fill="#c8d8f0"/>
        <ellipse cx="58" cy="60" rx="18" ry="14" fill="#c8d8f0"/>
        <ellipse cx="86" cy="60" rx="16" ry="12" fill="#c8d8f0"/>
      </g>
      <g className="cloud-front">
        <ellipse cx="58" cy="46" rx="32" ry="22" fill="white"/>
        <ellipse cx="40" cy="54" rx="20" ry="16" fill="white"/>
        <ellipse cx="76" cy="54" rx="18" ry="14" fill="white"/>
        {/* face */}
        <circle cx="50" cy="47" r="2.5" fill="#9090b0"/>
        <circle cx="62" cy="47" r="2.5" fill="#9090b0"/>
        <path d="M48 54 Q56 59 64 54" fill="none" stroke="#9090b0" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

function RainyAnim() {
  return (
    <svg viewBox="0 0 130 110" width="120" height="110">
      <style>{`
        @keyframes bobC{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes drop1{0%{transform:translateY(-8px);opacity:0}40%{opacity:1}100%{transform:translateY(22px);opacity:0}}
        @keyframes drop2{0%{transform:translateY(-8px);opacity:0}40%{opacity:1}100%{transform:translateY(22px);opacity:0}}
        .cloud-r{animation:bobC 3s ease-in-out infinite}
        .d1{animation:drop1 1.4s ease-in infinite}
        .d2{animation:drop1 1.4s ease-in 0.25s infinite}
        .d3{animation:drop1 1.4s ease-in 0.5s infinite}
        .d4{animation:drop2 1.4s ease-in 0.75s infinite}
        .d5{animation:drop2 1.4s ease-in 1.0s infinite}
      `}</style>
      <g className="cloud-r">
        <ellipse cx="62" cy="42" rx="34" ry="22" fill="#a8c0e8"/>
        <ellipse cx="44" cy="50" rx="22" ry="17" fill="#a8c0e8"/>
        <ellipse cx="80" cy="50" rx="20" ry="15" fill="#a8c0e8"/>
        <circle cx="52" cy="40" r="3" fill="#8090b8"/>
        <circle cx="66" cy="40" r="3" fill="#8090b8"/>
        <path d="M49 48 Q58 54 67 48" fill="none" stroke="#8090b8" strokeWidth="2.2" strokeLinecap="round"/>
      </g>
      {[[44,70],[58,74],[72,70],[50,84],[66,80]].map(([x,y],i)=>(
        <ellipse key={i} className={`d${i+1}`} cx={x} cy={y} rx="2.5" ry="5" fill="#74aee0" opacity="0.85"/>
      ))}
    </svg>
  );
}

function StormyAnim() {
  return (
    <svg viewBox="0 0 130 120" width="120" height="120">
      <style>{`
        @keyframes bobS{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes flash{0%,90%,100%{opacity:0}92%,96%{opacity:1}94%,98%{opacity:0.5}}
        @keyframes droopS{0%{transform:translateY(-6px);opacity:0}50%{opacity:1}100%{transform:translateY(20px);opacity:0}}
        .cloud-s{animation:bobS 2.5s ease-in-out infinite}
        .bolt{animation:flash 2.5s ease-in-out infinite}
        .ds1{animation:droopS 1.2s ease-in infinite}
        .ds2{animation:droopS 1.2s ease-in 0.3s infinite}
        .ds3{animation:droopS 1.2s ease-in 0.6s infinite}
        .ds4{animation:droopS 1.2s ease-in 0.9s infinite}
      `}</style>
      <g className="cloud-s">
        <ellipse cx="62" cy="38" rx="36" ry="23" fill="#8090b0"/>
        <ellipse cx="42" cy="48" rx="24" ry="18" fill="#8090b0"/>
        <ellipse cx="82" cy="48" rx="22" ry="16" fill="#8090b0"/>
        {/* grumpy face */}
        <circle cx="52" cy="36" r="3" fill="#505878"/>
        <circle cx="66" cy="36" r="3" fill="#505878"/>
        <path d="M50 45 Q59 41 68 45" fill="none" stroke="#505878" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M49 31 L54 35" stroke="#505878" strokeWidth="2" strokeLinecap="round"/>
        <path d="M68 31 L64 35" stroke="#505878" strokeWidth="2" strokeLinecap="round"/>
      </g>
      <polygon className="bolt" points="66,58 60,74 65,74 59,90 70,70 64,70" fill="#ffe040" filter="url(#glow)"/>
      <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {[[42,68],[50,72],[80,68],[86,74]].map(([x,y],i)=>(
        <ellipse key={i} className={`ds${i+1}`} cx={x} cy={y} rx="2.5" ry="5" fill="#6090c8" opacity="0.8"/>
      ))}
    </svg>
  );
}

function ClearAnim() {
  return (
    <svg viewBox="0 0 130 100" width="120" height="100">
      <style>{`
        @keyframes sunR2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes floatC{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .sun2{transform-origin:32px 42px;animation:sunR2 14s linear infinite}
        .cl2{animation:floatC 3.5s ease-in-out infinite}
      `}</style>
      <g className="sun2">
        {[0,60,120,180,240,300].map(a=>{
          const rad=a*Math.PI/180,x1=32+18*Math.cos(rad),y1=42+18*Math.sin(rad),x2=32+25*Math.cos(rad),y2=42+25*Math.sin(rad);
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd040" strokeWidth="3" strokeLinecap="round"/>;
        })}
      </g>
      <circle cx="32" cy="42" r="14" fill="#ffe555"/>
      <g className="cl2">
        <ellipse cx="72" cy="52" rx="34" ry="22" fill="white"/>
        <ellipse cx="54" cy="60" rx="22" ry="17" fill="white"/>
        <ellipse cx="90" cy="60" rx="20" ry="15" fill="white"/>
        <circle cx="64" cy="50" r="2.5" fill="#9090b0"/>
        <circle cx="76" cy="50" r="2.5" fill="#9090b0"/>
        <path d="M62 57 Q70 63 78 57" fill="none" stroke="#9090b0" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

function ReadyAnim() {
  return (
    <svg viewBox="0 0 140 120" width="130" height="120">
      <style>{`
        @keyframes bobR{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes star1{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes star2{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:0.2;transform:scale(0.7)}}
        .main-cloud{animation:bobR 3s ease-in-out infinite}
        .s1{transform-origin:20px 25px;animation:star1 2s ease-in-out infinite}
        .s2{transform-origin:110px 20px;animation:star2 2.4s ease-in-out infinite}
        .s3{transform-origin:115px 55px;animation:star1 1.8s ease-in-out 0.5s infinite}
      `}</style>
      <text className="s1" x="12" y="30" fontSize="16">✨</text>
      <text className="s2" x="102" y="24" fontSize="14">⭐</text>
      <text className="s3" x="108" y="58" fontSize="12">✨</text>
      <g className="main-cloud">
        <ellipse cx="68" cy="58" rx="40" ry="26" fill="white" opacity="0.9"/>
        <ellipse cx="46" cy="68" rx="26" ry="20" fill="white" opacity="0.9"/>
        <ellipse cx="90" cy="68" rx="24" ry="18" fill="white" opacity="0.9"/>
        {/* rainbow */}
        {[["#ff8fa0",32],["#ffb870",28],["#ffe060",24],["#a0e080",20],["#80c8f0",16]].map(([c,r])=>(
          <path key={r} d={`M ${68-r} 56 A ${r} ${r} 0 0 1 ${68+r} 56`} fill="none" stroke={c} strokeWidth="3" opacity="0.7"/>
        ))}
        {/* cute face */}
        <circle cx="58" cy="62" r="3.5" fill="#9090b0"/>
        <circle cx="74" cy="62" r="3.5" fill="#9090b0"/>
        <path d="M55 71 Q66 79 77 71" fill="none" stroke="#9090b0" strokeWidth="2.5" strokeLinecap="round"/>
        {/* blush */}
        <ellipse cx="52" cy="68" rx="5" ry="3" fill="#ffb0c0" opacity="0.5"/>
        <ellipse cx="80" cy="68" rx="5" ry="3" fill="#ffb0c0" opacity="0.5"/>
      </g>
    </svg>
  );
}

function WeatherAnim({ condition }) {
  if (condition === "Stormy") return <StormyAnim/>;
  if (condition === "Rainy")  return <RainyAnim/>;
  if (condition === "Cloudy") return <CloudyAnim/>;
  if (condition === "Sunny")  return <SunnyAnim/>;
  if (condition === "Clear")  return <ClearAnim/>;
  return <ReadyAnim/>;
}

// ─── Animated App Title ───────────────────────────────────────────────────────
function AnimatedTitle() {
  const letters = ["W","e","a","t","h","e","r"," ","M","L"];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
      {letters.map((l, i) => (
        <span key={i} style={{
          display:"inline-block",
          fontWeight: 900,
          fontSize: i >= 8 ? 34 : 34,
          color: i >= 8 ? "#e88fa0" : "#7ab8d8",
          animation: `letterBob 2s ease-in-out ${i*0.1}s infinite`,
          letterSpacing: l===" " ? "4px" : "-0.01em",
        }}>{l}</span>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.72)", backdropFilter:"blur(12px)", borderRadius:18, padding:"18px 22px", boxShadow:"0 2px 16px rgba(180,140,120,0.08)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"#9b8fa0", textTransform:"uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color:"#2d2438" }}>{value}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(255,255,255,0.97)", borderRadius:12, padding:"10px 14px", boxShadow:"0 4px 20px rgba(0,0,0,0.1)", fontSize:13 }}>
      <div style={{ fontWeight:800, marginBottom:4, color:"#2d2438" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:p.color, display:"flex", gap:10, justifyContent:"space-between", fontWeight:700 }}>
          <span>{p.name}</span><span>{p.value}{p.name==="Temperature"?"°C":"%"}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function WeatherML() {
  const [tab, setTab] = useState("manual");
  const [inputs, setInputs] = useState({ temperature:"", humidity:"", pressure:"", windSpeed:"" });
  const [city, setCity] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animKey, setAnimKey] = useState(0);

  // Seed with demo history so trends & history are always visible
  useEffect(() => {
    const demos = [
      { temperature:22.5, humidity:70, pressure:1008, windSpeed:12 },
      { temperature:12.2, humidity:28, pressure:1020, windSpeed:5  },
      { temperature:25.5, humidity:65, pressure:1010, windSpeed:18 },
      { temperature:25.0, humidity:75, pressure:1007, windSpeed:22 },
    ];
    const h = demos.map(inp => {
      const p = mlPredict(inp);
      const d = new Date(Date.now() - Math.random()*3600000);
      return { ...p, inputs: inp, time: d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) };
    });
    setHistory(h);
    setResult(h[0]);
  }, []);

  const doPredict = useCallback((data) => {
    const pred = mlPredict(data);
    const entry = { ...pred, inputs:data, time: new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) };
    setResult(entry);
    setHistory(h => [entry, ...h.slice(0,19)]);
    setAnimKey(k=>k+1);
    setError("");
  }, []);

  const handlePredict = () => {
    const t=+inputs.temperature, h=+inputs.humidity, p=+inputs.pressure, w=+inputs.windSpeed;
    if ([t,h,p,w].some(v=>isNaN(v)||v===""||inputs[Object.keys(inputs)[[t,h,p,w].indexOf(v)]]==="")) {
      setError("Please fill all fields"); return;
    }
    doPredict({ temperature:t, humidity:h, pressure:p, windSpeed:w });
  };

  const handleLocation = async () => {
    setLoading(true); setError("");
    try {
      let lat, lon;
      if (city.trim()) { const g = await geocode(city); lat=g.lat; lon=g.lon; }
      else { const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej)); lat=pos.coords.latitude; lon=pos.coords.longitude; }
      const data = await fetchWeather(lat, lon);
      setInputs({ temperature:data.temperature+"", humidity:data.humidity+"", pressure:data.pressure+"", windSpeed:data.windSpeed+"" });
      doPredict(data);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const avgHumidity = history.length ? Math.round(history.reduce((s,h)=>s+h.inputs.humidity,0)/history.length) : 0;
  const avgPressure = history.length ? Math.round(history.reduce((s,h)=>s+h.inputs.pressure,0)/history.length) : 0;
  const avgRain     = history.length ? (history.reduce((s,h)=>s+h.rainfallProb,0)/history.length).toFixed(0) : 0;

  const fields = [
    { key:"temperature", label:"Temperature (°C)", icon:"🌡️", placeholder:"-10 to 45" },
    { key:"humidity",    label:"Humidity (%)",      icon:"💧", placeholder:"0 to 100"  },
    { key:"pressure",   label:"Pressure (hPa)",    icon:"🌀", placeholder:"980 to 1050"},
    { key:"windSpeed",  label:"Wind Speed (km/h)", icon:"💨", placeholder:"0 to 100"  },
  ];

  const trendData = result?.forecast || [];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(145deg,#fbc5a2 0%,#f4a8b8 28%,#d4a8d4 58%,#a8c4e8 100%)", fontFamily:"'Nunito','Segoe UI',system-ui,sans-serif", padding:"24px 20px 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box}
        input::placeholder{color:#bab0c4}
        input:focus{outline:none;border-color:#c4a0d4!important;box-shadow:0 0 0 3px rgba(196,160,212,0.15)}
        .btn{cursor:pointer;border:none;font-family:'Nunito','Segoe UI',system-ui,sans-serif;font-weight:800;transition:all 0.18s}
        .btn:hover{transform:translateY(-2px)}
        .hist-row:hover{background:rgba(255,255,255,0.88)!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes letterBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes popIn{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
        .fade{animation:fadeUp 0.45s ease}
        .pop{animation:popIn 0.4s cubic-bezier(.34,1.56,.64,1)}
      `}</style>

      {/* ── Header ── */}
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:16 }}>
          <div style={{ width:60, height:60, borderRadius:18, background:"rgba(255,255,255,0.65)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(180,120,140,0.2)", overflow:"hidden" }}>
            <WeatherAnim condition={result?.condition} />
          </div>
          <div style={{ textAlign:"left" }}>
            <AnimatedTitle/>
            <p style={{ margin:0, fontSize:13, color:"rgba(80,60,100,0.7)", fontWeight:700 }}>Predict weather conditions with machine learning</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 }}>

        {/* ── Top Row: Result + Input ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20, alignItems:"start" }}>

          {/* Result panel */}
          <div style={{ background:"rgba(255,255,255,0.52)", backdropFilter:"blur(18px)", borderRadius:24, padding:"32px", boxShadow:"0 4px 32px rgba(180,130,150,0.1)", minHeight:320, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {result ? (
              <div key={animKey} className="pop" style={{ width:"100%", textAlign:"center" }}>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
                  <WeatherAnim condition={result.condition}/>
                </div>
                <h2 style={{ margin:"0 0 4px", fontSize:28, fontWeight:900, color:"#2d2438" }}>{result.condition}</h2>
                <p style={{ margin:"0 0 22px", color:"#9b8fa8", fontWeight:700, fontSize:15 }}>{result.tempCategory} · {result.inputs.temperature}°C</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    { icon:"💧", label:"Humidity",  val:result.inputs.humidity+"%",     bg:"#e8f4ff", tc:"#5090c8" },
                    { icon:"🌀", label:"Pressure",  val:result.inputs.pressure+" hPa",  bg:"#f0eaff", tc:"#9070c0" },
                    { icon:"💨", label:"Wind",      val:result.inputs.windSpeed+" km/h",bg:"#eafff4", tc:"#40a878" },
                    { icon:"🌧️", label:"Rain Prob", val:result.rainfallProb+"%",        bg:"#fff0f4", tc:"#d06080" },
                  ].map(({ icon,label,val,bg,tc })=>(
                    <div key={label} style={{ background:bg, borderRadius:16, padding:"14px 16px", textAlign:"left" }}>
                      <div style={{ fontSize:20, marginBottom:3 }}>{icon}</div>
                      <div style={{ fontSize:11, color:"#9b8fa8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                      <div style={{ fontSize:19, fontWeight:900, color:tc }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <ReadyAnim/>
                <h2 style={{ margin:"12px 0 6px", fontWeight:900, color:"#2d2438" }}>Ready to Predict!</h2>
                <p style={{ margin:0, color:"#9b8fa8", fontWeight:600 }}>Enter weather data or use your location</p>
              </div>
            )}
          </div>

          {/* Input panel */}
          <div style={{ background:"rgba(255,255,255,0.70)", backdropFilter:"blur(18px)", borderRadius:24, padding:"22px 20px", boxShadow:"0 4px 32px rgba(180,130,150,0.1)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#f4c8d0,#d4b8e8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🌡️</div>
              <div style={{ fontWeight:900, fontSize:18, color:"#2d2438" }}>Weather Input</div>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:18, background:"rgba(200,180,215,0.18)", borderRadius:50, padding:4 }}>
              {[["manual","Manual Input"],["location","📍 Location"]].map(([id,lbl])=>(
                <button key={id} className="btn" onClick={()=>setTab(id)} style={{
                  flex:1, padding:"9px 0", borderRadius:50, fontSize:13,
                  background:tab===id?"linear-gradient(135deg,#74c0e8,#a0b0f0)":"transparent",
                  color:tab===id?"white":"#9b8fa8",
                  boxShadow:tab===id?"0 2px 14px rgba(100,160,220,0.3)":"none",
                }}>{lbl}</button>
              ))}
            </div>
            {tab==="location" && (
              <input placeholder="City name (or blank for GPS)" value={city} onChange={e=>setCity(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLocation()}
                style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"1.5px solid rgba(200,180,220,0.45)", background:"rgba(255,255,255,0.8)", fontSize:14, color:"#2d2438", marginBottom:14, fontFamily:"inherit", fontWeight:600 }}/>
            )}
            {fields.map(({ key,label,icon,placeholder })=>(
              <div key={key} style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#7a7088", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                  <span>{icon}</span>{label}
                </div>
                <input type="number" placeholder={placeholder} value={inputs[key]}
                  onChange={e=>setInputs(p=>({...p,[key]:e.target.value}))}
                  style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"1.5px solid rgba(200,180,220,0.4)", background:"rgba(255,255,255,0.88)", fontSize:15, color:"#2d2438", fontFamily:"inherit", fontWeight:700 }}/>
              </div>
            ))}
            {error && <div style={{ color:"#e06070", fontSize:13, fontWeight:700, marginBottom:10, textAlign:"center" }}>⚠️ {error}</div>}
            <button className="btn" onClick={tab==="manual"?handlePredict:handleLocation} disabled={loading}
              style={{ width:"100%", padding:"13px", borderRadius:50, fontSize:15,
                background:loading?"rgba(100,160,220,0.35)":"linear-gradient(135deg,#74c0e8,#a090d8)",
                color:"white", boxShadow:"0 4px 20px rgba(100,140,220,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              📈 {loading?"Fetching…":"Predict Weather"}
            </button>
          </div>
        </div>

        {/* ── Weather Trends (always visible) ── */}
        <div className="fade" style={{ background:"rgba(255,255,255,0.58)", backdropFilter:"blur(18px)", borderRadius:24, padding:"24px 28px", boxShadow:"0 4px 32px rgba(180,130,150,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ margin:0, fontWeight:900, fontSize:20, color:"#2d2438" }}>Weather Trends</h2>
            {result && <button className="btn" onClick={()=>doPredict(result.inputs)} style={{ background:"none", fontSize:18, color:"#9b8fa8", padding:0 }}>🔄</button>}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <defs>
                  {[["hg","#74c0e8"],["rg","#c4a0d4"],["tg","#f4a8b8"]].map(([id,c])=>(
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.42}/>
                      <stop offset="95%" stopColor={c} stopOpacity={0.02}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(160,140,180,0.15)"/>
                <XAxis dataKey="day" tick={{ fill:"#9b8fa8", fontSize:13, fontWeight:700, fontFamily:"Nunito" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#9b8fa8", fontSize:12, fontFamily:"Nunito" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ fontSize:13, fontWeight:700, color:"#9b8fa8", fontFamily:"Nunito", paddingTop:12 }}/>
                <Area type="monotone" dataKey="Humidity"    stroke="#74c0e8" fill="url(#hg)" strokeWidth={2.5} dot={false}/>
                <Area type="monotone" dataKey="Rainfall %"  stroke="#c4a0d4" fill="url(#rg)" strokeWidth={2.5} dot={false}/>
                <Area type="monotone" dataKey="Temperature" stroke="#f4a8b8" fill="url(#tg)" strokeWidth={2.5} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:150, display:"flex", alignItems:"center", justifyContent:"center", color:"#c0b0cc", fontWeight:700 }}>No data yet — make a prediction!</div>
          )}
        </div>

        {/* ── Avg Stats ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          <StatCard icon="💧" label="Avg Humidity"  value={history.length ? avgHumidity+"%" : "—"}/>
          <StatCard icon="🌀" label="Avg Pressure"  value={history.length ? avgPressure+" hPa" : "—"}/>
          <StatCard icon="🌧️" label="Avg Rain Prob" value={history.length ? avgRain+"%" : "—"}/>
        </div>

        {/* ── Prediction History (always visible) ── */}
        <div style={{ background:"rgba(255,255,255,0.58)", backdropFilter:"blur(18px)", borderRadius:24, padding:"22px 24px", boxShadow:"0 4px 32px rgba(180,130,150,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontWeight:900, fontSize:20, color:"#2d2438" }}>Prediction History</h2>
            <button className="btn" onClick={()=>setHistory([])} style={{ background:"none", fontSize:18, color:"#9b8fa8", padding:0 }}>🔄</button>
          </div>
          {history.length > 0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {history.map((h, i)=>(
                <div key={i} className="hist-row" style={{ background:"rgba(255,255,255,0.72)", borderRadius:14, padding:"13px 18px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", transition:"background 0.15s" }}>
                  <span style={{ color:"#b0a0bc", fontSize:12, fontWeight:700, minWidth:126, display:"flex", alignItems:"center", gap:5 }}>🕐 {h.time}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#6b5a78" }}>🌡️ <b style={{color:"#2d2438"}}>{h.inputs.temperature}°C</b></span>
                  <span style={{ background:h.tempColor+"22", color:h.tempColor, borderRadius:50, padding:"3px 12px", fontSize:12, fontWeight:800 }}>{h.tempCategory}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#6b5a78" }}>💧 <b style={{color:"#2d2438"}}>{h.inputs.humidity}%</b></span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#6b5a78" }}>🌧️ <b style={{color:"#2d2438"}}>{h.rainfallProb}%</b></span>
                  <span style={{ background:h.hasRain?"#d4eeff":"#e8fff4", color:h.hasRain?"#4880b8":"#38966a", borderRadius:50, padding:"3px 12px", fontSize:12, fontWeight:800 }}>
                    {h.hasRain?"Rain":"No Rain"}
                  </span>
                  <span style={{ marginLeft:"auto", background:"rgba(200,180,220,0.2)", color:"#8878a0", borderRadius:50, padding:"4px 14px", fontSize:12, fontWeight:800 }}>{h.condition}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:"30px 0", textAlign:"center", color:"#c0b0cc", fontWeight:700 }}>No predictions yet — try the form above!</div>
          )}
        </div>

      </div>
    </div>
  );
}

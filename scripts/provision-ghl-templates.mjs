import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { encodeFirestoreValue } from '../functions/firestore-codec.js';
import { buildSystemTemplateSeed, loadTemplateSource } from './build-system-template-seed.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core'
);
const root = fileURLToPath(new URL('../', import.meta.url));

const firebaseRc = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8'));
const publicConfig = JSON.parse(fs.readFileSync(path.join(root, 'src/backend/gos-public-config.json'), 'utf8'));
const projectId = firebaseRc.projects.default;
if (projectId !== publicConfig.projectId) {
  throw new Error(`Project mismatch: ${projectId} vs ${publicConfig.projectId}`);
}
const bucketName = publicConfig.storageBucket || `${projectId}.firebasestorage.app`;

const publicThumbDir = path.join(root, 'public/template-thumbnails');
const seedThumbDir = path.join(root, 'functions/seed-data/template-thumbnails');
fs.mkdirSync(publicThumbDir, { recursive: true });
fs.mkdirSync(seedThumbDir, { recursive: true });

// High-resolution domain-matched Unsplash photography (preloaded in headless Edge before capture)
const PHOTOS = {
  framingHero: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=85',
  framingTeam: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=85',
  insuranceFamily1: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=85',
  insuranceFamily2: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=85',
  insuranceFamily3: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=600&q=85',
  insuranceFamily4: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=85',
  insuranceHero: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=85',
  pharmacyHero: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1400&q=85',
  pharmacyConsult: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=85',
  mortgageHome: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85',
  brakeMechanic: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=85',
  locksmithKeys: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1400&q=85',
  locksmithDoor: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=85',
  locksmithVan: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=85',
  trainerAthlete: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1000&q=85',
  architectStudio: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=85',
};

const sharedCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; background: #fff; color: #0f172a; overflow: hidden; }
  img { display: block; object-fit: cover; }
`;

const COVER_HTML = {
  'ghl-website-framing-construction': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; }
    .topbar { background: #091931; color: #cbd5e1; font-size: 11px; padding: 9px 42px; display: flex; justify-content: space-between; align-items: center; }
    .topbar b { color: #f97316; font-weight: 800; font-size: 13px; letter-spacing: -.2px; }
    .topbar b span { color: #fff; font-weight: 600; }
    .nav { background: #ffffff; padding: 12px 42px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #334155; }
    .nav-links { display: flex; gap: 22px; }
    .nav-cta { background: #091931; color: #fff; padding: 7px 16px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .hero { position: relative; height: 420px; background: #0b1d3a; overflow: hidden; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 90px; }
    .hero img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.42; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(9,25,49,0.58), rgba(9,25,49,0.78)); }
    .hero-inner { position: relative; z-index: 2; color: #fff; max-width: 680px; }
    .hero-kicker { display: inline-block; background: rgba(234,88,12,0.22); border: 1px solid rgba(249,115,22,0.55); color: #fdba74; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .hero h1 { font-size: 40px; line-height: 1.13; font-weight: 800; letter-spacing: -.8px; }
    .hero h1 em { font-style: normal; color: #f97316; }
    .hero p { font-size: 13.5px; color: #e2e8f0; margin-top: 13px; line-height: 1.55; }
    .hero-btns { margin-top: 22px; display: flex; gap: 12px; justify-content: center; }
    .btn-orange { background: #ea580c; color: #fff; padding: 11px 22px; border-radius: 5px; font-size: 12px; font-weight: 700; }
    .btn-ghost { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.35); color: #fff; padding: 11px 20px; border-radius: 5px; font-size: 12px; font-weight: 600; }
    .about { padding: 42px 54px; display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 36px; align-items: center; background: #fff; flex: 1; }
    .tag { color: #ea580c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .about h2 { font-size: 27px; line-height: 1.2; font-weight: 800; color: #0f172a; margin-bottom: 16px; }
    .about h2 span { color: #ea580c; }
    .check-item { margin-bottom: 13px; padding-left: 14px; border-left: 3px solid #ea580c; }
    .check-item b { display: block; font-size: 13px; color: #0f172a; margin-bottom: 3px; }
    .check-item span { font-size: 11.5px; color: #64748b; line-height: 1.45; display: block; }
    .photo-box { position: relative; height: 300px; border-radius: 10px; overflow: hidden; box-shadow: 0 18px 40px rgba(15,23,42,0.14); border: 4px solid #fff; }
    .photo-box img { width: 100%; height: 100%; }
    .photo-accent { position: absolute; bottom: 14px; left: 14px; background: #ea580c; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .services { background: #091931; color: #fff; padding: 34px 54px 38px; text-align: center; }
    .services h3 { font-size: 24px; font-weight: 800; margin-top: 4px; }
    .services h3 span { color: #f97316; }
    .srv-grid { margin-top: 22px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: left; }
    .srv-card { background: #ffffff; color: #0f172a; border-radius: 8px; padding: 16px 14px; border-top: 3px solid #ea580c; }
    .srv-icon { width: 30px; height: 30px; border-radius: 6px; background: #fff7ed; color: #ea580c; display: grid; place-items: center; font-weight: 800; font-size: 14px; margin-bottom: 9px; }
    .srv-card b { font-size: 12.5px; display: block; margin-bottom: 4px; }
    .srv-card p { font-size: 10.5px; color: #64748b; line-height: 1.4; }
  </style></head><body><div class="page">
    <div class="topbar"><b>Framing<span>Construction</span></b><span>✉ estimating@framingpro.com &nbsp;|&nbsp; ☎ (512) 555-0194</span></div>
    <div class="nav"><div class="nav-links"><span>Home</span><span>About</span><span>Services</span><span>Projects</span><span>Reviews</span></div><span class="nav-cta">Request Bid</span></div>
    <div class="hero"><img src="${PHOTOS.framingHero}" alt=""/><div class="hero-overlay"></div><div class="hero-inner">
      <span class="hero-kicker">Licensed Structural Contractors</span>
      <h1>Building Strong Foundations for <em>Every Project</em></h1>
      <p>Precision wood & light-gauge steel structural framing for custom residences, multi-family podiums, and commercial developments.</p>
      <div class="hero-btns"><span class="btn-orange">Request a Project Bid →</span><span class="btn-ghost">View Completed Frames</span></div>
    </div></div>
    <div class="about">
      <div>
        <div class="tag">● About Our Crews</div>
        <h2>Crafting <span>Strong Foundations</span> With Precision And Pride</h2>
        <div class="check-item"><b>Precision Blueprint Framing</b><span>Laser-leveled plates, dead-plumb walls, and engineered roof trusses ready for first-pass inspection.</span></div>
        <div class="check-item"><b>Schedule & Safety Discipline</b><span>Dedicated site superintendents and OSHA-certified crews keeping downstream trades ahead of schedule.</span></div>
        <div class="check-item"><b>Turnkey Lumber & Takeoff</b><span>Complete structural hardware, LVL/Glulam beams, and crane coordination handled end-to-end.</span></div>
        <div style="margin-top:16px"><span class="btn-orange" style="display:inline-block">Explore Our Process</span></div>
      </div>
      <div class="photo-box"><img src="${PHOTOS.framingTeam}" alt=""/><div class="photo-accent">25+ Years · 480+ Structures Framed</div></div>
    </div>
    <div class="services">
      <div class="tag" style="justify-content:center;color:#fb923c">● Our Services Overview</div>
      <h3>Building <span>Excellence</span>, One Frame At A Time</h3>
      <div class="srv-grid">
        <div class="srv-card"><div class="srv-icon">01</div><b>Residential Framing</b><p>Custom estates, vaulted timber ceilings & complex rooflines.</p></div>
        <div class="srv-card"><div class="srv-icon">02</div><b>Commercial Shells</b><p>Light-gauge steel studs, retail build-outs & structural mezzanines.</p></div>
        <div class="srv-card"><div class="srv-icon">03</div><b>Multi-Family Builds</b><p>High-velocity townhome & apartment framing packages.</p></div>
        <div class="srv-card"><div class="srv-icon">04</div><b>Truss & Beam Retrofits</b><p>Engineered floor/roof trusses and load-bearing beam installs.</p></div>
      </div>
    </div>
  </div></body></html>`,

  'ghl-website-life-insurance': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #042454; display: flex; flex-direction: column; }
    .hero { background: radial-gradient(circle at 50% 25%, #0c3b80 0%, #042454 72%); padding: 22px 48px 46px; color: #fff; text-align: center; }
    .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; font-size: 12px; color: #bfdbfe; }
    .brand { font-weight: 800; font-size: 16px; color: #fff; display: flex; align-items: center; gap: 8px; }
    .brand i { width: 22px; height: 22px; border-radius: 50%; background: #38bdf8; display: inline-block; }
    .nav-links { display: flex; gap: 20px; }
    .hero h1 { font-size: 36px; font-weight: 800; letter-spacing: -.6px; }
    .hero p { font-size: 13px; color: #cbd5e1; max-width: 560px; margin: 10px auto 26px; line-height: 1.5; }
    .circles { display: flex; justify-content: center; gap: 18px; margin-bottom: 8px; }
    .circle { width: 150px; height: 150px; border-radius: 50%; padding: 6px; background: linear-gradient(135deg, #fb7185, #38bdf8); box-shadow: 0 14px 30px rgba(0,0,0,0.28); }
    .circle img { width: 100%; height: 100%; border-radius: 50%; border: 3px solid #042454; }
    .services-wrap { background: #ffffff; border-radius: 34px 34px 0 0; padding: 38px 52px 34px; text-align: center; flex: 1; }
    .kicker { font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; }
    .services-wrap h2 { font-size: 26px; font-weight: 800; color: #072a5e; margin-top: 4px; margin-bottom: 22px; }
    .grid6 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; text-align: left; }
    .icard { background: #fdf6ec; border: 1px solid #f5e6d0; border-radius: 12px; padding: 16px; }
    .icard-ico { width: 30px; height: 30px; border-radius: 8px; background: #e0f2fe; color: #0369a1; display: grid; place-items: center; font-weight: 800; font-size: 13px; margin-bottom: 8px; }
    .icard b { font-size: 13px; color: #0f172a; display: block; margin-bottom: 4px; }
    .icard p { font-size: 11px; color: #64748b; line-height: 1.45; }
    .bottom-band { position: relative; background: linear-gradient(90deg, #072a5e 0%, #0f3a7d 100%); padding: 32px 52px 36px; color: #fff; }
    .bottom-band h3 { font-size: 24px; font-weight: 800; margin-bottom: 18px; }
    .step3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .scard { background: #ffffff; color: #0f172a; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 10px 24px rgba(0,0,0,0.16); }
    .scard span { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: #072a5e; color: #fff; font-size: 12px; font-weight: 800; margin-bottom: 8px; }
    .scard b { display: block; font-size: 12.5px; margin-bottom: 4px; }
    .scard p { font-size: 10.5px; color: #64748b; line-height: 1.4; }
    .stats-strip { background: #ffffff; padding: 14px 52px; display: flex; justify-content: space-around; border-top: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; color: #072a5e; }
  </style></head><body><div class="page">
    <div class="hero">
      <div class="nav"><div class="brand"><i></i> GUARDIAN LIFE</div><div class="nav-links"><span>Home</span><span>Coverage</span><span>Advisors</span><span>Claims</span><span>Get Quote</span></div></div>
      <h1>Secure Your Future With Ease.</h1>
      <p>Independent fiduciary protection across 30+ A+ rated life & retirement carriers—built around the people who count on you.</p>
      <div class="circles">
        <div class="circle"><img src="${PHOTOS.insuranceFamily1}" alt=""/></div>
        <div class="circle"><img src="${PHOTOS.insuranceFamily2}" alt=""/></div>
        <div class="circle"><img src="${PHOTOS.insuranceFamily3}" alt=""/></div>
        <div class="circle"><img src="${PHOTOS.insuranceFamily4}" alt=""/></div>
      </div>
    </div>
    <div class="services-wrap">
      <span class="kicker">Tailored Coverage Architecture</span>
      <h2>We Provide Best Services</h2>
      <div class="grid6">
        <div class="icard"><div class="icard-ico">♥</div><b>Term Life Protection</b><p>10, 20 & 30-year level-premium family income protection with living benefits.</p></div>
        <div class="icard"><div class="icard-ico">★</div><b>Whole & Universal Life</b><p>Guaranteed lifelong coverage with tax-advantaged cash value growth.</p></div>
        <div class="icard"><div class="icard-ico">⌂</div><b>Mortgage Shield</b><p>Keep your family home paid off and protected against life’s uncertainties.</p></div>
        <div class="icard"><div class="icard-ico">✚</div><b>Critical Illness Riders</b><p>Tax-free living benefit advances when health challenges arise.</p></div>
        <div class="icard"><div class="icard-ico">◈</div><b>Business Key-Person</b><p>Buy-sell funding and executive continuity plans for founders.</p></div>
        <div class="icard"><div class="icard-ico">☀</div><b>Fixed Annuities</b><p>Principal-protected lifetime retirement income with zero market downside.</p></div>
      </div>
    </div>
    <div class="bottom-band">
      <h3>Secure tomorrow, enjoy today.</h3>
      <div class="step3">
        <div class="scard"><span>01</span><b>Compare 30+ Carriers</b><p>Instant side-by-side quotes with zero hard inquiry.</p></div>
        <div class="scard"><span>02</span><b>Tailor Policy Riders</b><p>Customize term length, coverage & living benefits.</p></div>
        <div class="scard"><span>03</span><b>Same-Day Coverage</b><p>No-exam digital approval available for most applicants.</p></div>
      </div>
    </div>
    <div class="stats-strip"><span>50K+ Families Insured</span><span>A+ Superior Carriers</span><span>99.1% Claims Paid</span><span>10-Min Approval</span></div>
  </div></body></html>`,

  'ghl-website-pharmacy': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; }
    .nav { padding: 16px 48px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eef2f6; font-size: 12px; color: #334155; }
    .brand { font-weight: 800; font-size: 15px; color: #0f5132; display: flex; align-items: center; gap: 8px; }
    .brand i { width: 20px; height: 20px; border-radius: 5px; background: #0f5132; color: #fff; display: inline-grid; place-items: center; font-style: normal; font-size: 12px; }
    .nav-btn { background: #0f5132; color: #fff; padding: 7px 14px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .hero { padding: 38px 52px 32px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 34px; align-items: center; }
    .pill { display: inline-block; color: #0f5132; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 11px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
    .hero h1 { font-size: 36px; line-height: 1.12; font-weight: 800; color: #0f172a; letter-spacing: -.8px; }
    .hero p { font-size: 13px; color: #475569; line-height: 1.55; margin-top: 12px; }
    .cta-row { display: flex; gap: 10px; margin-top: 20px; }
    .btn-coral { background: #e05a3a; color: #fff; padding: 10px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .btn-outline { border: 1px solid #cbd5e1; color: #0f172a; padding: 10px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .hero-img { height: 270px; border-radius: 14px; overflow: hidden; box-shadow: 0 14px 34px rgba(15,81,50,0.10); }
    .hero-img img { width: 100%; height: 100%; }
    .quick4 { padding: 10px 52px 34px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .qcard { border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; background: #fff; }
    .qico { width: 28px; height: 28px; border-radius: 7px; background: #ecfdf5; color: #0f5132; display: grid; place-items: center; font-weight: 800; font-size: 13px; margin-bottom: 9px; }
    .qcard b { font-size: 12.5px; display: block; margin-bottom: 4px; }
    .qcard p { font-size: 10.5px; color: #64748b; line-height: 1.4; }
    .mint-band { background: #f0fdf7; padding: 34px 52px; border-block: 1px solid #d1fae5; }
    .band-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px; }
    .band-head h2 { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .band-head span { font-size: 11.5px; color: #e05a3a; font-weight: 700; }
    .care4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .ccard { background: #fff; border: 1px solid #d1fae5; border-radius: 10px; padding: 16px; }
    .ccard b { font-size: 12.5px; display: block; margin-bottom: 5px; color: #0f5132; }
    .ccard p { font-size: 10.5px; color: #475569; line-height: 1.45; }
    .neighbor { padding: 34px 52px; flex: 1; background: #fff; }
    .neighbor h3 { font-size: 23px; font-weight: 800; max-width: 380px; line-height: 1.2; margin-bottom: 16px; }
    .n-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .ncard { background: #f8fafc; border-radius: 10px; padding: 14px 16px; border: 1px solid #e2e8f0; }
    .ncard b { font-size: 12px; display: block; margin-bottom: 3px; }
    .ncard p { font-size: 10.5px; color: #64748b; line-height: 1.4; }
  </style></head><body><div class="page">
    <div class="nav"><div class="brand"><i>✚</i> ELMWOOD PHARMACY</div><div>Refills &nbsp;&nbsp; Transfer Rx &nbsp;&nbsp; Vaccines &nbsp;&nbsp; Compounding</div><span class="nav-btn">Refill Online</span></div>
    <div class="hero">
      <div>
        <span class="pill">● Your Neighborhood Clinical Pharmacy</span>
        <h1>Prescriptions made simple. Care that feels personal.</h1>
        <p>Refill in seconds, transfer prescriptions seamlessly without calling your old chain store, and enjoy free same-day local delivery.</p>
        <div class="cta-row"><span class="btn-coral">Refill Prescription</span><span class="btn-outline">Transfer Rx in 60s</span></div>
      </div>
      <div class="hero-img"><img src="${PHOTOS.pharmacyConsult}" alt=""/></div>
    </div>
    <div class="quick4">
      <div class="qcard"><div class="qico">↻</div><b>Refill Prescription</b><p>Ready in under 12 minutes with SMS pickup alerts.</p></div>
      <div class="qcard"><div class="qico">⇄</div><b>Transfer Prescription</b><p>We handle every call with your doctor & old pharmacy.</p></div>
      <div class="qcard"><div class="qico">✦</div><b>Ask a Pharmacist</b><p>Direct 1-on-1 copay savings & interaction checks.</p></div>
      <div class="qcard"><div class="qico">⛟</div><b>Free Local Delivery</b><p>Same-day doorstep courier service at $0 extra cost.</p></div>
    </div>
    <div class="mint-band">
      <div class="band-head"><div><small style="color:#0f5132;font-weight:700;font-size:11px">CLINICAL SERVICES</small><h2>Everything you need in one place.</h2></div><span>View all services →</span></div>
      <div class="care4">
        <div class="ccard"><b>Med-Sync Packs</b><p>All monthly refills aligned to one simple delivery day.</p></div>
        <div class="ccard"><b>Immunizations</b><p>Walk-in Flu, RSV, Shingles & travel vaccines.</p></div>
        <div class="ccard"><b>Custom Compounding</b><p>Tailored pediatric, dermatology & pet formulations.</p></div>
        <div class="ccard"><b>Medicare Part D</b><p>Annual plan reviews to lower your out-of-pocket costs.</p></div>
      </div>
    </div>
    <div class="neighbor">
      <small style="color:#e05a3a;font-weight:700;font-size:11px">WHY PATIENTS SWITCH</small>
      <h3>A pharmacy that treats you like a neighbor.</h3>
      <div class="n-grid">
        <div class="ncard"><b>12-Minute Average Fill</b><p>Skip long retail lines with express counter & drive-thru care.</p></div>
        <div class="ncard"><b>Automatic Copay Lookup</b><p>We apply manufacturer savings cards automatically.</p></div>
        <div class="ncard"><b>All Major Plans Accepted</b><p>Commercial, Medicare Part D, and competitive cash pricing.</p></div>
      </div>
    </div>
  </div></body></html>`,

  'ghl-funnel-mortgage-company': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; }
    .top { padding: 18px 54px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
    .logo { font-weight: 900; font-size: 15px; letter-spacing: -.3px; color: #0f1f38; }
    .cta-amber { background: #d97706; color: #fff; font-size: 11.5px; font-weight: 700; padding: 9px 18px; border-radius: 6px; }
    .trust-strip { display: flex; justify-content: space-around; padding: 11px 54px; background: #fafafa; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .6px; }
    .hero { padding: 42px 54px 36px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 36px; align-items: center; }
    .hero h1 { font-size: 40px; line-height: 1.1; font-weight: 800; color: #0f1f38; letter-spacing: -.9px; }
    .hero p { font-size: 13px; color: #475569; line-height: 1.55; margin: 14px 0 22px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 26px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .metrics b { font-size: 20px; color: #0f1f38; display: block; }
    .metrics span { font-size: 11px; color: #64748b; }
    .house { height: 350px; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 44px rgba(15,31,56,0.14); }
    .house img { width: 100%; height: 100%; }
    .afford { padding: 30px 54px 40px; background: #f8fafc; border-top: 1px solid #eef2f6; flex: 1; }
    .afford-head { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: end; margin-bottom: 22px; }
    .afford-head h2 { font-size: 25px; font-weight: 800; color: #0f1f38; line-height: 1.2; }
    .afford-head p { font-size: 12px; color: #64748b; line-height: 1.5; }
    .cards4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .acard { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .acard i { display: inline-block; width: 24px; height: 4px; border-radius: 2px; background: #d97706; margin-bottom: 10px; }
    .acard b { font-size: 12.5px; display: block; margin-bottom: 5px; color: #0f1f38; }
    .acard p { font-size: 10.5px; color: #64748b; line-height: 1.45; }
    .dark-steps { background: #0f1f38; color: #fff; padding: 36px 54px 42px; }
    .dark-steps-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 22px; }
    .dark-steps h3 { font-size: 24px; font-weight: 800; margin-top: 4px; }
    .sgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .sbox { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 16px; }
    .snum { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 5px; background: #d97706; color: #fff; font-size: 11px; font-weight: 800; margin-bottom: 10px; }
    .sbox b { display: block; font-size: 12.5px; margin-bottom: 4px; }
    .sbox p { font-size: 10.5px; color: #94a3b8; line-height: 1.45; }
  </style></head><body><div class="page">
    <div class="top"><span class="logo">CLEARPATH MORTGAGE</span><span class="cta-amber">Get Pre-Qualified</span></div>
    <div class="trust-strip"><span>✓ NMLS Licensed Lenders</span><span>✓ Zero Hard Credit Inquiry</span><span>✓ Verified Offer Letters</span></div>
    <div class="hero">
      <div>
        <h1>Get Your Free Mortgage Pre-Qualification.</h1>
        <p>Understand what you can comfortably afford and take the first step toward buying a home — with personalized rate guidance from senior mortgage specialists.</p>
        <div><span class="cta-amber" style="padding:12px 24px;font-size:12.5px;display:inline-block">Get Pre-Qualified →</span></div>
        <div class="metrics">
          <div><b>$0</b><span>To get pre-qualified</span></div>
          <div><b>3 mins</b><span>To complete online</span></div>
          <div><b>No Pull</b><span>Zero score impact</span></div>
        </div>
      </div>
      <div class="house"><img src="${PHOTOS.mortgageHome}" alt=""/></div>
    </div>
    <div class="afford">
      <div class="afford-head">
        <div><small style="color:#d97706;font-weight:800;font-size:10.5px;letter-spacing:1px">BUYING POWER CLARITY</small><h2>Know What You May Be Able to Afford</h2></div>
        <p>Before touring homes, unlock an accurate monthly payment range across Conventional, FHA, VA, and Jumbo loan options.</p>
      </div>
      <div class="cards4">
        <div class="acard"><i></i><b>See Your Range</b><p>Clear price & monthly PITI estimate tailored to your comfort zone.</p></div>
        <div class="acard"><i></i><b>Compare Loan Types</b><p>Side-by-side Conventional, FHA 3.5%, and VA 0%-down scenarios.</p></div>
        <div class="acard"><i></i><b>Down-Payment Aid</b><p>Check local closing-cost grants and first-time buyer incentives.</p></div>
        <div class="acard"><i></i><b>Stronger Offers</b><p>Stand out to listing agents with a verified local pre-qual letter.</p></div>
      </div>
    </div>
    <div class="dark-steps">
      <div class="dark-steps-head"><div><small style="color:#fbbf24;font-weight:700;font-size:10.5px;letter-spacing:1px">THE PROCESS</small><h3>Getting Started Is Simple</h3></div><span style="font-size:11.5px;color:#cbd5e1">4 streamlined steps · Zero obligation</span></div>
      <div class="sgrid">
        <div class="sbox"><span class="snum">1</span><b>Complete the Form</b><p>Answer 6 quick home & budget questions in under 3 minutes.</p></div>
        <div class="sbox"><span class="snum">2</span><b>Connect With a Pro</b><p>A dedicated loan officer reviews your goals—never a call center.</p></div>
        <div class="sbox"><span class="snum">3</span><b>Review Options</b><p>Compare custom rate locks, down payments & monthly totals.</p></div>
        <div class="sbox"><span class="snum">4</span><b>Shop With Confidence</b><p>Receive your pre-qualification letter ready for weekend tours.</p></div>
      </div>
    </div>
  </div></body></html>`,

  'ghl-funnel-brake-muffler': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; }
    .top { padding: 15px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
    .brand { font-weight: 900; font-size: 16px; color: #111827; letter-spacing: -.4px; }
    .brand span { color: #dc2626; }
    .btn-red { background: #dc2626; color: #fff; padding: 9px 18px; border-radius: 5px; font-size: 11.5px; font-weight: 800; }
    .hero { padding: 34px 50px 30px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 32px; align-items: center; background: #fafafa; border-bottom: 1px solid #eef2f6; }
    .badge { display: inline-block; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 4px; font-size: 10.5px; font-weight: 800; margin-bottom: 10px; }
    .hero h1 { font-size: 42px; line-height: 1.02; font-weight: 900; color: #111827; letter-spacing: -1px; }
    .hero h1 span { color: #dc2626; }
    .hero p { font-size: 12.5px; color: #4b5563; line-height: 1.55; margin: 12px 0 18px; }
    .stars { margin-top: 16px; font-size: 11.5px; color: #374151; font-weight: 700; }
    .stars b { color: #f59e0b; }
    .mech-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 14px 32px rgba(0,0,0,0.10); border: 1px solid #e5e7eb; }
    .mech-card img { width: 100%; height: 225px; }
    .mech-foot { padding: 11px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 700; }
    .mid { padding: 34px 50px; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 30px; align-items: center; }
    .mid h2 { font-size: 24px; font-weight: 900; color: #111827; line-height: 1.15; margin-bottom: 12px; }
    .mid ul { list-style: none; display: grid; gap: 7px; font-size: 12px; color: #374151; margin-bottom: 16px; }
    .mid li::before { content: '✓ '; color: #dc2626; font-weight: 900; }
    .zero-box { background: #111827; color: #fff; border-radius: 12px; padding: 26px; text-align: center; box-shadow: 0 18px 36px rgba(17,24,39,0.2); }
    .zero-box big { font-size: 54px; font-weight: 900; line-height: 1; display: block; margin: 6px 0; }
    .zero-box p { font-size: 11.5px; color: #9ca3af; margin-bottom: 16px; }
    .strip5 { padding: 10px 50px 34px; text-align: center; flex: 1; }
    .strip5 h3 { font-size: 20px; font-weight: 900; margin-bottom: 16px; }
    .row5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .p5 { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 8px; background: #fff; }
    .p5 i { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; background: #fef2f2; color: #dc2626; font-style: normal; font-weight: 900; font-size: 12px; margin-bottom: 7px; }
    .p5 b { display: block; font-size: 10.5px; color: #111827; }
    .dark-foot { background: #111827; color: #fff; padding: 30px 50px 34px; text-align: center; }
    .dark-foot h4 { font-size: 20px; font-weight: 900; margin: 4px 0 16px; }
    .check5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .cbox { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 14px 10px; font-size: 11px; font-weight: 700; color: #e5e7eb; }
  </style></head><body><div class="page">
    <div class="top"><span class="brand">APEX <span>BRAKE & MUFFLER</span></span><div><span style="font-size:12px;font-weight:700;margin-right:14px">☎ (555) 890-2400</span><span class="btn-red">Book Free Check</span></div></div>
    <div class="hero">
      <div>
        <span class="badge">LIMITED LOCAL VOUCHER · $0 INSPECTION</span>
        <h1><span>FREE</span> BRAKE INSPECTION</h1>
        <p>Grinding, squeaking, or soft pedal? Don’t guess with safety. Our ASE-certified techs check your full brake & exhaust system and show you exact measurements—at $0 cost.</p>
        <div><span class="btn-red" style="padding:11px 22px;display:inline-block">Schedule My Free Inspection</span></div>
        <div class="stars"><b>★★★★★</b> 4.9 Rating (480+ Local Drivers) &nbsp;·&nbsp; ASE Certified Shop</div>
      </div>
      <div class="mech-card"><img src="${PHOTOS.brakeMechanic}" alt=""/><div class="mech-foot"><span style="color:#dc2626">$0 Multi-Point Inspection</span><span>35–45 Min Express Bay</span></div></div>
    </div>
    <div class="mid">
      <div>
        <small style="color:#dc2626;font-weight:800;font-size:10.5px">HONEST WRITTEN DIAGNOSTICS</small>
        <h2>A COMPLETE BRAKE CHECK — AT NO COST.</h2>
        <ul>
          <li>Front & rear brake pad millimeter measurement</li>
          <li>Rotor surface, runout & caliper slide inspection</li>
          <li>Brake fluid moisture & hydraulic line safety test</li>
          <li>Complete muffler, exhaust hanger & leak check</li>
        </ul>
        <span class="btn-red" style="display:inline-block">Claim Your Free Inspection</span>
      </div>
      <div class="zero-box"><small style="color:#fca5a5;font-weight:800;font-size:11px">VOUCHER PRICE TODAY</small><big>$0</big><p>Zero shop fee · Written estimate before any wrench turns</p><span class="btn-red" style="display:block;width:100%">Reserve Express Lift Bay</span></div>
    </div>
    <div class="strip5">
      <h3>WHY DRIVERS TRUST OUR SHOP</h3>
      <div class="row5">
        <div class="p5"><i>01</i><b>ASE Certified Techs</b></div>
        <div class="p5"><i>02</i><b>Same-Day Service</b></div>
        <div class="p5"><i>03</i><b>Upfront Written Quote</b></div>
        <div class="p5"><i>04</i><b>24k-Mile Warranty</b></div>
        <div class="p5"><i>05</i><b>Zero Upsell Pressure</b></div>
      </div>
    </div>
    <div class="dark-foot">
      <small style="color:#f87171;font-weight:800;font-size:10px;letter-spacing:1px">5-POINT SAFETY PROTOCOL</small>
      <h4>WHAT WE CHECK ON THE LIFT</h4>
      <div class="check5">
        <div class="cbox">Brake Pads & Shoes</div>
        <div class="cbox">Rotors & Drums</div>
        <div class="cbox">Calipers & Hoses</div>
        <div class="cbox">Master Cylinder</div>
        <div class="cbox">Exhaust & Muffler</div>
      </div>
    </div>
  </div></body></html>`,

  'ghl-funnel-locksmith': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; }
    .dark-top { background: #0a1122; color: #fff; padding: 20px 46px 38px; }
    .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
    .logo { font-weight: 900; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .logo i { width: 18px; height: 18px; border-radius: 4px; background: #ff5a00; display: inline-block; }
    .pill-live { background: rgba(255,90,0,0.16); border: 1px solid rgba(255,90,0,0.45); color: #ff8a4c; padding: 5px 12px; border-radius: 99px; font-size: 10.5px; font-weight: 700; }
    .bento-top { display: grid; grid-template-columns: 1.35fr 0.85fr; gap: 14px; }
    .hero-card { background: #121c33; border: 1px solid #1f2d4d; border-radius: 14px; padding: 28px; }
    .hero-card h1 { font-size: 34px; line-height: 1.12; font-weight: 800; margin: 8px 0 12px; }
    .hero-card p { font-size: 12.5px; color: #94a3b8; line-height: 1.5; margin-bottom: 18px; }
    .btn-orange { background: #ff5a00; color: #fff; padding: 10px 18px; border-radius: 7px; font-size: 12px; font-weight: 800; display: inline-block; }
    .call-stack { display: grid; gap: 14px; }
    .orange-card { background: #ff5a00; color: #fff; border-radius: 14px; padding: 22px; display: flex; flex-direction: column; justify-content: center; }
    .orange-card small { font-size: 10.5px; font-weight: 800; text-transform: uppercase; opacity: 0.9; }
    .orange-card strong { font-size: 26px; font-weight: 900; margin: 6px 0 4px; letter-spacing: -.5px; }
    .sub-dark { background: #121c33; border: 1px solid #1f2d4d; border-radius: 14px; padding: 16px 20px; font-size: 12px; color: #cbd5e1; }
    .bento-stats { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 14px; margin-top: 14px; }
    .stat-card { background: #121c33; border: 1px solid #1f2d4d; border-radius: 12px; padding: 18px 20px; }
    .stat-card b { font-size: 24px; display: block; margin-bottom: 3px; }
    .stat-card span { font-size: 11px; color: #94a3b8; }
    .key-img { border-radius: 12px; overflow: hidden; height: 92px; border: 1px solid #1f2d4d; }
    .key-img img { width: 100%; height: 100%; }
    .mid { padding: 34px 46px 26px; flex: 1; }
    .mid h2 { font-size: 25px; font-weight: 800; color: #0a1122; line-height: 1.18; margin: 4px 0 18px; max-width: 420px; }
    .open-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 14px; }
    .home-lock { position: relative; border-radius: 14px; overflow: hidden; height: 245px; }
    .home-lock img { width: 100%; height: 100%; }
    .home-lock div { position: absolute; inset: auto 0 0 0; padding: 18px; background: linear-gradient(transparent, rgba(10,17,34,0.92)); color: #fff; }
    .right-bento { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .bcard { background: #0f192e; color: #fff; border-radius: 12px; padding: 16px; }
    .bcard.wide { grid-column: 1 / -1; }
    .bcard b { font-size: 13.5px; display: block; margin-bottom: 4px; color: #ff8a4c; }
    .bcard p { font-size: 11px; color: #cbd5e1; line-height: 1.45; }
    .why { padding: 0 46px 34px; }
    .why-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .wcard { background: #0f192e; color: #fff; border-radius: 12px; padding: 16px 18px; }
    .wcard b { font-size: 13px; color: #fff; display: block; margin-bottom: 4px; }
    .wcard p { font-size: 11px; color: #94a3b8; }
    .van-card { border-radius: 12px; overflow: hidden; height: 84px; }
    .van-card img { width: 100%; height: 100%; }
  </style></head><body><div class="page">
    <div class="dark-top">
      <div class="nav"><span class="logo"><i></i> RAPIDKEY 24/7</span><span class="pill-live">● Techs On Standby · 24/7 Dispatch</span><span class="btn-orange" style="padding:7px 14px;font-size:11px">Call Now</span></div>
      <div class="bento-top">
        <div class="hero-card">
          <small style="color:#ff8a4c;font-weight:800;font-size:10.5px">EMERGENCY MOBILE LOCKSMITH</small>
          <h1>Locked out? We'll get you back in — fast.</h1>
          <p>24/7 damage-free emergency lockout rescue for vehicles, homes, and offices. Licensed mobile vans with flat upfront pricing.</p>
          <span class="btn-orange">Dispatch Nearest Tech →</span>
        </div>
        <div class="call-stack">
          <div class="orange-card"><small>24/7 Direct Dispatch</small><strong>(214) 555-5555</strong><span style="font-size:11px">Tap to call · Live dispatcher answers in 5s</span></div>
          <div class="sub-dark"><b style="color:#fff;display:block;margin-bottom:3px">Upfront Flat Quote</b><span>Exact price confirmed before our van rolls.</span></div>
        </div>
      </div>
      <div class="bento-stats">
        <div class="stat-card"><b>~15 min</b><span>Average local arrival time</span></div>
        <div class="stat-card"><b>4.9 ★</b><span>1,240+ verified rescues</span></div>
        <div class="key-img"><img src="${PHOTOS.locksmithKeys}" alt=""/></div>
      </div>
    </div>
    <div class="mid">
      <small style="color:#ff5a00;font-weight:800;font-size:10.5px;letter-spacing:.8px">DAMAGE-FREE ENTRY & REKEY</small>
      <h2>Whatever you're locked out of, we open it.</h2>
      <div class="open-grid">
        <div class="home-lock"><img src="${PHOTOS.locksmithDoor}" alt=""/><div><b style="font-size:15px;display:block">Home Lockouts & Rekey</b><span style="font-size:11px;color:#cbd5e1">Deadbolts, smart locks & instant key changes.</span></div></div>
        <div class="right-bento">
          <div class="bcard wide"><b>Car Lockouts & Key Fobs</b><p>All makes & push-to-start transponders opened and programmed on-site without towing.</p></div>
          <div class="bcard"><b>Office & Storefront</b><p>Commercial cylinders, panic bars & master keys.</p></div>
          <div class="bcard"><b>Broken Key Rescue</b><p>Clean extraction & fresh laser-cut replacement.</p></div>
        </div>
      </div>
    </div>
    <div class="why">
      <div class="why-grid">
        <div class="wcard"><b>Licensed, Bonded & Insured</b><p>State-certified technicians in marked GPS service vans.</p></div>
        <div class="wcard"><b>No Hidden Arrival Multipliers</b><p>Honest flat-rate quotes day, night, weekends, and holidays.</p></div>
        <div class="wcard"><b>$25 Off Rekey Package</b><p>Upgrade home or commercial security on the same visit.</p></div>
        <div class="van-card"><img src="${PHOTOS.locksmithVan}" alt=""/></div>
      </div>
    </div>
  </div></body></html>`,

  'ghl-form-flooring-quote': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ded7cf; padding: 38px 66px; display: flex; flex-direction: column; }
    .sheet { background: #ffffff; border-radius: 8px; box-shadow: 0 16px 40px rgba(28,25,23,0.10); padding: 42px 50px; flex: 1; display: flex; flex-direction: column; }
    h1 { font-size: 31px; font-weight: 800; color: #1c1917; letter-spacing: -.6px; }
    .sub { font-size: 13px; color: #57534e; line-height: 1.5; margin: 8px 0 24px; padding-bottom: 18px; border-bottom: 1px solid #e7e5e4; }
    .field { margin-bottom: 15px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #292524; margin-bottom: 6px; }
    label em { color: #dc2626; font-style: normal; }
    .input { height: 38px; border: 1px solid #d6d3d1; border-radius: 5px; background: #fafaf9; padding: 0 12px; display: flex; align-items: center; font-size: 12px; color: #a8a29e; justify-content: space-between; }
    .radios { display: grid; gap: 9px; margin-top: 8px; padding: 4px 0; }
    .radio { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #292524; font-weight: 500; }
    .radio i { width: 15px; height: 15px; border-radius: 50%; border: 1.8px solid #a8a29e; display: inline-block; }
    .radio.checked i { border-color: #1e293b; box-shadow: inset 0 0 0 3.5px #fff; background: #1e293b; }
    .submit { margin-top: auto; background: #1e293b; color: #fff; height: 44px; border-radius: 6px; display: grid; place-items: center; font-size: 13px; font-weight: 700; letter-spacing: .2px; }
  </style></head><body><div class="page"><div class="sheet">
    <h1>Get Your Free Flooring Quote</h1>
    <p class="sub">Ready to transform your home or business with beautiful new flooring? Complete the form below, and our team will provide a customized, no-obligation quote tailored to your project.</p>
    <div class="field"><label>Full Name <em>*</em></label><div class="input"><span>Enter your full name</span></div></div>
    <div class="row2">
      <div class="field"><label>Email <em>*</em></label><div class="input"><span>✉ you@example.com</span></div></div>
      <div class="field"><label>Phone <em>*</em></label><div class="input"><span>+1 (555) 000-0000</span></div></div>
    </div>
    <div class="field"><label>Street Address <em>*</em></label><div class="input"><span>742 Evergreen Terrace</span></div></div>
    <div class="row2">
      <div class="field"><label>City</label><div class="input"><span>Austin</span></div></div>
      <div class="field"><label>State</label><div class="input"><span>TX</span></div></div>
    </div>
    <div class="row2">
      <div class="field"><label>Country</label><div class="input"><span>United States</span><span>▾</span></div></div>
      <div class="field"><label>Postal Code</label><div class="input"><span>78701</span></div></div>
    </div>
    <div class="field" style="margin-top:4px">
      <label>What Type of Flooring Are You Interested In?</label>
      <div class="radios">
        <div class="radio checked"><i></i><span>Hardwood</span></div>
        <div class="radio"><i></i><span>Luxury Vinyl Plank (LVP)</span></div>
        <div class="radio"><i></i><span>Laminate</span></div>
        <div class="radio"><i></i><span>Tile</span></div>
        <div class="radio"><i></i><span>Carpet</span></div>
        <div class="radio"><i></i><span>Engineered Wood</span></div>
        <div class="radio"><i></i><span>Not Sure Yet</span></div>
      </div>
    </div>
    <div class="field"><label>Project Flooring Scope</label><div class="input"><span>Select project scope...</span><span>▾</span></div></div>
    <div class="field"><label>Approximate Project Size</label><div class="input"><span>Select square footage range...</span><span>▾</span></div></div>
    <div class="submit">Get My Free Flooring Quote →</div>
  </div></div></body></html>`,

  'ghl-form-personal-trainer': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #f8fafc; padding: 38px 36px; display: flex; flex-direction: column; justify-content: flex-start; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(15,23,42,0.12); border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1.24fr 0.76fr; min-height: 980px; }
    .left { padding: 40px 38px; display: flex; flex-direction: column; }
    h1 { font-size: 34px; line-height: 1.05; font-weight: 900; color: #111827; letter-spacing: -.8px; text-transform: uppercase; }
    h1 mark { background: none; color: #eab308; }
    .nope { margin: 14px 0 12px; font-size: 12.5px; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 7px; }
    .nope i { color: #dc2626; font-style: normal; font-weight: 900; }
    .desc { font-size: 13px; color: #374151; line-height: 1.5; margin-bottom: 24px; }
    .inp { height: 42px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 13px; display: flex; align-items: center; font-size: 12.5px; color: #94a3b8; margin-bottom: 14px; background: #fff; justify-content: space-between; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .area { height: 84px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 11px 13px; font-size: 12px; color: #94a3b8; line-height: 1.45; margin-bottom: 16px; }
    .chk { display: grid; grid-template-columns: 16px 1fr; gap: 10px; font-size: 11px; color: #374151; line-height: 1.45; margin-bottom: 14px; }
    .chk i { width: 15px; height: 15px; border: 1.5px solid #94a3b8; border-radius: 3px; margin-top: 2px; }
    .cta { margin-top: 10px; background: #facc15; color: #111827; height: 48px; border-radius: 99px; display: grid; place-items: center; font-size: 13px; font-weight: 900; letter-spacing: .4px; box-shadow: 0 8px 20px rgba(250,204,21,0.38); }
    .links { text-align: center; margin-top: 14px; font-size: 11px; color: #2563eb; text-decoration: underline; }
    .right { position: relative; background: #facc15; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
    .right img { position: absolute; inset: 0; width: 100%; height: 100%; object-position: center top; }
    .right-grad { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(250,204,21,0.12) 45%, rgba(250,204,21,0.95) 92%); }
    .stamp { position: relative; z-index: 2; padding: 28px 22px; text-align: center; }
    .stamp strong { font-size: 46px; font-weight: 900; letter-spacing: 2px; color: #111827; display: block; line-height: 1; -webkit-text-stroke: 1px #111827; }
    .stamp span { font-size: 18px; font-style: italic; font-weight: 700; color: #1f2937; }
  </style></head><body><div class="page"><div class="card">
    <div class="left">
      <h1>LET'S BUILD<br/><mark>YOUR WORKOUT</mark><br/>BLUEPRINT.</h1>
      <div class="nope"><i>✕</i> No generic templates</div>
      <p class="desc">Tell us a bit about your current routine, your goals, and how your body feels today so we can design a training plan tailored exactly to you.</p>
      <div class="inp"><span>Full Name</span></div>
      <div class="row2"><div class="inp"><span>+1 (555) 000-0000</span></div><div class="inp"><span>✉ Email Address</span></div></div>
      <div class="inp"><span>Primary Goal: Lean Strength & Conditioning</span><span>▾</span></div>
      <div class="area">Are there any current injuries, joint pains, or medical limitations we need to program around?</div>
      <div class="chk"><i></i><span>By checking this box, I consent to receive non-marketing text messages from <b>APEX PERFORMANCE</b> regarding my baseline assessment and session schedule. Reply STOP to opt out.</span></div>
      <div class="chk"><i></i><span>By checking this box, I consent to receive weekly training blueprints, nutrition guides, and member transformation openings.</span></div>
      <div class="cta">REQUEST MY BASELINE ASSESSMENT</div>
      <div class="links">Privacy Policy | Terms of Service</div>
    </div>
    <div class="right"><img src="${PHOTOS.trainerAthlete}" alt=""/><div class="right-grad"></div><div class="stamp"><strong>FITNESS</strong><span>level up</span></div></div>
  </div></div></body></html>`,

  'ghl-form-architecture-studio': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #f5f3ef; padding: 38px 36px; display: flex; flex-direction: column; }
    .card { background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 18px 44px rgba(17,17,17,0.09); border: 1px solid #e5e2dc; display: grid; grid-template-columns: 0.78fr 1.22fr; min-height: 980px; }
    .photo { position: relative; background: #e7e5e4; }
    .photo img { width: 100%; height: 100%; }
    .form { padding: 40px 40px; display: flex; flex-direction: column; }
    h1 { font-size: 25px; line-height: 1.22; font-weight: 800; color: #111111; text-align: center; letter-spacing: -.4px; }
    .sub { font-size: 12.5px; color: #52525b; text-align: center; line-height: 1.5; margin: 10px 0 26px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .fld { margin-bottom: 15px; }
    label { display: block; font-size: 11.5px; font-weight: 700; color: #18181b; margin-bottom: 6px; }
    label em { color: #dc2626; font-style: normal; }
    .inp { height: 39px; border: 1px solid #d4d4d8; border-radius: 6px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #a1a1aa; background: #fff; }
    .area { height: 88px; border: 1px solid #d4d4d8; border-radius: 6px; padding: 10px 12px; font-size: 12px; color: #a1a1aa; }
    .chk { display: grid; grid-template-columns: 15px 1fr; gap: 9px; font-size: 10.5px; color: #52525b; line-height: 1.45; margin: 6px 0 18px; }
    .chk i { width: 14px; height: 14px; border: 1.5px solid #a1a1aa; border-radius: 3px; margin-top: 2px; }
    .btn-black { margin-top: auto; background: #09090b; color: #ffffff; height: 46px; border-radius: 7px; display: grid; place-items: center; font-size: 12px; font-weight: 800; letter-spacing: .8px; }
  </style></head><body><div class="page"><div class="card">
    <div class="photo"><img src="${PHOTOS.architectStudio}" alt=""/></div>
    <div class="form">
      <h1>Every great space starts<br/>with a conversation.</h1>
      <p class="sub">Tell us a little about yourself and what you have in mind. Whether you are at the idea stage or ready to build, we would love to hear from you.</p>
      <div class="row2">
        <div class="fld"><label>Full Name</label><div class="inp"><span>Enter your full name</span></div></div>
        <div class="fld"><label>City / Location</label><div class="inp"><span>Enter your location</span></div></div>
      </div>
      <div class="row2">
        <div class="fld"><label>Phone <em>*</em></label><div class="inp"><span>+1 (555) 000-0000</span></div></div>
        <div class="fld"><label>Email <em>*</em></label><div class="inp"><span>✉ your@email.com</span></div></div>
      </div>
      <div class="fld"><label>Project type</label><div class="inp"><span>Select an option</span><span>▾</span></div></div>
      <div class="fld"><label>Approximate budget</label><div class="inp"><span>Select a range</span><span>▾</span></div></div>
      <div class="fld"><label>Desired start timeline</label><div class="inp"><span>Select an option</span><span>▾</span></div></div>
      <div class="fld"><label>Describe your project here</label><div class="area">Briefly describe your site, architectural goals, and vision...</div></div>
      <div class="chk"><i></i><span>By checking this box, I consent to receive studio consultation updates regarding my architectural inquiry. Reply STOP to opt out.</span></div>
      <div class="btn-black">START THE CONVERSATION</div>
    </div>
  </div></div></body></html>`,
};

const HERO_SOURCE_MAP = {
  'ghl-website-framing-construction': PHOTOS.framingHero,
  'ghl-website-life-insurance': PHOTOS.insuranceHero,
  'ghl-website-pharmacy': PHOTOS.pharmacyHero,
  'ghl-funnel-mortgage-company': PHOTOS.mortgageHome,
  'ghl-funnel-brake-muffler': PHOTOS.brakeMechanic,
  'ghl-funnel-locksmith': PHOTOS.locksmithKeys,
};

async function getFirebaseAccessToken() {
  const cliRequire = createRequire(new URL('../node_modules/.cache/firebase-deploy-cli/node_modules/firebase-tools/package.json', import.meta.url));
  const cliAuth = cliRequire('./lib/auth.js');
  const account = cliAuth.getProjectDefaultAccount(root) || cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error('No authenticated Firebase CLI account found.');
  }
  cliAuth.setRefreshToken(account.tokens.refresh_token);
  const res = await cliAuth.getAccessToken(
    account.tokens.refresh_token,
    account.tokens.scopes || ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
  );
  return res.access_token;
}

async function uploadToFirebaseStorage(accessToken, storagePath, buffer, contentType = 'image/jpeg') {
  const downloadToken = randomUUID();
  const boundary = 'gos_boundary_' + randomUUID().replace(/-/g, '');
  const metadata = JSON.stringify({
    name: storagePath,
    contentType,
    cacheControl: 'public, max-age=31536000',
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
      source: 'ghl-super-admin-templates-v1',
    },
  });
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    'utf8'
  );
  const ending = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const body = Buffer.concat([preamble, buffer, ending]);

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=multipart`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(60000),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Storage upload failed (${resp.status}) for ${storagePath}: ${errText}`);
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
}

async function firestoreRequest(accessToken, method, relPath, body) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const resp = await fetch(`${base}${relPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  if (resp.status === 404) return null;
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Firestore ${method} ${relPath} failed (${resp.status}): ${json.error?.message || JSON.stringify(json)}`);
  }
  return json;
}

function toFirestoreField(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreField) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, toFirestoreField(v)])
      ),
    },
  };
}

console.log('1/5 Rendering 9 GoHighLevel full-page cover thumbnails & 6 hero banners via Headless Edge...');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});

const coverBuffers = new Map();
const heroBuffers = new Map();

try {
  const context = await browser.newContext({ viewport: { width: 960, height: 1240 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const [id, html] of Object.entries(COVER_HTML)) {
    await page.setViewportSize({ width: 960, height: 1240 });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(res => {
                img.onload = res;
                img.onerror = res;
              })
        )
      );
    });
    const jpg = await page.screenshot({ type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: 960, height: 1240 } });
    coverBuffers.set(id, jpg);
    fs.writeFileSync(path.join(publicThumbDir, `${id}.jpg`), jpg);
    fs.writeFileSync(path.join(seedThumbDir, `${id}.jpg`), jpg);
    console.log(`   ✓ Rendered cover: ${id}.jpg (${(jpg.length / 1024).toFixed(0)} KB)`);
  }

  for (const [id, photoUrl] of Object.entries(HERO_SOURCE_MAP)) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;width:1280px;height:720px;overflow:hidden;background:#0f172a"><img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block"/></body></html>`,
      { waitUntil: 'networkidle', timeout: 45000 }
    );
    const heroJpg = await page.screenshot({ type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    heroBuffers.set(id, heroJpg);
    fs.writeFileSync(path.join(publicThumbDir, `${id}-hero.jpg`), heroJpg);
    fs.writeFileSync(path.join(seedThumbDir, `${id}-hero.jpg`), heroJpg);
    console.log(`   ✓ Rendered hero:  ${id}-hero.jpg (${(heroJpg.length / 1024).toFixed(0)} KB)`);
  }
} finally {
  await browser.close();
}

console.log('2/5 Uploading covers & hero banners to Firebase Storage...');
const accessToken = await getFirebaseAccessToken();
const storageUrls = new Map();
const heroStorageUrls = new Map();

for (const [id, buffer] of coverBuffers.entries()) {
  const url = await uploadToFirebaseStorage(accessToken, `templateThumbnails/${id}/cover.jpg`, buffer);
  storageUrls.set(id, url);
  console.log(`   ✓ Uploaded Storage cover: ${id}`);
}
for (const [id, buffer] of heroBuffers.entries()) {
  const url = await uploadToFirebaseStorage(accessToken, `templateThumbnails/${id}/hero.jpg`, buffer);
  heroStorageUrls.set(id, url);
  console.log(`   ✓ Uploaded Storage hero:  ${id}`);
}

console.log('3/5 Building & enriching canonical 9 templates with Firebase Storage URLs...');
const allSeedRecords = buildSystemTemplateSeed();
const { validateSystemTemplate } = loadTemplateSource('src/pages/system-template-validation.ts');
const targetCategories = new Set(['Websites', 'Funnels', 'Forms']);

for (const rec of allSeedRecords) {
  if (!targetCategories.has(rec.category)) continue;
  const coverUrl = storageUrls.get(rec.id);
  const heroUrl = heroStorageUrls.get(rec.id) || coverUrl;
  rec.thumbnail = coverUrl;
  if (rec.pageTemplate) {
    rec.pageTemplate.thumbnail = coverUrl;
    rec.pageTemplate.image = heroUrl;
  }
  if (rec.builderDocument?.pages?.length) {
    rec.builderDocument.pages = rec.builderDocument.pages.map(pg => ({
      ...pg,
      featuredImage: pg.featuredImage ? heroUrl : '',
      sections: pg.sections.map(s =>
        s.content?.image && s.content.image.includes('/template-thumbnails/')
          ? { ...s, content: { ...s.content, image: heroUrl } }
          : s
      ),
    }));
    if (rec.pageTemplate) rec.pageTemplate.builderDocument = rec.builderDocument;
  }
  const validationErrors = validateSystemTemplate(rec);
  if (validationErrors.length) {
    throw new Error(`Validation failed for ${rec.id}: ${validationErrors.join(' ')}`);
  }
}

console.log('4/5 Cleaning up legacy Websites, Funnels & Forms in live Firestore (preserving all other categories)...');
const existingCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
const existingDocs = existingCatalog?.documents || [];
const docsToPurge = existingDocs.filter(doc => targetCategories.has(doc.fields?.category?.stringValue || ''));
const preservedDocs = existingDocs.filter(doc => !targetCategories.has(doc.fields?.category?.stringValue || ''));

console.log(`   Found ${existingDocs.length} total docs in templateCatalog: purging ${docsToPurge.length} targeted legacy docs, preserving ${preservedDocs.length} non-targeted docs.`);

const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
if (docsToPurge.length > 0) {
  const deleteWrites = [];
  for (const doc of docsToPurge) {
    const id = doc.name.split('/').pop();
    deleteWrites.push({ delete: `${databaseRoot}/templateCatalog/${id}` });
    deleteWrites.push({ delete: `${databaseRoot}/systemTemplateMigrations/${id}` });
  }
  await firestoreRequest(accessToken, 'POST', ':commit', { writes: deleteWrites });
  console.log(`   ✓ Purged ${docsToPurge.length} legacy Websites/Funnels/Forms templates from Firestore.`);
}

console.log('5/5 Seeding 9 GoHighLevel templates (3 Websites, 3 Funnels, 3 Forms) to live Firestore...');
const newNineRecords = allSeedRecords.filter(r => targetCategories.has(r.category));
if (newNineRecords.length !== 9) {
  throw new Error(`Expected exactly 9 targeted templates, got ${newNineRecords.length}`);
}

for (const template of newNineRecords) {
  const encoded = encodeFirestoreValue({
    ...template,
    source: 'official',
    active: true,
    status: 'Published',
    schemaVersion: 2,
    updated: new Date().toISOString(),
    updatedBy: 'super-admin-ghl-seed-v1',
  });
  await firestoreRequest(accessToken, 'POST', ':commit', {
    writes: [
      {
        update: {
          name: `${databaseRoot}/templateCatalog/${template.id}`,
          fields: toFirestoreField(encoded).mapValue.fields,
        },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      },
      {
        update: {
          name: `${databaseRoot}/systemTemplateMigrations/${template.id}`,
          fields: toFirestoreField({ templateId: template.id, version: 2 }).mapValue.fields,
        },
        updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
      },
    ],
  });
  console.log(`   ✓ Seeded Firestore templateCatalog/${template.id} (${template.category} · "${template.name}" · downloads: ${template.popularity})`);
}

// Persist updated seed JSON manifests with live Storage URLs
fs.writeFileSync(path.join(root, 'functions/seed-data/system-templates.json'), JSON.stringify(allSeedRecords, null, 2) + '\n');
const { MASTER_TEMPLATES } = loadTemplateSource('src/pages/system-template-data.ts');
const enrichedMasters = MASTER_TEMPLATES.map(m => (storageUrls.has(m.id) ? { ...m, thumbnail: storageUrls.get(m.id) } : m));
fs.writeFileSync(path.join(root, 'functions/seed-data/template-catalog.json'), JSON.stringify(enrichedMasters, null, 2) + '\n');

// Verify live Firestore post-seed counts
const finalCatalog = await firestoreRequest(accessToken, 'GET', '/templateCatalog?pageSize=1000');
const finalCounts = (finalCatalog?.documents || []).reduce((acc, doc) => {
  const cat = doc.fields?.category?.stringValue || 'Unknown';
  acc[cat] = (acc[cat] || 0) + 1;
  return acc;
}, {});
const adminCustom = await firestoreRequest(accessToken, 'GET', '/adminTemplates?pageSize=100');

console.log('\n=== LIVE FIRESTORE VERIFICATION ===');
console.log(
  JSON.stringify(
    {
      projectId,
      storageBucket: bucketName,
      templateCatalogTotal: finalCatalog?.documents?.length || 0,
      categories: finalCounts,
      preservedAdminTemplatesCount: adminCustom?.documents?.length || 0,
    },
    null,
    2
  )
);

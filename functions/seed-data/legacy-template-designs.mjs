// High-resolution domain-matched Unsplash photography (preloaded in headless Edge before capture)
export const PHOTOS = {
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
  saasSellHero: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=85',
  audienceCreatorHero: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=85',
  bizDevOffice: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=85',
  bizDevSmilingMan: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85',
  softCoding: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
  softPhoto: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
  softTravel: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=600&q=80',
  b2bAvatar1: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  b2bAvatar2: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
  b2bAvatar3: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  medDoctorsLab: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=85',
  medWomanMask: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=900&q=85',
  coachWomanBlazer: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=85',
  coachWomanCoffee: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=85',
};

const sharedCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; background: #fff; color: #0f172a; overflow: hidden; }
  img { display: block; object-fit: cover; }
`;

export const COVER_HTML = {
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

  'upklick-funnel-flagship-sell': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #f8fafc; display: flex; flex-direction: column; }
    .topbar { background: linear-gradient(90deg, #1e1b4b 0%, #312e81 100%); color: #e0e7ff; font-size: 11.5px; font-weight: 700; padding: 10px 40px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .timer-pill { background: rgba(251, 191, 36, 0.18); border: 1px solid rgba(251, 191, 36, 0.55); color: #fde68a; padding: 4px 12px; border-radius: 99px; font-weight: 800; font-size: 11px; }
    .hero { background: radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.35), transparent 52%), #0f172a; color: #fff; padding: 40px 46px 42px; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 30px; align-items: center; }
    .kicker { display: inline-block; background: rgba(99, 102, 241, 0.22); border: 1px solid rgba(129, 140, 248, 0.48); color: #c7d2fe; font-size: 10.5px; font-weight: 800; padding: 5px 12px; border-radius: 99px; margin-bottom: 14px; letter-spacing: 0.6px; }
    .hero h1 { font-size: 34px; line-height: 1.14; font-weight: 800; letter-spacing: -0.6px; }
    .hero p { font-size: 13px; color: #cbd5e1; line-height: 1.55; margin: 12px 0 20px; }
    .hero-btns { display: flex; gap: 12px; align-items: center; }
    .cta-primary { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 12px 22px; border-radius: 9px; font-size: 12.5px; font-weight: 800; box-shadow: 0 12px 28px rgba(79, 70, 229, 0.42); }
    .trust-row { display: flex; gap: 14px; margin-top: 16px; font-size: 11px; color: #a5b4fc; font-weight: 600; flex-wrap: wrap; }
    .hero-card { background: rgba(30, 41, 59, 0.88); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 14px; overflow: hidden; box-shadow: 0 20px 42px rgba(0, 0, 0, 0.36); }
    .hero-card img { width: 100%; height: 185px; }
    .hero-card-body { padding: 16px 18px; }
    .price-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
    .price-row strong { font-size: 28px; font-weight: 900; color: #fff; }
    .price-row del { font-size: 13px; color: #94a3b8; }
    .save-tag { background: #10b981; color: #052e16; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 99px; }
    .mid { padding: 32px 46px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 28px; background: #ffffff; flex: 1; align-items: start; }
    .sec-tag { color: #4f46e5; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
    .mid h2 { font-size: 23px; font-weight: 800; color: #0f172a; margin-bottom: 14px; line-height: 1.22; }
    .stack-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .stack-item b { font-size: 12.5px; color: #0f172a; display: block; }
    .stack-item span { font-size: 11px; color: #64748b; }
    .val-pill { font-size: 11px; font-weight: 800; color: #4f46e5; background: #eef2ff; padding: 4px 9px; border-radius: 6px; white-space: nowrap; }
    .order-box { background: #ffffff; border: 2px solid #4f46e5; border-radius: 14px; padding: 20px; box-shadow: 0 16px 36px rgba(79, 70, 229, 0.11); }
    .order-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
    .order-head b { font-size: 14px; color: #0f172a; }
    .order-head small { font-size: 11px; color: #059669; font-weight: 700; }
    .f-inp { height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; font-size: 11.5px; color: #64748b; margin-bottom: 9px; background: #f8fafc; }
    .order-btn { background: #16a34a; color: #ffffff; height: 42px; border-radius: 9px; display: grid; place-items: center; font-size: 12.5px; font-weight: 800; margin-top: 10px; }
    .guarantee { margin-top: 10px; font-size: 10.5px; color: #475569; text-align: center; font-weight: 600; }
    .bottom-band { background: #0f172a; color: #fff; padding: 26px 46px 30px; }
    .step3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .pcard { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 11px; padding: 14px 16px; }
    .pcard small { color: #fbbf24; font-size: 11px; font-weight: 800; display: block; margin-bottom: 5px; }
    .pcard p { font-size: 11px; color: #e2e8f0; line-height: 1.45; margin-bottom: 6px; }
    .pcard b { font-size: 11px; color: #a5b4fc; }
    @media (max-width: 959px) {
      .topbar { flex-wrap: wrap; padding: 10px 20px; }
      .hero, .mid { grid-template-columns: minmax(0, 1fr); padding: 26px 20px; }
      .bottom-band { padding: 22px 20px; }
      .step3 { grid-template-columns: minmax(0, 1fr); }
    }
  </style></head><body><div class="page">
    <div class="topbar"><span>FLASH FOUNDING OFFER · PRE-LINKED SALES + ORDER FORM + THANK YOU</span><span class="timer-pill">Offer Reserved · 00 : 14 : 59</span></div>
    <div class="hero">
      <div>
        <span class="kicker">ALL-IN-ONE DIRECT SALE FUNNEL</span>
        <h1>Launch & Scale Digital Revenue With One Conversion System.</h1>
        <p>Turn cold visitors into verified buyers with a persuasive offer stack, two-step SSL Order Form checkout, and automated Thank You onboarding.</p>
        <div class="hero-btns"><span class="cta-primary">Claim Founding Access — $97 →</span></div>
        <div class="trust-row"><span>✓ 256-Bit SSL Checkout</span><span>✓ 14-Day Guarantee</span><span>✓ 4.9/5 (2,840+ Buyers)</span></div>
      </div>
      <div class="hero-card">
        <img src="${PHOTOS.saasSellHero}" alt=""/>
        <div class="hero-card-body">
          <div class="price-row"><div><strong>$97</strong> <del>$297</del></div><span class="save-tag">SAVE 67% TODAY</span></div>
          <span style="font-size:11.5px;color:#cbd5e1;display:block">Includes 6 Action Modules + 12 Ready-to-Deploy Funnel Templates</span>
        </div>
      </div>
    </div>
    <div class="mid">
      <div>
        <div class="sec-tag">COMPLETE VALUE STACK INCLUDED</div>
        <h2>Everything You Need To Convert Clicks Into Customers</h2>
        <div class="stack-item"><div><b>6 Step-by-Step Implementation Modules</b><span>Offer architecture, funnel launch & traffic scaling</span></div><span class="val-pill">$297 Value</span></div>
        <div class="stack-item"><div><b>12 High-Converting Funnel & Order Templates</b><span>Ready to customize in English & Arabic</span></div><span class="val-pill">$197 Value</span></div>
        <div class="stack-item"><div><b>Automated WhatsApp & Email Follow-Up Pack</b><span>Recover abandoned carts & onboard buyers 24/7</span></div><span class="val-pill">$97 Value</span></div>
        <div class="stack-item"><div><b>Instant Member Portal + Lifetime Updates</b><span>Delivered automatically on the Thank You step</span></div><span class="val-pill">FREE Bonus</span></div>
      </div>
      <div class="order-box">
        <div class="order-head"><b>Express Order Form · Step 2</b><small>🔒 256-Bit SSL</small></div>
        <div class="f-inp">Full Name · Alex Morgan</div>
        <div class="f-inp">Work Email · alex@company.com</div>
        <div class="f-inp">Phone / WhatsApp · +1 (555) 234-5678</div>
        <div class="f-inp">Card · •••• •••• •••• 4242 · Stripe Secure</div>
        <div class="order-btn">Complete Secure Order ($97) →</div>
        <div class="guarantee">Protected by our 14-Day 100% Money-Back Guarantee</div>
      </div>
    </div>
    <div class="bottom-band">
      <div class="step3">
        <div class="pcard"><small>★★★★★ 5.0 VERIFIED</small><p>"Generated $18,400 in our first 72 hours with a 6.8% checkout conversion rate."</p><b>Nadia Al-Mansoor · Digital Academy</b></div>
        <div class="pcard"><small>★★★★★ 5.0 VERIFIED</small><p>"Mobile buyers finish the Order Form in under 60 seconds with zero drop-off."</p><b>Daniel Mercer · SaaS Growth Lead</b></div>
        <div class="pcard"><small>3 PRE-LINKED STEPS</small><p>Step 1 Sales Offer → Step 2 Secure Order Form → Step 3 Instant Thank You Portal.</p><b>100% Responsive · AR & EN</b></div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-flagship-audience': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #f0fdf4; display: flex; flex-direction: column; }
    .topbar { background: #064e3b; color: #d1fae5; font-size: 11.5px; font-weight: 700; padding: 10px 42px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .bonus-pill { background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(52, 211, 153, 0.55); color: #a7f3d0; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 800; }
    .hero { background: linear-gradient(135deg, #022c22 0%, #064e3b 62%, #047857 100%); color: #fff; padding: 42px 46px; display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 30px; align-items: center; }
    .kicker { display: inline-block; background: rgba(16, 185, 129, 0.22); border: 1px solid rgba(110, 231, 183, 0.45); color: #a7f3d0; font-size: 10.5px; font-weight: 800; padding: 5px 12px; border-radius: 99px; margin-bottom: 14px; letter-spacing: 0.6px; }
    .hero h1 { font-size: 33px; line-height: 1.15; font-weight: 800; letter-spacing: -0.5px; }
    .hero p { font-size: 13px; color: #d1fae5; line-height: 1.55; margin: 12px 0 18px; }
    .bento-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
    .stat-box { background: rgba(255, 255, 255, 0.09); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px; padding: 10px 12px; }
    .stat-box strong { display: block; font-size: 18px; font-weight: 900; color: #fff; }
    .stat-box span { font-size: 10.5px; color: #a7f3d0; }
    .squeeze-card { background: #ffffff; color: #0f172a; border-radius: 16px; padding: 22px 20px; box-shadow: 0 22px 48px rgba(2, 44, 34, 0.42); }
    .squeeze-badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 10.5px; font-weight: 800; padding: 4px 10px; border-radius: 99px; margin-bottom: 8px; }
    .squeeze-card h3 { font-size: 17px; font-weight: 800; margin-bottom: 6px; color: #0f172a; }
    .squeeze-card p { font-size: 11.5px; color: #64748b; margin: 0 0 12px; line-height: 1.45; }
    .sq-inp { height: 37px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; font-size: 11.5px; color: #64748b; margin-bottom: 9px; background: #f8fafc; }
    .sq-btn { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff; height: 42px; border-radius: 9px; display: grid; place-items: center; font-size: 12.5px; font-weight: 800; box-shadow: 0 10px 22px rgba(5, 150, 105, 0.3); }
    .sq-note { font-size: 10px; color: #64748b; text-align: center; margin-top: 8px; font-weight: 600; }
    .mid { background: #ffffff; padding: 34px 46px; display: grid; grid-template-columns: 0.92fr 1.08fr; gap: 30px; align-items: center; flex: 1; }
    .photo-wrap { position: relative; height: 275px; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12); }
    .photo-wrap img { width: 100%; height: 100%; }
    .photo-chip { position: absolute; bottom: 12px; inset-inline-start: 12px; background: rgba(6, 78, 59, 0.92); color: #fff; padding: 8px 13px; border-radius: 8px; font-size: 11px; font-weight: 700; }
    .sec-kicker { color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
    .mid h2 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 14px; line-height: 1.22; }
    .bullet { padding: 10px 14px; border-inline-start: 3px solid #10b981; background: #f8fafc; border-radius: 0 9px 9px 0; margin-bottom: 10px; }
    .bullet b { display: block; font-size: 12.5px; color: #0f172a; margin-bottom: 2px; }
    .bullet span { font-size: 11px; color: #64748b; line-height: 1.4; display: block; }
    .bottom-band { background: #064e3b; color: #fff; padding: 26px 46px 30px; }
    .step3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .rcard { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 11px; padding: 14px 16px; }
    .rcard small { color: #6ee7b7; font-size: 11px; font-weight: 800; display: block; margin-bottom: 5px; }
    .rcard p { font-size: 11px; color: #ecfdf5; line-height: 1.45; margin-bottom: 6px; }
    .rcard b { font-size: 11px; color: #a7f3d0; }
    @media (max-width: 959px) {
      .topbar { flex-wrap: wrap; padding: 10px 20px; }
      .hero, .mid { grid-template-columns: minmax(0, 1fr); padding: 26px 20px; }
      .bottom-band { padding: 22px 20px; }
      .step3 { grid-template-columns: minmax(0, 1fr); }
    }
  </style></head><body><div class="page">
    <div class="topbar"><span>FREE 28-PAGE PLAYBOOK · OPT-IN SQUEEZE + INSTANT THANK YOU DOWNLOAD</span><span class="bonus-pill">Bonus Checklist · 00 : 19 : 59</span></div>
    <div class="hero">
      <div>
        <span class="kicker">BUILD AN AUDIENCE & EMAIL LIST</span>
        <h1>Get the Free 7-Figure Audience & Funnel Playbook.</h1>
        <p>Join 18,400+ founders, coaches, and creators using our 3-step squeeze architecture to capture qualified daily subscribers in 15 minutes a day.</p>
        <div class="bento-stats">
          <div class="stat-box"><strong>18,400+</strong><span>Active Readers</span></div>
          <div class="stat-box"><strong>42.8%</strong><span>Avg Opt-In Rate</span></div>
          <div class="stat-box"><strong>$0</strong><span>Instant PDF Guide</span></div>
        </div>
      </div>
      <div class="squeeze-card">
        <span class="squeeze-badge">100% FREE INSTANT ACCESS</span>
        <h3>Unlock Your Free Starter Playbook</h3>
        <p>Enter your details below and jump straight to your instant PDF download page.</p>
        <div class="sq-inp">Your First Name</div>
        <div class="sq-inp">Best Email Address</div>
        <div class="sq-inp">WhatsApp Number (Optional Bonus)</div>
        <div class="sq-btn">Send Me the Free Playbook →</div>
        <div class="sq-note">🔒 Zero spam · Unsubscribe in 1 click · Instant Step 2 redirect</div>
      </div>
    </div>
    <div class="mid">
      <div class="photo-wrap"><img src="${PHOTOS.audienceCreatorHero}" alt=""/><div class="photo-chip">28 Pages · Swipe Files + Checklists</div></div>
      <div>
        <div class="sec-kicker">INSIDE YOUR FREE PLAYBOOK</div>
        <h2>Three Proven Frameworks You Can Deploy Today</h2>
        <div class="bullet"><b>01 · Curiosity & Value Hook Formulas</b><span>15 tested headline structures that convert cold social clicks into eager subscribers.</span></div>
        <div class="bullet"><b>02 · Automated 5-Day Welcome Sequence</b><span>Ready-to-send email & WhatsApp templates that build trust on autopilot.</span></div>
        <div class="bullet"><b>03 · Instant Thank-You Resource Delivery</b><span>Pre-linked Step 2 Thank You page with one-click PDF download and next steps.</span></div>
      </div>
    </div>
    <div class="bottom-band">
      <div class="step3">
        <div class="rcard"><small>★★★★★ 4.9/5 READER SCORE</small><p>"Added 1,420 new email subscribers in 3 weeks using the exact page-6 squeeze layout."</p><b>Layla Haddad · Executive Coach</b></div>
        <div class="rcard"><small>★★★★★ VERIFIED CREATOR</small><p>"The 5-day welcome sequence turned cold leads into 19 booked strategy calls in week one."</p><b>Ryan Kowalski · ScaleBrief</b></div>
        <div class="rcard"><small>2 PRE-LINKED STEPS</small><p>Step 1 High-Converting Squeeze Page → Step 2 Instant Resource Download Thank You Page.</p><b>100% Responsive · AR & EN</b></div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-business-development': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; }
    .bd-top { position: relative; background: radial-gradient(#cbd5e1 1px, transparent 1px) 0 0 / 16px 16px, #f7f8fa; padding: 24px 64px 36px; text-align: center; overflow: hidden; }
    .bd-chevron-bg { position: absolute; inset-inline-end: -60px; top: -40px; width: 380px; height: 380px; border-radius: 50%; background: rgba(15, 23, 42, 0.045); pointer-events: none; }
    .bd-logo { position: relative; z-index: 2; display: inline-flex; align-items: center; gap: 7px; margin-bottom: 18px; }
    .bd-logo-mark { font-weight: 900; font-size: 20px; color: #0a0a0a; line-height: 1; }
    .bd-logo-txt { text-align: start; line-height: 1.05; }
    .bd-logo-txt b { display: block; font-size: 14px; font-weight: 800; letter-spacing: 0.6px; color: #111827; }
    .bd-logo-txt small { display: block; font-size: 7.5px; letter-spacing: 1.8px; color: #6b7280; font-weight: 700; }
    .bd-h1 { position: relative; z-index: 2; font-size: 33px; line-height: 1.15; font-weight: 900; color: #09090b; max-width: 610px; margin: 0 auto 10px; letter-spacing: -0.6px; }
    .bd-sub { position: relative; z-index: 2; font-size: 11.5px; font-weight: 700; color: #1f2937; margin-bottom: 18px; }
    .bd-vsl { position: relative; z-index: 2; max-width: 560px; margin: 0 auto; border-radius: 3px; overflow: hidden; box-shadow: 0 20px 44px rgba(15, 23, 42, 0.16); background: #060d24; }
    .bd-vsl-bar { background: #c84b31; color: #ffffff; font-size: 9.5px; font-weight: 800; letter-spacing: 0.5px; padding: 7px 14px; text-align: center; }
    .bd-vsl-screen { position: relative; height: 270px; background: #1c1917; overflow: hidden; }
    .bd-vsl-screen img { width: 100%; height: 100%; filter: sepia(0.18) contrast(0.96) brightness(0.84); }
    .bd-sound-pill { position: absolute; top: 10px; inset-inline-start: 10px; background: rgba(0, 0, 0, 0.72); color: #fff; font-size: 9.5px; font-weight: 700; padding: 4px 9px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
    .bd-progress { position: absolute; inset-inline: 10px; bottom: 8px; height: 18px; display: flex; align-items: center; gap: 8px; color: #e2e8f0; font-size: 9px; }
    .bd-track { flex: 1; height: 3px; background: rgba(255,255,255,0.28); border-radius: 99px; overflow: hidden; }
    .bd-track i { display: block; width: 38%; height: 100%; background: #c84b31; }
    .bd-vsl-foot { background: #040b22; padding: 14px 24px 16px; text-align: center; }
    .bd-vsl-foot p { font-size: 10.5px; color: #cbd5e1; line-height: 1.5; margin-bottom: 5px; }
    .bd-vsl-foot p b { color: #ffffff; }
    .bd-vsl-foot strong { display: block; font-size: 13px; font-weight: 900; color: #df5638; }
    .bd-dark-band { background: linear-gradient(180deg, #050505 0%, #050505 68%, #ffffff 68%, #ffffff 100%); padding: 34px 64px 28px; flex: 1; display: flex; flex-direction: column; align-items: center; }
    .bd-dark-h2 { color: #ffffff; font-size: 25px; line-height: 1.22; font-weight: 900; text-align: center; max-width: 580px; margin-bottom: 8px; }
    .bd-dark-p1 { color: #e5e7eb; font-size: 10.5px; font-weight: 700; text-align: center; margin-bottom: 3px; }
    .bd-dark-p2 { color: #9ca3af; font-size: 9.5px; text-align: center; margin-bottom: 22px; }
    .bd-split-card { width: 100%; max-width: 600px; background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 20px 48px rgba(15, 23, 42, 0.14); border: 1px solid #e5e7eb; display: grid; grid-template-columns: 0.92fr 1.08fr; gap: 22px; align-items: center; }
    .bd-founder-img { height: 278px; border-radius: 8px; overflow: hidden; background: #e5e7eb; }
    .bd-founder-img img { width: 100%; height: 100%; object-position: center top; }
    .bd-card-h3 { font-size: 20px; line-height: 1.18; font-weight: 900; color: #09090b; margin-bottom: 12px; }
    .bd-list { display: grid; gap: 7px; margin-bottom: 13px; }
    .bd-li { display: flex; align-items: center; gap: 7px; font-size: 10px; color: #374151; line-height: 1.35; }
    .bd-dot { width: 13px; height: 13px; border-radius: 50%; background: #c84b31; color: #fff; display: inline-grid; place-items: center; font-size: 8px; font-weight: 900; flex-shrink: 0; }
    .bd-li b { color: #111827; font-weight: 800; }
    .bd-callout { background: #c84b31; color: #ffffff; border-radius: 6px; padding: 10px 12px; font-size: 9.5px; line-height: 1.42; }
    .bd-callout b { display: block; font-weight: 800; margin-bottom: 2px; }
    @media (max-width: 959px) {
      .bd-top, .bd-dark-band { padding-inline: 20px; }
      .bd-h1 { font-size: 26px; }
    }
    @media (max-width: 600px) {
      .bd-split-card { grid-template-columns: minmax(0, 1fr); }
      .bd-founder-img { height: 220px; }
      .bd-vsl-screen { height: 200px; }
    }
  </style></head><body><div class="page">
    <div class="bd-top">
      <div class="bd-chevron-bg"></div>
      <div class="bd-logo"><span class="bd-logo-mark">⟫</span><div class="bd-logo-txt"><b>LOGO NAME</b><small>SLOGAN HERE</small></div></div>
      <h1 class="bd-h1">You have Laid the Foundation – Now Let It Grow Without You.</h1>
      <p class="bd-sub">Refine Your Margins. Implement Strong Systems. Build A Solid Team. Scale With Purpose.</p>
      <div class="bd-vsl">
        <div class="bd-vsl-bar">🔊 WATCH TO LEARN MORE ABOUT OUR MISSION, HOW WE TRANSFORM LIVES</div>
        <div class="bd-vsl-screen">
          <img src="${PHOTOS.bizDevOffice}" alt=""/>
          <span class="bd-sound-pill">🔇 Enable sound</span>
          <div class="bd-progress"><span>▶</span><div class="bd-track"><i></i></div><span>🔊 ⛶</span></div>
        </div>
        <div class="bd-vsl-foot">
          <p>If Your Business Is In The <b>$1M–$10M Revenue Range</b>, You're Caught Up In The Day-To-Day, And It Feels Like Everything Relies On YOU...</p>
          <strong>You're Not Alone — But You Can't Scale This Way.</strong>
        </div>
      </div>
    </div>
    <div class="bd-dark-band">
      <h2 class="bd-dark-h2">I Hear You. You've Created Something Remarkable.</h2>
      <p class="bd-dark-p1">Revenue Is Coming In. You've Built A Team. You're Gaining Momentum...</p>
      <p class="bd-dark-p2">But If You Were Gone Tomorrow, Your Business Would Fall Apart In A Month.</p>
      <div class="bd-split-card">
        <div class="bd-founder-img"><img src="${PHOTOS.bizDevSmilingMan}" alt=""/></div>
        <div>
          <h3 class="bd-card-h3">Our Result Speaks for Themselves</h3>
          <div class="bd-list">
            <div class="bd-li"><span class="bd-dot">✓</span><span><b>Micromanaging Projects And Staff</b></span></div>
            <div class="bd-li"><span class="bd-dot">✓</span><span><b>Dealing</b> With Narrow Margins</span></div>
            <div class="bd-li"><span class="bd-dot">✓</span><span><b>Not Sure</b> If Your Offer Is Fully Optimized</span></div>
            <div class="bd-li"><span class="bd-dot">✓</span><span><b>Missing</b> The Processes That Would Let You Step Away</span></div>
            <div class="bd-li"><span class="bd-dot">✓</span><span><b>Away For Any Length Of Time</b></span></div>
          </div>
          <div class="bd-callout">
            <b>Most Importantly:</b>
            <span>You're not being held accountable to what actually matters—the metrics that move the needle.</span>
          </div>
        </div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-software-platform': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; padding: 20px 38px 28px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .sp-hero-shell { position: relative; background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 55%, #fae8ff 100%); border-radius: 22px; padding: 16px 36px 0; text-align: center; }
    .sp-nav { max-width: 560px; margin: 0 auto 22px; background: #ffffff; border-radius: 99px; padding: 8px 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 6px 20px rgba(30, 19, 72, 0.06); }
    .sp-clover { display: inline-grid; grid-template-columns: repeat(2, 8px); gap: 2px; }
    .sp-clover i { width: 8px; height: 8px; border-radius: 50%; display: block; }
    .sp-links { display: flex; gap: 16px; font-size: 10px; font-weight: 700; color: #334155; }
    .sp-h1 { font-size: 30px; line-height: 1.18; font-weight: 800; color: #1a103c; max-width: 520px; margin: 0 auto 10px; letter-spacing: -0.5px; }
    .sp-sub { font-size: 11px; line-height: 1.5; color: #5b5675; max-width: 490px; margin: 0 auto 14px; }
    .sp-cta { display: inline-block; background: #1e1348; color: #ffffff; font-size: 10.5px; font-weight: 700; padding: 9px 20px; border-radius: 8px; margin-bottom: 18px; box-shadow: 0 10px 22px rgba(30, 19, 72, 0.22); }
    .sp-mock { max-width: 620px; margin: 0 auto -36px; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.1); display: grid; grid-template-columns: 34px 1fr 155px; overflow: hidden; text-align: start; }
    .sp-rail { background: #f8fafc; border-inline-end: 1px solid #f1f5f9; padding: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 11px; font-size: 9px; color: #94a3b8; }
    .sp-rail-logo { width: 22px; height: 22px; border-radius: 6px; background: #1e1348; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 10px; }
    .sp-main { padding: 12px 14px; }
    .sp-topbar { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px; }
    .sp-tabs { display: flex; gap: 10px; font-size: 8.5px; font-weight: 700; color: #64748b; margin-bottom: 8px; }
    .sp-tabs b { color: #6d28d9; border-bottom: 2px solid #6d28d9; padding-bottom: 2px; }
    .sp-search-row { display: flex; gap: 6px; align-items: center; margin-bottom: 10px; }
    .sp-chip-in { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 99px; padding: 4px 10px; font-size: 8.5px; color: #94a3b8; }
    .sp-go { width: 20px; height: 20px; border-radius: 50%; background: #7c3aed; color: #fff; display: grid; place-items: center; font-size: 9px; }
    .sp-role-card { border: 1px solid #f1f5f9; border-radius: 10px; padding: 8px 10px; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center; gap: 8px; background: #ffffff; }
    .sp-role-left { display: flex; align-items: center; gap: 8px; }
    .sp-ico { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0; }
    .sp-role-left b { display: block; font-size: 9.5px; color: #0f172a; }
    .sp-role-left small { display: block; font-size: 8px; color: #64748b; }
    .sp-badge-ok { background: #ecfdf5; color: #059669; font-size: 8px; font-weight: 700; padding: 3px 7px; border-radius: 99px; white-space: nowrap; }
    .sp-side { background: #fafafe; border-inline-start: 1px solid #f1f5f9; padding: 12px 10px; }
    .sp-side-h { font-size: 9px; font-weight: 800; color: #1e1b4b; margin-bottom: 8px; display: block; }
    .sp-mini { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; }
    .sp-mini i { width: 16px; height: 16px; border-radius: 50%; background: #ede9fe; color: #6d28d9; display: grid; place-items: center; font-style: normal; font-size: 8px; font-weight: 800; flex-shrink: 0; }
    .sp-mini span { font-size: 8px; color: #334155; font-weight: 600; line-height: 1.2; }
    .sp-trust { padding-top: 48px; text-align: center; }
    .sp-trust p { font-size: 10px; color: #475569; font-weight: 600; margin-bottom: 12px; }
    .sp-logos { display: flex; justify-content: center; align-items: center; gap: 28px; flex-wrap: wrap; }
    .sp-logo-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: #312e81; }
    .sp-logo-dot { width: 16px; height: 16px; border-radius: 50%; display: inline-block; }
    .sp-bottom { background: linear-gradient(135deg, #f4f5f9 0%, #f8f5fb 100%); border-radius: 20px; padding: 28px 36px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 26px; align-items: center; border: 1px solid #eef0f6; }
    .sp-bot-h2 { font-size: 24px; line-height: 1.18; font-weight: 800; color: #1a103c; margin-bottom: 10px; }
    .sp-bot-p { font-size: 10px; line-height: 1.52; color: #5b5675; margin-bottom: 14px; }
    .sp-pill-list { display: grid; gap: 8px; }
    .sp-pill-row { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 7px; padding: 8px 12px; font-size: 9.5px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; }
    .sp-cards-collage { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; align-items: center; }
    .sp-gcard { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08); border: 1px solid #f1f5f9; text-align: center; padding-bottom: 10px; }
    .sp-gcard img { width: 100%; height: 58px; }
    .sp-gcard b { display: block; font-size: 10px; color: #0f172a; margin-top: 8px; }
    .sp-gcard small { display: block; font-size: 8px; color: #64748b; margin: 2px 0 6px; }
    .sp-gbtn { display: inline-block; border: 1px solid #c4b5fd; color: #6d28d9; font-size: 8px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
    @media (max-width: 959px) {
      .page { padding: 16px; height: auto; gap: 20px; }
      .sp-mock { grid-template-columns: 1fr; margin-bottom: 0; }
      .sp-rail, .sp-side { display: none; }
      .sp-trust { padding-top: 12px; }
      .sp-bottom { grid-template-columns: minmax(0, 1fr); padding: 20px; }
    }
    @media (max-width: 600px) {
      .sp-hero-shell { padding: 14px 16px 18px; }
      .sp-cards-collage { grid-template-columns: minmax(0, 1fr); }
    }
  </style></head><body><div class="page">
    <div class="sp-hero-shell">
      <div class="sp-nav">
        <span class="sp-clover"><i style="background:#06b6d4"></i><i style="background:#f59e0b"></i><i style="background:#ec4899"></i><i style="background:#8b5cf6"></i></span>
        <div class="sp-links"><span>About</span><span>Features</span><span>Use Cases</span><span>Testimonials</span></div>
      </div>
      <h1 class="sp-h1">Instant Contact Verification For Smarter Outreach</h1>
      <p class="sp-sub">Our advanced Verification Tool helps you instantly validate emails and phone numbers so you can focus on real connections, not wasted outreach. With real-time accuracy.</p>
      <span class="sp-cta">Get Started For Free</span>
      <div class="sp-mock">
        <div class="sp-rail"><span class="sp-rail-logo">O</span><span>⌂</span><span>✉</span><span>✓</span><span>⚙</span></div>
        <div class="sp-main">
          <div class="sp-topbar"><span>🔍 Search verified contacts...</span><span>⚙ Login</span></div>
          <div class="sp-tabs"><b>All Contacts</b><span>Categories</span><span>Manage</span><span>Saved</span></div>
          <div class="sp-search-row"><span class="sp-chip-in">Keyword</span><span class="sp-chip-in">Location</span><span class="sp-go">⌕</span></div>
          <div class="sp-role-card"><div class="sp-role-left"><span class="sp-ico" style="background:#7c3aed">S</span><div><b>Sales & Customer Success Manager</b><small>99.8% Deliverable · Real-Time SMTP</small></div></div><span class="sp-badge-ok">Verified</span></div>
          <div class="sp-role-card"><div class="sp-role-left"><span class="sp-ico" style="background:#06b6d4">M</span><div><b>Marketing Data Enrichment</b><small>Zero Bounce · Phone + Domain Check</small></div></div><span class="sp-badge-ok">Verified</span></div>
          <div class="sp-role-card"><div class="sp-role-left"><span class="sp-ico" style="background:#f59e0b">Q</span><div><b>Software Quality Assurance Lead</b><small>CRM Synced · Duplicate Filtered</small></div></div><span class="sp-badge-ok">Verified</span></div>
        </div>
        <div class="sp-side">
          <b class="sp-side-h">Featured Lists</b>
          <div class="sp-mini"><i>1</i><span>SaaS Decision Makers</span></div>
          <div class="sp-mini"><i>2</i><span>Enterprise VP Sales</span></div>
          <div class="sp-mini"><i>3</i><span>Verified Tech Founders</span></div>
          <div class="sp-mini"><i>4</i><span>Inbound Demo Leads</span></div>
        </div>
      </div>
    </div>
    <div class="sp-trust">
      <p>Trusted by 60,000+ businesses to accelerate outbound sales and unlock new revenue streams</p>
      <div class="sp-logos">
        <span class="sp-logo-item"><i class="sp-logo-dot" style="background:#38bdf8"></i><b>Logoipsum</b></span>
        <span class="sp-logo-item"><i class="sp-logo-dot" style="background:#06b6d4"></i><b>logoipsum</b></span>
        <span class="sp-logo-item"><i class="sp-logo-dot" style="background:#a855f7"></i><b>LogoCloud</b></span>
        <span class="sp-logo-item"><i class="sp-logo-dot" style="background:#6366f1"></i><b>Logoipsum</b></span>
        <span class="sp-logo-item"><i class="sp-logo-dot" style="background:#0ea5e9"></i><b>LogoSync</b></span>
      </div>
    </div>
    <div class="sp-bottom">
      <div>
        <h2 class="sp-bot-h2">Verify Leads Fast, Eliminate Duplicates, Boost ROI</h2>
        <p class="sp-bot-p">Stop wasting time and ad spend on bad data. Our verification tool instantly checks and validates contact details like emails, phone numbers, and more—so you're only reaching real, qualified leads. Say goodbye to duplicates and fake entries, and start converting with confidence.</p>
        <div class="sp-pill-list">
          <div class="sp-pill-row"><span>📋</span><span>Outdated B2B Data Slows Down Your Sales Process.</span></div>
          <div class="sp-pill-row"><span>🗂</span><span>Direct List Imports Often Contain Invalid Leads.</span></div>
          <div class="sp-pill-row"><span>☁</span><span>Ensure Every Contact In Your CRM Is Verified.</span></div>
        </div>
      </div>
      <div class="sp-cards-collage">
        <div class="sp-gcard"><img src="${PHOTOS.softCoding}" alt=""/><b>Programming</b><small>Public Group · 18 members</small><span class="sp-gbtn">View Group</span></div>
        <div class="sp-gcard"><img src="${PHOTOS.softPhoto}" alt=""/><b>Photography</b><small>Public Group · 9 members</small><span class="sp-gbtn">View Group</span></div>
        <div class="sp-gcard" style="grid-column: span 2; max-width: 210px; margin: 0 auto; width: 100%;"><img src="${PHOTOS.softTravel}" alt=""/><b>Backpackers Club</b><small>Public Group · 12 members</small><span class="sp-gbtn">View Group</span></div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-project-management-ai': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: radial-gradient(circle at 50% 18%, #e0f2fe 0%, #f8fbff 38%, #ffffff 70%); display: flex; flex-direction: column; justify-content: space-between; padding: 18px 54px 28px; overflow: hidden; }
    .pm-nav { display: flex; justify-content: space-between; align-items: center; }
    .pm-brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14px; color: #0f172a; }
    .pm-bolt { width: 24px; height: 24px; border-radius: 50%; background: #1da1f2; color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 900; }
    .pm-cta-solid { background: #1da1f2; color: #ffffff; font-size: 10px; font-weight: 800; padding: 8px 16px; border-radius: 5px; letter-spacing: 0.4px; }
    .pm-hero { text-align: center; margin-top: 8px; }
    .pm-h1 { font-size: 32px; line-height: 1.18; font-weight: 800; color: #09090b; max-width: 520px; margin: 0 auto 10px; letter-spacing: -0.5px; }
    .pm-sub { font-size: 11px; line-height: 1.5; color: #64748b; max-width: 500px; margin: 0 auto 14px; }
    .pm-cta-outline { display: inline-block; border: 1.5px solid #38bdf8; color: #0284c7; background: #ffffff; font-size: 10px; font-weight: 800; padding: 7px 22px; border-radius: 99px; margin-bottom: 18px; }
    .pm-dash-wrap { position: relative; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 20px 50px rgba(2, 132, 199, 0.12); padding: 14px 18px 16px; text-align: start; }
    .pm-dash-top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 9px; border-bottom: 1px solid #f1f5f9; margin-bottom: 10px; font-size: 9.5px; color: #64748b; }
    .pm-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
    .pm-kpi { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; }
    .pm-kpi small { display: block; font-size: 8px; color: #94a3b8; margin-bottom: 2px; }
    .pm-kpi b { font-size: 13px; font-weight: 800; }
    .pm-dash-grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; }
    .pm-tasks { background: #f8fafc; border-radius: 9px; padding: 10px; font-size: 8.5px; color: #475569; display: grid; gap: 6px; }
    .pm-task-row { display: flex; justify-content: space-between; padding-bottom: 4px; border-bottom: 1px dashed #e2e8f0; }
    .pm-bars-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 9px; padding: 10px; }
    .pm-bars { height: 74px; display: flex; align-items: flex-end; gap: 8px; padding-top: 8px; }
    .pm-bars i { flex: 1; border-radius: 4px 4px 0 0; display: block; }
    .pm-play-btn { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 42px; height: 42px; border-radius: 50%; background: rgba(15, 23, 42, 0.55); color: #ffffff; display: grid; place-items: center; font-size: 14px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
    .pm-mid { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; align-items: center; margin-top: 12px; }
    .pm-mid h2 { font-size: 24px; line-height: 1.2; font-weight: 800; color: #09090b; margin-bottom: 10px; }
    .pm-mid p { font-size: 10.5px; line-height: 1.52; color: #64748b; margin-bottom: 12px; }
    .pm-chk { display: flex; align-items: flex-start; gap: 8px; font-size: 10px; color: #334155; margin-bottom: 9px; line-height: 1.45; }
    .pm-chk i { width: 15px; height: 15px; border-radius: 4px; background: #1da1f2; color: #fff; display: inline-grid; place-items: center; font-style: normal; font-size: 9px; font-weight: 900; flex-shrink: 0; margin-top: 1px; }
    .pm-engage-card { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.07); padding: 18px; }
    .pm-engage-card b { display: block; font-size: 12.5px; color: #0f172a; }
    .pm-engage-card small { display: block; font-size: 9px; color: #94a3b8; margin-bottom: 10px; }
    .pm-wave-box { background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%); border-radius: 10px; padding: 10px; margin-bottom: 10px; }
    .pm-wave-svg { width: 100%; height: 110px; display: block; }
    .pm-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 8.5px; font-weight: 700; color: #475569; }
    .pm-legend span { display: inline-flex; align-items: center; gap: 5px; }
    .pm-legend i { width: 14px; height: 5px; border-radius: 99px; display: inline-block; }
    .pm-foot { text-align: center; padding-top: 8px; }
    .pm-foot h3 { font-size: 23px; line-height: 1.22; font-weight: 800; color: #09090b; margin-bottom: 6px; }
    .pm-foot p { font-size: 10.5px; color: #64748b; max-width: 460px; margin: 0 auto 12px; line-height: 1.45; }
    .pm-peek3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .pm-peek-card { background: #f0f7ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 10px 12px; font-size: 10px; font-weight: 700; color: #0369a1; }
    @media (max-width: 959px) {
      .page { padding: 16px 20px; height: auto; gap: 22px; }
      .pm-kpis { grid-template-columns: repeat(2, 1fr); }
      .pm-mid { grid-template-columns: minmax(0, 1fr); }
      .pm-peek3 { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 600px) {
      .pm-dash-grid { grid-template-columns: minmax(0, 1fr); }
    }
  </style></head><body><div class="page">
    <div class="pm-nav">
      <div class="pm-brand"><span class="pm-bolt">⚡</span><b>Logoipsum</b></div>
      <span class="pm-cta-solid">GET STARTED NOW</span>
    </div>
    <div class="pm-hero">
      <h1 class="pm-h1">The Methodical Approach to Project Management</h1>
      <p class="pm-sub">Every step of your funnel follows a structured, results-driven process. From planning to execution, AI keeps campaigns organized, efficient, and aligned with your business goals.</p>
      <span class="pm-cta-outline">WATCH DEMO</span>
      <div class="pm-dash-wrap">
        <div class="pm-dash-top"><div class="pm-brand" style="font-size:11px"><span class="pm-bolt" style="width:18px;height:18px;font-size:9px">⚡</span><b>Logoipsum</b></div><span>🔍 Search campaigns & sprints...</span><span>● Active AI Sync</span></div>
        <div class="pm-kpis">
          <div class="pm-kpi"><small>Velocity Lift</small><b style="color:#0284c7">52%</b></div>
          <div class="pm-kpi"><small>Tasks Automated</small><b style="color:#ea580c">18,346</b></div>
          <div class="pm-kpi"><small>Active Sprints</small><b style="color:#d97706">23</b></div>
          <div class="pm-kpi"><small>On-Time SLA</small><b style="color:#059669">99.4%</b></div>
        </div>
        <div class="pm-dash-grid">
          <div class="pm-tasks">
            <div class="pm-task-row"><span>✓ Q4 Funnel Roadmap</span><b>Done</b></div>
            <div class="pm-task-row"><span>✓ AI Resource Allocation</span><b>Live</b></div>
            <div class="pm-task-row"><span>✓ Automated Client QA</span><b>98%</b></div>
            <div class="pm-task-row"><span>✓ Sprint Milestone Sync</span><b>Active</b></div>
          </div>
          <div class="pm-bars-card">
            <div class="pm-bars">
              <i style="height:48%;background:#38bdf8"></i>
              <i style="height:82%;background:#0284c7"></i>
              <i style="height:64%;background:#f59e0b"></i>
              <i style="height:95%;background:#1da1f2"></i>
              <i style="height:72%;background:#38bdf8"></i>
            </div>
          </div>
          <div class="pm-play-btn">▶</div>
        </div>
      </div>
    </div>
    <div class="pm-mid">
      <div>
        <h2>Use Our Resources to Deliver Fantastic Customer Service</h2>
        <p>Our tools give your team the support they need to respond quickly, solve problems effectively, and keep customers happy.</p>
        <div class="pm-chk"><i>✓</i><span>Streamlined processes cut wait times and make every interaction effortless.</span></div>
        <div class="pm-chk"><i>✓</i><span>Smart automation keeps your team focused on building strong relationships.</span></div>
        <div style="margin-top:14px"><span class="pm-cta-solid" style="display:inline-block">GET STARTED NOW</span></div>
      </div>
      <div class="pm-engage-card">
        <b>Engagement Overview</b>
        <small>Interaction Breakdown · Mon – Sun</small>
        <div class="pm-wave-box">
          <svg class="pm-wave-svg" viewBox="0 0 320 110" preserveAspectRatio="none">
            <path d="M0,55 Q40,18 80,42 T160,30 T240,44 T320,20 L320,62 L0,62 Z" fill="rgba(29,161,242,0.32)"/>
            <path d="M0,62 Q40,35 80,50 T160,40 T240,52 T320,34" fill="none" stroke="#0284c7" stroke-width="2.5"/>
            <path d="M0,96 Q45,74 90,88 T180,76 T260,90 T320,72 L320,108 L0,108 Z" fill="rgba(249,115,22,0.26)"/>
            <path d="M0,96 Q45,74 90,88 T180,76 T260,90 T320,72" fill="none" stroke="#ea580c" stroke-width="2"/>
          </svg>
        </div>
        <div class="pm-legend">
          <span><i style="background:#1da1f2"></i><span>Website Visits</span></span>
          <span><i style="background:#38bdf8"></i><span>AI Workflows</span></span>
          <span><i style="background:#fb923c"></i><span>Resolved Tickets</span></span>
        </div>
      </div>
    </div>
    <div class="pm-foot">
      <h3>The Features You'll Need to Expand Your Business</h3>
      <p>Strategic management tools that help you plan smarter, track progress clearly, and scale operations without losing control.</p>
      <div class="pm-peek3">
        <div class="pm-peek-card">01 · Automated AI Sprint Planning</div>
        <div class="pm-peek-card">02 · Real-Time Funnel Bottleneck Alerts</div>
        <div class="pm-peek-card">03 · Cross-Team Executive Dashboards</div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-b2b-saas': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; }
    .b2b-topstrip { background: #311b6b; color: #e9d5ff; font-size: 9.5px; font-weight: 700; text-align: center; padding: 7px 20px; }
    .b2b-topstrip b { color: #34d399; }
    .b2b-hero { background: linear-gradient(135deg, #e8effc 0%, #f5f8ff 50%, #eaeefc 100%); padding: 20px 56px 68px; text-align: center; }
    .b2b-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .b2b-brand { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: #111827; }
    .b2b-sun { width: 22px; height: 22px; border-radius: 50%; background: #f15a29; color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 900; }
    .b2b-links { display: flex; gap: 18px; font-size: 10.5px; font-weight: 700; color: #1f2937; }
    .b2b-kicker { font-size: 14.5px; font-weight: 600; color: #311b6b; margin-bottom: 6px; font-style: italic; }
    .b2b-h1 { font-size: 44px; line-height: 1.08; font-weight: 900; color: #22b573; margin-bottom: 12px; letter-spacing: -0.7px; }
    .b2b-sub { font-size: 12.5px; line-height: 1.48; font-weight: 800; color: #1f2937; max-width: 470px; margin: 0 auto 20px; }
    .b2b-btns { display: flex; justify-content: center; gap: 12px; margin-bottom: 9px; flex-wrap: wrap; }
    .b2b-btn-orange { background: #f15a29; color: #ffffff; font-size: 11px; font-weight: 800; padding: 11px 22px; border-radius: 5px; box-shadow: 0 10px 22px rgba(241, 90, 41, 0.28); }
    .b2b-btn-purple { background: #3c2179; color: #ffffff; font-size: 11px; font-weight: 800; padding: 11px 20px; border-radius: 5px; }
    .b2b-micro { font-size: 9px; color: #64748b; margin-bottom: 18px; }
    .b2b-checks { display: flex; justify-content: center; gap: 20px; font-size: 10px; font-weight: 800; color: #1e293b; flex-wrap: wrap; }
    .b2b-checks span i { color: #22b573; font-style: normal; margin-inline-end: 4px; }
    .b2b-icons-bar { max-width: 680px; width: calc(100% - 64px); margin: -40px auto 30px; background: #ffffff; border-radius: 12px; box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08); border: 1px solid #f1f5f9; padding: 18px 20px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; text-align: center; }
    .b2b-ic-item i { width: 36px; height: 36px; margin: 0 auto 7px; border-radius: 9px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; display: grid; place-items: center; font-style: normal; font-size: 15px; font-weight: 800; }
    .b2b-ic-item span { display: block; font-size: 8.5px; font-weight: 800; color: #1e293b; }
    .b2b-proof { padding: 4px 56px 26px; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .b2b-stars { color: #f15a29; font-size: 13px; letter-spacing: 2px; margin-bottom: 4px; }
    .b2b-script { color: #22b573; font-size: 13.5px; font-style: italic; font-weight: 700; margin-bottom: 5px; }
    .b2b-h2 { font-size: 22px; line-height: 1.24; font-weight: 900; color: #111827; margin-bottom: 20px; }
    .b2b-tgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; max-width: 690px; margin: 0 auto 22px; }
    .b2b-tcard { background: #ffffff; border-radius: 10px; border: 1px solid #f1f5f9; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06); padding: 22px 16px; text-align: center; }
    .b2b-avatar { width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 10px; overflow: hidden; border: 3px solid #ecfdf5; }
    .b2b-avatar img { width: 100%; height: 100%; }
    .b2b-tcard b { display: block; font-size: 11.5px; color: #0f172a; }
    .b2b-tcard small { display: block; font-size: 8.5px; color: #10b981; font-weight: 700; margin-bottom: 10px; }
    .b2b-tcard p { font-size: 9.2px; line-height: 1.56; color: #475569; }
    .b2b-rate-note { font-size: 8.5px; color: #475569; line-height: 1.35; margin-top: 4px; }
    .b2b-foot-band { background: #f6f9fc; border-top: 1px solid #e2e8f0; padding: 26px 84px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 28px; align-items: center; }
    .b2b-foot-band h3 { font-size: 19px; line-height: 1.22; font-weight: 900; color: #0f172a; margin-bottom: 6px; max-width: 260px; }
    .b2b-foot-band p { font-size: 9.8px; line-height: 1.5; color: #64748b; max-width: 310px; }
    .b2b-foot-visual { background: linear-gradient(135deg, #3c2179 0%, #2b1963 60%, #1e3a8a 100%); color: #ffffff; border-radius: 12px; min-height: 92px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; box-shadow: 0 14px 30px rgba(60, 33, 121, 0.24); border: 1px solid rgba(255, 255, 255, 0.14); }
    @media (max-width: 959px) {
      .page { height: auto; }
      .b2b-hero, .b2b-proof, .b2b-foot-band { padding-inline: 20px; }
      .b2b-icons-bar { width: calc(100% - 32px); grid-template-columns: repeat(3, 1fr); }
      .b2b-tgrid { grid-template-columns: minmax(0, 1fr); }
      .b2b-foot-band { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 600px) {
      .b2b-h1 { font-size: 30px; }
      .b2b-icons-bar { grid-template-columns: repeat(2, 1fr); }
    }
  </style></head><body><div class="page">
    <div class="b2b-topstrip"><span>Limited Time: </span><b>Save BIG With Our SaaS Marketing Agency Funnels</b></div>
    <div class="b2b-hero">
      <div class="b2b-nav">
        <div class="b2b-brand"><span class="b2b-sun">☀</span><b>Logoipsum</b></div>
        <div class="b2b-links"><span>Services</span><span>Features</span><span>FAQs</span></div>
      </div>
      <div class="b2b-kicker">Afraid You Won't Be Able To Get A Regular Flow Of Customers?</div>
      <h1 class="b2b-h1">Boost Your B2B SaaS</h1>
      <p class="b2b-sub">What We Do Best Is Attract Traffic To Your Website And Convert It Into Contented, Paying Customers.</p>
      <div class="b2b-btns">
        <span class="b2b-btn-orange">Begin Your Free Trial Today!</span>
        <span class="b2b-btn-purple">▶ Watch Free Demo Videos</span>
      </div>
      <div class="b2b-micro">Cancel Anytime • No Contracts</div>
      <div class="b2b-checks">
        <span><i>✔</i><span>Zero Computer Skills Needed</span></span>
        <span><i>✔</i><span>For Every Type Of Business</span></span>
        <span><i>✔</i><span>Market, Sell, And Deliver</span></span>
      </div>
    </div>
    <div class="b2b-icons-bar">
      <div class="b2b-ic-item"><i>⇶</i><span>Sales Funnels</span></div>
      <div class="b2b-ic-item"><i>⊞</i><span>Landing Pages</span></div>
      <div class="b2b-ic-item"><i>📈</i><span>Lead Capture</span></div>
      <div class="b2b-ic-item"><i>⚙</i><span>Conversion Tools</span></div>
      <div class="b2b-ic-item"><i>$</i><span>Revenue Growth</span></div>
      <div class="b2b-ic-item"><i>🚀</i><span>Marketing Funnels</span></div>
    </div>
    <div class="b2b-proof">
      <div class="b2b-stars">★★★★★</div>
      <div class="b2b-script">Meet people who know us...</div>
      <h2 class="b2b-h2">World Class Entrepreneur Attract Traffic To Your Website</h2>
      <div class="b2b-tgrid">
        <div class="b2b-tcard">
          <div class="b2b-avatar"><img src="${PHOTOS.b2bAvatar1}" alt=""/></div>
          <b>John Doe</b><small>Verified Client</small>
          <p>This platform made the entire process smooth and reliable. Setting things up was easy, and I immediately noticed how much faster my workflow became. The tools are simple to use, yet powerful enough to handle complex needs.</p>
        </div>
        <div class="b2b-tcard">
          <div class="b2b-avatar"><img src="${PHOTOS.b2bAvatar2}" alt=""/></div>
          <b>Mark Vance</b><small>Verified Client</small>
          <p>The features are designed with users in mind, making every task feel intuitive and straightforward. I was able to cut down hours of manual work and focus more on growing my business. Support has also been excellent throughout.</p>
        </div>
        <div class="b2b-tcard">
          <div class="b2b-avatar"><img src="${PHOTOS.b2bAvatar3}" alt=""/></div>
          <b>Jane Doe</b><small>Verified Client</small>
          <p>From the first day, I could see how much efficiency this solution brought to my team. Managing multiple projects became less stressful, and the smart automation gave us more time to focus on clients instead of admin work.</p>
        </div>
      </div>
      <div><span class="b2b-btn-orange" style="display:inline-block">Begin Your Free Trial Today!</span></div>
      <div class="b2b-micro" style="margin:5px 0 6px">Cancel Anytime • No Contracts</div>
      <div class="b2b-stars" style="font-size:11px">★★★★★</div>
      <div class="b2b-rate-note">Your Company Is Rated Excellent · 4.9 out of 5 based on 1,312 reviews</div>
    </div>
    <div class="b2b-foot-band">
      <div>
        <h3>Building Strong Foundations for Growth</h3>
        <p>Clear strategies help transform pipeline challenges into predictable recurring ARR opportunities.</p>
      </div>
      <div class="b2b-foot-visual"><span>SaaS Growth Engine · +312% Pipeline</span><span>✈</span></div>
    </div>
  </div></body></html>`,

  'upklick-funnel-medical-solution': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; }
    .med-nav { background: #ffffff; padding: 12px 54px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
    .med-brand { display: inline-flex; align-items: center; gap: 7px; font-weight: 800; font-size: 13.5px; color: #0f172a; }
    .med-brand i { width: 22px; height: 22px; border-radius: 50%; background: #2ac3e2; color: #fff; display: grid; place-items: center; font-style: normal; font-size: 11px; font-weight: 900; }
    .med-links { display: flex; gap: 18px; font-size: 10px; font-weight: 700; color: #334155; }
    .med-hero { position: relative; height: 315px; background: #07192d; overflow: hidden; display: flex; align-items: center; padding: 0 74px; }
    .med-hero img { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.42; object-position: center 25%; }
    .med-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(7, 25, 45, 0.92) 0%, rgba(7, 25, 45, 0.65) 58%, rgba(7, 25, 45, 0.35) 100%); }
    [dir="rtl"] .med-overlay { background: linear-gradient(270deg, rgba(7, 25, 45, 0.92) 0%, rgba(7, 25, 45, 0.65) 58%, rgba(7, 25, 45, 0.35) 100%); }
    .med-hero-copy { position: relative; z-index: 2; max-width: 420px; color: #ffffff; }
    .med-eyebrow { color: #2ac3e2; font-size: 11px; font-weight: 800; margin-bottom: 6px; }
    .med-h1 { font-size: 32px; line-height: 1.12; font-weight: 900; margin-bottom: 12px; }
    .med-h1 em { font-style: normal; color: #2ac3e2; display: block; }
    .med-bullets { display: grid; gap: 5px; margin-bottom: 16px; font-size: 10.5px; color: #e2e8f0; }
    .med-bullets span i { color: #2ac3e2; font-style: normal; font-weight: 900; margin-inline-end: 6px; }
    .med-btn { display: inline-block; background: #2ac3e2; color: #042037; font-size: 10.5px; font-weight: 900; padding: 9px 20px; border-radius: 99px; box-shadow: 0 10px 24px rgba(42, 195, 226, 0.32); }
    .med-seen { background: #102a4c; color: #ffffff; padding: 14px 54px 16px; text-align: center; }
    .med-seen small { display: block; color: #38bdf8; font-size: 10px; font-weight: 700; margin-bottom: 8px; }
    .med-seen-logos { display: flex; justify-content: center; gap: 34px; align-items: center; font-size: 12px; font-weight: 800; color: #e2e8f0; flex-wrap: wrap; }
    .med-mid { background: #f4f8fb; padding: 30px 64px; text-align: center; }
    .med-italic-kicker { color: #2ac3e2; font-size: 12px; font-style: italic; font-weight: 700; margin-bottom: 3px; }
    .med-h2 { font-size: 23px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
    .med-sub { font-size: 10px; line-height: 1.5; color: #64748b; max-width: 500px; margin: 0 auto 20px; }
    .med-cards4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; max-width: 680px; margin: 0 auto; }
    .med-fcard { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 12px; text-align: center; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.03); }
    .med-circle { width: 54px; height: 54px; border-radius: 50%; border: 1.5px solid #67e8f9; background: #ecfeff; color: #0891b2; margin: 0 auto 10px; display: grid; place-items: center; font-size: 13px; font-weight: 900; }
    .med-fcard b { display: block; font-size: 10px; line-height: 1.38; color: #0f172a; font-weight: 800; }
    .med-bot { background: #ffffff; padding: 30px 74px 28px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .med-bot-head { text-align: center; margin-bottom: 18px; }
    .med-split { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 28px; align-items: center; max-width: 680px; margin: 0 auto; }
    .med-split h3 { font-size: 17px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
    .med-split p { font-size: 9.8px; line-height: 1.55; color: #475569; margin-bottom: 9px; }
    .med-mini-chk { font-size: 10px; font-weight: 800; color: #0891b2; }
    .med-photo { height: 188px; border-radius: 8px; overflow: hidden; box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1); }
    .med-photo img { width: 100%; height: 100%; }
    @media (max-width: 959px) {
      .page { height: auto; }
      .med-nav, .med-hero, .med-seen, .med-mid, .med-bot { padding-inline: 20px; }
      .med-cards4 { grid-template-columns: repeat(2, 1fr); }
      .med-split { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 600px) {
      .med-cards4 { grid-template-columns: minmax(0, 1fr); }
      .med-hero { height: auto; padding-block: 28px; }
    }
  </style></head><body><div class="page">
    <div class="med-nav">
      <div class="med-brand"><i>⚡</i><b>Logoipsum</b></div>
      <div class="med-links"><span>Features & Benefits</span><span>100% Guarantee</span><span>Testimonials</span><span>FAQs</span></div>
    </div>
    <div class="med-hero">
      <img src="${PHOTOS.medDoctorsLab}" alt=""/>
      <div class="med-overlay"></div>
      <div class="med-hero-copy">
        <div class="med-eyebrow">Filter Efficiency Above 99%</div>
        <h1 class="med-h1">Grab Your N95 Mask Now Up to <em>70% Off!</em></h1>
        <div class="med-bullets">
          <span><i>✓</i><span>High-performance filter fabric</span></span>
          <span><i>✓</i><span>99% particle filtration efficiency</span></span>
          <span><i>✓</i><span>Captures particles as small as 0.3 microns</span></span>
        </div>
        <span class="med-btn">Get Your N95 Mask Now!</span>
      </div>
    </div>
    <div class="med-seen">
      <small>As Seen On</small>
      <div class="med-seen-logos"><span>MedWatch</span><span>⇄ Logoipsum</span><span>✚ HealthPlus</span><span>⚡ BioShield</span><span>✺ CareStandard</span></div>
    </div>
    <div class="med-mid">
      <div class="med-italic-kicker">Protective N95 Mask</div>
      <h2 class="med-h2">Take Care of You And Your Family</h2>
      <p class="med-sub">With our comprehensive plans, you can be sure your loved ones are covered. We offer reliable, flexible solutions designed to give you peace of mind in every season of life.</p>
      <div class="med-cards4">
        <div class="med-fcard"><div class="med-circle">HEPA</div><b>Advanced 4-Stage HEPA Filtration</b></div>
        <div class="med-fcard"><div class="med-circle">3D</div><b>Dust, Virus & Bacteria Protection</b></div>
        <div class="med-fcard"><div class="med-circle">🛡</div><b>Shaped for Comfort. Built for Safety.</b></div>
        <div class="med-fcard"><div class="med-circle">≈</div><b>Soft on Ears, Light on Your Face</b></div>
      </div>
    </div>
    <div class="med-bot">
      <div class="med-bot-head">
        <div class="med-italic-kicker">Your Protection Starts with N95</div>
        <h2 class="med-h2">The #1 Rated Protective N95 Mask</h2>
        <p class="med-sub" style="margin-bottom:0">Stay safe with the highest level of defense. Our N95 masks provide superior filtration, offering you and your family ultimate peace of mind.</p>
      </div>
      <div class="med-split">
        <div>
          <h3>Ultra-High Filtration Power</h3>
          <p>Our advanced N95 masks are engineered with cutting-edge technology to provide maximum protection. The multi-layered design effectively filters out airborne particles, ensuring the air you breathe is clean.</p>
          <p>Lightweight ergonomic contours ensure a snug, secure seal without discomfort—allowing optimal breathability while delivering hospital-grade defense all day long.</p>
          <div class="med-mini-chk">✓ High-performance 4-layer filter fabric</div>
        </div>
        <div class="med-photo"><img src="${PHOTOS.medWomanMask}" alt=""/></div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-product-development': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #100818; display: flex; flex-direction: column; overflow: hidden; }
    .pd-topstrip { background: linear-gradient(90deg, #6366f1 0%, #818cf8 100%); color: #ffffff; font-size: 9.5px; font-weight: 700; text-align: center; padding: 6px 20px; }
    .pd-hero { background: radial-gradient(circle at 20% 58%, rgba(168, 85, 247, 0.36), transparent 48%), radial-gradient(circle at 82% 24%, rgba(236, 72, 153, 0.2), transparent 44%), #100818; color: #ffffff; padding: 20px 56px 46px; text-align: center; }
    .pd-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .pd-brand { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: #ffffff; }
    .pd-clover { width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg, #34d399, #60a5fa, #f472b6); display: inline-block; }
    .pd-pill-btn { display: inline-block; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(244, 114, 182, 0.55); color: #ffffff; font-size: 9.5px; font-weight: 700; padding: 8px 20px; border-radius: 99px; }
    .pd-h1 { font-size: 33px; line-height: 1.15; font-weight: 800; max-width: 560px; margin: 0 auto 12px; letter-spacing: -0.5px; }
    .pd-sub { font-size: 10.5px; line-height: 1.58; color: #cbd5e1; max-width: 540px; margin: 0 auto 20px; }
    .pd-logos-wrap { margin: 26px 0 28px; }
    .pd-logos-wrap small { display: block; font-size: 9.5px; color: #e2e8f0; margin-bottom: 12px; font-weight: 600; }
    .pd-logos { display: flex; justify-content: center; gap: 26px; flex-wrap: wrap; font-size: 12px; font-weight: 800; color: #f8fafc; }
    .pd-logos span i { color: #f472b6; font-style: normal; margin-inline-end: 4px; }
    .pd-bento { max-width: 650px; margin: 0 auto; background: rgba(24, 16, 38, 0.9); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 18px; padding: 20px; display: grid; grid-template-columns: 0.9fr 1.25fr 0.85fr; gap: 14px; text-align: start; box-shadow: 0 24px 52px rgba(0, 0, 0, 0.48); }
    .pd-panel { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 15px 14px; display: flex; flex-direction: column; justify-content: space-between; }
    .pd-gauge { position: relative; text-align: center; padding-top: 8px; }
    .pd-gauge svg { width: 132px; height: 78px; margin: 0 auto; display: block; }
    .pd-gauge b { display: block; font-size: 17px; font-weight: 900; color: #fff; margin-top: -28px; }
    .pd-gauge small { display: block; font-size: 8.5px; color: #cbd5e1; margin-top: 5px; }
    .pd-tags3 { display: flex; justify-content: center; gap: 5px; margin-top: 12px; }
    .pd-tags3 span { font-size: 7.5px; font-weight: 700; padding: 3px 7px; border-radius: 99px; background: rgba(244, 114, 182, 0.22); color: #fbcfe8; }
    .pd-timeline-h { text-align: center; margin-bottom: 10px; }
    .pd-timeline-h b { display: block; font-size: 11px; color: #ffffff; margin-bottom: 2px; }
    .pd-timeline-h small { font-size: 8.5px; color: #94a3b8; }
    .pd-years { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; position: relative; padding-top: 10px; }
    .pd-year-col { border-top: 2px solid #a855f7; padding-top: 10px; }
    .pd-year-col b { display: block; font-size: 11px; color: #f472b6; margin-bottom: 4px; }
    .pd-year-col p { font-size: 8px; line-height: 1.42; color: #cbd5e1; }
    .pd-vbars { height: 128px; display: flex; align-items: flex-end; justify-content: space-between; gap: 9px; padding-top: 10px; }
    .pd-vbar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; height: 100%; justify-content: flex-end; }
    .pd-vbar small { font-size: 9px; font-weight: 800; color: #ffffff; }
    .pd-vbar i { width: 100%; border-radius: 5px 5px 0 0; background: linear-gradient(180deg, #f472b6 0%, #818cf8 100%); display: block; }
    .pd-white { background: #ffffff; color: #0f172a; padding: 48px 74px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 32px; align-items: center; }
    .pd-kicker-blue { font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; color: #6366f1; text-transform: uppercase; margin-bottom: 8px; }
    .pd-white h2 { font-size: 25px; line-height: 1.2; font-weight: 900; color: #09090b; margin-bottom: 10px; }
    .pd-white p { font-size: 10.5px; line-height: 1.58; color: #475569; margin-bottom: 18px; }
    .pd-dark-cta { display: inline-block; background: #180c24; color: #ffffff; font-size: 10px; font-weight: 800; padding: 10px 22px; border-radius: 99px; border: 1px solid #ec4899; box-shadow: 0 10px 24px rgba(24, 12, 36, 0.18); }
    .pd-stat-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .pd-scard { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; }
    .pd-scard strong { display: block; font-size: 22px; font-weight: 900; color: #6d28d9; margin-bottom: 3px; }
    .pd-scard span { font-size: 10px; color: #475569; font-weight: 600; }
    .pd-bot { background: radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.16), transparent 62%), #100818; color: #ffffff; padding: 34px 64px 32px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 28px; }
    .pd-bot-top { text-align: center; max-width: 580px; margin: 0 auto; }
    .pd-bot-top h2 { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
    .pd-bot-top p { font-size: 10.2px; line-height: 1.55; color: #94a3b8; }
    .pd-workflow-row { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 28px; align-items: center; max-width: 660px; margin: 0 auto; width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px 22px; }
    .pd-wf-left small { display: block; color: #60a5fa; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; margin-bottom: 5px; }
    .pd-wf-left h3 { font-size: 18px; line-height: 1.26; font-weight: 800; color: #ffffff; }
    .pd-tiles { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; background: rgba(16, 8, 24, 0.72); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 10px; position: relative; }
    .pd-tile { width: 31px; height: 31px; border-radius: 7px; display: grid; place-items: center; font-size: 10.5px; font-weight: 900; color: #fff; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35); }
    @media (max-width: 959px) {
      .page { height: auto; }
      .pd-hero, .pd-white, .pd-bot { padding-inline: 20px; }
      .pd-bento, .pd-white, .pd-workflow-row { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 600px) {
      .pd-stat-cards { grid-template-columns: minmax(0, 1fr); }
    }
  </style></head><body><div class="page">
    <div class="pd-topstrip">Get the insights you need—right when you need them. Learn more!</div>
    <div class="pd-hero">
      <div class="pd-nav">
        <div class="pd-brand"><span class="pd-clover"></span><b>Logoipsum</b></div>
        <span class="pd-pill-btn">Get Insights Now</span>
      </div>
      <h1 class="pd-h1">Product Development with Valuable Customer Insights</h1>
      <p class="pd-sub">Our platform empowers you to capture meaningful insights from your customers, employees, or stakeholders in real time. With advanced analytics and intuitive reporting, you can turn feedback into actionable strategies that drive growth.</p>
      <span class="pd-pill-btn">Get Insights Now</span>
      <div class="pd-logos-wrap">
        <small>Transforming How Leading Companies Innovate with Customer Feedback</small>
        <div class="pd-logos">
          <span><i>❖</i><span>Logoipsum</span></span>
          <span><i>✦</i><span>PulseLabs</span></span>
          <span><i>❖</i><span>CloudScale</span></span>
          <span><i>✦</i><span>MetricFlow</span></span>
          <span><i>❖</i><span>NovaStack</span></span>
        </div>
      </div>
      <div class="pd-bento">
        <div class="pd-panel">
          <div class="pd-gauge">
            <svg viewBox="0 0 120 70">
              <path d="M14,60 A46,46 0 0,1 106,60" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="10" stroke-linecap="round"/>
              <path d="M14,60 A46,46 0 0,1 94,28" fill="none" stroke="#ec4899" stroke-width="10" stroke-linecap="round"/>
            </svg>
            <b>73%</b>
            <small>Adopted Feature Velocity</small>
          </div>
          <div class="pd-tags3"><span>Feedback</span><span>Insights</span><span>Roadmap</span></div>
        </div>
        <div class="pd-panel">
          <div class="pd-timeline-h"><b>Continuous Product Discovery</b><small>Real-time sentiment & roadmap alignment</small></div>
          <div class="pd-years">
            <div class="pd-year-col"><b>2022</b><p>Centralized multi-channel user feedback intake.</p></div>
            <div class="pd-year-col"><b>2023</b><p>Automated AI theme clustering & sprint scoring.</p></div>
            <div class="pd-year-col"><b>2024</b><p>Predictive revenue impact & instant release loops.</p></div>
          </div>
        </div>
        <div class="pd-panel">
          <div class="pd-vbars">
            <div class="pd-vbar"><small>19</small><i style="height:26%"></i></div>
            <div class="pd-vbar"><small>78</small><i style="height:82%"></i></div>
            <div class="pd-vbar"><small>68</small><i style="height:68%"></i></div>
            <div class="pd-vbar"><small>82</small><i style="height:92%"></i></div>
          </div>
        </div>
      </div>
    </div>
    <div class="pd-white">
      <div>
        <div class="pd-kicker-blue">VERIFIED CUSTOMER FEEDBACK INSIGHTS</div>
        <h2>Prioritize Every Release With Real User Evidence</h2>
        <p>Eliminate roadmap guesswork by connecting live customer interviews, NPS signals, and feature requests directly to engineering sprints.</p>
        <span class="pd-dark-cta">Get Insights Now</span>
      </div>
      <div class="pd-stat-cards">
        <div class="pd-scard"><strong>3.4x</strong><span>Faster Feature Validation</span></div>
        <div class="pd-scard"><strong>94%</strong><span>Stakeholder Alignment</span></div>
        <div class="pd-scard"><strong>-48%</strong><span>Wasted Sprint Cycles</span></div>
        <div class="pd-scard"><strong>24/7</strong><span>Live Feedback Sync</span></div>
      </div>
    </div>
    <div class="pd-bot">
      <div class="pd-bot-top">
        <h2>Converting Customer Feedback into Actionable Strategies</h2>
        <p>Trusted by industry leaders, our platform enables you to make confident, data-driven product decisions that deliver measurable results.</p>
      </div>
      <div class="pd-workflow-row">
        <div class="pd-wf-left">
          <small>SIMPLIFY</small>
          <h3>From Feedback to Action in One Unified Workflow</h3>
        </div>
        <div class="pd-tiles">
          <span class="pd-tile" style="background:#0284c7">E</span>
          <span class="pd-tile" style="background:#e11d48">M</span>
          <span class="pd-tile" style="background:#16a34a">🌱</span>
          <span class="pd-tile" style="background:#d97706">G</span>
          <span class="pd-tile" style="background:#2563eb">❄</span>
          <span class="pd-tile" style="background:#059669">ZF</span>
          <span class="pd-tile" style="background:#ea580c">⛩</span>
        </div>
      </div>
    </div>
  </div></body></html>`,

  'upklick-funnel-coaching-collective': `<!doctype html><html><head><style>${sharedCss}
    .page { width: 960px; height: 1240px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; }
    .cc-hero-wrap { background: radial-gradient(circle at 18% 72%, rgba(103, 232, 249, 0.28), transparent 42%), radial-gradient(circle at 78% 28%, rgba(196, 181, 253, 0.36), transparent 48%), linear-gradient(90deg, rgba(226,232,240,0.35) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(180deg, rgba(226,232,240,0.35) 1px, transparent 1px) 0 0 / 28px 28px, #fcfcff; padding: 16px 64px 0; }
    .cc-nav { background: linear-gradient(90deg, #6d28d9 0%, #7c3aed 100%); color: #ffffff; border-radius: 999px; padding: 8px 10px 8px 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 12px 28px rgba(109, 40, 217, 0.24); margin-bottom: 24px; }
    .cc-brand { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; }
    .cc-brand i { background: rgba(255,255,255,0.2); padding: 3px 6px; border-radius: 99px; font-style: normal; font-size: 9px; }
    .cc-links { display: flex; gap: 18px; font-size: 10px; font-weight: 600; color: #ede9fe; }
    .cc-nav-btn { background: #ffffff; color: #5b21b6; font-size: 9.5px; font-weight: 800; padding: 6px 14px; border-radius: 99px; }
    .cc-hero-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 24px; align-items: end; }
    .cc-hero-copy { padding-bottom: 28px; }
    .cc-cohort-pill { display: inline-flex; align-items: center; gap: 7px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 99px; padding: 3px 11px 3px 4px; font-size: 9px; color: #475569; font-weight: 600; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(15,23,42,0.04); }
    .cc-cohort-pill b { background: #7c3aed; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 7px; border-radius: 99px; }
    .cc-h1 { font-size: 34px; line-height: 1.08; font-weight: 900; color: #09090b; letter-spacing: -0.8px; margin-bottom: 12px; max-width: 390px; }
    .cc-sub { font-size: 10.2px; line-height: 1.55; color: #334155; margin-bottom: 16px; max-width: 400px; }
    .cc-sub b { color: #09090b; font-weight: 800; }
    .cc-cta-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .cc-btn-purple { background: #7c3aed; color: #ffffff; font-size: 10px; font-weight: 800; padding: 10px 18px; border-radius: 99px; box-shadow: 0 10px 24px rgba(124, 58, 237, 0.3); }
    .cc-link-how { font-size: 10px; font-weight: 800; color: #0f172a; }
    .cc-mini-stats { display: flex; gap: 26px; flex-wrap: wrap; }
    .cc-mstat strong { display: block; font-size: 17px; font-weight: 900; color: #09090b; }
    .cc-mstat span { font-size: 7.5px; font-weight: 800; letter-spacing: 0.6px; color: #64748b; text-transform: uppercase; }
    .cc-hero-photo { height: 340px; border-radius: 18px 18px 0 0; overflow: hidden; box-shadow: 0 -8px 30px rgba(109, 40, 217, 0.08); }
    .cc-hero-photo img { width: 100%; height: 100%; object-position: center top; }
    .cc-mid { background: #ffffff; padding: 30px 64px; text-align: center; }
    .cc-kicker { font-size: 8.5px; font-weight: 800; letter-spacing: 1.2px; color: #7c3aed; text-transform: uppercase; margin-bottom: 4px; }
    .cc-h2 { font-size: 21px; font-weight: 900; color: #09090b; margin-bottom: 4px; }
    .cc-h2 em { font-style: normal; color: #7c3aed; }
    .cc-mid-sub { font-size: 9.8px; color: #64748b; margin-bottom: 16px; }
    .cc-partners { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 650px; margin: 0 auto 16px; }
    .cc-partner { background: #f5f3ff; border-radius: 8px; padding: 9px 8px; font-size: 9.5px; font-weight: 800; color: #1e1b4b; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .cc-partner i { width: 14px; height: 14px; border-radius: 4px; background: #7c3aed; color: #fff; font-style: normal; font-size: 8px; display: grid; place-items: center; }
    .cc-big-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 650px; margin: 0 auto; }
    .cc-bstat { background: #ffffff; border: 1px solid #ede9fe; border-top: 3px solid #7c3aed; border-radius: 12px; padding: 14px 12px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04); }
    .cc-bstat.cyan { border-top-color: #22d3ee; }
    .cc-bstat strong { display: block; font-size: 22px; font-weight: 900; color: #09090b; margin-bottom: 3px; }
    .cc-bstat span { font-size: 9px; color: #64748b; font-weight: 600; }
    .cc-story { background: #f4f4f6; padding: 28px 74px; flex: 1; display: grid; grid-template-columns: 0.86fr 1.14fr; gap: 32px; align-items: center; }
    .cc-portrait-wrap { position: relative; max-width: 260px; margin: 0 auto; width: 100%; }
    .cc-portrait { height: 270px; border-radius: 16px; overflow: hidden; border: 4px solid #ffffff; box-shadow: 0 18px 38px rgba(15, 23, 42, 0.1); }
    .cc-portrait img { width: 100%; height: 100%; object-position: center top; }
    .cc-exp-chip { position: absolute; top: 14px; inset-inline-end: -14px; background: #7c3aed; color: #ffffff; padding: 7px 12px; border-radius: 9px; box-shadow: 0 10px 22px rgba(124, 58, 237, 0.32); }
    .cc-exp-chip b { display: block; font-size: 13px; font-weight: 900; line-height: 1.1; }
    .cc-exp-chip small { font-size: 7px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #ede9fe; }
    .cc-cred-card { position: absolute; bottom: -10px; inset-inline-start: -10px; inset-inline-end: 18px; background: #ffffff; border-radius: 10px; padding: 9px 11px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1); border: 1px solid #f1f5f9; }
    .cc-cred-card b { display: block; font-size: 7.5px; letter-spacing: 0.8px; color: #7c3aed; margin-bottom: 2px; }
    .cc-cred-card span { display: block; font-size: 8px; line-height: 1.35; color: #334155; font-weight: 600; }
    .cc-story-copy h3 { font-size: 22px; line-height: 1.16; font-weight: 900; color: #09090b; margin-bottom: 10px; }
    .cc-cyan-quote { background: #def7fa; border-radius: 8px; padding: 9px 12px; font-size: 10px; line-height: 1.45; font-weight: 800; color: #0f172a; margin-bottom: 10px; }
    .cc-story-copy p { font-size: 9.2px; line-height: 1.55; color: #475569; margin-bottom: 8px; }
    .cc-story-copy p b { color: #09090b; }
    .cc-sig { margin-top: 8px; }
    .cc-sig b { display: block; font-size: 15px; font-style: italic; font-weight: 900; color: #7c3aed; }
    .cc-sig small { font-size: 8px; color: #64748b; }
    @media (max-width: 959px) {
      .page { height: auto; }
      .cc-hero-wrap, .cc-mid, .cc-story { padding-inline: 20px; }
      .cc-hero-grid, .cc-story { grid-template-columns: minmax(0, 1fr); }
      .cc-partners { grid-template-columns: repeat(2, 1fr); }
      .cc-big-stats { grid-template-columns: minmax(0, 1fr); }
      .cc-exp-chip { inset-inline-end: 8px; }
      .cc-cred-card { inset-inline-start: 8px; }
    }
    @media (max-width: 600px) {
      .cc-links { display: none; }
      .cc-h1 { font-size: 28px; }
      .cc-hero-photo { height: 250px; }
    }
  </style></head><body><div class="page">
    <div class="cc-hero-wrap">
      <div class="cc-nav">
        <div class="cc-brand"><i>∞</i><b>The Compound Collective</b></div>
        <div class="cc-links"><span>Home</span><span>About ▾</span><span>Contact</span></div>
        <span class="cc-nav-btn">Get The Free Guide →</span>
      </div>
      <div class="cc-hero-grid">
        <div class="cc-hero-copy">
          <div class="cc-cohort-pill"><b>NEW</b><span>Cohort 09 · coaching that compounds</span></div>
          <h1 class="cc-h1">Build a Smarter Coaching Business That Drives Real Results.</h1>
          <p class="cc-sub">Led by an <b>ICF-certified coach with 11 years in the field</b>, The Compound Collective has trained 340+ independent operators. Last cohort averaged <b>3x higher client retention</b> and <b>47% more revenue</b> in under 90 days.</p>
          <div class="cc-cta-row">
            <span class="cc-btn-purple">Send Me The Free Guide →</span>
            <span class="cc-link-how">See how it works →</span>
          </div>
          <div class="cc-mini-stats">
            <div class="cc-mstat"><strong>100+</strong><span>COACHES TRAINED</span></div>
            <div class="cc-mstat"><strong>47%</strong><span>AVG REVENUE LIFT</span></div>
            <div class="cc-mstat"><strong>42 hrs</strong><span>BACK PER MONTH</span></div>
          </div>
        </div>
        <div class="cc-hero-photo"><img src="${PHOTOS.coachWomanBlazer}" alt=""/></div>
      </div>
    </div>
    <div class="cc-mid">
      <div class="cc-kicker">TRUSTED BY</div>
      <h2 class="cc-h2">Trusted By <em>Industry Leaders</em></h2>
      <p class="cc-mid-sub">Agencies, consultants, and coaching studios building their engine on the same framework.</p>
      <div class="cc-partners">
        <span class="cc-partner"><i>◈</i><span>Northwind</span></span>
        <span class="cc-partner"><i>◈</i><span>Brightpath</span></span>
        <span class="cc-partner"><i>◈</i><span>Apex Advisory</span></span>
        <span class="cc-partner"><i>◈</i><span>Crestline</span></span>
        <span class="cc-partner"><i>◈</i><span>Elevate Co</span></span>
      </div>
      <div class="cc-big-stats">
        <div class="cc-bstat"><strong>10K+</strong><span>Students trained across 9 cohorts</span></div>
        <div class="cc-bstat cyan"><strong>Top 1%</strong><span>Industry-ranked coaching programs</span></div>
        <div class="cc-bstat"><strong>$50M+</strong><span>Client revenue generated</span></div>
      </div>
    </div>
    <div class="cc-story">
      <div class="cc-portrait-wrap">
        <div class="cc-portrait"><img src="${PHOTOS.coachWomanCoffee}" alt=""/></div>
        <div class="cc-exp-chip"><b>11 yrs</b><small>COACHING EXPERIENCE</small></div>
        <div class="cc-cred-card"><b>CREDENTIALS</b><span>ICF-certified · Formerly Head of Coaching, Brightpath Studio · 340+ operators trained</span></div>
      </div>
      <div class="cc-story-copy">
        <div class="cc-kicker">THE WHY BEHIND THE COLLECTIVE</div>
        <h3>A coach who's been in your chair.</h3>
        <div class="cc-cyan-quote">Eight years ago this coaching practice looked successful on paper and felt like a trap every Monday morning.</div>
        <p>22 clients on rolling calls, a calendar that never closed, revenue that flatlined the second a week off came up. Every scaling course said the same thing — post more, hustle harder, build another funnel.</p>
        <p>The turning point wasn't a new tactic. It was a <b>delivery system</b> — a repeatable coaching framework that could be taught instead of performed. Six months later, hours dropped 40% and rates tripled.</p>
        <p>Today The Compound Collective helps independent coaches do the same: build an offer that compounds, systemize the messy middle, and get their weekends back. 340+ operators and counting.</p>
        <div class="cc-sig"><b>The Compound Collective</b><small>Founder · ICF-certified · 11 years in coaching</small></div>
      </div>
    </div>
  </div></body></html>`,
};


/**
 * Generator of realistic mobile camera photos for vehicle inspection tests.
 * Simulates smartphone camera captures of chassis VIN stamping and engine block numbers.
 */

export function generateRealisticChassisPhoto(chassi: string, modelo: string = "VEÍCULO", dateStr: string = "19/08/2026 14:22:18"): string {
  const cleanChassi = chassi.toUpperCase().trim();
  const displayVin = `*${cleanChassi}*`;
  
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <!-- Steel Texture Gradients -->
    <linearGradient id="metalBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2d333b"/>
      <stop offset="30%" stop-color="#3d4450"/>
      <stop offset="48%" stop-color="#5a6372"/>
      <stop offset="52%" stop-color="#8a95a5"/>
      <stop offset="55%" stop-color="#4a5360"/>
      <stop offset="80%" stop-color="#262c35"/>
      <stop offset="100%" stop-color="#181c22"/>
    </linearGradient>

    <!-- Stamped Indentation Filter -->
    <filter id="stamped" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1.5" dy="1.5" stdDeviation="0.8" flood-color="#05070a" flood-opacity="0.95"/>
      <feDropShadow dx="-1" dy="-1" stdDeviation="0.5" flood-color="#c5d1e0" flood-opacity="0.75"/>
    </filter>

    <!-- Camera Flash Glare -->
    <radialGradient id="flashGlare" cx="45%" cy="40%" r="55%" fx="45%" fy="40%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="25%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.0"/>
    </radialGradient>

    <!-- Spot Weld Gradient -->
    <radialGradient id="weldSpot" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#15171a"/>
      <stop offset="60%" stop-color="#2c323b"/>
      <stop offset="90%" stop-color="#4e5866"/>
      <stop offset="100%" stop-color="#353c45" stop-opacity="0"/>
    </radialGradient>

    <!-- Metal Scratch Pattern -->
    <pattern id="metalGrain" width="40" height="40" patternUnits="userSpaceOnUse">
      <line x1="0" y1="5" x2="40" y2="7" stroke="#ffffff" stroke-opacity="0.04" stroke-width="0.7"/>
      <line x1="0" y1="18" x2="40" y2="19" stroke="#000000" stroke-opacity="0.1" stroke-width="0.8"/>
      <line x1="0" y1="32" x2="40" y2="31" stroke="#ffffff" stroke-opacity="0.03" stroke-width="0.6"/>
    </pattern>
  </defs>

  <!-- Background Steel Plate -->
  <rect width="800" height="600" fill="url(#metalBg)"/>
  <rect width="800" height="600" fill="url(#metalGrain)"/>

  <!-- Vehicle Frame Seams / Welds -->
  <path d="M 0,110 Q 400,105 800,115" stroke="#181c22" stroke-width="6" fill="none" opacity="0.6"/>
  <path d="M 0,113 Q 400,108 800,118" stroke="#7e8c9f" stroke-width="1.5" fill="none" opacity="0.4"/>
  
  <path d="M 0,490 Q 400,495 800,485" stroke="#181c22" stroke-width="8" fill="none" opacity="0.7"/>
  <path d="M 0,487 Q 400,492 800,482" stroke="#7e8c9f" stroke-width="1.5" fill="none" opacity="0.4"/>

  <!-- Spot Welds -->
  <circle cx="80" cy="112" r="18" fill="url(#weldSpot)"/>
  <circle cx="280" cy="110" r="16" fill="url(#weldSpot)"/>
  <circle cx="520" cy="111" r="17" fill="url(#weldSpot)"/>
  <circle cx="720" cy="114" r="18" fill="url(#weldSpot)"/>

  <circle cx="120" cy="488" r="17" fill="url(#weldSpot)"/>
  <circle cx="390" cy="491" r="19" fill="url(#weldSpot)"/>
  <circle cx="660" cy="487" r="17" fill="url(#weldSpot)"/>

  <!-- Primer/Paint Masking Edge -->
  <rect x="50" y="210" width="700" height="180" rx="6" fill="#1e232a" fill-opacity="0.4" stroke="#4a5568" stroke-width="1" stroke-dasharray="8 4"/>

  <!-- Stamped VIN Text (Simulating Dot-Peen / Mechanical Press Stamping) -->
  <g filter="url(#stamped)">
    <text 
      x="400" 
      y="315" 
      font-family="'Consolas', 'Courier New', 'Lucida Console', monospace" 
      font-size="34" 
      font-weight="900" 
      letter-spacing="5" 
      fill="#1c2127" 
      text-anchor="middle"
      stroke="#12161b"
      stroke-width="1"
    >
      ${displayVin}
    </text>
  </g>

  <!-- Secondary Dot-Peen Metallic Highlight Overlay -->
  <text 
    x="399.5" 
    y="314" 
    font-family="'Consolas', 'Courier New', 'Lucida Console', monospace" 
    font-size="34" 
    font-weight="900" 
    letter-spacing="5" 
    fill="#8898aa" 
    fill-opacity="0.35" 
    text-anchor="middle"
  >
    ${displayVin}
  </text>

  <!-- Smartphone Camera Flash Light Cone -->
  <rect width="800" height="600" fill="url(#flashGlare)" pointer-events="none"/>

  <!-- Camera HUD / UI Overlay (Simulating Mobile Inspection Camera) -->
  <g opacity="0.65" stroke="#ffffff" stroke-width="1.2" fill="none">
    <!-- Center Focus Reticle -->
    <circle cx="400" cy="300" r="45" stroke-dasharray="6 4" stroke-opacity="0.4"/>
    <line x1="385" y1="300" x2="415" y2="300" stroke-opacity="0.5"/>
    <line x1="400" y1="285" x2="400" y2="315" stroke-opacity="0.5"/>

    <!-- Viewfinder Corners -->
    <path d="M 60,80 L 90,80 M 60,80 L 60,110"/>
    <path d="M 740,80 L 710,80 M 740,80 L 740,110"/>
    <path d="M 60,520 L 90,520 M 60,520 L 60,490"/>
    <path d="M 740,520 L 710,520 M 740,520 L 740,490"/>
  </g>

  <!-- Camera Metadata Info Banner (Top) -->
  <rect x="0" y="0" width="800" height="36" fill="#000000" fill-opacity="0.55"/>
  <text x="24" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#22c55e" letter-spacing="1">
    ● EV-CHASSI [MACRO 1.2x AF-L]
  </text>
  <text x="776" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#e2e8f0" text-anchor="end">
    ARGOS FIELD INSPECT v2.6
  </text>

  <!-- Mobile Timestamp Watermark (Bottom Right in Yellow/Orange) -->
  <rect x="490" y="542" width="290" height="42" rx="4" fill="#000000" fill-opacity="0.6"/>
  <text x="765" y="561" font-family="'Consolas', 'Courier New', monospace" font-size="13" font-weight="700" fill="#fbbf24" text-anchor="end">
    ${dateStr}
  </text>
  <text x="765" y="576" font-family="'Consolas', 'Courier New', monospace" font-size="10" font-weight="600" fill="#fef3c7" text-anchor="end">
    CHASSI: ${cleanChassi} | ${modelo.substring(0, 20)}
  </text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateRealisticEnginePhoto(motor: string, modelo: string = "VEÍCULO", dateStr: string = "19/08/2026 14:24:05"): string {
  const cleanMotor = motor.toUpperCase().trim();
  const displayMotor = `*${cleanMotor}*`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <!-- Cast Iron / Aluminum Engine Block Texture -->
    <linearGradient id="engineCastBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c2026"/>
      <stop offset="25%" stop-color="#2a303a"/>
      <stop offset="50%" stop-color="#3b4452"/>
      <stop offset="75%" stop-color="#222830"/>
      <stop offset="100%" stop-color="#15191f"/>
    </linearGradient>

    <!-- Milled Machined Flat Pad -->
    <linearGradient id="machinedPad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f5968"/>
      <stop offset="20%" stop-color="#7b889b"/>
      <stop offset="50%" stop-color="#93a1b5"/>
      <stop offset="80%" stop-color="#6e7b8e"/>
      <stop offset="100%" stop-color="#454f5d"/>
    </linearGradient>

    <!-- Laser/Stamping Engraving Filter -->
    <filter id="engravedMotor" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1.2" dy="1.2" stdDeviation="0.6" flood-color="#0a0c10" flood-opacity="0.95"/>
      <feDropShadow dx="-0.8" dy="-0.8" stdDeviation="0.4" flood-color="#dbe4f0" flood-opacity="0.65"/>
    </filter>

    <!-- Flash Light Refraction -->
    <radialGradient id="engineFlash" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="35%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0.0"/>
    </radialGradient>

    <!-- Cast Roughness Pattern -->
    <pattern id="castGrain" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.2" fill="#000000" fill-opacity="0.3"/>
      <circle cx="14" cy="7" r="1" fill="#ffffff" fill-opacity="0.07"/>
      <circle cx="9" cy="15" r="1.4" fill="#000000" fill-opacity="0.25"/>
      <circle cx="18" cy="17" r="0.9" fill="#ffffff" fill-opacity="0.08"/>
    </pattern>
  </defs>

  <!-- Rough Cast Engine Block Base -->
  <rect width="800" height="600" fill="url(#engineCastBg)"/>
  <rect width="800" height="600" fill="url(#castGrain)"/>

  <!-- Engine Block Ribs & Cast Edges -->
  <path d="M 0,80 L 800,95" stroke="#0e1115" stroke-width="12" fill="none" opacity="0.8"/>
  <path d="M 0,86 L 800,101" stroke="#5d6a7d" stroke-width="2" fill="none" opacity="0.4"/>
  
  <path d="M 0,520 L 800,510" stroke="#0e1115" stroke-width="14" fill="none" opacity="0.8"/>
  <path d="M 0,514 L 800,504" stroke="#5d6a7d" stroke-width="2" fill="none" opacity="0.4"/>

  <!-- Machined Mounting Bolts in Cast Block -->
  <g fill="#374151" stroke="#1f2937" stroke-width="2">
    <!-- Hex bolt 1 -->
    <polygon points="90,170 110,160 130,170 130,195 110,205 90,195"/>
    <circle cx="110" cy="182" r="6" fill="#111827"/>

    <!-- Hex bolt 2 -->
    <polygon points="670,170 690,160 710,170 710,195 690,205 670,195"/>
    <circle cx="690" cy="182" r="6" fill="#111827"/>

    <!-- Hex bolt 3 -->
    <polygon points="670,410 690,400 710,410 710,435 690,445 670,435"/>
    <circle cx="690" cy="422" r="6" fill="#111827"/>
  </g>

  <!-- Machined Engine Pad (Milled Aluminum/Steel Flat Surface) -->
  <rect x="70" y="225" width="660" height="150" rx="8" fill="url(#machinedPad)" stroke="#2b3441" stroke-width="3"/>

  <!-- Tooling Machining Lines on the Pad -->
  <g stroke="#ffffff" stroke-opacity="0.08" stroke-width="1">
    <line x1="80" y1="245" x2="720" y2="245"/>
    <line x1="80" y1="265" x2="720" y2="265"/>
    <line x1="80" y1="285" x2="720" y2="285"/>
    <line x1="80" y1="305" x2="720" y2="305"/>
    <line x1="80" y1="325" x2="720" y2="325"/>
    <line x1="80" y1="345" x2="720" y2="345"/>
    <line x1="80" y1="365" x2="720" y2="365"/>
  </g>

  <!-- Slight Oil Film Patina -->
  <ellipse cx="600" cy="270" rx="70" ry="35" fill="#a16207" fill-opacity="0.18"/>
  <ellipse cx="160" cy="330" rx="55" ry="25" fill="#a16207" fill-opacity="0.14"/>

  <!-- Engraved Engine Code Stamping -->
  <g filter="url(#engravedMotor)">
    <text 
      x="400" 
      y="312" 
      font-family="'Consolas', 'Courier New', 'Lucida Console', monospace" 
      font-size="36" 
      font-weight="900" 
      letter-spacing="6" 
      fill="#141922" 
      text-anchor="middle"
      stroke="#0f131a"
      stroke-width="1"
    >
      ${displayMotor}
    </text>
  </g>

  <!-- Secondary High-Precision Dot Laser Marking Glow -->
  <text 
    x="399" 
    y="310.5" 
    font-family="'Consolas', 'Courier New', 'Lucida Console', monospace" 
    font-size="36" 
    font-weight="900" 
    letter-spacing="6" 
    fill="#cbd5e1" 
    fill-opacity="0.4" 
    text-anchor="middle"
  >
    ${displayMotor}
  </text>

  <!-- Flash Refraction -->
  <rect width="800" height="600" fill="url(#engineFlash)" pointer-events="none"/>

  <!-- Camera HUD Overlay -->
  <g opacity="0.65" stroke="#ffffff" stroke-width="1.2" fill="none">
    <circle cx="400" cy="300" r="45" stroke-dasharray="6 4" stroke-opacity="0.4"/>
    <line x1="385" y1="300" x2="415" y2="300" stroke-opacity="0.5"/>
    <line x1="400" y1="285" x2="400" y2="315" stroke-opacity="0.5"/>

    <path d="M 60,80 L 90,80 M 60,80 L 60,110"/>
    <path d="M 740,80 L 710,80 M 740,80 L 740,110"/>
    <path d="M 60,520 L 90,520 M 60,520 L 60,490"/>
    <path d="M 740,520 L 710,520 M 740,520 L 740,490"/>
  </g>

  <!-- Camera Header Bar -->
  <rect x="0" y="0" width="800" height="36" fill="#000000" fill-opacity="0.55"/>
  <text x="24" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#38bdf8" letter-spacing="1">
    ● EV-MOTOR [BLOCO / CARCAÇA]
  </text>
  <text x="776" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#e2e8f0" text-anchor="end">
    ARGOS FIELD INSPECT v2.6
  </text>

  <!-- Mobile Timestamp Watermark -->
  <rect x="490" y="542" width="290" height="42" rx="4" fill="#000000" fill-opacity="0.6"/>
  <text x="765" y="561" font-family="'Consolas', 'Courier New', monospace" font-size="13" font-weight="700" fill="#fbbf24" text-anchor="end">
    ${dateStr}
  </text>
  <text x="765" y="576" font-family="'Consolas', 'Courier New', monospace" font-size="10" font-weight="600" fill="#fef3c7" text-anchor="end">
    MOTOR: ${cleanMotor} | ${modelo.substring(0, 20)}
  </text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

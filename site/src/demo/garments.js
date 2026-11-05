// رسومات توضيحية أصلية (SVG) لقطع الأزياء، تُستعمل في النسخة التجريبية فقط.
// ليست صور حقيقية: هي بديل مؤقت يشبه الواقع بما يكفي لتجربة الموقع، إلى أن تضيف ألاء صور قطعها.

const W = 600, H = 750;

// لوحات الألوان: [فاتح، أساسي، غامق]
export const palettes = {
  plum:     ['#B07A9C', '#6F2F5F', '#3F1636'],
  emerald:  ['#4FA38B', '#0F6B57', '#08362C'],
  rose:     ['#F2C4CC', '#D98A9C', '#9A5C6D'],
  champagne:['#F4E3CC', '#D9B98F', '#A98557'],
  indigo:   ['#5C6BB0', '#2B3A87', '#151D4C'],
  terra:    ['#E3A183', '#BF5B3D', '#7C3220'],
  black:    ['#5B5560', '#2A2630', '#121016'],
  sage:     ['#B7C7A3', '#7F9A6B', '#4C6340'],
  blush:    ['#F8DDD9', '#EBB9B4', '#C98A87'],
  teal:     ['#5FB4B0', '#1E7F7F', '#0E4747'],
  cream:    ['#FBF1E3', '#EAD7BC', '#C9AE88'],
  olive:    ['#B9B27A', '#7D7A3C', '#4D4B22'],
  dusty:    ['#B7CCDD', '#7E9DB8', '#4C6A85'],
  burgundy: ['#B5566B', '#7A1F3A', '#450F22'],
};

const GOLD = ['#F1D3C8', '#CEA9A6', '#9F7570']; // ذهبي وردي

let uid = 0;

function defs(id, pal, extra = '') {
  return `<defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF6F3"/><stop offset="1" stop-color="#F1E1DF"/></linearGradient>
    <radialGradient id="glow${id}" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="f${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".55" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></linearGradient>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD[0]}"/><stop offset=".5" stop-color="${GOLD[1]}"/><stop offset="1" stop-color="${GOLD[2]}"/></linearGradient>
    <linearGradient id="d${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></linearGradient>
    <pattern id="dots${id}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="2.2" fill="${GOLD[0]}" opacity=".55"/></pattern>
    <pattern id="dia${id}" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M15 4 26 15 15 26 4 15Z" fill="none" stroke="${GOLD[1]}" stroke-width="1.6" opacity=".8"/><circle cx="15" cy="15" r="2" fill="${GOLD[0]}" opacity=".9"/></pattern>
    <pattern id="lace${id}" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="#fff" opacity=".28"/><circle cx="12" cy="12" r="2.4" fill="#fff" opacity=".28"/></pattern>
    ${extra}
  </defs>`;
}

function frame(id, pal, body, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
  ${defs(id, pal, extraDefs)}
  <rect width="${W}" height="${H}" fill="url(#bg${id})"/>
  <rect width="${W}" height="${H}" fill="url(#glow${id})"/>
  <circle cx="300" cy="360" r="250" fill="${pal[0]}" opacity=".13"/>
  <ellipse cx="300" cy="704" rx="200" ry="13" fill="#3B2A2F" opacity=".14"/>
  ${body}
</svg>`;
}

// خطوط طيّات خفيفة
const folds = (paths, o = 0.22) => paths.map(d => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="3" stroke-linecap="round"/>`).join('')
  + paths.map(d => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${o / 2.4}" stroke-width="2" stroke-linecap="round" transform="translate(5 3)"/>`).join('');

const KINDS = {
  // فستان سهرة (حورية)
  evening(id, p) {
    const body = `
      <path d="M262 86 L246 152 M338 86 L354 152" stroke="url(#g${id})" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M244 152 Q300 206 356 152 L374 300 Q386 396 394 466 Q424 566 478 694 L122 694 Q176 566 206 466 Q214 396 226 300 Z" fill="url(#f${id})"/>
      <path d="M244 152 Q300 206 356 152" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      <path d="M226 300 Q300 322 374 300" fill="none" stroke="url(#g${id})" stroke-width="9" stroke-linecap="round"/>
      <path d="M270 180 Q300 330 296 460 M330 190 Q310 330 322 470" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/>
      <path d="M244 170 Q290 230 300 300 L226 300 Z" fill="url(#lace${id})" opacity=".8"/>
      <g fill="${GOLD[0]}" opacity=".85"><circle cx="262" cy="232" r="3"/><circle cx="290" cy="260" r="3"/><circle cx="330" cy="236" r="3"/><circle cx="346" cy="270" r="3"/><circle cx="276" cy="282" r="2.4"/></g>
      ${folds(['M210 480 Q196 580 160 680', 'M260 480 Q250 590 236 690', 'M340 480 Q350 590 364 690', 'M390 480 Q404 580 440 680'])}
      <path d="M122 694 Q300 676 478 694" fill="none" stroke="url(#g${id})" stroke-width="6" stroke-linecap="round"/>`;
    return frame(id, p, body);
  },
  // فستان هزاز (منفوش)
  swing(id, p) {
    const body = `
      <path d="M256 104 Q300 142 344 104 L376 134 L360 190 L370 288 C440 340 508 460 528 560 Q478 584 424 560 Q366 592 300 568 Q234 592 176 560 Q122 584 72 560 C92 460 160 340 230 288 L240 190 L224 134 Z" fill="url(#f${id})"/>
      <path d="M256 104 Q300 142 344 104" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      <path d="M230 288 Q300 312 370 288" fill="none" stroke="url(#g${id})" stroke-width="10" stroke-linecap="round"/>
      <circle cx="300" cy="300" r="9" fill="url(#g${id})"/>
      <path d="M240 190 Q300 230 360 190" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
      ${folds(['M262 320 Q226 430 190 548', 'M300 322 Q296 440 298 560', 'M338 320 Q374 430 410 548', 'M232 330 Q160 430 124 540', 'M368 330 Q440 430 476 540'])}
      <path d="M72 560 Q122 584 176 560 Q234 592 300 568 Q366 592 424 560 Q478 584 528 560" fill="none" stroke="url(#g${id})" stroke-width="5" stroke-linecap="round"/>`;
    return frame(id, p, body);
  },
  // ثوب سوداني
  toub(id, p) {
    const body = `
      <path d="M300 70 C248 70 232 120 238 166 C196 206 168 332 158 452 C148 584 118 654 106 702 L494 702 C482 654 452 584 442 452 C432 332 404 206 362 166 C368 120 352 70 300 70 Z" fill="url(#f${id})"/>
      <path d="M300 70 C248 70 232 120 238 166 C196 206 168 332 158 452 C148 584 118 654 106 702 L494 702 C482 654 452 584 442 452 C432 332 404 206 362 166 C368 120 352 70 300 70 Z" fill="url(#dia${id})" opacity=".55"/>
      <path d="M238 166 C288 236 366 268 452 332 L448 410 C358 346 286 312 220 250 Z" fill="url(#d${id})" opacity=".9"/>
      <path d="M238 166 C288 236 366 268 452 332" fill="none" stroke="url(#g${id})" stroke-width="7" stroke-linecap="round"/>
      <path d="M220 250 C286 312 358 346 448 410" fill="none" stroke="url(#g${id})" stroke-width="4" stroke-linecap="round"/>
      <path d="M106 702 C118 654 148 584 158 452" fill="none" stroke="url(#g${id})" stroke-width="9" stroke-linecap="round"/>
      <path d="M494 702 C482 654 452 584 442 452" fill="none" stroke="url(#g${id})" stroke-width="9" stroke-linecap="round"/>
      <path d="M106 702 L494 702" stroke="url(#g${id})" stroke-width="12"/>
      ${folds(['M230 330 C214 430 196 560 176 680', 'M300 400 C300 500 300 600 300 690', 'M372 420 C388 500 404 600 420 680'])}`;
    return frame(id, p, body);
  },
  // عباية مفتوحة
  abaya(id, p) {
    const body = `
      <path d="M254 106 Q300 140 346 106 L398 150 L476 446 L422 466 L386 276 L398 700 L202 700 L214 276 L178 466 L124 446 L202 150 Z" fill="url(#f${id})"/>
      <path d="M286 126 L314 126 L346 700 L254 700 Z" fill="url(#d${id})"/>
      <path d="M286 126 L254 700 M314 126 L346 700" stroke="url(#g${id})" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M124 446 L176 466 M476 446 L424 466" stroke="url(#g${id})" stroke-width="9" stroke-linecap="round"/>
      <path d="M214 276 Q300 296 386 276" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      ${folds(['M220 300 Q210 500 206 680', 'M386 300 Q392 500 396 680', 'M170 220 Q150 330 140 430', 'M430 220 Q450 330 460 430'])}
      <path d="M202 700 L398 700" stroke="url(#g${id})" stroke-width="8"/>`;
    return frame(id, p, body);
  },
  // فستان خطوبة بأكمام طويلة
  engagement(id, p) {
    const body = `
      <path d="M252 104 Q300 140 348 104 L398 134 L442 336 L412 346 L374 206 L380 300 L456 700 L144 700 L220 300 L226 206 L188 346 L158 336 L202 134 Z" fill="url(#f${id})"/>
      <path d="M252 104 Q300 140 348 104 L398 134 L442 336 L412 346 L374 206 L380 300 L220 300 L226 206 L188 346 L158 336 L202 134 Z" fill="url(#lace${id})"/>
      <path d="M220 300 Q300 324 380 300" fill="none" stroke="url(#g${id})" stroke-width="10" stroke-linecap="round"/>
      <path d="M252 104 Q300 140 348 104" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      <g fill="${GOLD[0]}" opacity=".9"><circle cx="300" cy="196" r="3.2"/><circle cx="300" cy="226" r="3.2"/><circle cx="300" cy="256" r="3.2"/></g>
      <path d="M162 330 L190 340 M438 330 L410 340" stroke="url(#g${id})" stroke-width="7" stroke-linecap="round"/>
      ${folds(['M250 330 Q226 520 190 690', 'M300 330 Q300 520 300 690', 'M350 330 Q374 520 410 690'])}
      <path d="M144 700 L456 700" stroke="url(#g${id})" stroke-width="8"/>`;
    return frame(id, p, body);
  },
  // طقم بلوزة وتنورة
  set(id, p) {
    const body = `
      <path d="M244 112 Q300 146 356 112 L418 150 L396 214 L372 192 L380 300 L220 300 L228 192 L204 214 L182 150 Z" fill="url(#f${id})"/>
      <path d="M244 112 Q300 146 356 112" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      <path d="M220 300 Q300 322 380 300" fill="none" stroke="url(#g${id})" stroke-width="6" stroke-linecap="round"/>
      <path d="M228 340 L372 340 L430 690 L170 690 Z" fill="url(#d${id})"/>
      <path d="M228 340 Q300 356 372 340" fill="none" stroke="url(#g${id})" stroke-width="8" stroke-linecap="round"/>
      ${folds(['M258 368 L226 680', 'M300 372 L300 684', 'M342 368 L374 680'], .2)}
      ${folds(['M262 150 Q290 230 270 296', 'M338 150 Q310 230 330 296'], .18)}
      <path d="M170 690 L430 690" stroke="url(#g${id})" stroke-width="6"/>`;
    return frame(id, p, body);
  },
  // فستان قميص يومي
  shirt(id, p) {
    const body = `
      <path d="M244 112 L300 162 L356 112 L402 146 L384 214 L372 196 L378 300 L424 580 L176 580 L222 300 L228 196 L216 214 L198 146 Z" fill="url(#f${id})"/>
      <path d="M244 112 L300 162 L356 112 L340 100 L300 134 L260 100 Z" fill="url(#d${id})"/>
      <path d="M300 162 L300 580" stroke="#000" stroke-opacity=".18" stroke-width="3"/>
      <g fill="${GOLD[0]}"><circle cx="300" cy="200" r="4"/><circle cx="300" cy="244" r="4"/><circle cx="300" cy="360" r="4"/><circle cx="300" cy="420" r="4"/><circle cx="300" cy="480" r="4"/><circle cx="300" cy="540" r="4"/></g>
      <path d="M222 300 Q300 324 378 300 L378 322 Q300 346 222 322 Z" fill="url(#g${id})"/>
      ${folds(['M240 340 Q222 450 196 570', 'M360 340 Q378 450 404 570'], .2)}
      <path d="M176 580 L424 580" stroke="url(#g${id})" stroke-width="5"/>`;
    return frame(id, p, body);
  },
  // قفطان
  kaftan(id, p) {
    const body = `
      <path d="M242 104 L300 196 L358 104 L526 304 L474 346 L402 276 L402 702 L198 702 L198 276 L126 346 L74 304 Z" fill="url(#f${id})"/>
      <path d="M242 104 L300 196 L358 104" fill="none" stroke="url(#g${id})" stroke-width="7" stroke-linejoin="round"/>
      <path d="M262 124 L300 176 L338 124 M300 196 L300 330" fill="none" stroke="url(#g${id})" stroke-width="3.5"/>
      <path d="M300 196 L300 330" fill="none" stroke="url(#g${id})" stroke-width="7" stroke-linecap="round"/>
      <path d="M198 276 L198 702 M402 276 L402 702" stroke="url(#g${id})" stroke-width="3" opacity=".6"/>
      <path d="M74 304 L126 346 M526 304 L474 346" stroke="url(#g${id})" stroke-width="9" stroke-linecap="round"/>
      <path d="M198 400 L402 400" stroke="url(#g${id})" stroke-width="5" opacity=".9"/>
      ${folds(['M232 420 Q226 560 220 690', 'M368 420 Q374 560 380 690', 'M170 300 Q140 330 110 332', 'M430 300 Q460 330 490 332'])}
      <path d="M198 702 L402 702" stroke="url(#g${id})" stroke-width="8"/>`;
    return frame(id, p, body);
  },
  // تونك وبنطلون واسع
  outfit(id, p) {
    const body = `
      <path d="M244 112 Q300 148 356 112 L412 148 L392 212 L372 194 L380 392 L220 392 L228 194 L208 212 L188 148 Z" fill="url(#f${id})"/>
      <path d="M244 112 Q300 148 356 112" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      <path d="M220 392 L380 392" stroke="url(#g${id})" stroke-width="5"/>
      <path d="M232 380 L368 380 L452 692 L322 692 L300 470 L278 692 L148 692 Z" fill="url(#d${id})"/>
      <path d="M300 384 L300 470" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <path d="M232 380 Q300 396 368 380" fill="none" stroke="url(#g${id})" stroke-width="7" stroke-linecap="round"/>
      ${folds(['M252 410 L190 680', 'M348 410 L410 680'], .2)}`;
    return frame(id, p, body);
  },
  // تفصيل خاص: مجسّم خياطة مع شريط قياس
  custom(id, p) {
    const body = `
      <path d="M262 98 Q300 118 338 98 L360 150 Q366 214 350 262 Q362 316 366 372 Q340 420 300 424 Q260 420 234 372 Q238 316 250 262 Q234 214 240 150 Z" fill="url(#f${id})"/>
      <path d="M262 98 Q300 118 338 98" fill="none" stroke="url(#g${id})" stroke-width="5"/>
      <rect x="296" y="424" width="8" height="190" fill="${GOLD[2]}"/>
      <path d="M232 640 L368 640 L352 616 L248 616 Z" fill="${GOLD[1]}"/>
      <ellipse cx="300" cy="650" rx="86" ry="12" fill="${GOLD[2]}"/>
      <path d="M232 214 Q300 252 368 214" fill="none" stroke="#FFF7E6" stroke-width="15" stroke-linecap="round"/>
      <path d="M232 214 Q300 252 368 214" fill="none" stroke="#C9AE88" stroke-width="15" stroke-linecap="round" stroke-dasharray="2 9" opacity=".8"/>
      <path d="M244 300 Q300 330 356 300" fill="none" stroke="#FFF7E6" stroke-width="15" stroke-linecap="round"/>
      <path d="M244 300 Q300 330 356 300" fill="none" stroke="#C9AE88" stroke-width="15" stroke-linecap="round" stroke-dasharray="2 9" opacity=".8"/>
      <g fill="${GOLD[0]}" stroke="${GOLD[2]}"><circle cx="322" cy="168" r="5"/><circle cx="276" cy="340" r="5"/></g>
      <path d="M120 540 Q160 470 230 500 T360 560 T480 500" fill="none" stroke="#FFF7E6" stroke-width="16" stroke-linecap="round"/>
      <path d="M120 540 Q160 470 230 500 T360 560 T480 500" fill="none" stroke="#C9AE88" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 10" opacity=".8"/>
      <path d="M438 120 L470 150 L444 176 L412 146 Z" fill="${p[1]}" opacity=".9"/><path d="M150 164 L186 176 L172 210 L136 198 Z" fill="${GOLD[1]}" opacity=".9"/>`;
    return frame(id, p, body);
  },
};

export function garmentSvg(kind, paletteName) {
  const pal = palettes[paletteName] || palettes.plum;
  return KINDS[kind](++uid, pal);
}

export function garmentUri(kind, paletteName) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(garmentSvg(kind, paletteName));
}

// صورة غلاف عريضة لقسم البداية
export function heroUri() {
  const id = ++uid;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 640" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="hb${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E9E8"/><stop offset="1" stop-color="#E7C9C8"/></linearGradient>
    <linearGradient id="hp${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A4455"/><stop offset="1" stop-color="#3F1636"/></linearGradient>
    <linearGradient id="hg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD[0]}"/><stop offset="1" stop-color="${GOLD[2]}"/></linearGradient>
  </defs>
  <rect width="1600" height="640" fill="url(#hb${id})"/>
  <circle cx="1180" cy="330" r="300" fill="#fff" opacity=".35"/>
  <circle cx="1180" cy="330" r="210" fill="none" stroke="url(#hg${id})" stroke-width="2.5" opacity=".7"/>
  <g transform="translate(980 40) scale(.8)">
    <path d="M244 152 Q300 206 356 152 L374 300 Q386 396 394 466 Q424 566 478 694 L122 694 Q176 566 206 466 Q214 396 226 300 Z" fill="url(#hp${id})"/>
    <path d="M262 86 L246 152 M338 86 L354 152" stroke="url(#hg${id})" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M226 300 Q300 322 374 300" fill="none" stroke="url(#hg${id})" stroke-width="9" stroke-linecap="round"/>
    <path d="M122 694 Q300 676 478 694" fill="none" stroke="url(#hg${id})" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g transform="translate(1290 90) scale(.62)"><path d="M300 70 C248 70 232 120 238 166 C196 206 168 332 158 452 C148 584 118 654 106 702 L494 702 C482 654 452 584 442 452 C432 332 404 206 362 166 C368 120 352 70 300 70 Z" fill="#9A5C6D" opacity=".85"/><path d="M238 166 C288 236 366 268 452 332" fill="none" stroke="url(#hg${id})" stroke-width="9" stroke-linecap="round"/></g>
  <g transform="translate(700 150) scale(.5)"><path d="M256 104 Q300 142 344 104 L376 134 L360 190 L370 288 C440 340 508 460 528 560 Q478 584 424 560 Q366 592 300 568 Q234 592 176 560 Q122 584 72 560 C92 460 160 340 230 288 L240 190 L224 134 Z" fill="#D98A9C" opacity=".9"/></g>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Build the Unit 8 performance-test SVG (plot area maths kept out of hand-written markup).
const T = [1,50,100,150,200,250,300,350,400,450,500];
const S = [
  { key:'logon',    name:'Logon/Log off', short:'Logon', labelAt:300,  color:'var(--series-1)', max:3,  peak:500,
    v:[2.0,2.0,2.1,2.1,2.2,2.2,2.2,2.2,2.2,3.0,3.0] },
  { key:'purchase', name:'Purchase steps', short:'Purchase', labelAt:0, color:'var(--series-2)', max:7,  peak:500,
    v:[3.0,3.2,3.6,3.8,3.9,4.1,4.3,4.4,4.6,4.8,5.2] },
  { key:'catalog',  name:'Catalog search', short:'Catalog', labelAt:0, color:'var(--series-3)', max:10, peak:200,
    v:[1.5,4.2,8.2,9.0,11.2,12.0,null,null,null,null,null] },
];

const W=720, H=348, M={t:18,r:132,b:46,l:58};
const iw=W-M.l-M.r, ih=H-M.t-M.b;
const XMAX=500, YMAX=13;
const x=t=>M.l+(t/XMAX)*iw;
const y=v=>M.t+((YMAX-v)/YMAX)*ih;
const n=z=>Math.round(z*100)/100;

let o=[];
o.push(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Response time versus number of round-trip transactions for three transaction groups, with the maximum allowed response time for each.">`);

// grid + y axis
o.push(`<g class="grid">`);
for(let v=0;v<=12;v+=2) o.push(`<line x1="${n(x(0))}" y1="${n(y(v))}" x2="${n(x(XMAX))}" y2="${n(y(v))}"/>`);
o.push(`</g>`);
o.push(`<g class="axis-line"><line x1="${n(x(0))}" y1="${n(y(0))}" x2="${n(x(XMAX))}" y2="${n(y(0))}"/><line x1="${n(x(0))}" y1="${M.t}" x2="${n(x(0))}" y2="${n(y(0))}"/></g>`);
o.push(`<g class="tick">`);
for(let v=0;v<=12;v+=2) o.push(`<text x="${n(x(0)-9)}" y="${n(y(v)+4)}" text-anchor="end">${v}</text>`);
for(const t of T) o.push(`<text x="${n(x(t))}" y="${n(y(0)+18)}" text-anchor="middle">${t}</text>`);
o.push(`</g>`);
o.push(`<text class="axis-title" x="${n(M.l+iw/2)}" y="${H-8}" text-anchor="middle">Number of Round Trip Transactions</text>`);
o.push(`<text class="axis-title" transform="translate(14 ${n(M.t+ih/2)}) rotate(-90)" text-anchor="middle">Response Time (Seconds)</text>`);

// requirement lines (dashed, same hue as the series they govern, drawn to that group's peak workload)
for(const s of S){
  o.push(`<line class="limit" x1="${n(x(0))}" y1="${n(y(s.max))}" x2="${n(x(s.peak))}" y2="${n(y(s.max))}" stroke="${s.color}"/>`);
  o.push(`<text class="limit-label" x="${n(x(s.labelAt)+6)}" y="${n(y(s.max)-6)}" fill="${s.color}">${s.short} max ${s.max} s${s.peak<XMAX?` (peak ${s.peak})`:''}</text>`);
}

// data lines + markers
for(const s of S){
  const pts=s.v.map((v,i)=>v==null?null:[x(T[i]),y(v)]).filter(Boolean);
  o.push(`<polyline class="series" stroke="${s.color}" points="${pts.map(p=>`${n(p[0])},${n(p[1])}`).join(' ')}"/>`);
  for(const p of pts) o.push(`<circle class="dot" cx="${n(p[0])}" cy="${n(p[1])}" r="4" fill="${s.color}"/>`);
  const last=pts[pts.length-1];
  o.push(`<text class="series-label" x="${n(last[0]+11)}" y="${n(last[1]+4)}" fill="${s.color}">${s.name}</text>`);
}

// breach annotation: catalog search crosses its 10 s limit between 150 and 200 transactions
const xb=150+50*(10-9.0)/(11.2-9.0);
o.push(`<circle class="breach" cx="${n(x(xb))}" cy="${n(y(10))}" r="6" fill="none" stroke="var(--series-3)"/>`);
o.push(`<text class="note" x="${n(x(xb)+16)}" y="${n(y(10)+20)}" fill="var(--text-secondary)">Catalog search breaks its</text>`);
o.push(`<text class="note" x="${n(x(xb)+16)}" y="${n(y(10)+32)}" fill="var(--text-secondary)">10 s limit at ~${Math.round(xb)} transactions</text>`);
o.push(`</svg>`);
process.stdout.write(o.join('\n'));

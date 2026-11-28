import json, os, sys

OUT = sys.argv[2]
d = json.load(open(sys.argv[1]))
os.makedirs(OUT, exist_ok=True)

FONT = "font-family=\"Helvetica Neue, Helvetica, Arial, sans-serif\""

def shape(kind, fill, stroke):
    if kind == "circle":
        return f'<circle cx="80" cy="80" r="74" fill="{fill}"/><circle cx="80" cy="80" r="67" fill="none" stroke="{stroke}" stroke-width="2.5"/>'
    if kind == "square":
        return f'<rect x="6" y="6" width="148" height="148" rx="30" fill="{fill}"/><rect x="13" y="13" width="134" height="134" rx="24" fill="none" stroke="{stroke}" stroke-width="2.5"/>'
    if kind == "shield":
        p = "M80 5 L148 26 V80 C148 118 118 144 80 156 C42 144 12 118 12 80 V26 Z"
        q = "M80 13 L141 32 V80 C141 113 114 136 80 147 C46 136 19 113 19 80 V32 Z"
        return f'<path d="{p}" fill="{fill}"/><path d="{q}" fill="none" stroke="{stroke}" stroke-width="2.5"/>'
    if kind == "hex":
        return (f'<polygon points="80,4 146,42 146,118 80,156 14,118 14,42" fill="{fill}"/>'
                f'<polygon points="80,13 138,46.5 138,113.5 80,147 22,113.5 22,46.5" fill="none" stroke="{stroke}" stroke-width="2.5"/>')
    if kind == "badge":
        return f'<rect x="6" y="18" width="148" height="124" rx="62" fill="{fill}"/><rect x="13" y="25" width="134" height="110" rx="55" fill="none" stroke="{stroke}" stroke-width="2.5"/>'
    raise ValueError(kind)

# Motifs are drawn in the upper band of the emblem (roughly y 26..66).
def m_waves(c):
    return (f'<path d="M40 50 q10 -10 20 0 t20 0 t20 0 t20 0" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round"/>'
            f'<path d="M48 62 q8 -8 16 0 t16 0 t16 0 t16 0" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>')
def m_sun_waves(c):
    return (f'<circle cx="80" cy="44" r="12" fill="{c}"/>'
            f'<path d="M44 62 q9 -8 18 0 t18 0 t18 0 t18 0" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round"/>')
def m_gate(c):
    return (f'<path d="M56 68 V46 a24 22 0 0 1 48 0 V68" fill="none" stroke="{c}" stroke-width="6" stroke-linejoin="round"/>'
            f'<line x1="80" y1="28" x2="80" y2="68" stroke="{c}" stroke-width="3"/>')
def m_maple(c):
    return (f'<path d="M80 22 l5 11 9 -4 -3 14 10 -5 -1 7 9 3 -12 10 2 6 -15 -2 -2 12 h-4 l-2 -12 -15 2 2 -6 -12 -10 9 -3 -1 -7 10 5 -3 -14 9 4 z" fill="{c}"/>')
def m_trillium(c):
    return (f'<g fill="{c}"><ellipse cx="80" cy="34" rx="8" ry="14"/>'
            f'<ellipse cx="80" cy="34" rx="8" ry="14" transform="rotate(120 80 48)"/>'
            f'<ellipse cx="80" cy="34" rx="8" ry="14" transform="rotate(240 80 48)"/></g><circle cx="80" cy="48" r="4" fill="#ffffff"/>')
def m_mountains(c):
    return f'<path d="M38 68 L62 34 L74 50 L88 28 L122 68 Z" fill="{c}"/><path d="M84 34 L88 28 L92 34 Z" fill="#ffffff"/>'
def m_peak(c):
    return f'<path d="M44 68 L80 24 L116 68 Z" fill="none" stroke="{c}" stroke-width="6" stroke-linejoin="round"/><path d="M68 52 L80 40 L92 52" fill="none" stroke="{c}" stroke-width="4" stroke-linejoin="round"/>'
def m_cliff(c):
    return f'<path d="M36 68 H124 V56 L100 56 L92 40 L70 40 L60 30 L36 30 Z" fill="{c}"/>'
def m_road(c):
    return (f'<path d="M66 68 L76 26 H84 L94 68 Z" fill="{c}"/>'
            f'<g stroke="#ffffff" stroke-width="2.5"><line x1="80" y1="32" x2="80" y2="38"/><line x1="80" y1="45" x2="80" y2="52"/><line x1="80" y1="59" x2="80" y2="66"/></g>')
def m_star(c):
    return f'<polygon points="80,22 87,40 106,40 91,51 97,69 80,58 63,69 69,51 54,40 73,40" fill="{c}"/>'
def m_aurora(c):
    return (f'<path d="M40 64 C56 30 70 60 82 36 S108 30 120 50" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round"/>'
            f'<circle cx="106" cy="30" r="4" fill="{c}"/><circle cx="54" cy="32" r="3" fill="{c}"/>')
def m_crown(c):
    return f'<path d="M50 66 L46 34 L64 48 L80 26 L96 48 L114 34 L110 66 Z" fill="{c}"/>'
def m_oak(c):
    return (f'<circle cx="80" cy="40" r="16" fill="{c}"/><circle cx="64" cy="48" r="11" fill="{c}"/><circle cx="96" cy="48" r="11" fill="{c}"/>'
            f'<rect x="77" y="52" width="6" height="16" fill="{c}"/>')
def m_pine(c):
    return f'<path d="M80 22 L98 46 H90 L104 62 H56 L70 46 H62 Z" fill="{c}"/><rect x="77" y="62" width="6" height="7" fill="{c}"/>'
def m_horseshoe(c):
    return (f'<path d="M62 68 V48 a18 18 0 0 1 36 0 V68" fill="none" stroke="{c}" stroke-width="9" stroke-linecap="round"/>'
            f'<g fill="#ffffff"><circle cx="62" cy="52" r="1.8"/><circle cx="98" cy="52" r="1.8"/><circle cx="66" cy="38" r="1.8"/><circle cx="94" cy="38" r="1.8"/></g>')
def m_blocks(c):
    return (f'<g fill="{c}"><rect x="48" y="54" width="20" height="13" rx="2"/><rect x="70" y="54" width="20" height="13" rx="2"/><rect x="92" y="54" width="20" height="13" rx="2"/>'
            f'<rect x="59" y="39" width="20" height="13" rx="2"/><rect x="81" y="39" width="20" height="13" rx="2"/><rect x="70" y="24" width="20" height="13" rx="2"/></g>')
def m_columns(c):
    return (f'<path d="M50 36 L80 22 L110 36 Z" fill="{c}"/>'
            f'<g fill="{c}"><rect x="56" y="40" width="7" height="22"/><rect x="71" y="40" width="7" height="22"/><rect x="86" y="40" width="7" height="22"/><rect x="101" y="40" width="7" height="22"/>'
            f'<rect x="50" y="63" width="60" height="5"/></g>')
def m_skyline(c):
    return f'<path d="M44 68 V48 H56 V36 H68 V26 H80 V40 H92 V30 H104 V50 H116 V68 Z" fill="{c}"/>'
def m_cross(c):
    return (f'<g stroke="{c}" stroke-width="8" stroke-linecap="round"><line x1="80" y1="24" x2="80" y2="68"/><line x1="56" y1="46" x2="104" y2="46"/></g>'
            f'<circle cx="80" cy="46" r="8" fill="{c}"/><circle cx="80" cy="46" r="3" fill="#ffffff"/>')
def m_arrow(c):
    return f'<path d="M110 46 L90 26 V38 H52 V54 H90 V66 Z" fill="{c}"/>'
def m_arrow_west(c):
    return f'<path d="M48 46 L70 26 V38 H112 V54 H70 V66 Z" fill="{c}"/>'
def m_pin(c):
    return f'<path d="M80 70 C68 54 62 46 62 38 a18 18 0 0 1 36 0 c0 8 -6 16 -18 32 Z" fill="{c}"/><circle cx="80" cy="38" r="6" fill="#ffffff"/>'
def m_wheel(c):
    spokes = "".join(f'<line x1="80" y1="46" x2="80" y2="30" transform="rotate({a} 80 46)"/>' for a in range(0, 360, 60))
    return f'<circle cx="80" cy="46" r="20" fill="none" stroke="{c}" stroke-width="5"/><g stroke="{c}" stroke-width="3">{spokes}</g><circle cx="80" cy="46" r="5" fill="{c}"/>'
def m_bridge(c):
    return (f'<path d="M40 64 H120" stroke="{c}" stroke-width="5"/><path d="M46 64 Q80 18 114 64" fill="none" stroke="{c}" stroke-width="5"/>'
            f'<g stroke="{c}" stroke-width="2.5"><line x1="62" y1="44" x2="62" y2="64"/><line x1="80" y1="37" x2="80" y2="64"/><line x1="98" y1="44" x2="98" y2="64"/></g>')
def m_lock(c):  # canal lock gates
    return (f'<path d="M42 66 H118" stroke="{c}" stroke-width="5"/><rect x="50" y="28" width="10" height="38" fill="{c}"/><rect x="100" y="28" width="10" height="38" fill="{c}"/>'
            f'<path d="M62 52 q9 -7 18 0 t18 0" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round"/>')
def m_leaf_drop(c):
    return f'<path d="M80 22 C100 40 104 56 80 68 C56 56 60 40 80 22 Z" fill="{c}"/><path d="M80 30 V64" stroke="#ffffff" stroke-width="2"/>'
def m_compass(c):
    return (f'<circle cx="80" cy="46" r="21" fill="none" stroke="{c}" stroke-width="4"/>'
            f'<polygon points="80,28 86,46 80,64 74,46" fill="{c}"/><circle cx="80" cy="46" r="3" fill="#ffffff"/>')
def m_chevrons(c):
    return (f'<path d="M50 62 L80 34 L110 62" fill="none" stroke="{c}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>'
            f'<path d="M62 44 L80 27 L98 44" fill="none" stroke="{c}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" opacity="0.75"/>')
def m_seal(c):
    return (f'<circle cx="80" cy="46" r="20" fill="{c}"/><circle cx="80" cy="46" r="14" fill="none" stroke="#ffffff" stroke-width="2"/>'
            f'<polygon points="80,36 83,43 90,43 84.5,47.5 86.5,55 80,50.5 73.5,55 75.5,47.5 70,43 77,43" fill="#ffffff"/>')

# code: (shape, background, ring/accent, motif, monogram, wordmark)
DESIGN = {
 "D01": ("circle", "#0b4f6c", "#7fd1e8", m_waves, "LA", "LAKESHORE"),
 "D02": ("shield", "#1f2a44", "#c9a227", m_gate, "NM", "NORTHGATE"),
 "D03": ("square", "#b3202a", "#f6d5d7", m_maple, "MP", "MAPLE LEAF"),
 "D04": ("circle", "#2f6b3a", "#f2e8c9", m_trillium, "TC", "TRILLIUM"),
 "D05": ("hex", "#24496b", "#9cc4e4", m_mountains, "HV", "HURON VALLEY"),
 "D06": ("badge", "#3d3d3d", "#f2b134", m_road, "CA", "CARLING AVE"),
 "D07": ("square", "#0f6e74", "#bfe9e6", m_bridge, "RG", "RIVERSIDE"),
 "D08": ("square", "#14213d", "#e5e5e5", m_skyline, "BS", "BAY STREET"),
 "D09": ("shield", "#5b1a6e", "#e8c46a", m_crown, "KC", "KINGSWAY"),
 "D10": ("hex", "#6b6559", "#efe7d6", m_blocks, "LC", "LIMESTONE"),
 "D11": ("circle", "#7a4b0c", "#f3c64b", m_horseshoe, "GH", "GOLDEN"),
 "D12": ("shield", "#1d4d2b", "#d8b45a", m_oak, "RO", "ROYAL OAK"),
 "D13": ("square", "#4a5a2a", "#dfe7c4", m_cliff, "EM", "ESCARPMENT"),
 "D14": ("circle", "#164f3f", "#cde8dc", m_pine, "PA", "PINECREST"),
 "D15": ("badge", "#1e5f8c", "#d6ecf7", m_sun_waves, "TV", "THAMES VALLEY"),
 "D16": ("hex", "#0d5c63", "#f4d35e", m_waves, "GR", "GRAND RIVER"),
 "D17": ("circle", "#7d1128", "#f1d7a5", m_star, "AA", "AMBASSADOR"),
 "D18": ("shield", "#2c5530", "#f0f4ef", m_pin, "SC", "SIMCOE"),
 "D19": ("badge", "#2a6f97", "#ffffff", m_sun_waves, "LV", "LAKEVIEW"),
 "D20": ("square", "#2b3a55", "#ce7b3c", m_lock, "CS", "CANAL STREET"),
 "D21": ("circle", "#121a3a", "#62e3a4", m_aurora, "NL", "NORTHERN LIGHTS"),
 "D22": ("hex", "#8a1c1c", "#f5e1c8", m_seal, "RA", "RIDEAU"),
 "D23": ("square", "#d35400", "#ffe8d6", m_cross, "CC", "CROSSROADS"),
 "D24": ("badge", "#3c1361", "#d9c3f0", m_arrow, "EG", "EASTGATE"),
 "D25": ("circle", "#00507a", "#ffcc33", m_arrow_west, "WM", "WESTSIDE"),
 "D26": ("shield", "#3b4f3a", "#c9d6a3", m_mountains, "HA", "HIGHLAND"),
 "D27": ("hex", "#9c2f2f", "#f0d9b5", m_columns, "BM", "BROCK STREET"),
 "D28": ("shield", "#4b2e1e", "#d4a76a", m_wheel, "HS", "HERITAGE"),
 "D29": ("circle", "#1b3b6f", "#f8f9fa", m_peak, "SG", "SUMMIT"),
 "D30": ("badge", "#256d1b", "#e9f5db", m_chevrons, "PM", "PARKWAY"),
}

for x in d:
    kind, bg, accent, motif, mono, word = DESIGN[x["code"]]
    fs = 10 if len(word) <= 10 else (8.5 if len(word) <= 13 else 7.5)
    my, wy = (108, 128) if kind == "square" else (102, 121)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">'
           f'{shape(kind, bg, accent)}{motif(accent)}'
           f'<text x="80" y="{my}" text-anchor="middle" {FONT} font-weight="800" font-size="38" letter-spacing="1" fill="#ffffff">{mono}</text>'
           f'<text x="80" y="{wy}" text-anchor="middle" {FONT} font-weight="600" font-size="{fs}" letter-spacing="1.6" fill="{accent}">{word}</text>'
           f'</svg>')
    open(os.path.join(OUT, x["code"] + ".svg"), "w").write(svg)
    open(os.path.join(OUT, x["code"] + ".html"), "w").write(
        '<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>' + svg + '</body></html>')
print("ok")

"""Builds the 26 ABC Town character SVGs into assets/characters/.

Every character shares the same face / glove / leg kit so they read as one family;
each has its own body drawing. Parts that animate in the town square are tagged with
classes (arm-l, arm-r, eye, mouth, rays, toast, ...) and given a transform-origin, and
hidden "fx" layers (rain, hearts, sparks...) sit at opacity 0 until css/style.css
animates them. Re-run after editing:

    python tools/build_characters.py
"""
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "characters"

INK = "#3a2e2e"
GLOVE = "#fff"


# ---------------------------------------------------------------- shared kit

def part(cls, inner, ox=None, oy=None):
    style = f' style="transform-origin:{ox}px {oy}px"' if ox is not None else ""
    return f'<g class="{cls}"{style}>{inner}</g>'


def fx(inner, cls="fx"):
    return f'<g class="{cls}" opacity="0">{inner}</g>'


def radial(gid, light, base, dark, cx="35%", cy="28%"):
    return (f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="80%">'
            f'<stop offset="0" stop-color="{light}"/><stop offset=".5" stop-color="{base}"/>'
            f'<stop offset="1" stop-color="{dark}"/></radialGradient>')


def linear(gid, a, b, vertical=False):
    x2, y2 = ("0", "1") if vertical else ("1", "1")
    return (f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>')


def shadow(cy=212, rx=58):
    return f'<ellipse class="shadow" cx="100" cy="{cy}" rx="{rx}" ry="8" fill="#000" opacity=".12"/>'


def gloss(cx, cy, rx=15, ry=8, rot=-30, op=.5):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{op}" transform="rotate({rot} {cx} {cy})"/>'


def sparkle(cx, cy, r=6, color="#ffd23f"):
    return (f'<path d="M{cx},{cy - r} Q{cx + 1},{cy - 1} {cx + r},{cy} Q{cx + 1},{cy + 1} {cx},{cy + r} '
            f'Q{cx - 1},{cy + 1} {cx - r},{cy} Q{cx - 1},{cy - 1} {cx},{cy - r}Z" fill="{color}" stroke="#fff" stroke-width="1"/>')


def heart(cx, cy, s=1.0, color="#e63946"):
    return (f'<path transform="translate({cx} {cy}) scale({s})" d="M0,10 C-9,3 -10,-4 -5,-6 C-2,-7 0,-4 0,-3 C0,-4 2,-7 5,-6 C10,-4 9,3 0,10Z" '
            f'fill="{color}" stroke="#fff" stroke-width="1.2"/>')


def note(cx, cy, color=INK):
    return (f'<g fill="{color}"><ellipse cx="{cx}" cy="{cy}" rx="5" ry="3.5" transform="rotate(-20 {cx} {cy})"/>'
            f'<path d="M{cx + 4},{cy - 1} V{cy - 17} h8" fill="none" stroke="{color}" stroke-width="2.5"/></g>')


def glove(x, y, side, color=GLOVE):
    s = side
    return (f'<g fill="{color}" stroke="{INK}" stroke-width="2.5">'
            f'<circle cx="{x}" cy="{y}" r="9"/>'
            f'<circle cx="{x + s * 7}" cy="{y - 6}" r="4.5"/>'
            f'<circle cx="{x + s * 9}" cy="{y + 2}" r="4.5"/>'
            f'<circle cx="{x + s * 5}" cy="{y + 9}" r="4.2"/></g>')


def fist(x, y, color=GLOVE):
    return (f'<g fill="{color}" stroke="{INK}" stroke-width="2.5"><circle cx="{x}" cy="{y}" r="10"/>'
            f'<path d="M{x - 6},{y - 3} h12 M{x - 6},{y + 2} h12" stroke-width="1.5" opacity=".5"/></g>')


def arm_path(sx, sy, cx, cy, hx, hy, color, w=7):
    return f'<path d="M{sx},{sy} Q{cx},{cy} {hx},{hy}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>'


def arm(sx, sy, side, pose, color, glove_color=GLOVE, hand="glove", held=None):
    """Returns (stroke_svg, hand_svg, (hx, hy)). Draw the stroke behind the body, the hand in
    front. Both are tagged arm-l / arm-r with the shoulder as pivot so css can swing them
    together. `held(hx, hy, side)` draws something in the hand (drumstick, mallet...)."""
    s = side
    if pose == "down":
        cx, cy, hx, hy = sx + s * 14, sy + 22, sx + s * 12, sy + 44
    elif pose == "out":
        cx, cy, hx, hy = sx + s * 18, sy + 2, sx + s * 34, sy + 8
    elif pose == "up":
        cx, cy, hx, hy = sx + s * 26, sy - 6, sx + s * 24, sy - 42
    elif pose == "hip":
        cx, cy, hx, hy = sx + s * 30, sy + 20, sx - s * 4, sy + 42
    elif pose == "wave":
        cx, cy, hx, hy = sx + s * 30, sy - 8, sx + s * 26, sy - 40
    else:
        raise ValueError(pose)
    h = fist(hx, hy, glove_color) if hand == "fist" else glove(hx, hy, s, glove_color)
    if held:
        h += held(hx, hy, s)
    cls = "arm-l" if s < 0 else "arm-r"
    return part(cls, arm_path(sx, sy, cx, cy, hx, hy, color), sx, sy), part(cls, h, sx, sy), (hx, hy)


def leg(x, side, color, shoe, kick=False, y=176):
    s = side
    cls = "leg-l" if s < 0 else "leg-r"
    if kick:
        inner = (f'<path d="M{x},{y} Q{x + s * 10},{y + 10} {x + s * 26},{y + 6}" fill="none" stroke="{color}" stroke-width="7" stroke-linecap="round"/>'
                 f'<ellipse cx="{x + s * 32}" cy="{y + 6}" rx="13" ry="7" fill="{shoe}" stroke="{INK}" stroke-width="2.5" transform="rotate({s * -50} {x + s * 32} {y + 6})"/>')
    else:
        inner = (f'<line x1="{x}" y1="{y}" x2="{x + s * 3}" y2="{y + 20}" stroke="{color}" stroke-width="7" stroke-linecap="round"/>'
                 f'<ellipse cx="{x + s * 7}" cy="{y + 24}" rx="13" ry="7" fill="{shoe}" stroke="{INK}" stroke-width="2.5"/>')
    return part(cls, inner, x, y)


def legs(color, shoe, lx=84, rx=116, kick=None, y=176):
    return leg(lx, -1, color, shoe, kick == "L", y) + leg(rx, 1, color, shoe, kick == "R", y)


def eye(cx, cy, r, iris="#2b2b2b", look=(0.15, 0.1), lid=None):
    px, py = cx + look[0] * r * 0.35, cy + look[1] * r * 0.3
    pupil = (f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{r * 0.62:.1f}" fill="{iris}"/>'
             f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{r * 0.4:.1f}" fill="#1a1a1a"/>'
             f'<circle cx="{px - r * 0.22:.1f}" cy="{py - r * 0.25:.1f}" r="{r * 0.2:.1f}" fill="#fff"/>'
             f'<circle cx="{px + r * 0.18:.1f}" cy="{py + r * 0.2:.1f}" r="{r * 0.09:.1f}" fill="#fff" opacity=".8"/>')
    s = (f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r * 1.08:.1f}" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
         + part("pupil", pupil))
    if lid:
        s += f'<path d="M{cx - r - 1},{cy - 1} A{r + 1},{r * 1.1:.1f} 0 0 1 {cx + r + 1},{cy - 1} Z" fill="{lid}" stroke="{INK}" stroke-width="2.5"/>'
    return part("eye", s, cx, cy)


def brow(cx, y, mood, side):
    s = side
    if mood == "happy":
        return f"M{cx - 10},{y + 3} Q{cx},{y - 5} {cx + 10},{y + 3}"
    if mood == "cheeky":
        return (f"M{cx - 10},{y - 2} Q{cx},{y - 12} {cx + 10},{y - 4}" if s < 0
                else f"M{cx - 10},{y + 2} Q{cx},{y - 1} {cx + 10},{y + 2}")
    if mood == "grumpy":
        return f"M{cx - s * 10},{y - 4} Q{cx},{y - 1} {cx + s * 10},{y + 5}"
    if mood == "surprised":
        return f"M{cx - 10},{y - 4} Q{cx},{y - 14} {cx + 10},{y - 4}"
    if mood == "sleepy":
        return f"M{cx - 10},{y + 4} Q{cx},{y + 3} {cx + 10},{y + 6}"
    if mood == "worried":
        return f"M{cx - s * 10},{y + 4} Q{cx},{y - 6} {cx + s * 10},{y - 2}"
    raise ValueError(mood)


def brows(lx, rx, y, mood):
    return part("brows", f'<g fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round">'
                         f'<path d="{brow(lx, y, mood, -1)}"/><path d="{brow(rx, y, mood, 1)}"/></g>', (lx + rx) / 2, y)


def mouth(cx, my, kind, uid, w=22):
    if kind == "smile":
        d = f"M{cx - w},{my} C{cx - w // 2},{my + 34} {cx + w // 2},{my + 34} {cx + w},{my} Z"
        s = (f'<clipPath id="m{uid}"><path d="{d}"/></clipPath>'
             f'<path d="{d}" fill="#6e1a2b" stroke="{INK}" stroke-width="2.5"/>'
             f'<g clip-path="url(#m{uid})"><rect x="{cx - w}" y="{my - 2}" width="{2 * w}" height="7" fill="#fff"/>'
             f'<ellipse cx="{cx}" cy="{my + 24}" rx="12" ry="8" fill="#ff7b9c"/></g>')
    elif kind == "grin":
        d = f"M{cx - w},{my} C{cx - w // 2},{my + 24} {cx + w // 2},{my + 24} {cx + w},{my} Z"
        s = (f'<clipPath id="m{uid}"><path d="{d}"/></clipPath>'
             f'<path d="{d}" fill="#6e1a2b" stroke="{INK}" stroke-width="2.5"/>'
             f'<g clip-path="url(#m{uid})"><rect x="{cx - w}" y="{my - 2}" width="{2 * w}" height="9" fill="#fff"/></g>')
    elif kind == "smirk":
        s = (f'<path d="M{cx - 16},{my} Q{cx},{my + 16} {cx + 18},{my - 4}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
             f'<ellipse cx="{cx + 9}" cy="{my + 8}" rx="6" ry="5" fill="#ff7b9c" stroke="{INK}" stroke-width="2"/>')
    elif kind == "smug":
        s = f'<path d="M{cx - 14},{my + 2} Q{cx},{my + 12} {cx + 16},{my - 4}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    elif kind == "small":
        s = f'<path d="M{cx - 12},{my} Q{cx},{my + 10} {cx + 12},{my}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    elif kind == "o":
        s = f'<ellipse cx="{cx}" cy="{my + 6}" rx="8" ry="10" fill="#6e1a2b" stroke="{INK}" stroke-width="2.5"/>'
    elif kind == "wobble":
        s = f'<path d="M{cx - 14},{my + 4} Q{cx - 7},{my - 2} {cx},{my + 4} Q{cx + 7},{my + 10} {cx + 14},{my + 4}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    elif kind == "frown":
        s = f'<path d="M{cx - 12},{my + 8} Q{cx},{my - 2} {cx + 12},{my + 8}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    else:
        raise ValueError(kind)
    return part("mouth", s, cx, my)


def blush(lx, rx, y, color="#ff8fa3", op=.55):
    return part("blush", f'<ellipse cx="{lx}" cy="{y}" rx="9" ry="6" fill="{color}" opacity="{op}"/>'
                         f'<ellipse cx="{rx}" cy="{y}" rx="9" ry="6" fill="{color}" opacity="{op}"/>')


def face(uid, cx, cy, gap, r, iris, mood, mouth_kind, look=(0.15, 0.1), lid=None,
         cheeks=True, mouth_dy=None, mouth_w=22):
    lx, rx = cx - gap, cx + gap
    s = ""
    if cheeks:
        s += blush(lx - r - 4, rx + r + 4, cy + r + 2)
    s += eye(lx, cy, r, iris, look, lid) + eye(rx, cy, r, iris, look, lid)
    s += brows(lx, rx, cy - r - 8, mood)
    s += mouth(cx, cy + r + (mouth_dy if mouth_dy is not None else 14), mouth_kind, uid, mouth_w)
    return part("face", s, cx, cy)


def svg(key, defs, body, w=200, h=240):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" data-char="{key}">'
            f'<defs>{defs}</defs>{body}</svg>')


# ---------------------------------------------------------------- characters

def apple():
    defs = radial("g", "#ff8a94", "#e63946", "#8f1420") + linear("leaf", "#8be0a4", "#2a9d5c")
    body = shadow()
    body += legs("#c1121f", "#7a1c2b")
    l, lh, _ = arm(42, 120, -1, "hip", "#c1121f")
    r, rh, _ = arm(158, 120, 1, "hip", "#c1121f")
    body += l + r
    body += ('<path d="M100,56 C90,40 58,36 42,62 C26,90 30,134 50,162 C66,184 90,186 100,180 C110,186 134,184 150,162 '
             'C170,134 174,90 158,62 C142,36 110,40 100,56Z" fill="url(#g)" stroke="#8f1420" stroke-width="3" stroke-linejoin="round"/>')
    body += gloss(64, 70, 16, 9, -35)
    body += lh + rh
    body += part("leaf",
                 '<path d="M100,52 C104,42 106,32 114,22" fill="none" stroke="#7a4a1e" stroke-width="6" stroke-linecap="round"/>'
                 '<path d="M110,38 C116,24 138,20 148,28 C142,42 122,48 110,38Z" fill="url(#leaf)" stroke="#237a48" stroke-width="2.5" stroke-linejoin="round"/>'
                 '<path d="M113,37 C122,32 134,28 144,29" fill="none" stroke="#237a48" stroke-width="1.5" stroke-linecap="round"/>', 100, 52)
    body += face("A", 100, 100, 22, 16, "#5a3a1a", "cheeky", "smile", look=(0.2, 0.1))
    body += ('<g fill="#2f7de1" stroke="#1b4f9c" stroke-width="2.5" stroke-linejoin="round">'
             '<path d="M100,168 L80,157 L80,179 Z"/><path d="M100,168 L120,157 L120,179 Z"/><circle cx="100" cy="168" r="5" fill="#1b4f9c"/></g>')
    body += fx(sparkle(28, 60, 8) + sparkle(172, 50, 7) + sparkle(160, 150, 6) + sparkle(36, 160, 6) + sparkle(100, 14, 5))
    return svg("apple", defs, body)


def banana():
    defs = radial("g", "#fff3a0", "#ffd23f", "#c9961a", "30%", "30%")
    body = shadow(cy=212, rx=52)
    body += legs("#c9961a", "#8a5a1a", lx=100, rx=124, y=182)
    l, lh, _ = arm(52, 124, -1, "out", "#c9961a")
    r, rh, _ = arm(112, 116, 1, "wave", "#c9961a")
    body += l + r
    # The fruit poking out of the top, the curved body, and two peel strips folded back.
    body += '<ellipse cx="100" cy="42" rx="15" ry="22" fill="#fff3c4" stroke="#d9b56a" stroke-width="2.5"/>'
    body += ('<path d="M86,50 C30,86 36,182 114,202 C132,206 144,194 138,180 C96,162 108,100 116,50 Z" '
             'fill="url(#g)" stroke="#a8781a" stroke-width="3" stroke-linejoin="round"/>')
    body += '<path d="M118,200 q14,10 22,-6 q-8,6 -22,6z" fill="#6b3a10"/>'
    body += '<path d="M78,70 C52,100 52,150 86,182" fill="none" stroke="#fff3c4" stroke-width="7" stroke-linecap="round" opacity=".45"/>'
    body += ''.join(f'<circle cx="{cx}" cy="{cy}" r="{r_}" fill="#a8781a" opacity=".55"/>'
                    for cx, cy, r_ in ((60, 150, 3), (94, 178, 2.5), (104, 82, 2), (72, 100, 2)))
    peel = ('<path d="M86,58 C56,52 44,30 60,10 C68,30 80,44 98,54 Z" fill="#ffd23f" stroke="#a8781a" stroke-width="2.5" stroke-linejoin="round"/>'
            '<path d="M84,50 C70,42 62,28 64,18" fill="none" stroke="#fff3c4" stroke-width="4" stroke-linecap="round" opacity=".8"/>'
            '<path d="M116,58 C146,52 158,30 142,10 C134,30 122,44 104,54 Z" fill="#ffd23f" stroke="#a8781a" stroke-width="2.5" stroke-linejoin="round"/>'
            '<path d="M118,50 C132,42 140,28 138,18" fill="none" stroke="#fff3c4" stroke-width="4" stroke-linecap="round" opacity=".8"/>')
    body += part("peel", peel, 100, 54)
    body += face("B", 76, 118, 15, 13, "#5a3a1a", "cheeky", "grin", look=(0.25, 0.0), mouth_w=15)
    body += lh + rh
    # Dizzy stars after a pratfall.
    body += fx(sparkle(30, 44, 8) + sparkle(166, 40, 7, "#fff") + sparkle(18, 110, 6, "#fff") + sparkle(170, 110, 6) + sparkle(100, 6, 5, "#fff"))
    return svg("banana", defs, body)


def cookie():
    defs = (radial("g", "#e8b787", "#c98a4b", "#8a5424") +
            '<mask id="bite"><rect width="200" height="240" fill="#fff"/><circle cx="154" cy="60" r="24" fill="#000"/></mask>')
    body = shadow()
    body += legs("#8a5424", "#6b3a10", kick="R")
    l, lh, _ = arm(42, 120, -1, "hip", "#8a5424")
    r, rh, _ = arm(158, 116, 1, "wave", "#8a5424")
    body += l + r
    body += '<g mask="url(#bite)"><circle cx="100" cy="112" r="62" fill="url(#g)" stroke="#8a5424" stroke-width="3"/>'
    for cx, cy, rx in ((66, 80, 6), (128, 88, 5), (60, 132, 5), (140, 138, 6), (100, 160, 6), (84, 100, 4), (120, 124, 4), (116, 150, 4)):
        body += f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{rx * 0.8:.1f}" fill="#4a2a10" transform="rotate(20 {cx} {cy})"/>'
    body += '</g>'
    body += '<clipPath id="bitec"><circle cx="100" cy="112" r="63"/></clipPath>'
    body += '<circle cx="154" cy="60" r="24" fill="none" stroke="#8a5424" stroke-width="3" clip-path="url(#bitec)"/>'
    body += '<circle cx="176" cy="72" r="3" fill="#c98a4b"/><circle cx="170" cy="86" r="2" fill="#c98a4b"/><circle cx="182" cy="90" r="2.5" fill="#8a5424"/>'
    body += lh + rh
    body += face("C", 100, 108, 22, 15, "#2b2b2b", "cheeky", "smirk", look=(0.4, -0.1))
    crumbs = "".join(f'<circle cx="{cx}" cy="{cy}" r="{r_}" fill="{c}"/>'
                     for cx, cy, r_, c in ((168, 40, 3.5, "#c98a4b"), (182, 54, 3, "#8a5424"), (176, 30, 2.5, "#4a2a10"),
                                           (190, 44, 2.5, "#c98a4b"), (160, 24, 3, "#8a5424"), (186, 70, 3, "#c98a4b")))
    body += fx(crumbs)
    return svg("cookie", defs, body)


def drum():
    defs = linear("side", "#ff6b76", "#b3121f") + radial("top", "#fffaf0", "#f6e7c1", "#c9a86a", "40%", "40%")
    body = shadow(rx=66)
    body += legs("#3a2e2e", "#1b4f9c")

    def stick(hx, hy, s):
        return (f'<line x1="{hx}" y1="{hy}" x2="{hx + s * 8}" y2="{hy - 40}" stroke="#d9a066" stroke-width="5" stroke-linecap="round"/>'
                f'<circle cx="{hx + s * 8}" cy="{hy - 42}" r="6" fill="#f6e7c1" stroke="#8a5424" stroke-width="2"/>')
    l, lh, _ = arm(40, 110, -1, "up", "#3a2e2e", held=stick)
    r, rh, _ = arm(160, 110, 1, "up", "#3a2e2e", held=stick)
    body += l + r
    body += '<path d="M40,70 V160 A60,18 0 0 0 160,160 V70 Z" fill="url(#side)" stroke="#8f1420" stroke-width="3"/>'
    zig = "M40,84 " + " ".join(f"L{40 + i * 20},{150 if i % 2 else 84}" for i in range(1, 7))
    body += f'<path d="{zig}" fill="none" stroke="#2f7de1" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    body += '<path d="M40,160 A60,18 0 0 0 160,160" fill="none" stroke="#ffd23f" stroke-width="7"/>'
    body += '<ellipse cx="100" cy="70" rx="60" ry="18" fill="url(#top)" stroke="#ffd23f" stroke-width="7"/>'
    body += '<ellipse cx="100" cy="70" rx="60" ry="18" fill="none" stroke="#8f1420" stroke-width="2"/>'
    body += face("D", 100, 112, 22, 15, "#1d5fa8", "surprised", "smile", look=(0.0, -0.1))
    body += lh + rh
    rings = ('<ellipse cx="100" cy="70" rx="72" ry="24" fill="none" stroke="#ffd23f" stroke-width="3"/>'
             '<ellipse cx="100" cy="70" rx="86" ry="30" fill="none" stroke="#ffd23f" stroke-width="2.5" opacity=".7"/>')
    body += part("rings", fx(rings), 100, 70)
    return svg("drum", defs, body)


def egg():
    defs = radial("g", "#fffaf0", "#f2e2b8", "#b89a5c")
    body = shadow()
    body += legs("#f4a261", "#e63946", kick="R")
    l, lh, _ = arm(44, 122, -1, "up", "#f4a261", hand="fist")
    r, rh, _ = arm(156, 122, 1, "out", "#f4a261")
    body += l + r
    shape = "M100,38 C138,38 158,88 158,128 C158,165 130,180 100,180 C70,180 42,165 42,128 C42,88 62,38 100,38Z"
    body += f'<clipPath id="eggc"><path d="{shape}"/></clipPath>'
    body += f'<path d="{shape}" fill="url(#g)" stroke="#b89a5c" stroke-width="3"/>'
    body += '<g clip-path="url(#eggc)"><rect x="30" y="58" width="140" height="14" fill="#e63946"/><rect x="30" y="61" width="140" height="3" fill="#ff8a94" opacity=".6"/></g>'
    body += part("band", '<path d="M150,66 l16,-6 M150,68 l14,8" stroke="#e63946" stroke-width="6" stroke-linecap="round"/>', 150, 66)
    body += gloss(72, 84, 12, 7, -40)
    body += face("E", 100, 104, 21, 15, "#2b2b2b", "cheeky", "smile", look=(0.2, -0.2))
    body += lh + rh
    body += fx('<path d="M20,110 h14 M14,124 h20 M20,138 h14" stroke="#7fc4f0" stroke-width="3" stroke-linecap="round"/>'
               + sparkle(178, 90, 7) + sparkle(30, 70, 6))
    return svg("egg", defs, body)


def flower():
    defs = radial("c", "#fff4b0", "#ffd23f", "#e0a800", "40%", "35%") + radial("p", "#ffd6e6", "#ff70a6", "#d63d7c", "40%", "35%")
    body = shadow(rx=40)
    body += '<line x1="100" y1="140" x2="100" y2="182" stroke="#2a9d5c" stroke-width="9" stroke-linecap="round"/>'
    body += legs("#2a9d5c", "#57cc99", lx=93, rx=107)
    body += part("leaves",
                 '<ellipse cx="80" cy="160" rx="16" ry="7" fill="#57cc99" stroke="#237a48" stroke-width="2.5" transform="rotate(-30 80 160)"/>'
                 '<ellipse cx="121" cy="172" rx="16" ry="7" fill="#57cc99" stroke="#237a48" stroke-width="2.5" transform="rotate(30 121 172)"/>', 100, 166)
    l, lh, _ = arm(100, 150, -1, "out", "#2a9d5c")
    r, rh, _ = arm(100, 150, 1, "out", "#2a9d5c")
    body += l + r
    petals = "".join(f'<ellipse cx="100" cy="58" rx="15" ry="26" fill="url(#p)" stroke="#d63d7c" stroke-width="2.5" transform="rotate({i * 45} 100 98)"/>'
                     for i in range(8))
    body += part("petals", petals, 100, 98)
    body += '<circle cx="100" cy="98" r="36" fill="url(#c)" stroke="#e0a800" stroke-width="3"/>'
    body += gloss(84, 80, 10, 5, -40)
    body += face("F", 100, 94, 15, 11, "#2b2b2b", "happy", "smile", look=(0.1, 0.2), mouth_dy=10, mouth_w=16)
    body += lh + rh
    body += fx(sparkle(30, 50, 6, "#ff70a6") + sparkle(170, 40, 7, "#ffd23f") + sparkle(176, 120, 5, "#ff70a6") + sparkle(24, 130, 6, "#ffd23f"))
    return svg("flower", defs, body)


def glasses():
    defs = linear("lens", "#eaf7ff", "#bfe4ff", vertical=True)
    frame = "#1d3557"
    body = shadow(rx=70, cy=210)
    body += legs("#1d3557", "#e63946", lx=62, rx=138, y=176)

    def magnifier(hx, hy, s):
        return (f'<circle cx="{hx + 6}" cy="{hy - 22}" r="13" fill="#dff3ff" fill-opacity=".8" stroke="{frame}" stroke-width="4"/>'
                f'<line x1="{hx + 2}" y1="{hy - 10}" x2="{hx}" y2="{hy}" stroke="{frame}" stroke-width="5" stroke-linecap="round"/>')
    l, lh, _ = arm(30, 130, -1, "hip", frame)
    r, rh, _ = arm(170, 126, 1, "up", frame, held=magnifier)
    body += l + r
    body += f'<path d="M30,108 Q10,100 8,80 M170,108 Q190,100 192,80" fill="none" stroke="{frame}" stroke-width="7" stroke-linecap="round"/>'
    for cx in (62, 138):
        body += f'<circle cx="{cx}" cy="{120}" r="36" fill="url(#lens)" fill-opacity=".9" stroke="{frame}" stroke-width="8"/>'
    body += f'<path d="M96,112 Q100,100 104,112" fill="none" stroke="{frame}" stroke-width="7" stroke-linecap="round"/>'
    body += gloss(46, 100, 10, 5, -40, .7) + gloss(122, 100, 10, 5, -40, .7)
    body += part("face", eye(62, 120, 20, "#5a3a1a", (0.3, 0.1)) + eye(138, 120, 20, "#5a3a1a", (0.3, 0.1), lid="#cfe6f7")
                 + brows(62, 138, 78, "cheeky") + mouth(100, 150, "smug", "G"))
    body += lh + rh
    body += fx(sparkle(48, 96, 7, "#fff") + sparkle(124, 96, 7, "#fff"))
    return svg("glasses", defs, body)


def hat():
    defs = radial("g", "#f0cfa0", "#d9a066", "#8c5a2b", "35%", "20%")
    body = shadow(rx=80)
    body += legs("#8c5a2b", "#5a3a1a", y=180)
    l, lh, _ = arm(58, 118, -1, "hip", "#8c5a2b")
    r, rh, _ = arm(142, 112, 1, "out", "#8c5a2b")
    body += l + r
    body += '<ellipse cx="100" cy="166" rx="84" ry="20" fill="#c48a4a" stroke="#6b3a10" stroke-width="3"/>'
    body += '<path d="M58,76 Q58,54 78,54 H122 Q142,54 142,76 V166 H58Z" fill="url(#g)" stroke="#6b3a10" stroke-width="3" stroke-linejoin="round"/>'
    body += '<path d="M70,54 Q100,44 130,54" fill="none" stroke="#6b3a10" stroke-width="3"/>'
    body += '<rect x="58" y="142" width="84" height="16" fill="#5a3a1a"/>'
    body += '<path d="M16,166 A84,20 0 0 0 184,166" fill="#d9a066" stroke="#6b3a10" stroke-width="3"/>'
    body += gloss(76, 72, 12, 6, -60)
    body += part("feather",
                 '<ellipse cx="146" cy="128" rx="26" ry="8" fill="#e63946" stroke="#9b1c26" stroke-width="2" transform="rotate(-50 146 128)"/>'
                 '<line x1="130" y1="148" x2="162" y2="108" stroke="#9b1c26" stroke-width="2"/>', 130, 148)
    body += face("H", 100, 92, 19, 14, "#2b2b2b", "cheeky", "smug", look=(0.3, -0.1), mouth_dy=12)
    body += lh + rh
    body += fx(sparkle(40, 50, 8) + sparkle(168, 40, 7) + sparkle(178, 90, 5) + sparkle(24, 100, 6))
    return svg("hat", defs, body)


def icecream():
    defs = (linear("cone", "#e8b26a", "#a8652a", vertical=True) + radial("straw", "#ffe0ea", "#ff8fb3", "#d6567e")
            + radial("mint", "#f0fff6", "#a4ebc8", "#4fb58c", "40%", "35%"))
    body = shadow(cy=214, rx=44)
    body += legs("#a8652a", "#6b3a10", lx=90, rx=110, y=182)
    l, lh, _ = arm(58, 112, -1, "out", "#d6567e")
    r, rh, _ = arm(142, 104, 1, "up", "#d6567e")
    body += l + r
    # Waffle cone with a criss-cross pattern, clipped to the cone.
    cone = 'M58,130 L100,200 L142,130 Z'
    body += f'<clipPath id="conec"><path d="{cone}"/></clipPath>'
    body += f'<path d="{cone}" fill="url(#cone)" stroke="#7a4a1e" stroke-width="3" stroke-linejoin="round"/>'
    lines = "".join(f'<path d="M{x},120 L{x + 60},210 M{x + 60},120 L{x},210" stroke="#7a4a1e" stroke-width="2" opacity=".45"/>' for x in range(20, 160, 18))
    body += f'<g clip-path="url(#conec)">{lines}</g>'
    body += '<path d="M56,130 H144" stroke="#7a4a1e" stroke-width="3" stroke-linecap="round"/>'
    # Two scoops: a mint one on top of the big strawberry one that wears the face.
    body += part("scoop-top", '<circle cx="100" cy="54" r="30" fill="url(#mint)" stroke="#3c9a72" stroke-width="3"/>'
                 + gloss(88, 40, 8, 5, -30), 100, 84)
    body += '<circle cx="100" cy="102" r="46" fill="url(#straw)" stroke="#b83d63" stroke-width="3"/>'
    body += gloss(70, 76, 12, 7, -35)
    body += part("drips", '<path d="M62,128 q0,20 -8,22 q-4,-8 4,-16z M132,136 q2,18 -6,20 q-6,-8 0,-18z M98,142 q4,14 -3,18 q-6,-8 0,-16z" '
                 'fill="#ff8fb3" stroke="#b83d63" stroke-width="2"/>', 100, 130)
    sprinkles = "".join(f'<rect x="{cx}" y="{cy}" width="9" height="3.5" rx="1.7" fill="{c}" transform="rotate({rot} {cx} {cy})"/>'
                        for cx, cy, c, rot in ((78, 34, "#2196f3", 20), (110, 30, "#ff3b3b", -30), (94, 66, "#ffc400", 60), (120, 60, "#8e44ff", 10),
                                               (64, 96, "#3ecf3e", -20), (134, 90, "#2196f3", 40), (72, 128, "#ffc400", 15), (126, 122, "#ff8a00", -50)))
    body += part("sprinkles", sprinkles, 100, 80)
    body += part("cherry", '<path d="M104,24 C110,12 116,10 122,6" fill="none" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round"/>'
                 '<circle cx="102" cy="26" r="9" fill="#e63946" stroke="#8f1420" stroke-width="2.5"/>' + gloss(99, 23, 3, 2, -30, .7), 102, 34)
    body += face("I", 100, 100, 20, 14, "#5a3a1a", "happy", "smile", look=(0.15, 0.1), mouth_w=18)
    body += lh + rh
    flying = "".join(f'<rect x="{cx}" y="{cy}" width="10" height="4" rx="2" fill="{c}" transform="rotate({rot} {cx} {cy})"/>'
                     for cx, cy, c, rot in ((30, 40, "#ff3b3b", 30), (166, 34, "#2196f3", -20), (20, 100, "#ffc400", 70), (178, 110, "#3ecf3e", -60),
                                            (36, 160, "#8e44ff", 15), (164, 164, "#ff8a00", -35), (60, 12, "#3ecf3e", 50), (146, 10, "#ff4fa3", -45)))
    body += fx(flying)
    return svg("icecream", defs, body)


def jamjar():
    defs = (radial("jam", "#ff6b8a", "#c9184a", "#7a0f2e", "35%", "30%") +
            '<pattern id="ging" width="12" height="12" patternUnits="userSpaceOnUse">'
            '<rect width="12" height="12" fill="#fff"/><rect width="6" height="6" fill="#e63946"/><rect x="6" y="6" width="6" height="6" fill="#e63946"/>'
            '<rect x="6" width="6" height="6" fill="#ffb3c6" opacity=".6"/><rect y="6" width="6" height="6" fill="#ffb3c6" opacity=".6"/></pattern>')
    body = shadow()
    body += legs("#c9184a", "#7a0f2e")
    l, lh, _ = arm(52, 120, -1, "down", "#c9184a")
    r, rh, _ = arm(148, 116, 1, "wave", "#c9184a")
    body += l + r
    body += '<rect x="52" y="72" width="96" height="108" rx="16" fill="url(#jam)" stroke="#7a0f2e" stroke-width="3"/>'
    body += '<rect x="58" y="60" width="84" height="16" fill="#ffd6e0" stroke="#7a0f2e" stroke-width="2.5"/>'
    body += part("lid",
                 '<path d="M46,44 H154 Q160,44 160,50 V60 Q160,66 154,66 H46 Q40,66 40,60 V50 Q40,44 46,44Z" fill="url(#ging)" stroke="#7a0f2e" stroke-width="2.5"/>'
                 '<path d="M40,64 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0 q6,8 12,0" fill="none" stroke="#7a0f2e" stroke-width="1.5"/>', 100, 56)
    body += '<path d="M62,86 v40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>'
    body += '<rect x="66" y="128" width="68" height="36" rx="6" fill="#fff9f0" stroke="#7a0f2e" stroke-width="2.5"/>'
    body += '<path d="M100,158 C86,148 84,138 92,136 C97,135 100,140 100,142 C100,140 103,135 108,136 C116,138 114,148 100,158Z" fill="#e63946"/>'
    body += face("J", 100, 96, 20, 14, "#2b2b2b", "happy", "grin", look=(0.1, 0.1), mouth_dy=10, mouth_w=18)
    body += lh + rh
    body += fx(heart(40, 60, 1.2) + heart(160, 48, 1.4, "#ff70a6") + heart(100, 26, 1.0) + heart(24, 110, 1.0, "#ff70a6") + heart(178, 100, 1.1))
    return svg("jamjar", defs, body)


def key():
    defs = radial("g", "#fff2a8", "#ffd23f", "#c98f00", "35%", "25%")
    body = shadow(rx=44)
    body += legs("#c98f00", "#8a5a00", lx=92, rx=108, y=182)
    l, lh, _ = arm(62, 96, -1, "hip", "#c98f00")
    r, rh, _ = arm(138, 92, 1, "up", "#c98f00")
    body += l + r
    body += '<rect x="88" y="110" width="24" height="76" rx="8" fill="url(#g)" stroke="#c98f00" stroke-width="3"/>'
    body += '<rect x="108" y="150" width="18" height="10" rx="3" fill="#ffd23f" stroke="#c98f00" stroke-width="3"/>'
    body += '<rect x="108" y="168" width="26" height="10" rx="3" fill="#ffd23f" stroke="#c98f00" stroke-width="3"/>'
    body += '<circle cx="100" cy="76" r="42" fill="url(#g)" stroke="#c98f00" stroke-width="3"/>'
    body += gloss(78, 52, 12, 6, -40)
    body += face("K", 100, 74, 18, 13, "#2b2b2b", "cheeky", "smug", look=(0.5, -0.4), mouth_dy=12)
    body += lh + rh
    bulb = ('<circle cx="176" cy="30" r="12" fill="#fff4b0" stroke="#c98f00" stroke-width="2.5"/>'
            '<rect x="170" y="40" width="12" height="7" rx="2" fill="#8a94a3" stroke="#3a2e2e" stroke-width="1.5"/>'
            '<path d="M176,8 v6 M156,14 l4,4 M196,14 l-4,4 M154,32 h6 M192,32 h6" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>')
    body += part("bulb", fx(bulb), 176, 34)
    return svg("key", defs, body)


def lollipop():
    colors = ["#ff3b3b", "#ff8a00", "#ffc400", "#3ecf3e", "#2196f3", "#8e44ff"]
    defs = ""
    body = shadow(rx=44)
    body += legs("#3a2e2e", "#ff4fa3", lx=94, rx=106, y=178, kick="R")
    l, lh, _ = arm(46, 104, -1, "up", "#3a2e2e")
    r, rh, _ = arm(154, 104, 1, "up", "#3a2e2e")
    body += l + r
    body += '<rect x="93" y="144" width="14" height="40" rx="5" fill="#f5f0e6" stroke="#b8a88a" stroke-width="2.5"/>'
    disc = "".join(f'<circle cx="100" cy="90" r="{58 - i * 10}" fill="{c}"/>' for i, c in enumerate(colors))
    pts = []
    for k in range(0, 260):
        t = k / 260 * 5.2 * math.pi
        rr = 4 + t * 3.2
        pts.append(f"{100 + rr * math.cos(t):.1f},{90 + rr * math.sin(t):.1f}")
    disc += f'<polyline points="{" ".join(pts)}" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>'
    disc += '<circle cx="100" cy="90" r="58" fill="none" stroke="#c2185b" stroke-width="3"/>'
    body += part("disc", disc, 100, 90)
    body += gloss(76, 60, 14, 7, -40)
    body += face("L", 100, 84, 20, 14, "#2b2b2b", "surprised", "smile", look=(0.1, -0.1), mouth_dy=10, mouth_w=18)
    conf = "".join(f'<rect x="{cx}" y="{cy}" width="7" height="7" fill="{c}" transform="rotate(30 {cx} {cy})"/>'
                   for cx, cy, c in ((24, 40, "#ff8a00"), (176, 52, "#3ecf3e"), (30, 150, "#2196f3"), (172, 150, "#ff3b3b"), (160, 20, "#ffc400")))
    body += part("confetti", conf, 100, 90)
    body += lh + rh
    burst = "".join(f'<rect x="{cx}" y="{cy}" width="8" height="8" fill="{c}" transform="rotate({cx % 60} {cx} {cy})"/>'
                    for cx, cy, c in ((40, 20, "#ff3b3b"), (70, 6, "#2196f3"), (130, 10, "#3ecf3e"), (166, 24, "#8e44ff"),
                                      (14, 80, "#ffc400"), (186, 90, "#ff8a00"), (20, 180, "#3ecf3e"), (180, 180, "#2196f3")))
    body += fx(burst)
    return svg("lollipop", defs, body)


def mug():
    defs = radial("g", "#fffaf0", "#f2e2b8", "#b89a5c", "35%", "30%")
    body = shadow(rx=64)
    body += legs("#b89a5c", "#6b3a10")
    l, lh, _ = arm(48, 124, -1, "down", "#b89a5c")
    r, rh, _ = arm(152, 124, 1, "down", "#b89a5c")
    body += l + r
    body += '<path d="M152,104 Q192,104 192,136 Q192,168 152,168" fill="none" stroke="#b89a5c" stroke-width="18" stroke-linecap="round"/>'
    body += '<path d="M152,104 Q192,104 192,136 Q192,168 152,168" fill="none" stroke="#f2e2b8" stroke-width="12" stroke-linecap="round"/>'
    body += '<path d="M48,72 V166 Q48,184 66,184 H134 Q152,184 152,166 V72Z" fill="url(#g)" stroke="#b89a5c" stroke-width="3"/>'
    body += '<ellipse cx="100" cy="72" rx="52" ry="14" fill="#f2e2b8" stroke="#b89a5c" stroke-width="3"/>'
    body += '<ellipse cx="100" cy="72" rx="44" ry="10" fill="#6b3a10"/><ellipse cx="90" cy="70" rx="14" ry="4" fill="#8a5424"/>'
    steam = "".join(f'<path d="M{x},56 q-6,-8 0,-16 q6,-8 0,-16" fill="none" stroke="#bbb" stroke-width="3" stroke-linecap="round" opacity=".6"/>'
                    for x in (80, 100, 120))
    body += part("steam", steam, 100, 56)
    body += face("M", 100, 112, 20, 14, "#2b2b2b", "sleepy", "small", look=(0.0, 0.3), lid="#f2e2b8", mouth_dy=12)
    body += part("zz", '<text x="150" y="60" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#4ea8de">z</text>'
                       '<text x="162" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="#4ea8de">z</text>', 156, 52)
    body += lh + rh
    return svg("mug", defs, body)


def nest():
    defs = radial("g", "#d9a066", "#b5723e", "#6b3a10", "40%", "60%")
    body = shadow(rx=68)
    body += legs("#6b3a10", "#8a5424", y=178)
    l, lh, _ = arm(40, 134, -1, "out", "#6b3a10")
    r, rh, _ = arm(160, 134, 1, "out", "#6b3a10")
    body += l + r
    body += '<ellipse cx="100" cy="110" rx="64" ry="18" fill="#5a3010"/>'
    body += part("egg-l", '<ellipse cx="70" cy="104" rx="15" ry="19" fill="#bde0fe" stroke="#3a2e2e" stroke-width="2.5"/>', 70, 120)
    body += part("egg-r", '<ellipse cx="130" cy="104" rx="15" ry="19" fill="#ffb3c6" stroke="#3a2e2e" stroke-width="2.5"/>', 130, 120)
    chick = ('<circle cx="100" cy="86" r="14" fill="#ffd23f" stroke="#3a2e2e" stroke-width="2.5"/>'
             '<circle cx="95" cy="84" r="2.5" fill="#1a1a1a"/><circle cx="105" cy="84" r="2.5" fill="#1a1a1a"/>'
             '<path d="M96,92 L100,97 L104,92 Z" fill="#ff8a00" stroke="#3a2e2e" stroke-width="1.5"/>')
    body += part("chick", chick, 100, 100)
    body += '<path d="M82,108 Q82,84 100,82 Q118,84 118,108 Z" fill="none"/>'
    body += '<path d="M82,108 L88,100 L94,108 L100,100 L106,108 L112,100 L118,108 V112 H82 Z" fill="#ffe08a" stroke="#3a2e2e" stroke-width="2.5" stroke-linejoin="round"/>'
    body += '<clipPath id="nestc"><path d="M36,112 Q36,178 100,180 Q164,178 164,112 Z"/></clipPath>'
    body += '<path d="M36,112 Q36,178 100,180 Q164,178 164,112 Z" fill="url(#g)" stroke="#5a3010" stroke-width="3"/>'
    body += '<g clip-path="url(#nestc)" stroke-linecap="round" stroke-width="3" fill="none">'
    twigs = [(30, 120, 80, 160), (50, 170, 120, 118), (90, 176, 160, 130), (140, 176, 60, 150), (36, 140, 100, 178), (110, 112, 170, 150), (60, 118, 20, 160)]
    for i, (x1, y1, x2, y2) in enumerate(twigs):
        body += f'<path d="M{x1},{y1} Q{(x1 + x2) / 2},{(y1 + y2) / 2 + 8} {x2},{y2}" stroke="{"#e6bc93" if i % 2 else "#5a3010"}" opacity=".7"/>'
    body += '</g>'
    body += '<ellipse cx="100" cy="112" rx="64" ry="18" fill="none" stroke="#5a3010" stroke-width="3"/>'
    body += face("N", 100, 140, 20, 13, "#2b2b2b", "happy", "small", look=(0.0, 0.2), mouth_dy=10)
    body += lh + rh
    body += fx(note(126, 60, "#ff8a00") + note(150, 44, "#ff8a00") + heart(50, 60, 1.0, "#ff70a6"))
    return svg("nest", defs, body)


def octopus():
    defs = radial("g", "#d9bfff", "#9b5de5", "#5a189a")
    body = shadow(rx=76)
    tents = [("M56,124 Q30,150 18,178 Q14,198 34,198", 56, 124), ("M76,134 Q60,170 48,196", 76, 134), ("M96,138 Q92,176 80,202", 96, 138),
             ("M144,124 Q170,150 182,178 Q186,198 166,198", 144, 124), ("M124,134 Q140,170 152,196", 124, 134), ("M104,138 Q108,176 120,202", 104, 138)]
    for i, (t, ox, oy) in enumerate(tents):
        body += part(f"tent t{i}", f'<path d="{t}" fill="none" stroke="#5a189a" stroke-width="17" stroke-linecap="round"/>'
                                   f'<path d="{t}" fill="none" stroke="#9b5de5" stroke-width="12" stroke-linecap="round"/>', ox, oy)
    for cx, cy in ((26, 172), (44, 184), (72, 176), (56, 154), (174, 172), (156, 184), (128, 176), (144, 154), (96, 176), (104, 176)):
        body += f'<circle cx="{cx}" cy="{cy}" r="2.5" fill="#d9bfff"/>'
    arms_ = [("M50,108 Q14,112 12,80 Q12,62 28,64", 50, 108, "arm-l"), ("M150,108 Q186,112 188,80 Q188,62 172,64", 150, 108, "arm-r")]
    for t, ox, oy, cls in arms_:
        body += part(cls, f'<path d="{t}" fill="none" stroke="#5a189a" stroke-width="15" stroke-linecap="round"/>'
                          f'<path d="{t}" fill="none" stroke="#9b5de5" stroke-width="10" stroke-linecap="round"/>', ox, oy)
    body += '<ellipse cx="100" cy="92" rx="58" ry="54" fill="url(#g)" stroke="#5a189a" stroke-width="3"/>'
    body += gloss(66, 56, 16, 8, -35)
    body += face("O", 100, 92, 22, 16, "#2b2b2b", "surprised", "smile", look=(-0.4, 0.0))
    body += fx('<path d="M14,40 h12 M8,54 h14 M178,40 h12 M180,54 h14" stroke="#7fc4f0" stroke-width="3" stroke-linecap="round"/>')
    return svg("octopus", defs, body)


def potato():
    defs = radial("g", "#e6c9a0", "#c69c6d", "#8a5a2b", "35%", "30%")
    body = shadow(rx=84, cy=206)
    body += '<ellipse cx="100" cy="184" rx="86" ry="18" fill="#9b5de5" stroke="#5a189a" stroke-width="3"/>'
    body += '<path d="M40,184 Q100,170 160,184" fill="none" stroke="#d9bfff" stroke-width="3" opacity=".6"/>'
    body += part("leg-r", '<path d="M150,160 Q170,166 178,178" fill="none" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>'
                          '<ellipse cx="182" cy="176" rx="13" ry="7" fill="#ff70a6" stroke="#3a2e2e" stroke-width="2.5" transform="rotate(-30 182 176)"/>', 150, 160)
    body += part("leg-l", '<path d="M156,164 Q170,178 172,192" fill="none" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>'
                          '<ellipse cx="176" cy="194" rx="13" ry="7" fill="#ff70a6" stroke="#3a2e2e" stroke-width="2.5"/>', 156, 164)
    body += part("arm-l", '<path d="M44,144 Q22,140 26,116 Q30,104 44,112" fill="none" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>', 44, 144)
    tater = '<path d="M38,150 C30,120 60,96 110,104 C160,110 176,140 162,164 C150,186 70,188 46,172 C36,166 40,158 38,150Z" fill="url(#g)" stroke="#8a5a2b" stroke-width="3"/>'
    for cx, cy, r in ((60, 130, 4), (140, 122, 3.5), (150, 156, 3), (72, 166, 3.5), (120, 172, 3)):
        tater += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#8a5a2b" opacity=".5"/>'
    tater += face("P", 100, 132, 20, 13, "#2b2b2b", "sleepy", "small", look=(0.0, 0.3), lid="#c69c6d", mouth_dy=10)
    body += part("body", tater, 100, 180)
    body += part("arm-l", glove(44, 112, -1), 44, 144)
    body += part("zz", '<text x="150" y="86" font-family="Arial, sans-serif" font-weight="700" font-size="14" fill="#9b5de5">z</text>'
                       '<text x="164" y="70" font-family="Arial, sans-serif" font-weight="700" font-size="18" fill="#9b5de5">z</text>', 156, 78)
    return svg("potato", defs, body)


def queen():
    defs = radial("g", "#fff2a8", "#ffd23f", "#c98f00", "35%", "25%")
    body = shadow(rx=66)
    body += legs("#c98f00", "#b3123f")

    def scepter(hx, hy, s):
        return (f'<line x1="{hx}" y1="{hy}" x2="{hx}" y2="{hy - 44}" stroke="#c98f00" stroke-width="5" stroke-linecap="round"/>'
                f'<circle cx="{hx}" cy="{hy - 48}" r="8" fill="#8e44ff" stroke="#c98f00" stroke-width="3"/>')
    l, lh, _ = arm(40, 140, -1, "hip", "#c98f00")
    r, rh, _ = arm(160, 136, 1, "up", "#c98f00", held=scepter)
    body += l + r
    body += '<ellipse cx="100" cy="98" rx="52" ry="30" fill="#b3123f"/>'
    body += ('<path d="M40,124 L40,58 L64,92 L82,40 L100,84 L118,40 L136,92 L160,58 L160,124 Z" fill="url(#g)" '
             'stroke="#c98f00" stroke-width="3" stroke-linejoin="round"/>')
    body += '<path d="M46,124 Q100,70 154,124 Z" fill="#b3123f" opacity=".35"/>'
    body += '<rect x="40" y="118" width="120" height="60" rx="8" fill="url(#g)" stroke="#c98f00" stroke-width="3"/>'
    body += '<rect x="40" y="118" width="120" height="8" fill="#fff2a8" opacity=".6"/>'
    jewels = "".join(f'<circle cx="{cx}" cy="{cy}" r="6" fill="{c}" stroke="#3a2e2e" stroke-width="2"/>'
                     for cx, cy, c in ((40, 58, "#e63946"), (82, 40, "#2196f3"), (118, 40, "#3ecf3e"), (160, 58, "#e63946")))
    jewels += '<circle cx="100" cy="84" r="7" fill="#8e44ff" stroke="#3a2e2e" stroke-width="2"/>'
    body += part("jewels", jewels)
    body += face("Q", 100, 142, 22, 13, "#2b2b2b", "grumpy", "smug", look=(-0.3, 0.0), mouth_dy=12)
    body += lh + rh
    body += fx(sparkle(40, 42, 8, "#fff") + sparkle(82, 24, 7, "#fff") + sparkle(118, 24, 7, "#fff") + sparkle(160, 42, 8, "#fff") + sparkle(100, 66, 6, "#fff"))
    return svg("queen", defs, body)


def robot():
    defs = (linear("metal", "#b8e2ff", "#2b6fb5") + linear("metalDark", "#6fb8ea", "#1d5292") +
            linear("screen", "#eaf7ff", "#bfe4ff", vertical=True))
    body = shadow(cy=214)
    body += part("leg-l", '<rect x="76" y="176" width="14" height="18" rx="4" fill="url(#metalDark)" stroke="#1d5292" stroke-width="2.5"/>'
                          '<rect x="62" y="192" width="34" height="16" rx="6" fill="url(#metal)" stroke="#1d5292" stroke-width="2.5"/>', 83, 176)
    body += part("leg-r", '<rect x="110" y="176" width="14" height="18" rx="4" fill="url(#metalDark)" stroke="#1d5292" stroke-width="2.5"/>'
                          '<rect x="104" y="192" width="34" height="16" rx="6" fill="url(#metal)" stroke="#1d5292" stroke-width="2.5"/>', 117, 176)
    for d, ox, oy, cls, gx, gy, s in (("M52,132 Q30,150 40,172", 52, 132, "arm-l", 40, 176, -1), ("M148,128 Q176,118 172,84", 148, 128, "arm-r", 172, 80, 1)):
        body += part(cls, f'<path d="{d}" fill="none" stroke="#2b6fb5" stroke-width="9" stroke-linecap="round"/>'
                          f'<path d="{d}" fill="none" stroke="#7fc4f0" stroke-width="3" stroke-linecap="round" opacity=".6"/>' + glove(gx, gy, s), ox, oy)
    body += '<rect x="58" y="122" width="84" height="58" rx="12" fill="url(#metal)" stroke="#1d5292" stroke-width="3"/>'
    body += '<rect x="72" y="134" width="56" height="34" rx="6" fill="url(#screen)" stroke="#1d5292" stroke-width="2.5"/>'
    body += '<path d="M84,160 A16,16 0 0 1 116,160" fill="none" stroke="#9cc9e8" stroke-width="2"/>'
    body += part("needle", '<line x1="100" y1="160" x2="110" y2="148" stroke="#e63946" stroke-width="2.5" stroke-linecap="round"/>', 100, 160)
    body += '<circle cx="100" cy="160" r="2.5" fill="#1d5292"/>'
    for cx, cy in ((64, 128), (136, 128), (64, 174), (136, 174)):
        body += f'<circle cx="{cx}" cy="{cy}" r="2.2" fill="#1d5292"/>'
    body += '<rect x="90" y="112" width="20" height="12" fill="url(#metalDark)" stroke="#1d5292" stroke-width="2.5"/>'
    head = '<rect x="50" y="44" width="100" height="72" rx="16" fill="url(#metal)" stroke="#1d5292" stroke-width="3"/>'
    head += gloss(72, 56, 14, 6, -20)
    head += '<rect x="38" y="70" width="14" height="22" rx="4" fill="url(#metalDark)" stroke="#1d5292" stroke-width="2.5"/>'
    head += '<rect x="148" y="70" width="14" height="22" rx="4" fill="url(#metalDark)" stroke="#1d5292" stroke-width="2.5"/>'
    head += '<line x1="45" y1="76" x2="45" y2="86" stroke="#b8e2ff" stroke-width="2"/><line x1="155" y1="76" x2="155" y2="86" stroke="#b8e2ff" stroke-width="2"/>'
    head += '<line x1="100" y1="44" x2="100" y2="22" stroke="#1d5292" stroke-width="4"/><circle cx="100" cy="18" r="7" fill="#e63946" stroke="#3a2e2e" stroke-width="2.5"/><circle cx="97" cy="15" r="2" fill="#fff"/>'
    head += '<g class="bulb" opacity="0"><circle cx="100" cy="18" r="13" fill="#ff5a5a" opacity=".5"/><circle cx="100" cy="18" r="7" fill="#ffd23f"/></g>'
    head += blush(66, 134, 94, "#ff9aa2", .6)
    head += eye(80, 78, 15, "#1d5fa8", (0.15, 0.1)) + eye(120, 78, 15, "#1d5fa8", (0.15, 0.1))
    head += '<g fill="none" stroke="#3a2e2e" stroke-width="4" stroke-linecap="round"><path d="M70,56 Q80,50 90,56"/><path d="M110,52 Q120,44 130,52"/></g>'
    head += mouth(100, 98, "grin", "R", 20)
    body += part("head", head, 100, 118)
    return svg("robot", defs, body)


def sun():
    defs = radial("g", "#fff4b0", "#ffd23f", "#f4a261", "38%", "32%")
    body = shadow(rx=70)
    body += legs("#f4a261", "#e63946", y=170)
    l, lh, _ = arm(48, 110, -1, "out", "#f4a261")
    r, rh, _ = arm(152, 110, 1, "out", "#f4a261")
    body += l + r
    rays = ""
    for i in range(12):
        a = math.radians(i * 30)
        b1, b2 = a - math.radians(9), a + math.radians(9)
        rays += (f"M{100 + 60 * math.cos(b1):.1f},{96 + 60 * math.sin(b1):.1f} "
                 f"L{100 + 90 * math.cos(a):.1f},{96 + 90 * math.sin(a):.1f} "
                 f"L{100 + 60 * math.cos(b2):.1f},{96 + 60 * math.sin(b2):.1f} Z ")
    body += part("rays", f'<path d="{rays}" fill="#f4a261" stroke="#e07b1a" stroke-width="2.5" stroke-linejoin="round"/>', 100, 96)
    body += '<circle cx="100" cy="96" r="58" fill="url(#g)" stroke="#e07b1a" stroke-width="3"/>'
    body += gloss(70, 62, 16, 8, -35)
    body += face("S", 100, 92, 22, 15, "#5a3a1a", "happy", "smile", look=(0.1, 0.1))
    body += lh + rh
    body += fx(sparkle(20, 30, 9) + sparkle(180, 24, 8) + sparkle(190, 130, 7) + sparkle(12, 140, 7) + sparkle(100, 4, 6))
    return svg("sun", defs, body)


def toaster():
    defs = linear("steel", "#f4f6f8", "#8a94a3") + radial("toast", "#f0cfa0", "#d9a066", "#8c5a2b", "40%", "35%")
    body = shadow(rx=68)
    body += legs("#5a6472", "#e63946")
    l, lh, _ = arm(42, 130, -1, "up", "#5a6472")
    r, rh, _ = arm(158, 130, 1, "up", "#5a6472")
    body += l + r
    toast = ""
    for x, y in ((58, 52), (108, 44)):
        toast += (f'<path d="M{x},{y + 8} Q{x},{y} {x + 8},{y} H{x + 26} Q{x + 34},{y} {x + 34},{y + 8} V{y + 40} H{x} Z" fill="url(#toast)" stroke="#8c5a2b" stroke-width="2.5"/>'
                  f'<path d="M{x + 6},{y + 12} Q{x + 6},{y + 6} {x + 12},{y + 6} H{x + 22} Q{x + 28},{y + 6} {x + 28},{y + 12} V{y + 40} H{x + 6} Z" fill="#f6e7c1"/>')
    body += part("bread", toast, 100, 90)
    body += '<rect x="40" y="92" width="120" height="90" rx="18" fill="url(#steel)" stroke="#5a6472" stroke-width="3"/>'
    body += '<path d="M40,166 H160 V164 Q160,182 142,182 H58 Q40,182 40,164 Z" fill="#5a6472"/>'
    body += '<rect x="58" y="94" width="34" height="8" rx="3" fill="#3a2e2e"/><rect x="108" y="94" width="34" height="8" rx="3" fill="#3a2e2e"/>'
    body += part("lever", '<rect x="158" y="118" width="10" height="8" rx="2" fill="#3a2e2e"/><circle cx="168" cy="122" r="5" fill="#e63946" stroke="#3a2e2e" stroke-width="2"/>', 160, 122)
    body += '<circle cx="50" cy="150" r="6" fill="#3a2e2e"/><line x1="50" y1="150" x2="53" y2="145" stroke="#fff" stroke-width="2"/>'
    body += gloss(60, 104, 14, 5, -10, .7)
    body += face("T", 100, 122, 22, 14, "#2b2b2b", "surprised", "smile", look=(0.0, -0.2), mouth_dy=10)
    body += lh + rh
    body += fx('<path d="M70,40 q-5,-8 0,-16 M100,30 q-5,-8 0,-16 M130,34 q-5,-8 0,-16" fill="none" stroke="#bbb" stroke-width="3" stroke-linecap="round"/>')
    return svg("toaster", defs, body)


def umbrella():
    defs = radial("g", "#b3e0ff", "#4ea8de", "#1b5ea3", "35%", "30%")
    body = shadow(rx=70)
    body += '<path d="M100,124 V176 Q100,194 84,194 Q70,194 70,182" fill="none" stroke="#7a4a1e" stroke-width="7" stroke-linecap="round"/>'
    l, lh, _ = arm(34, 112, -1, "out", "#1b5ea3")
    r, rh, _ = arm(166, 112, 1, "out", "#1b5ea3")
    canopy = l + r
    shape = "M18,122 A82,82 0 0 1 182,122 Q161,106 141,122 Q120,106 100,122 Q80,106 59,122 Q39,106 18,122 Z"
    canopy += f'<path d="{shape}" fill="url(#g)" stroke="#1b5ea3" stroke-width="3" stroke-linejoin="round"/>'
    canopy += '<path d="M100,42 L59,122 M100,42 L141,122 M100,42 L18,122 M100,42 L182,122" fill="none" stroke="#1b5ea3" stroke-width="2" opacity=".5"/>'
    canopy += '<line x1="100" y1="42" x2="100" y2="26" stroke="#7a4a1e" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="24" r="4" fill="#7a4a1e"/>'
    canopy += gloss(58, 70, 16, 8, -40)
    canopy += face("U", 100, 84, 22, 14, "#2b2b2b", "happy", "small", look=(0.0, 0.1), mouth_dy=12)
    canopy += lh + rh
    body += part("canopy", canopy, 100, 124)
    for cx, cy in ((24, 40), (176, 48), (12, 84), (188, 92)):
        body += f'<path d="M{cx},{cy} q6,10 0,14 q-6,-4 0,-14z" fill="#7fc4f0" stroke="#4ea8de" stroke-width="1.5"/>'
    rain = ""
    for i, x in enumerate((30, 52, 74, 96, 118, 140, 162, 184)):
        y = -30 - (i * 37) % 50
        rain += part(f"drop d{i}", f'<path d="M{x},{y} q5,9 0,13 q-5,-4 0,-13z" fill="#7fc4f0" stroke="#4ea8de" stroke-width="1.5"/>')
    body += fx(rain, "fx rain")
    return svg("umbrella", defs, body)


def volcano():
    defs = radial("rock", "#b59a8a", "#8a6a5a", "#5a4038", "40%", "40%") + linear("lava", "#ffd23f", "#ff5a1f", vertical=True)
    body = shadow(rx=76)
    body += legs("#5a4038", "#3a2e2e", y=182)
    l, lh, _ = arm(56, 140, -1, "up", "#5a4038", hand="fist")
    r, rh, _ = arm(144, 140, 1, "up", "#5a4038", hand="fist")
    body += l + r
    smoke = "".join(f'<circle cx="{cx}" cy="{cy}" r="{r_}" fill="#cfd8e3" stroke="#9aa5b5" stroke-width="2" opacity=".9"/>'
                    for cx, cy, r_ in ((100, 40, 16), (84, 30, 11), (116, 26, 13), (100, 16, 9)))
    body += part("smoke", smoke, 100, 50)
    body += ('<path d="M78,66 H122 Q136,66 146,100 L170,182 Q172,190 164,190 H36 Q28,190 30,182 L54,100 Q64,66 78,66Z" '
             'fill="url(#rock)" stroke="#5a4038" stroke-width="3" stroke-linejoin="round"/>')
    body += '<ellipse cx="100" cy="66" rx="24" ry="8" fill="#5a4038"/>'
    body += part("lava", '<path d="M78,68 Q76,96 66,118 Q80,108 86,124 Q98,96 112,122 Q118,102 130,116 Q126,92 122,68 Z" fill="url(#lava)" stroke="#e63946" stroke-width="2"/>'
                         '<ellipse cx="100" cy="66" rx="20" ry="6" fill="#ffd23f"/>', 100, 66)
    body += face("V", 100, 142, 22, 13, "#2b2b2b", "grumpy", "smile", look=(0.0, -0.2), mouth_dy=10, mouth_w=20)
    body += lh + rh
    sparks = "".join(f'<path d="M{cx},{cy} q4,-8 0,-14 q-4,6 0,14z M{cx + 6},{cy + 2} q3,-6 0,-10" fill="#ff5a1f" stroke="#e63946" stroke-width="1.5"/>'
                     for cx, cy in ((50, 40), (154, 50), (36, 70)))
    body += part("sparks", sparks, 100, 60)
    burst = "".join(f'<circle cx="{cx}" cy="{cy}" r="{r_}" fill="{c}"/>'
                    for cx, cy, r_, c in ((70, 50, 5, "#ff5a1f"), (130, 44, 6, "#ffd23f"), (90, 30, 4, "#ff5a1f"), (114, 22, 5, "#ffb703"),
                                          (60, 26, 4, "#ffd23f"), (144, 22, 4, "#ff5a1f"), (100, 6, 5, "#ff5a1f"), (40, 46, 3.5, "#ffb703")))
    body += part("burst", fx(burst), 100, 66)
    return svg("volcano", defs, body)


def waterbottle():
    defs = linear("bot", "#d6efff", "#5aaee0")
    body = shadow(rx=50)
    body += legs("#2b6fb5", "#e63946", lx=86, rx=114)
    l, lh, _ = arm(66, 120, -1, "up", "#2b6fb5", hand="fist")
    r, rh, _ = arm(134, 120, 1, "up", "#2b6fb5", hand="fist")
    body += l + r
    body += '<rect x="66" y="66" width="68" height="120" rx="20" fill="url(#bot)" fill-opacity=".92" stroke="#2b6fb5" stroke-width="3"/>'
    body += '<rect x="84" y="56" width="32" height="14" fill="#8fcfff" stroke="#2b6fb5" stroke-width="2.5"/>'
    body += '<rect x="78" y="34" width="44" height="26" rx="6" fill="#2f7de1" stroke="#1b4f9c" stroke-width="2.5"/><rect x="78" y="40" width="44" height="4" fill="#7fc4f0" opacity=".6"/>'
    body += '<clipPath id="wbc"><rect x="66" y="66" width="68" height="120" rx="20"/></clipPath>'
    body += '<g clip-path="url(#wbc)"><rect x="60" y="74" width="80" height="12" fill="#e63946"/><rect x="60" y="130" width="80" height="26" fill="#fff"/></g>'
    body += part("band", '<path d="M132,80 l14,-6 M132,82 l12,8" stroke="#e63946" stroke-width="5" stroke-linecap="round"/>', 132, 80)
    body += '<path d="M100,134 q8,10 0,16 q-8,-6 0,-16z" fill="#4ea8de" stroke="#2b6fb5" stroke-width="1.5"/>'
    body += '<path d="M74,92 v60" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>'
    body += face("W", 100, 104, 15, 11, "#1d5fa8", "happy", "smile", look=(0.1, 0.0), mouth_dy=8, mouth_w=14)
    body += lh + rh
    for cx, cy in ((54, 60), (150, 100)):
        body += f'<path d="M{cx},{cy} q6,10 0,14 q-6,-4 0,-14z" fill="#7fc4f0" stroke="#4ea8de" stroke-width="1.5"/>'
    body += fx(sparkle(30, 40, 8, "#7fc4f0") + sparkle(172, 36, 8, "#7fc4f0") + sparkle(20, 120, 6, "#ffd23f") + sparkle(180, 130, 6, "#ffd23f") + sparkle(100, 14, 7, "#ffd23f"))
    return svg("waterbottle", defs, body)


def xylophone():
    colors = ["#ff3b3b", "#ff8a00", "#ffc400", "#3ecf3e", "#2196f3", "#8e44ff", "#ff4fa3"]
    defs = radial("wood", "#b5723e", "#8a5424", "#5a3010", "40%", "60%")
    body = shadow(rx=80)
    body += legs("#5a3010", "#e63946", y=184)

    def mallet(hx, hy, s):
        return (f'<line x1="{hx}" y1="{hy}" x2="{hx + s * 6}" y2="{hy - 36}" stroke="#f6e7c1" stroke-width="4" stroke-linecap="round"/>'
                f'<circle cx="{hx + s * 6}" cy="{hy - 40}" r="7" fill="#e63946" stroke="#3a2e2e" stroke-width="2"/>')
    l, lh, _ = arm(30, 130, -1, "up", "#5a3010", held=mallet)
    r, rh, _ = arm(170, 130, 1, "up", "#5a3010", held=mallet)
    body += l + r
    body += '<rect x="26" y="86" width="148" height="104" rx="14" fill="url(#wood)" stroke="#5a3010" stroke-width="3"/>'
    for i, c in enumerate(colors):
        h = 46 - i * 3
        x = 38 + i * 18
        body += part(f"xbar b{i}", f'<rect x="{x}" y="{140 - h}" width="15" height="{h}" rx="4" fill="{c}" stroke="#3a2e2e" stroke-width="2"/>'
                                  f'<circle cx="{x + 7.5}" cy="{140 - h + 6}" r="1.8" fill="#fff" opacity=".8"/>', x + 7.5, 140)
    body += face("X", 100, 158, 22, 11, "#2b2b2b", "happy", "smile", look=(0.1, 0.0), mouth_dy=8, mouth_w=18)
    body += lh + rh
    body += part("notes", note(22, 62) + note(176, 52), 100, 60)
    body += fx(note(60, 40, "#e63946") + note(100, 26, "#2196f3") + note(140, 44, "#3ecf3e") + note(14, 110, "#ff8a00") + note(186, 106, "#8e44ff"))
    return svg("xylophone", defs, body)


def yoyo():
    defs = radial("g", "#ff8a94", "#e63946", "#9b1c26")
    body = shadow()
    body += legs("#3a2e2e", "#1b4f9c", kick="L")
    l, lh, _ = arm(42, 120, -1, "out", "#3a2e2e")
    r, rh, _ = arm(158, 116, 1, "wave", "#3a2e2e")
    body += l + r
    body += part("string", '<path d="M156,96 Q196,76 190,40 Q186,22 170,26" fill="none" stroke="#f5f0e6" stroke-width="3.5"/><circle cx="168" cy="28" r="6" fill="none" stroke="#f5f0e6" stroke-width="3.5"/>', 156, 96)
    disc = ('<circle cx="100" cy="110" r="62" fill="url(#g)" stroke="#9b1c26" stroke-width="3"/>'
            '<circle cx="100" cy="110" r="50" fill="none" stroke="#ff8a94" stroke-width="3" opacity=".7"/>'
            '<path d="M100,52 A58,58 0 0 1 158,110" fill="none" stroke="#ffb3b3" stroke-width="5" stroke-linecap="round" opacity=".6"/>'
            '<path d="M100,168 A58,58 0 0 1 42,110" fill="none" stroke="#ffb3b3" stroke-width="5" stroke-linecap="round" opacity=".6"/>')
    body += part("disc", disc, 100, 110)
    body += gloss(70, 76, 16, 8, -35)
    body += part("whoosh", '<path d="M24,80 A66,66 0 0 0 24,140 M14,86 A76,76 0 0 0 14,134" fill="none" stroke="#7fc4f0" stroke-width="3" stroke-linecap="round" opacity=".8"/>', 100, 110)
    body += face("Y", 100, 106, 22, 15, "#2b2b2b", "cheeky", "smile", look=(0.3, 0.0))
    body += lh + rh
    return svg("yoyo", defs, body)


def zipper():
    defs = linear("fab", "#7fc4f0", "#1b4f9c", vertical=True)
    body = shadow(rx=52)
    body += legs("#1b4f9c", "#e63946", lx=86, rx=114, kick="R")
    l, lh, _ = arm(62, 110, -1, "up", "#1b4f9c")
    r, rh, _ = arm(138, 110, 1, "up", "#1b4f9c")
    body += l + r
    body += '<rect x="62" y="40" width="76" height="144" rx="16" fill="url(#fab)" stroke="#1b4f9c" stroke-width="3"/>'
    body += '<path d="M62,60 h76 M62,164 h76" stroke="#1b4f9c" stroke-width="2" stroke-dasharray="4 4" opacity=".6"/>'
    body += '<rect x="94" y="46" width="12" height="132" fill="#cfd8e3"/>'
    body += "".join(f'<rect x="{92 if i % 2 else 102}" y="{50 + i * 8}" width="6" height="4" fill="#8a94a3"/>' for i in range(16))
    body += gloss(74, 58, 8, 4, -70)
    body += face("Z", 100, 108, 22, 13, "#2b2b2b", "surprised", "smile", look=(0.1, -0.2), mouth_dy=10, mouth_w=20)
    body += part("slider", '<rect x="88" y="48" width="24" height="18" rx="5" fill="#e6ebf0" stroke="#5a6472" stroke-width="2.5"/>'
                           '<rect x="96" y="64" width="8" height="18" rx="3" fill="#cfd8e3" stroke="#5a6472" stroke-width="2"/><circle cx="100" cy="86" r="4" fill="none" stroke="#5a6472" stroke-width="2.5"/>', 100, 57)
    body += lh + rh
    body += part("whoosh", '<path d="M40,60 h10 M36,72 h14 M40,84 h10 M150,60 h10 M150,72 h14 M150,84 h10" stroke="#7fc4f0" stroke-width="3" stroke-linecap="round"/>', 100, 72)
    return svg("zipper", defs, body)


CHARACTERS = {
    "apple": apple, "banana": banana, "cookie": cookie, "drum": drum, "egg": egg, "flower": flower,
    "glasses": glasses, "hat": hat, "icecream": icecream, "jamjar": jamjar, "key": key, "lollipop": lollipop,
    "mug": mug, "nest": nest, "octopus": octopus, "potato": potato, "queen": queen, "robot": robot,
    "sun": sun, "toaster": toaster, "umbrella": umbrella, "volcano": volcano, "waterbottle": waterbottle,
    "xylophone": xylophone, "yoyo": yoyo, "zipper": zipper,
}


def namespace_ids(key, text):
    """Prefix every id so 26 characters can be inlined on one page without gradient clashes."""
    text = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{key}-{m.group(1)}"', text)
    return re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{key}-{m.group(1)})', text)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in CHARACTERS.items():
        (OUT / f"{name}.svg").write_text(namespace_ids(name, fn()), encoding="utf-8")
        print(f"  {name}.svg")
    print(f"Wrote {len(CHARACTERS)} characters to {OUT}")


if __name__ == "__main__":
    main()

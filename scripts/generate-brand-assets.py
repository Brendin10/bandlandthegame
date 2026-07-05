#!/usr/bin/env python3
"""Generate monster-brand instrument card PNGs (replace with final art via same filenames)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "assets" / "brand"
INST = ROOT / "assets" / "instruments"

LIME = (57, 255, 20)
LIME_DIM = (40, 180, 30)
PURPLE = (155, 48, 255)
PURPLE_DARK = (80, 20, 140)
BLACK = (0, 0, 0)
GREEN_BODY = (50, 160, 45)
GREEN_LIGHT = (100, 220, 70)
YELLOW = (232, 255, 58)
GREY = (120, 120, 130)

W, H = 400, 520
LABEL_H = 72

INSTRUMENTS = [
    ("trash-lid", "TRASH CAN LID", "lid"),
    ("tambourine", "TAMBOURINE", "tambourine"),
    ("ukulele", "UKULELE", "ukulele"),
    ("electric-guitar", "ELECTRIC GUITAR", "guitar"),
    ("piano", "PIANO", "piano"),
    ("keyboard", "KEYBOARD", "keyboard"),
    ("organ", "ORGAN", "organ"),
    ("trumpet", "TRUMPET", "trumpet"),
    ("trombone", "TROMBONE", "trombone"),
    ("saxophone", "SAXOPHONE", "sax"),
    ("violin", "VIOLIN", "violin"),
    ("flute", "FLUTE", "flute"),
    ("harmonica", "HARMONICA", "harmonica"),
    ("synth-lead", "SYNTH LEAD", "synth"),
    ("triangle", "TRIANGLE", "triangle"),
    ("xylophone", "XYLOPHONE", "xylophone"),
]


def font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def glow_rect(draw, box, color, width=4):
    x0, y0, x1, y1 = box
    for i in range(width):
        draw.rounded_rectangle((x0 - i, y0 - i, x1 + i, y1 + i), radius=12 + i, outline=color, width=1)


def monster_eyes(draw, cx, cy, scale=1):
    for ox in (-22 * scale, 22 * scale):
        draw.ellipse((cx + ox - 14 * scale, cy - 10 * scale, cx + ox + 14 * scale, cy + 12 * scale), fill=YELLOW)
        draw.ellipse((cx + ox - 4 * scale, cy - 2 * scale, cx + ox + 4 * scale, cy + 8 * scale), fill=BLACK)


def draw_shape(draw, kind, cx, cy):
    if kind == "lid":
        draw.ellipse((cx - 90, cy - 20, cx + 90, cy + 60), fill=GREY, outline=BLACK, width=4)
        draw.rectangle((cx - 30, cy - 50, cx + 30, cy - 15), fill=GREY, outline=BLACK, width=3)
        for i in range(5):
            draw.ellipse((cx - 70 + i * 18, cy + 10, cx - 55 + i * 18, cy + 25), fill=LIME_DIM)
        monster_eyes(draw, cx, cy - 5, 0.9)
    elif kind == "guitar":
        draw.ellipse((cx - 55, cy + 30, cx + 55, cy + 110), fill=GREEN_BODY, outline=BLACK, width=4)
        draw.rectangle((cx - 12, cy - 80, cx + 12, cy + 40), fill=BLACK)
        monster_eyes(draw, cx, cy + 55, 0.8)
        for i in range(4):
            draw.line((cx - 8 + i * 5, cy - 75, cx - 6 + i * 5, cy + 35), fill=GREY, width=1)
    elif kind == "ukulele":
        draw.ellipse((cx - 45, cy + 40, cx + 45, cy + 100), fill=GREEN_BODY, outline=BLACK, width=4)
        draw.rectangle((cx - 10, cy - 50, cx + 10, cy + 45), fill=BLACK)
        monster_eyes(draw, cx, cy + 60, 0.7)
    elif kind == "piano":
        draw.polygon([(cx - 100, cy + 80), (cx + 100, cy + 80), (cx + 80, cy - 40), (cx - 80, cy - 40)], fill=GREEN_BODY, outline=BLACK, width=4)
        for i in range(8):
            draw.rectangle((cx - 75 + i * 20, cy + 10, cx - 58 + i * 20, cy + 65), fill=BLACK if i % 3 == 0 else (240, 240, 240))
        monster_eyes(draw, cx, cy - 10, 0.8)
    elif kind == "keyboard":
        draw.rounded_rectangle((cx - 100, cy - 10, cx + 100, cy + 70), radius=8, fill=BLACK, outline=PURPLE, width=3)
        draw.rounded_rectangle((cx - 90, cy, cx + 90, cy + 55), radius=4, fill=GREEN_BODY)
        for i in range(10):
            draw.rectangle((cx - 82 + i * 16, cy + 8, cx - 70 + i * 16, cy + 45), fill=BLACK if i % 4 == 0 else (235, 235, 235))
        monster_eyes(draw, cx, cy - 25, 0.75)
    elif kind == "organ":
        for i, h in enumerate([120, 100, 140, 110]):
            draw.rectangle((cx - 80 + i * 42, cy + 80 - h, cx - 50 + i * 42, cy + 80), fill=GREEN_BODY, outline=BLACK, width=2)
        draw.ellipse((cx - 60, cy + 60, cx + 60, cy + 90), fill=BLACK)
        monster_eyes(draw, cx, cy + 20, 0.7)
    elif kind in ("trumpet", "trombone", "sax"):
        draw.line((cx - 80, cy + 40, cx + 90, cy - 20), fill=GREEN_BODY, width=18)
        draw.ellipse((cx + 60, cy - 35, cx + 110, cy + 15), fill=GREEN_LIGHT, outline=BLACK, width=3)
        monster_eyes(draw, cx - 20, cy + 15, 0.6)
    elif kind == "violin":
        draw.polygon([(cx, cy - 60), (cx + 45, cy + 20), (cx, cy + 90), (cx - 45, cy + 20)], fill=GREEN_BODY, outline=BLACK, width=4)
        draw.rectangle((cx - 8, cy - 90, cx + 8, cy - 55), fill=BLACK)
        monster_eyes(draw, cx, cy + 10, 0.65)
    elif kind == "flute":
        draw.rounded_rectangle((cx - 12, cy - 70, cx + 12, cy + 80), radius=6, fill=GREEN_LIGHT, outline=BLACK, width=3)
        for i in range(6):
            draw.ellipse((cx - 8, cy - 50 + i * 22, cx + 8, cy - 36 + i * 22), fill=BLACK)
    elif kind == "harmonica":
        draw.rounded_rectangle((cx - 70, cy + 10, cx + 70, cy + 45), fill=GREY, outline=BLACK, width=3)
        draw.rounded_rectangle((cx - 65, cy + 5, cx + 65, cy + 25), fill=GREEN_BODY)
        monster_eyes(draw, cx, cy - 5, 0.55)
    elif kind == "synth":
        draw.rounded_rectangle((cx - 90, cy, cx + 90, cy + 70), radius=8, fill=BLACK, outline=PURPLE, width=3)
        for i in range(6):
            draw.ellipse((cx - 70 + i * 26, cy + 15, cx - 52 + i * 26, cy + 33), fill=LIME)
        monster_eyes(draw, cx, cy - 20, 0.7)
    elif kind == "tambourine":
        draw.ellipse((cx - 70, cy, cx + 70, cy + 120), fill=PURPLE_DARK, outline=BLACK, width=4)
        draw.ellipse((cx - 55, cy + 15, cx + 55, cy + 105), fill=GREEN_BODY)
        monster_eyes(draw, cx, cy + 45, 0.8)
    elif kind == "triangle":
        draw.polygon([(cx, cy - 60), (cx + 70, cy + 70), (cx - 70, cy + 70)], fill=GREEN_LIGHT, outline=BLACK, width=4)
        monster_eyes(draw, cx, cy + 10, 0.7)
        draw.polygon([(cx - 15, cy + 35), (cx + 15, cy + 35), (cx, cy + 55)], fill=BLACK)
    elif kind == "xylophone":
        colors = [(220, 80, 80), (220, 180, 60), (80, 200, 80), (80, 200, 200), (150, 100, 220)]
        for i, c in enumerate(colors):
            draw.rounded_rectangle((cx - 80 + i * 32, cy + 20 + i * 6, cx - 52 + i * 32, cy + 80 + i * 6), radius=4, fill=c, outline=BLACK, width=2)
        monster_eyes(draw, cx - 30, cy - 10, 0.5)
        monster_eyes(draw, cx + 30, cy - 5, 0.5)


def render_card(inst_id, label, shape):
    img = Image.new("RGBA", (W, H), BLACK + (255,))
    draw = ImageDraw.Draw(img)
    glow_rect(draw, (24, 24, W - 24, H - LABEL_H - 24), PURPLE, width=6)
    draw_shape(draw, shape, W // 2, H // 2 - 30)
    f = font(28, bold=True)
    tw = draw.textlength(label, font=f)
    draw.text(((W - tw) / 2, H - LABEL_H + 18), label, fill=LIME, font=f)
    INST.mkdir(parents=True, exist_ok=True)
    img.save(INST / f"{inst_id}.png", "PNG")
    print("wrote", inst_id)


def render_logo():
    img = Image.new("RGBA", (480, 160), BLACK + (255,))
    draw = ImageDraw.Draw(img)
    glow_rect(draw, (10, 10, 470, 150), PURPLE, width=5)
    f = font(56, bold=True)
    text = "BANDLAND"
    tw = draw.textlength(text, font=f)
    draw.text(((480 - tw) / 2, 42), text, fill=LIME, font=f)
    draw.ellipse((30, 50, 70, 90), fill=GREEN_BODY, outline=LIME, width=2)
    monster_eyes(draw, 50, 62, 0.45)
    BRAND.mkdir(parents=True, exist_ok=True)
    img.save(BRAND / "bandland-logo.png", "PNG")
    print("wrote logo")


if __name__ == "__main__":
    render_logo()
    for inst_id, label, shape in INSTRUMENTS:
        render_card(inst_id, label, shape)

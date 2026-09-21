from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).parent
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


def star_points(cx: float, cy: float, outer: float, inner: float, count: int = 5):
    import math

    points = []
    for index in range(count * 2):
        angle = -math.pi / 2 + index * math.pi / count
        radius = outer if index % 2 == 0 else inner
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return points


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_icon():
    image = Image.new("RGB", (128, 128), "#F4F5F7")
    draw = ImageDraw.Draw(image)
    rounded(draw, (8, 8, 120, 120), 28, "#FFFFFF")
    draw.polygon(star_points(64, 64, 41, 18), fill="#111315")
    image.save(OUT / "icon-128.png", optimize=True)


def make_thumbnail():
    image = Image.new("RGB", (1920, 1080), "#F2F4F7")
    draw = ImageDraw.Draw(image)

    # Brand and headline
    draw.polygon(star_points(124, 110, 48, 21), fill="#111315")
    draw.text((192, 71), "DkShots", font=font(54, True), fill="#111315")
    draw.text((104, 205), "Проверяйте контрастность", font=font(76, True), fill="#111315")
    draw.text((104, 294), "любого элемента прямо в Figma", font=font(76, True), fill="#111315")
    draw.text((108, 404), "Шесть фоновых токенов · анализ градиентов · результат в процентах", font=font(30), fill="#596169")

    # Plugin window mockup
    rounded(draw, (104, 516, 1816, 998), 42, "#FFFFFF", "#DFE3E8", 3)
    draw.line((104, 612, 1816, 612), fill="#E8EBEF", width=3)
    draw.polygon(star_points(162, 564, 24, 11), fill="#111315")
    draw.text((207, 541), "DkShots", font=font(30, True), fill="#111315")
    draw.text((704, 541), "Проверка контрастности", font=font(30, True), fill="#111315")

    rounded(draw, (140, 648, 972, 962), 28, "#FFFFFF", "#E5E8EC", 2)
    draw.text((345, 688), "Уровень контраста · Surface primary", font=font(22, True), fill="#4B535B")
    draw.text((520, 735), "86,4%", font=font(64, True), fill="#15191C")
    rounded(draw, (284, 835, 828, 916), 20, "#F0F5F8")
    draw.text((418, 858), "Выбранный компонент", font=font(25, True), fill="#22272B")
    draw.text((515, 932), "Card / Primary", font=font(19), fill="#646C74")

    draw.text((1030, 662), "Выбери фон для проверки", font=font(25, True), fill="#343A40")
    cards = [
        ("Bg page", "#ECEEF0", "78,1%", "#ECEEF0", "#111315"),
        ("Surface primary", "#FFFFFF", "86,4%", "#FFFFFF", "#111315"),
        ("Surface secondary", "#F0F5F8", "81,2%", "#F0F5F8", "#111315"),
        ("Surface tertiary", "#F4F5F6", "83,7%", "#F4F5F6", "#111315"),
        ("Surface inverse", "#262626", "96,8%", "#262626", "#FFFFFF"),
        ("Bg control", "#E7EEF3", "79,5%", "#E7EEF3", "#111315"),
    ]
    for index, (name, hex_code, score, color, text_color) in enumerate(cards):
        col, row = index % 3, index // 3
        x = 1030 + col * 244
        y = 718 + row * 120
        draw.text((x, y), name, font=font(16), fill="#3F464C")
        rounded(draw, (x, y + 28, x + 220, y + 104), 15, color, "#626BFF" if index == 1 else "#E2E5E9", 3 if index == 1 else 1)
        draw.text((x + 14, y + 38), score, font=font(28, True), fill=text_color)
        draw.text((x + 14, y + 80), hex_code, font=font(14), fill="#D4D7DA" if index == 4 else "#687077")

    image.save(OUT / "thumbnail-1920x1080.png", optimize=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    make_icon()
    make_thumbnail()


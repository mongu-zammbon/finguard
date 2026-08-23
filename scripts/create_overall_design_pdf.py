from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


OUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "FinGuard-overall-design.pdf"
W, H = 960, 540

BG = "#08111f"
PANEL = "#13233b"
PANEL_2 = "#1c3150"
INK = "#f5f7fb"
MUTED = "#9baabd"
LIME = "#c5fb65"
CYAN = "#73d7ff"
ORANGE = "#ffbe55"
RED = "#ff7e75"
GREEN = "#79d99c"
LIGHT_BG = "#edf3f0"
DARK_INK = "#10223b"


FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
pdfmetrics.registerFont(TTFont("Korean", FONT_PATH))
pdfmetrics.registerFont(TTFont("KoreanBold", FONT_PATH))


def hex_color(value: str):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))


def set_fill(c: canvas.Canvas, color: str) -> None:
    c.setFillColorRGB(*hex_color(color))


def set_stroke(c: canvas.Canvas, color: str) -> None:
    c.setStrokeColorRGB(*hex_color(color))


def draw_text(c, x, y, text, size=16, color=INK, font="Korean", align="left"):
    set_fill(c, color)
    c.setFont(font, size)
    if align == "center":
        c.drawCentredString(x, y, text)
    elif align == "right":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def wrap_lines(text: str, size: float, max_width: float, font="Korean"):
    words = text.split(" ")
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
        if pdfmetrics.stringWidth(word, font, size) <= max_width:
            current = word
        else:
            chunks = wrap(word, width=max(1, int(max_width / (size * 0.95))))
            lines.extend(chunks[:-1])
            current = chunks[-1]
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, x, y, text, size=14, color=MUTED, max_width=300, leading=None, font="Korean"):
    leading = leading or size * 1.45
    cursor = y
    for paragraph in text.split("\n"):
        lines = wrap_lines(paragraph, size, max_width, font) if paragraph else [""]
        for line in lines:
            draw_text(c, x, cursor, line, size, color, font)
            cursor -= leading
        cursor -= leading * 0.2
    return cursor


def rounded_box(c, x, y, w, h, fill=PANEL, stroke=None, radius=14, width=1):
    set_fill(c, fill)
    if stroke:
        set_stroke(c, stroke)
        c.setLineWidth(width)
    else:
        c.setStrokeColorRGB(*hex_color(fill))
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if stroke else 0)


def line(c, x1, y1, x2, y2, color=PANEL_2, width=2):
    set_stroke(c, color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def pill(c, x, y, text, color=LIME, text_color=BG, w=None):
    size = 10
    w = w or pdfmetrics.stringWidth(text, "Korean", size) + 22
    rounded_box(c, x, y, w, 24, color, radius=12)
    draw_text(c, x + w / 2, y + 7, text, size, text_color, align="center")
    return w


def page_bg(c, number, label, light=False):
    set_fill(c, LIGHT_BG if light else BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    draw_text(c, 52, H - 42, label, 11, "#587a43" if light else LIME, "KoreanBold")
    draw_text(c, W - 52, H - 42, f"{number:02d}", 11, "#718078" if light else MUTED, align="right")


def title(c, kicker, heading, sub, light=False):
    color = DARK_INK if light else INK
    muted = "#62727b" if light else MUTED
    draw_text(c, 52, H - 88, kicker, 12, "#4d7e3d" if light else CYAN, "KoreanBold")
    draw_wrapped(c, 52, H - 132, heading, 29, color, 760, 36, "KoreanBold")
    draw_wrapped(c, 52, H - 196, sub, 14, muted, 760, 21)
    line(c, 52, H - 224, W - 52, H - 224, "#c5d5cc" if light else PANEL_2, 2)


def footer(c, text, light=False):
    draw_text(c, 52, 22, text, 8.5, "#718078" if light else "#6f8197")


def card_label(c, x, y, label, color=LIME):
    draw_text(c, x, y, label, 10, color, "KoreanBold")


def page1(c):
    page_bg(c, 1, "FINGUARD / OVERALL DESIGN")
    draw_text(c, 52, 432, "금융사고 전후를", 36, INK, "KoreanBold")
    draw_text(c, 52, 388, "증거와 행동으로 연결합니다.", 36, INK, "KoreanBold")
    draw_wrapped(c, 54, 348, "하나의 서비스, 하나의 공통 엔진, 두 개의 핵심 진입.", 16, MUTED, 650, 24)
    pill(c, 54, 300, "MAIN WEDGE  지급정지 소명", LIME, BG, 190)

    cards = [
        (52, "BEFORE", "행동 직전", "문자·스크린샷·링크를 분석하고\n송금·인증·클릭을 멈춤", CYAN),
        (336, "AFTER", "돈을 보낸 후", "72시간 행동계획과\n공식 신고·증거 보존", ORANGE),
        (620, "FROZEN", "계좌가 막힌 후", "거래·대화·문서를 연결해\n소명 패키지 생성", LIME),
    ]
    for x, label, head, body, accent in cards:
        rounded_box(c, x, 92, 248, 152, PANEL, radius=16)
        card_label(c, x + 20, 215, label, accent)
        draw_text(c, x + 20, 180, head, 22, INK, "KoreanBold")
        draw_wrapped(c, x + 20, 148, body, 12, MUTED, 205, 17)
    draw_text(c, 52, 55, "MVP의 주인공은 FROZEN / ProofPack. 나머지는 같은 엔진을 재사용하는 확장 경로입니다.", 12, LIME, "KoreanBold")
    footer(c, "FinGuard / service architecture proposal")


def flow_node(c, x, y, w, label, head, body, accent, fill=PANEL):
    rounded_box(c, x, y, w, 108, fill, radius=14)
    card_label(c, x + 16, y + 84, label, accent)
    draw_text(c, x + 16, y + 55, head, 17, INK, "KoreanBold")
    draw_wrapped(c, x + 16, y + 30, body, 10.5, MUTED, w - 32, 14)


def arrow(c, x1, y1, x2, y2, color=CYAN):
    line(c, x1, y1, x2, y2, color, 2)
    c.setFillColorRGB(*hex_color(color))
    c.setStrokeColorRGB(*hex_color(color))
    c.line(x2, y2, x2 - 7, y2 + 4)
    c.line(x2, y2, x2 - 7, y2 - 4)


def page3(c):
    page_bg(c, 2, "01 / TWO ENTRY PATHS")
    title(c, "THE USER FLOW", "사용자는 두 문장 중 하나로 시작합니다.", "두 경로가 같은 사건 기록 엔진으로 들어가고, 마지막에는 공식 채널에서 사람이 제출하고 판단합니다.")
    draw_text(c, 70, 282, "A", 20, LIME, "KoreanBold")
    draw_text(c, 98, 286, "계좌가 막혔어요", 18, INK, "KoreanBold")
    draw_text(c, 70, 245, "정상 거래를 증명해야 하는 사람", 11, MUTED)
    flow_node(c, 70, 108, 170, "01  UPLOAD", "통지서 + 자료", "지급정지 문자\n거래 CSV·대화·계약", CYAN)
    arrow(c, 240, 162, 270, 162)
    flow_node(c, 280, 108, 170, "02  BUILD", "타임라인", "입금 원인\n상대방·거래·증거", ORANGE)
    arrow(c, 450, 162, 480, 162)
    flow_node(c, 490, 108, 170, "03  PROOF", "소명팩", "누락 자료\n근거 순서·초안", LIME)
    arrow(c, 660, 162, 690, 162)
    flow_node(c, 700, 108, 170, "04  SUBMIT", "공식 채널", "사용자 검토 후\n은행·기관에 직접 제출", GREEN)

    draw_text(c, 70, 74, "B", 20, ORANGE, "KoreanBold")
    draw_text(c, 98, 78, "돈을 보냈어요", 18, INK, "KoreanBold")
    draw_text(c, 275, 78, "이체 직후 10분 - 72시간의 회복 경로", 11, MUTED)
    footer(c, "두 진입의 공통 코어: 입력 정규화 > 사건 타임라인 > 증거 연결 > 공식 다음 행동")


def page4(c):
    page_bg(c, 3, "02 / SHARED AI ENGINE")
    title(c, "THE ENGINE", "AI는 결론을 내리는 판사가 아니라, 근거를 정리하는 사건 엔진입니다.", "자료의 출처와 시간을 보존하고, 확실하지 않은 부분은 ABSTAIN으로 남깁니다.")
    nodes = [
        (52, "01  INBOX", "자료 수집", "PDF·CSV·이미지·텍스트", CYAN),
        (228, "02  NORMALIZE", "정규화·보호", "OCR·날짜·금액·PII 마스킹", ORANGE),
        (404, "03  TIMELINE", "사건 그래프", "사람·거래·문서·시간 연결", LIME),
        (580, "04  GROUNDED", "정책 근거", "공식 규정·기관 경로·체크리스트", GREEN),
        (756, "05  PACK", "다음 행동", "소명팩·72h 플랜·보류", RED),
    ]
    for i, (x, label, head, body, accent) in enumerate(nodes):
        rounded_box(c, x, 180, 152, 122, PANEL, stroke=accent, radius=14, width=1.5)
        card_label(c, x + 14, 276, label, accent)
        draw_text(c, x + 14, 242, head, 16, INK, "KoreanBold")
        draw_wrapped(c, x + 14, 216, body, 10.5, MUTED, 124, 14)
        if i < len(nodes) - 1:
            arrow(c, x + 154, 240, x + 174, 240, "#6e91b4")
    rounded_box(c, 52, 70, 856, 76, "#102038", radius=14)
    draw_text(c, 76, 116, "SAFETY POLICY", 10, RED, "KoreanBold")
    draw_text(c, 210, 116, "근거 없는 주장 금지", 15, INK, "KoreanBold")
    draw_text(c, 412, 116, "문서 위조 생성 금지", 15, INK, "KoreanBold")
    draw_text(c, 614, 116, "모호하면 사람 확인", 15, INK, "KoreanBold")
    draw_text(c, 76, 88, "LLM 출력에는 source_id, event_id, confidence, abstain_reason을 남긴다.", 11, MUTED)
    footer(c, "기술 차별점: 생성 텍스트가 아니라 근거-이벤트-행동의 추적 가능성")


def scope_row(c, y, label, desc, accent, x=52, w=856):
    rounded_box(c, x, y, w, 38, "#f7faf8" if accent == "#628c68" else PANEL, radius=8)
    draw_text(c, x + 16, y + 13, label, 11, accent, "KoreanBold")
    draw_text(c, x + 190, y + 13, desc, 11.5, DARK_INK if accent == "#628c68" else INK)


def page5(c):
    page_bg(c, 4, "03 / MVP BOUNDARY", light=True)
    title(c, "SCOPE", "MVP는 ‘소명팩이 완성되는 순간’까지만 책임집니다.", "기관과의 실제 계약·API가 없어도 합성자료로 재현하고, 최종 제출과 법적 판단은 사용자와 기관의 몫으로 남깁니다.", light=True)
    rounded_box(c, 52, 80, 410, 226, "#ffffff", stroke="#c6d7cc", radius=16, width=1)
    card_label(c, 76, 272, "SHIP NOW", "#628c68")
    rows = [
        ("입력", "지급정지 통지서·거래 CSV·대화·영수증"),
        ("AI", "OCR·타임라인·증거 연결·누락자료"),
        ("결과", "소명 요약·자료 목록·PDF 초안"),
        ("안전", "근거 표시·ABSTAIN·원문 미저장"),
        ("데모", "합성 사건 3종·90초 재현"),
    ]
    for i, (a, b) in enumerate(rows):
        y = 246 - i * 36
        draw_text(c, 76, y, a, 11, "#628c68", "KoreanBold")
        draw_text(c, 142, y, b, 11.5, DARK_INK)
        line(c, 76, y - 10, 438, y - 10, "#e0e9e3", 1)
    rounded_box(c, 498, 80, 410, 226, "#ffffff", stroke="#e0c7c1", radius=16, width=1)
    card_label(c, 522, 272, "NOT IN MVP", "#b2655c")
    for i, txt in enumerate([
        "MyData·은행 코어 API 직접 연동",
        "은행·기관 자동 제출",
        "사기 여부·법적 책임 확정",
        "가짜 증빙·공문서 생성",
        "실제 개인정보로 테스트",
    ]):
        y = 246 - i * 36
        draw_text(c, 522, y, "-", 13, "#b2655c", "KoreanBold")
        draw_text(c, 542, y, txt, 11.5, DARK_INK)
        line(c, 522, y - 10, 884, y - 10, "#f0e2df", 1)
    footer(c, "경계가 선명할수록 서비스가 실제로 작동한다는 것을 증명하기 쉽습니다.", light=True)


def page6(c):
    page_bg(c, 5, "04 / DEMO STORY")
    title(c, "THE 90-SECOND DEMO", "한 사건을 업로드하고, 한 장의 소명팩으로 끝냅니다.", "사용자·AI·금융기관이 각각 무엇을 얻는지 한 화면에서 드러납니다.")
    steps = [
        ("01", "상황 선택", "계좌가 막혔어요", "정지 통지서가 도착"),
        ("02", "자료 넣기", "4개 파일 업로드", "CSV·대화·영수증"),
        ("03", "타임라인", "입금 원인 연결", "사람·금액·시간"),
        ("04", "부족한 증거", "2개 자료 보완", "원본·계약 확인"),
        ("05", "소명팩", "검토 후 PDF", "공식 채널 제출"),
    ]
    for i, (num, head, main, body) in enumerate(steps):
        x = 52 + i * 177
        rounded_box(c, x, 150, 150, 150, PANEL, radius=14)
        card_label(c, x + 16, 272, num, LIME if i == 4 else CYAN)
        draw_text(c, x + 16, 239, head, 12, MUTED, "KoreanBold")
        draw_wrapped(c, x + 16, 206, main, 15, INK, 118, 20, "KoreanBold")
        draw_wrapped(c, x + 16, 168, body, 10.5, MUTED, 118, 14)
        if i < len(steps) - 1:
            arrow(c, x + 151, 225, x + 171, 225, "#6e91b4")
    rounded_box(c, 52, 72, 856, 54, "#203957", radius=12)
    draw_text(c, 76, 94, "사용자에게 남는 한 문장", 10, LIME, "KoreanBold")
    draw_text(c, 250, 94, "내 거래가 왜 문제인지, 무엇을 더 내야 하는지, 어디에 제출할지 알겠다.", 13, INK, "KoreanBold")
    footer(c, "모든 사례는 합성 데이터로 재현하며, 실제 계좌·로그인·제출은 수행하지 않습니다.")


def page7(c):
    page_bg(c, 6, "05 / WINNING PROOF")
    title(c, "EVALUATION", "정확도 하나가 아니라 ‘소명 완결성’을 증명합니다.", "AI가 그럴듯한 글을 쓰는지보다, 근거를 빠뜨리지 않고 사람이 검토할 수 있는 결과를 만드는지가 핵심입니다.")
    metrics = [
        ("01", "타임라인 완전성", "사건의 날짜·금액·상대방·증거가 빠지지 않는가?", CYAN),
        ("02", "증거 연결 정확도", "각 거래에 실제 근거 문서가 연결되는가?", ORANGE),
        ("03", "누락 자료 회수율", "심사에 필요한 자료를 얼마나 먼저 찾아내는가?", LIME),
        ("04", "근거 없는 주장", "출처 없는 법률·사기 단정을 0으로 만드는가?", RED),
    ]
    for i, (num, head, body, accent) in enumerate(metrics):
        y = 282 - i * 42
        draw_text(c, 74, y, num, 13, accent, "KoreanBold")
        draw_text(c, 128, y, head, 15, INK, "KoreanBold")
        draw_text(c, 320, y, body, 12, MUTED)
        line(c, 74, y - 16, 886, y - 16, "#233b59", 1)
    rounded_box(c, 52, 54, 856, 74, PANEL, radius=14)
    draw_text(c, 76, 100, "대체재", 10, MUTED, "KoreanBold")
    draw_text(c, 154, 100, "은행 FDS", 13, INK)
    draw_text(c, 280, 100, "검색·커뮤니티", 13, INK)
    draw_text(c, 468, 100, "수기 소명", 13, INK)
    draw_text(c, 650, 100, "FinGuard", 13, LIME, "KoreanBold")
    draw_text(c, 76, 75, "거래 신호", 10, MUTED)
    draw_text(c, 154, 75, "사후 탐지", 11, MUTED)
    draw_text(c, 280, 75, "사례 검색", 11, MUTED)
    draw_text(c, 468, 75, "자료 흩어짐", 11, MUTED)
    draw_text(c, 650, 75, "타임라인 + 증거 + 다음 행동", 11, LIME, "KoreanBold")
    footer(c, "심사 메시지: 금융기관의 판단을 대체하지 않고, 판단 가능한 근거를 더 빠르게 만든다.")


def page8(c):
    page_bg(c, 7, "06 / FINAL SERVICE", light=True)
    title(c, "THE SERVICE", "FinGuard의 최종 설계", "지급정지 소명을 중심에 두고, 72시간 회복과 기존 FinGuard는 같은 사건 엔진으로 연결합니다.", light=True)
    rounded_box(c, 52, 184, 856, 110, "#132a44", radius=16)
    draw_text(c, 76, 264, "FinGuard / 금융사고 대응 코파일럿", 23, INK, "KoreanBold")
    draw_text(c, 76, 232, "계좌가 막히거나 돈을 보낸 순간, 흩어진 자료를 증거와 공식 다음 행동으로 바꿉니다.", 13, "#c6d4e0")
    pill(c, 76, 196, "CORE  지급정지 소명", LIME, BG, 156)
    pill(c, 250, 196, "EXT  72시간 회복", ORANGE, BG, 140)
    pill(c, 408, 196, "FUTURE  불법추심", CYAN, BG, 138)

    rounded_box(c, 52, 70, 260, 104, "#ffffff", stroke="#c6d7cc", radius=14, width=1)
    card_label(c, 72, 145, "KEEP", "#628c68")
    draw_text(c, 72, 117, "현재 FinGuard", 16, DARK_INK, "KoreanBold")
    draw_text(c, 72, 92, "사전 위험 행동 차단", 12, "#62727b")
    rounded_box(c, 350, 70, 260, 104, "#ffffff", stroke="#c6d7cc", radius=14, width=1)
    card_label(c, 370, 145, "BUILD", "#628c68")
    draw_text(c, 370, 117, "ProofPack MVP", 16, DARK_INK, "KoreanBold")
    draw_text(c, 370, 92, "타임라인·증거·PDF", 12, "#62727b")
    rounded_box(c, 648, 70, 260, 104, "#ffffff", stroke="#c6d7cc", radius=14, width=1)
    card_label(c, 668, 145, "LATER", "#628c68")
    draw_text(c, 668, 117, "Recover72 + LoanShield", 15, DARK_INK, "KoreanBold")
    draw_text(c, 668, 92, "같은 사건 엔진의 확장", 12, "#62727b")

    draw_text(c, 52, 52, "제품 계약: 첫 사용자 1명 / 행동 순간 1개 / 증거 입력 3종 / 결과 PDF 1개", 11, "#4d7e3d", "KoreanBold")
    draw_text(c, 908, 52, "SOURCES", 8.5, "#718078", align="right")
    draw_text(c, 52, 23, "근거: daker.ai 2026 Finance AI Challenge · 금융보안원 2025 수상 발표 · 금융위 불법사금융 원스톱 지원", 7.5, "#718078")


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("FinGuard - 전체 설계 방향 제안")
    for page in (page1, page3, page4, page5, page6, page7, page8):
        page(c)
        c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()

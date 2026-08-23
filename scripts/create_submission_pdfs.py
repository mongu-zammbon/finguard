from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
PLAN_OUT = OUT_DIR / "FinGuard-공모전-기획서.pdf"
FEATURE_OUT = OUT_DIR / "FinGuard-MVP-기능명세서.pdf"

W, H = 595, 842
M = 44

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
LIGHT_BG = "#f1f5f2"
DARK_INK = "#10223b"
LIGHT_MUTED = "#61717a"
LIGHT_LINE = "#c9d8d0"

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
pdfmetrics.registerFont(TTFont("Korean", FONT_PATH))
pdfmetrics.registerFont(TTFont("KoreanBold", FONT_PATH))


def rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))


def fill(c: canvas.Canvas, color: str):
    c.setFillColorRGB(*rgb(color))


def stroke(c: canvas.Canvas, color: str):
    c.setStrokeColorRGB(*rgb(color))


def text(c, x, y, value, size=10, color=INK, font="Korean", align="left"):
    fill(c, color)
    c.setFont(font, size)
    if align == "center":
        c.drawCentredString(x, y, value)
    elif align == "right":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrap_lines(value: str, size: float, width: float, font="Korean"):
    result = []
    for paragraph in value.split("\n"):
        if not paragraph:
            result.append("")
            continue
        current = ""
        for word in paragraph.split(" "):
            candidate = word if not current else f"{current} {word}"
            if pdfmetrics.stringWidth(candidate, font, size) <= width:
                current = candidate
                continue
            if current:
                result.append(current)
            if pdfmetrics.stringWidth(word, font, size) <= width:
                current = word
            else:
                chunks = wrap(word, width=max(1, int(width / max(size * 0.95, 1))))
                result.extend(chunks[:-1])
                current = chunks[-1] if chunks else ""
        if current:
            result.append(current)
    return result


def wrapped(c, x, y, value, size=10, color=MUTED, width=450, leading=None, font="Korean"):
    leading = leading or size * 1.45
    cursor = y
    for line_value in wrap_lines(value, size, width, font):
        text(c, x, cursor, line_value, size, color, font)
        cursor -= leading
    return cursor


def rounded(c, x, y, width, height, fill_color=PANEL, stroke_color=None, radius=10, line_width=1):
    fill(c, fill_color)
    if stroke_color:
        stroke(c, stroke_color)
        c.setLineWidth(line_width)
        c.roundRect(x, y, width, height, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, width, height, radius, fill=1, stroke=0)


def rule(c, x1, y1, x2, y2, color=PANEL_2, width=1):
    stroke(c, color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def header(c, page_no, label, light=False):
    fill(c, LIGHT_BG if light else BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    text(c, M, H - 34, "DAKER 2026 FINANCE AI CHALLENGE", 8.5, "#4f7e47" if light else LIME, "KoreanBold")
    text(c, W - M, H - 34, f"{page_no:02d}", 8.5, "#718078" if light else MUTED, align="right")


def footer(c, light=False, note="제출용 문서 | 팀명·구성원은 DAKER 등록정보와 최종 대조"):
    rule(c, M, 34, W - M, 34, "#d5e1da" if light else PANEL_2, 0.7)
    text(c, M, 20, note, 7.2, "#718078" if light else "#6f8197")


def section_heading(c, number, title_value, subtitle, y, light=False):
    accent = "#4d7e3d" if light else LIME
    main = DARK_INK if light else INK
    muted = LIGHT_MUTED if light else MUTED
    text(c, M, y, f"{number}. {title_value}", 14, accent, "KoreanBold")
    cursor = wrapped(c, M, y - 28, subtitle, 9.2, muted, W - 2 * M, 13)
    rule(c, M, cursor - 6, W - M, cursor - 6, LIGHT_LINE if light else PANEL_2, 1)
    return cursor - 24, main, muted


def pill(c, x, y, value, color=LIME, text_color=BG, width=None):
    size = 8.2
    width = width or pdfmetrics.stringWidth(value, "Korean", size) + 18
    rounded(c, x, y, width, 20, color, radius=10)
    text(c, x + width / 2, y + 6, value, size, text_color, align="center")
    return width


def metadata(c, y, light=True):
    rounded(c, M, y - 54, W - 2 * M, 54, "#ffffff" if light else PANEL, "#cbdad2" if light else None, 9, 0.8)
    text(c, M + 14, y - 20, "팀명", 8.5, "#628c68" if light else LIME, "KoreanBold")
    text(c, M + 62, y - 20, "FinGuard", 9.2, DARK_INK if light else INK, "KoreanBold")
    text(c, M + 190, y - 20, "구성원", 8.5, "#628c68" if light else LIME, "KoreanBold")
    text(c, M + 244, y - 20, "김동석, 박성규", 9.2, DARK_INK if light else INK)
    text(c, M + 14, y - 40, "제출 범위", 8.5, "#628c68" if light else LIME, "KoreanBold")
    text(c, M + 74, y - 40, "기획서 PDF / MVP 기능 명세서 PDF", 8.8, DARK_INK if light else INK)
    text(c, W - M - 14, y - 40, "제출 전 DAKER 등록값 최종 확인", 7.4, "#aa635b" if light else RED, align="right")


def mini_card(c, x, y, width, height, label, title_value, body, accent, light=False):
    rounded(c, x, y, width, height, "#ffffff" if light else PANEL, "#c9d8d0" if light else None, 10, 0.8)
    text(c, x + 12, y + height - 20, label, 8.2, accent, "KoreanBold")
    text(c, x + 12, y + height - 44, title_value, 12, DARK_INK if light else INK, "KoreanBold")
    wrapped(c, x + 12, y + height - 65, body, 8.2, LIGHT_MUTED if light else MUTED, width - 24, 11)


def draw_table(c, x, y_top, widths, rows, header_row=None, font_size=8, leading=10.5, light=True, min_row=28):
    cursor = y_top
    all_rows = ([header_row] if header_row else []) + rows
    for row_index, row in enumerate(all_rows):
        is_header = header_row is not None and row_index == 0
        line_counts = []
        for value, width in zip(row, widths):
            line_counts.append(max(1, len(wrap_lines(str(value), font_size, width - 12, "KoreanBold" if is_header else "Korean"))))
        row_height = max(min_row, max(line_counts) * leading + 12)
        fill_color = "#17304d" if is_header and not light else ("#dfece5" if is_header else "#ffffff" if light else PANEL)
        stroke_color = "#b9cec2" if light else PANEL_2
        c.setFillColorRGB(*rgb(fill_color))
        c.setStrokeColorRGB(*rgb(stroke_color))
        c.setLineWidth(0.6)
        c.rect(x, cursor - row_height, sum(widths), row_height, fill=1, stroke=1)
        cell_x = x
        for value, width, count in zip(row, widths, line_counts):
            rule(c, cell_x, cursor, cell_x, cursor - row_height, stroke_color, 0.6)
            cell_color = "#c5fb65" if is_header and not light else (DARK_INK if light else INK)
            font = "KoreanBold" if is_header else "Korean"
            wrapped(c, cell_x + 6, cursor - 11, str(value), font_size, cell_color, width - 12, leading, font)
            cell_x += width
        rule(c, cell_x, cursor, cell_x, cursor - row_height, stroke_color, 0.6)
        cursor -= row_height
    return cursor


def source_line(c, y, label, url, light=True):
    color = "#4e7b45" if light else CYAN
    text(c, M, y, f"{label}: {url}", 7.1, color)
    c.linkURL(url, (M, y - 2, W - M, y + 8), relative=0)


def build_plan():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(PLAN_OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("FinGuard - 공모전 기획서")
    c.setAuthor("FinGuard")

    # Page 1
    header(c, 1, "PLAN")
    text(c, M, 734, "공모전 기획서", 11, CYAN, "KoreanBold")
    text(c, M, 686, "FinGuard", 35, INK, "KoreanBold")
    wrapped(c, M, 648, "금융사고 전후의 흩어진 자료를 증거와 공식 다음 행동으로 바꾸는 금융사고 대응 코파일럿", 15, MUTED, 470, 21)
    pill(c, M, 578, "CORE  지급정지 소명", LIME, BG, 142)
    pill(c, M + 154, 578, "EXT  72시간 회복", ORANGE, BG, 132)
    pill(c, M + 298, 578, "SHIELD  불법사금융·불법추심", CYAN, BG, 170)
    metadata(c, 544, light=False)

    text(c, M, 454, "하나의 사건 엔진, 네 개의 행동 순간", 14, INK, "KoreanBold")
    text(c, M, 431, "사용자는 금융사고 전후 어느 시점에서든 들어오고, FinGuard는 자료를 정리해 사람이 실행할 다음 행동을 제시합니다.", 8.8, MUTED)
    cards = [
        ("BEFORE", "행동 전", "문자·스크린샷·링크 문맥에서 송금·인증·클릭을 멈춤", CYAN),
        ("AFTER", "송금 직후", "72시간 동안 신고·지급정지·증거 보존 순서를 정리", ORANGE),
        ("FROZEN", "계좌가 막힌 후", "거래·대화·문서를 연결해 지급정지 소명팩을 구성", LIME),
        ("SHIELD", "불법추심 상황", "대출·추심 자료를 보존하고 공식 상담·신고 경로를 안내", GREEN),
    ]
    x = M
    for label, title_value, body, accent in cards:
        mini_card(c, x, 294, 116, 108, label, title_value, body, accent)
        x += 126
    rounded(c, M, 186, W - 2 * M, 70, "#102038", radius=12)
    text(c, M + 16, 226, "핵심 AI 출력", 9, LIME, "KoreanBold")
    text(c, M + 16, 202, "사건 타임라인  +  증거 연결  +  누락자료  +  공식 다음 행동", 13, INK, "KoreanBold")
    wrapped(c, M, 154, "첫 MVP는 행동 전 안전 게이트를 실제로 동작시키고, 동일한 사건 기록 엔진을 피해 회복·지급정지 소명·불법추심 대응으로 확장하는 구조를 증명합니다.", 9.2, MUTED, W - 2 * M, 13)
    footer(c)
    c.showPage()

    # Page 2
    header(c, 2, "PLAN")
    y, main, muted = section_heading(c, 2, "아이디어 기획 핵심내용(요약)", "금융사고가 발생하면 사용자는 대화, 거래내역, 영수증, 계약서, 기관 안내를 여러 채널에서 따로 찾아야 합니다. FinGuard는 이 자료를 한 사건으로 묶어 증거와 공식 다음 행동을 만듭니다.", 758)
    bullets = [
        "첫 사용자: 의심 금융 메시지를 받은 소비자와 가족·보호자. 확장 사용자: 송금 피해자, 지급정지 이용자, 불법사금융·불법추심 피해자.",
        "입력: 공유받은 문자, 스크린샷의 OCR 텍스트, 결제 링크가 포함된 메시지, 거래·대화·영수증·계약 자료.",
        "출력: 위험/보류 라벨, 근거 신호, 사건 타임라인, 부족한 자료, 지금 하지 말아야 할 행동, 공식 확인 경로.",
        "차별점: 금융기관의 탐지 결과나 검색 결과를 반복하지 않고, 금융기관이 검토할 수 있는 근거 묶음과 사용자 행동을 연결합니다.",
    ]
    text(c, M, y, "핵심 제안", 10.5, "#4d7e3d" if False else LIME, "KoreanBold")
    y -= 20
    for item in bullets:
        text(c, M + 4, y, "•", 11, CYAN if False else LIME, "KoreanBold")
        y = wrapped(c, M + 18, y, item, 9.2, DARK_INK if False else MUTED, W - 2 * M - 22, 13)
        y -= 4

    y -= 6
    y, main, muted = section_heading(c, 3, "문제 정의 및 제안 배경", "금융 문제의 공통 병목은 정보 부족보다 정보의 분산입니다. 피해 의심 사용자는 무엇을 먼저 멈추고, 어떤 자료를 보존하며, 어느 공식 채널에 설명해야 하는지 판단하기 어렵습니다.", y)
    problem_cards = [
        ("01", "행동 시간은 짧다", "송금·인증·링크 클릭은 몇 분 안에 일어나지만, 기존 도움말은 사용자가 직접 검색하고 비교해야 합니다.", CYAN),
        ("02", "증거가 흩어진다", "거래내역은 은행 앱, 대화는 메신저, 영수증은 갤러리에 있어 사건의 앞뒤 관계가 끊깁니다.", ORANGE),
        ("03", "공식 대응은 양식 중심이다", "지급정지 소명이나 불법추심 상담은 사실관계와 자료를 순서대로 설명해야 하지만, 준비 과정이 어렵습니다.", LIME),
    ]
    x = M
    for label, title_value, body, accent in problem_cards:
        mini_card(c, x, y - 118, 160, 108, label, title_value, body, accent, light=True)
        x += 170
    y -= 145
    text(c, M, y, "서비스 채널과 타깃", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    y = draw_table(
        c,
        M,
        y,
        [92, 126, 289],
        [
            ("1차 사용자", "모바일·웹", "의심 메시지를 받은 소비자와 가족·보호자: 행동 전 빠른 중단과 독립 확인"),
            ("2차 사용자", "웹 업로드", "송금 피해·지급정지 사용자: 사건 자료를 모아 신고·소명 준비"),
            ("확장 사용자", "웹 업로드", "불법사금융·불법추심 피해자: 자료 보존과 공식 지원기관 연결"),
        ],
        header_row=("사용자", "접점", "선정 이유"),
        font_size=8,
        leading=10.5,
        light=True,
        min_row=34,
    )
    footer(c, light=True)
    c.showPage()

    # Page 3
    header(c, 3, "PLAN")
    y, main, muted = section_heading(c, 4, "서비스 컨셉 및 차별성", "FinGuard는 사기 여부나 법적 책임을 확정하는 판사가 아닙니다. 근거가 있는 사건 기록을 만들고, 불확실한 부분은 보류하며, 사용자가 공식 채널에서 판단받을 수 있도록 준비시키는 코파일럿입니다.", 758)
    text(c, M, y, "하나의 사건 엔진이 네 개의 진입 시점을 연결합니다.", 10.5, LIME, "KoreanBold")
    y -= 26
    moments = [
        ("행동 전", "안전 게이트", "문자·스크린샷·링크 문맥", "DANGER / CAUTION / ABSTAIN", CYAN),
        ("송금 직후", "Recover72", "거래·대화·영수증", "보존자료 + 공식 다음 행동", ORANGE),
        ("지급정지 후", "ProofPack", "통지서·거래·계약·대화", "타임라인 + 소명 자료 목록", LIME),
        ("불법추심", "LoanShield", "대출계약·추심 메시지·통화기록", "보존 + 지원기관 경로", GREEN),
    ]
    x = M
    for label, title_value, input_value, output_value, accent in moments:
        rounded(c, x, y - 90, 116, 82, PANEL, radius=9)
        text(c, x + 10, y - 25, label, 8, accent, "KoreanBold")
        text(c, x + 10, y - 47, title_value, 10.5, INK, "KoreanBold")
        wrapped(c, x + 10, y - 64, input_value, 7.3, MUTED, 96, 9.5)
        wrapped(c, x + 10, y - 81, output_value, 7.3, MUTED, 96, 9.5)
        x += 126
    y -= 124
    text(c, M, y, "기존 대안과의 차이", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    draw_table(
        c,
        M,
        y,
        [105, 166, 236],
        [
            ("은행 FDS", "거래·계좌·디바이스 신호", "대화 원문과 사용자의 다음 행동을 사건 기록으로 연결"),
            ("검색·커뮤니티", "사례와 설명을 찾음", "확인 편향을 줄이는 근거·보류·공식 채널을 한 결과로 제공"),
            ("수기 소명", "사용자가 자료를 직접 편집", "날짜·금액·상대방·증거를 자동 연결하고 누락을 표시"),
            ("법률·상담 안내", "일반적인 정보 제공", "개별 결론 대신 출처와 사실관계를 정리해 상담 준비를 지원"),
        ],
        header_row=("대안", "현재 강점", "FinGuard의 빈틈 공략"),
        font_size=8,
        leading=10.5,
        light=True,
        min_row=35,
    )
    y = 224
    rounded(c, M, y - 84, W - 2 * M, 78, "#e8f2ec", "#c6d7cc", 10, 0.8)
    text(c, M + 14, y - 28, "안전 경계", 9, "#b2655c", "KoreanBold")
    wrapped(c, M + 104, y - 28, "근거 없는 사기 단정 금지  |  법률 결론 금지  |  문서 위조 금지  |  공식 제출은 사용자 검토 후 직접 수행", 8.8, DARK_INK, W - 2 * M - 118, 12)
    wrapped(c, M + 14, y - 55, "AI는 사건을 정리하지만 금융기관·수사기관·상담기관의 판단을 대체하지 않습니다.", 8.2, LIGHT_MUTED, W - 2 * M - 28, 11)
    footer(c, light=True)
    c.showPage()

    # Page 4
    header(c, 4, "PLAN")
    y, main, muted = section_heading(c, 5, "활용 데이터 및 생성형 AI 모델 적용 방안", "현재 MVP는 외부 의존성을 줄인 결정론적 규칙 엔진으로 안전한 출력 계약을 먼저 검증합니다. 확장 버전은 구조화 추출과 공식 근거 검색을 결합하되, 생성형 모델이 금융·법률 결론을 직접 내리지 않도록 설계합니다.", 758)
    text(c, M, y, "데이터 구성", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    y = draw_table(
        c,
        M,
        y,
        [108, 160, 239],
        [
            ("합성 데모 데이터", "기관 사칭·원격제어·투자·중고거래·프롬프트 공격", "화면 시연과 회귀 테스트. 실제 개인정보를 사용하지 않음"),
            ("공개·익명 사례", "공개된 금융사기 전술과 정상 대화 패턴", "라벨 정의와 시간축 holdout 평가셋으로 활용"),
            ("공식 안내 자료", "금융보안·금융소비자·지원기관의 공개 안내", "다음 행동과 기관 경로의 근거로 사용"),
            ("사용자 입력", "문자·OCR 텍스트·거래·대화·영수증·계약 자료", "처리 중 메모리 사용, 민감정보 마스킹과 원문 미보존 원칙"),
        ],
        header_row=("데이터", "예시", "사용 원칙"),
        font_size=7.8,
        leading=10,
        light=True,
        min_row=36,
    )
    y -= 26
    text(c, M, y, "AI 처리 파이프라인", 10.5, "#4d7e3d", "KoreanBold")
    y -= 26
    stages = [
        ("01", "정규화", "OCR·날짜·금액·상대방 추출", CYAN),
        ("02", "사건 그래프", "사람·거래·문서·시간 연결", ORANGE),
        ("03", "근거 검색", "공식 출처·기관 경로 확인", LIME),
        ("04", "안전 정책", "confidence·abstain·출처 부착", GREEN),
        ("05", "행동 팩", "소명·회복·보존 다음 행동", RED),
    ]
    x = M
    for number, title_value, body, accent in stages:
        rounded(c, x, y - 76, 94, 68, PANEL, radius=9)
        text(c, x + 9, y - 28, number, 8, accent, "KoreanBold")
        text(c, x + 9, y - 47, title_value, 9.3, INK, "KoreanBold")
        wrapped(c, x + 9, y - 61, body, 6.8, MUTED, 76, 8.5)
        x += 101
    y -= 108
    rounded(c, M, y - 112, W - 2 * M, 106, "#102038", radius=10)
    text(c, M + 14, y - 30, "생성형 AI 역할", 9, LIME, "KoreanBold")
    wrapped(c, M + 128, y - 30, "비정형 자료를 사건 이벤트로 구조화하고, 자료 간 관계를 설명하며, 누락자료 질문과 문서 초안을 작성합니다.", 8.5, INK, W - 2 * M - 142, 12)
    text(c, M + 14, y - 58, "생성형 AI 금지 역할", 9, RED, "KoreanBold")
    wrapped(c, M + 128, y - 58, "사기 여부 확정, 법률 책임 확정, 금융기관 심사 결과 예측, 가짜 증빙·공문서 생성, 자동 제출은 수행하지 않습니다.", 8.5, INK, W - 2 * M - 142, 12)
    text(c, M + 14, y - 88, "출력 추적 필드", 9, CYAN, "KoreanBold")
    wrapped(c, M + 128, y - 88, "source_id, event_id, confidence, abstain_reason을 남겨 사람이 원문과 판단 근거를 역추적합니다.", 8.5, INK, W - 2 * M - 142, 12)
    footer(c)
    c.showPage()

    # Page 5
    header(c, 5, "PLAN")
    y, main, muted = section_heading(c, 6, "기대 효과 및 확장 가능성", "FinGuard의 성과는 그럴듯한 답변 생성이 아니라, 사용자가 더 빨리 멈추고, 자료를 덜 빠뜨리고, 공식 채널에서 검토 가능한 형태로 설명할 수 있게 되는지로 측정합니다.", 758)
    text(c, M, y, "검증할 효과", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    draw_table(
        c,
        M,
        y,
        [126, 178, 203],
        [
            ("행동 전환", "위험 입력 후 송금·인증·클릭을 멈추는가", "DANGER·CAUTION·공식 확인 행동의 이해도"),
            ("소명 완결성", "날짜·금액·상대방·증거가 빠지지 않는가", "타임라인 완전성·증거 연결 정확도"),
            ("안전성", "출처 없는 단정과 문서 위조를 막는가", "unsupported claim 0·abstain 적절성"),
            ("대응 속도", "사건을 처음 설명할 때 준비 시간이 줄어드는가", "첫 행동까지 걸린 시간·누락자료 회수율"),
        ],
        header_row=("효과", "검증 질문", "관찰 지표"),
        font_size=8,
        leading=10.5,
        light=True,
        min_row=34,
    )
    rounded(c, M, 270, W - 2 * M, 92, "#102038", radius=10)
    text(c, M + 14, 332, "검증 원칙", 10, LIME, "KoreanBold")
    wrapped(c, M + 14, 308, "수치형 성능을 임의로 주장하지 않고, 공개·익명 사례와 합성 holdout으로 행동 전환·소명 완결성·안전성·대응 속도를 재현 가능하게 측정합니다.", 8.8, INK, W - 2 * M - 28, 12)
    text(c, M + 14, 282, "핵심 메시지: 금융기관의 판단을 대체하지 않고, 판단 가능한 근거를 더 빠르게 만든다.", 8.8, CYAN, "KoreanBold")
    footer(c, light=True)
    c.showPage()

    # Page 6
    header(c, 6, "PLAN")
    y, main, muted = section_heading(c, 6, "기대 효과 및 확장 가능성 - 확장 로드맵", "MVP에서 검증한 사건 기록 엔진을 피해 발생 직후, 지급정지 소명, 불법사금융·불법추심 대응으로 단계적으로 확장합니다.", 758)
    text(c, M, y, "확장 로드맵", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    draw_table(
        c,
        M,
        y,
        [104, 181, 222],
        [
            ("MVP", "행동 전 안전 게이트", "합성 사례로 위험 신호·근거·중단 행동을 검증"),
            ("Phase 2", "피해 발생 후 72시간 회복", "신고·지급정지·증거보존을 사건 타임라인으로 연결"),
            ("Phase 3", "지급정지 소명 코파일럿", "거래·대화·계약·통지서를 소명팩으로 정리"),
            ("Phase 4", "불법사금융·불법추심 대응", "추심 자료 보존, 사실관계 정리, 공식 지원 경로 안내"),
        ],
        header_row=("단계", "서비스 모듈", "확장 내용"),
        font_size=8,
        leading=10.5,
        light=True,
        min_row=34,
    )
    rounded(c, M, 176, W - 2 * M, 108, "#102038", radius=10)
    text(c, M + 14, 254, "7. 기타 추가 내용", 10, LIME, "KoreanBold")
    wrapped(c, M + 14, 230, "FinGuard는 금융기관을 대체하는 서비스가 아니라 사용자와 기관 사이의 설명 비용을 낮추는 서비스입니다. 제출 MVP는 현재 구현된 행동 전 안전 게이트를 정직하게 보여주고, 동일한 근거 엔진이 사후 회복·지급정지 소명·불법추심 대응으로 확장되는 설계를 제시합니다.", 8.5, INK, W - 2 * M - 28, 12)
    text(c, M, 136, "참고 출처", 9, "#4d7e3d", "KoreanBold")
    source_line(c, 118, "공식 대회 안내", "https://daker.ai/public/hackathons/2026-finance-ai-challenge", light=True)
    source_line(c, 103, "지급정지 이슈 참고", "https://www.yna.co.kr/view/AKR20260602152900002", light=True)
    source_line(c, 88, "불법사금융 원스톱 지원 참고", "https://www.fsc.go.kr/po010105/86417", light=True)
    footer(c, light=True)
    c.showPage()
    c.save()
    return PLAN_OUT


def build_feature_spec():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(FEATURE_OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("FinGuard - MVP 기능 명세서")
    c.setAuthor("FinGuard")

    # Page 1
    header(c, 1, "MVP SPEC")
    text(c, M, 734, "MVP 기능 명세서", 11, CYAN, "KoreanBold")
    text(c, M, 686, "FinGuard", 35, INK, "KoreanBold")
    wrapped(c, M, 648, "현재 제출 MVP: 금융 행동 직전의 위험 신호를 설명하고 안전한 다음 행동을 제시하는 로컬 웹서비스", 14, MUTED, 470, 20)
    pill(c, M, 586, "IMPLEMENTED  행동 전 안전 게이트", LIME, BG, 190)
    pill(c, M + 204, 586, "PYTHON 3.12+", CYAN, BG, 102)
    metadata(c, 548, light=False)
    y, main, muted = section_heading(c, 1, "MVP 구현 범위", "제출 URL에서 실제로 확인할 수 있는 기능만 기술합니다. 지급정지 소명, 72시간 회복, 불법사금융·불법추심 대응은 최종 서비스 확장 범위이며 현재 제출 MVP의 기능 목록에는 포함하지 않습니다.", 470)
    text(c, M, y, "실제 구현", 10.5, LIME, "KoreanBold")
    y -= 22
    implemented = [
        "공유받은 문자 / 스크린샷 / 결제 링크의 세 진입 경로 선택",
        "사용자 텍스트 또는 합성 데모 케이스 입력",
        "규칙 기반 위험·프롬프트 공격 분석과 근거 추출",
        "DANGER / INJECTION / CAUTION / LOW_RISK_NOT_PROOF / ABSTAIN 출력",
        "송금·인증·링크 클릭을 중단하고 공식 채널에서 확인하는 안전 행동 안내",
        "입력 원문 미저장, 외부 URL 미방문, 로컬 실행과 no-store 응답",
        "90초 발표 모드와 여섯 개 합성 회귀 케이스",
    ]
    for item in implemented:
        text(c, M + 4, y, "•", 11, LIME, "KoreanBold")
        y = wrapped(c, M + 18, y, item, 9.2, MUTED, W - 2 * M - 22, 13)
        y -= 3
    rounded(c, M, 126, W - 2 * M, 100, "#33262a", "#8d5b58", 10, 0.8)
    text(c, M + 14, 198, "제출 전 필수 교체", 9, RED, "KoreanBold")
    wrapped(c, M + 14, 176, "현재 검증 주소는 http://127.0.0.1:8765 입니다. 대회 제출 전 실행 가능한 공개 배포 URL을 확보해 아래 검증 절차의 URL과 제출 탭 입력값을 동일하게 교체해야 합니다.", 8.8, INK, W - 2 * M - 28, 12)
    text(c, M + 14, 142, "공개 배포 URL: ______________________________________________", 8.8, ORANGE, "KoreanBold")
    footer(c)
    c.showPage()

    # Page 2
    header(c, 2, "MVP SPEC")
    y, main, muted = section_heading(c, 2, "주요 기능 목록", "각 기능은 현재 로컬 MVP에서 확인 가능한 화면 또는 API 단위로 정의합니다.", 758)
    y = draw_table(
        c,
        M,
        y,
        [88, 195, 96, 128],
        [
            ("진입 경로", "공유받은 문자·스크린샷·결제 링크 선택. 스크린샷은 브라우저 로컬 미리보기와 OCR 텍스트 fallback.", "/", "구현"),
            ("케이스 선택", "여섯 개 합성 케이스 버튼으로 DANGER·INJECTION·CAUTION·LOW_RISK_NOT_PROOF 장면 재현.", "/, /pitch", "구현"),
            ("텍스트 분석", "POST /v1/analyze에 텍스트를 보내 위험 라벨, 점수, 신뢰도, 근거, 안전 행동 반환.", "/v1/analyze", "구현"),
            ("근거 표시", "입력에서 탐지된 기관 사칭·긴급성·이체·원격제어 등 reason code와 evidence span 표시.", "결과 패널", "구현"),
            ("안전 행동", "라벨만 보여주지 않고 송금·인증·링크 클릭 중단과 공식 앱·대표번호 독립 확인을 안내.", "결과 패널", "구현"),
            ("입력 공격 격리", "분석기를 흔드는 지시문은 금융 판단 지시로 실행하지 않고 INJECTION으로 분리.", "결과 패널", "구현"),
            ("보류 정책", "신호가 낮거나 불확실할 때 안전하다고 확정하지 않고 LOW_RISK_NOT_PROOF 또는 ABSTAIN 반환.", "결과 패널", "구현"),
            ("상태 점검", "프로세스와 분석 엔진 상태를 확인하는 healthz / readyz 계약 제공.", "/healthz, /readyz", "구현"),
        ],
        header_row=("기능명", "기능 설명", "관련 화면/API", "상태"),
        font_size=7.5,
        leading=9.5,
        light=True,
        min_row=34,
    )
    footer(c, light=True)
    c.showPage()

    # Page 3
    header(c, 3, "MVP SPEC")
    y, main, muted = section_heading(c, 3, "사용자 이용 흐름", "심사자는 공개 배포 URL에 접속한 뒤 아래 순서로 별도 계정 없이 주요 기능을 확인합니다. 현재 로컬 검증 주소는 공개 URL로 교체해야 합니다.", 758)
    steps = [
        ("01", "접속", "웹서비스 URL을 열고 첫 화면의 FinGuard 설명과 행동 전 안전 게이트를 확인", CYAN),
        ("02", "경로 선택", "공유받은 문자 / 스크린샷 / 결제 링크 중 하나를 선택", ORANGE),
        ("03", "입력", "합성 케이스 버튼을 누르거나 안전한 테스트 문장을 입력", LIME),
        ("04", "분석", "분석 결과에서 라벨·위험 점수·근거·신뢰도·면책 문구 확인", GREEN),
        ("05", "행동", "송금·인증·링크 클릭 중단 및 공식 앱·대표번호 독립 확인 행동 확인", RED),
    ]
    y -= 8
    for number, title_value, body, accent in steps:
        rounded(c, M, y - 74, W - 2 * M, 60, "#ffffff", "#c9d8d0", 9, 0.8)
        text(c, M + 14, y - 28, number, 10, accent, "KoreanBold")
        text(c, M + 52, y - 28, title_value, 10.5, DARK_INK, "KoreanBold")
        wrapped(c, M + 128, y - 28, body, 8.7, LIGHT_MUTED, W - 2 * M - 146, 11)
        y -= 78
    rounded(c, M, y - 102, W - 2 * M, 88, "#e8f2ec", "#c6d7cc", 10, 0.8)
    text(c, M + 14, y - 34, "예상 사용자 결과", 9, "#4d7e3d", "KoreanBold")
    wrapped(c, M + 14, y - 56, "내가 지금 무엇을 하지 말아야 하는지, 어떤 근거가 위험 신호인지, 어디에서 독립적으로 확인해야 하는지 알 수 있다.", 9, DARK_INK, W - 2 * M - 28, 13)
    y -= 138
    text(c, M, y, "화면 외부 행동", 10, "#4d7e3d", "KoreanBold")
    wrapped(c, M, y - 21, "실제 송금, 금융기관 로그인, 계좌 조회, 외부 링크 방문, 자동 신고·제출은 수행하지 않습니다. 결과는 사용자가 검토한 뒤 공식 채널에서 직접 확인하는 구조입니다.", 8.8, LIGHT_MUTED, W - 2 * M, 12)
    footer(c, light=True)
    c.showPage()

    # Page 4
    header(c, 4, "MVP SPEC")
    y, main, muted = section_heading(c, 4, "AI 및 데이터 처리 방식", "현재 MVP는 재현 가능한 규칙 엔진입니다. 최종 서비스에서는 이 계약을 유지하면서 비정형 자료 구조화와 공식 근거 검색에 생성형 AI를 추가합니다.", 758)
    text(c, M, y, "현재 입력·처리·출력", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    y = draw_table(
        c,
        M,
        y,
        [110, 180, 217],
        [
            ("입력", "JSON { text: string }", "비어 있지 않은 문자열, 최대 12,000자. 데모 케이스는 서버 코드에 합성 데이터로 포함"),
            ("전처리", "길이·형식 검증, 규칙 기반 특징 탐지", "기관명·긴급성·이체·원격제어·투자·링크·입력 공격 신호 추출"),
            ("판정", "label + risk_score + confidence", "DANGER, INJECTION, CAUTION, LOW_RISK_NOT_PROOF, ABSTAIN"),
            ("근거", "reason_codes + evidence", "입력에서 확인된 근거 문자열과 분류 코드를 함께 반환"),
            ("행동", "safe_action + disclaimer", "중단 행동, 공식 채널 확인, 데모용 규칙 기반 분석 고지"),
        ],
        header_row=("단계", "계약", "처리 원칙"),
        font_size=8,
        leading=10.5,
        light=True,
        min_row=34,
    )
    y -= 26
    text(c, M, y, "응답 핵심 예시", 10.5, "#4d7e3d", "KoreanBold")
    y -= 20
    rounded(c, M, y - 138, W - 2 * M, 126, "#102038", radius=10)
    response = '{\n  "label": "DANGER",\n  "risk_score": 0.99,\n  "confidence": 0.66,\n  "reason_codes": ["institution_impersonation", "transfer"],\n  "evidence": [{"text": "안전계좌", "category": "transfer"}],\n  "safe_action": "송금·인증·링크 클릭을 중단하고 공식 채널에서 확인"\n}'
    cursor = y - 34
    for line_value in response.splitlines():
        text(c, M + 16, cursor, line_value, 7.8, INK, "Korean")
        cursor -= 12
    y -= 166
    rounded(c, M, y - 92, W - 2 * M, 80, "#ffffff", "#c9d8d0", 10, 0.8)
    text(c, M + 14, y - 28, "데이터 안전", 9, "#4d7e3d", "KoreanBold")
    wrapped(c, M + 14, y - 49, "입력 원문은 요청 처리 중 메모리에서만 사용하고 로그·브라우저 저장소에 남기지 않습니다. 외부 URL fetch, 금융 API, 실제 개인정보 테스트를 수행하지 않습니다.", 8.6, DARK_INK, W - 2 * M - 28, 12)
    footer(c, light=True)
    c.showPage()

    # Page 5
    header(c, 5, "MVP SPEC")
    y, main, muted = section_heading(c, 5, "MVP 검증 방법", "심사자는 합성 입력과 사전 케이스를 사용해 라벨·근거·행동 출력이 연결되는지 확인합니다. 실제 금융행동을 유도하거나 개인정보를 입력할 필요가 없습니다.", 758)
    text(c, M, y, "로컬 smoke test", 10.5, "#4d7e3d", "KoreanBold")
    y -= 20
    rounded(c, M, y - 78, W - 2 * M, 66, "#102038", radius=9)
    text(c, M + 14, y - 32, "python3 -m app.server --port 8765", 9, LIME, "KoreanBold")
    text(c, M + 14, y - 54, "브라우저: http://127.0.0.1:8765  |  발표 모드: /pitch", 8.5, INK)
    y -= 106
    text(c, M, y, "검증 케이스", 10.5, "#4d7e3d", "KoreanBold")
    y -= 18
    y = draw_table(
        c,
        M,
        y,
        [112, 116, 128, 151],
        [
            ("기관 사칭 + 이체", "DANGER", "기관명·긴급성·이체", "송금·인증·클릭 중단"),
            ("원격제어 설치", "DANGER", "원격제어·인증 요구", "앱 설치·인증 중단"),
            ("분석기 우회 지시", "INJECTION", "입력 안의 지시문", "지시 격리·사람 확인"),
            ("중고거래 링크", "CAUTION", "결제 링크·외부 유도", "URL 방문 전 독립 확인"),
            ("일반 공지", "LOW_RISK_NOT_PROOF", "낮은 위험 신호", "안전 확정 금지"),
        ],
        header_row=("입력 장면", "예상 라벨", "확인 근거", "예상 행동"),
        font_size=7.8,
        leading=10,
        light=True,
        min_row=34,
    )
    y -= 24
    text(c, M, y, "실행 환경 및 제한사항", 10.5, "#4d7e3d", "KoreanBold")
    y -= 20
    limitations = [
        "실행 환경: Python 3.12 이상, 표준 라이브러리 기반, 최신 Chrome 또는 Safari 권장.",
        "계정: 필요 없음. 합성 케이스 버튼 또는 테스트 문장으로 바로 검증.",
        "제출 URL: 현재는 로컬 주소만 확인됨. 대회 제출 전 공개 배포 URL을 반드시 확보해야 함.",
        "MVP 제한: 은행·MyData API, 자동 제출, 사기·법률 최종 판단, 실제 개인정보, 불법추심 자료 처리 기능은 포함하지 않음.",
    ]
    for item in limitations:
        text(c, M + 4, y, "•", 11, ORANGE if "제출 URL" in item else "#4d7e3d", "KoreanBold")
        y = wrapped(c, M + 18, y, item, 8.6, LIGHT_MUTED, W - 2 * M - 22, 12)
        y -= 2
    footer(c, light=True)
    c.showPage()
    c.save()
    return FEATURE_OUT


if __name__ == "__main__":
    print(build_plan())
    print(build_feature_spec())

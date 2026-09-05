from __future__ import annotations

from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
PLAN_OUT = OUT_DIR / "(첨부1) 2026 금융 AI Challenge 공모전 기획서 - FinGuard.pdf"
SPEC_OUT = OUT_DIR / "(첨부2) 2026 금융 AI Challenge 기능명세서 - FinGuard.pdf"

PAGE_W, PAGE_H = 595, 842
FORM_X, FORM_W = 70, 455
TOP_Y = 780
BLUE = "#4f67c8"
LIGHT_BLUE = "#eaf0ff"
HEADER_GRAY = "#e7e7e7"
GRID = "#1f1f1f"
INK = "#202020"
MUTED = "#5a5a5a"
ORANGE = "#8b5a00"
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"

pdfmetrics.registerFont(TTFont("FormKorean", FONT_PATH))
pdfmetrics.registerFont(TTFont("FormKoreanBold", FONT_PATH))


def color(c: canvas.Canvas, value: str, stroke: bool = False) -> None:
    value = value.lstrip("#")
    rgb = tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))
    (c.setStrokeColorRGB if stroke else c.setFillColorRGB)(*rgb)


def wrap_text(value: str, size: float, width: float, font: str = "FormKorean") -> list[str]:
    lines: list[str] = []
    for paragraph in value.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        current = ""
        for char in paragraph:
            candidate = current + char
            if not current or pdfmetrics.stringWidth(candidate, font, size) <= width:
                current = candidate
            else:
                break_at = current.rfind(" ")
                if break_at > 0:
                    lines.append(current[:break_at].rstrip())
                    current = current[break_at + 1 :] + char
                else:
                    lines.append(current.rstrip())
                    current = char
        if current:
            lines.append(current.rstrip())
    return lines


def draw_lines(
    c: canvas.Canvas,
    x: float,
    y: float,
    value: str,
    width: float,
    size: float = 7.2,
    leading: float = 9.4,
    font: str = "FormKorean",
    text_color: str = INK,
) -> float:
    color(c, text_color)
    c.setFont(font, size)
    for line in wrap_text(value, size, width, font):
        c.drawString(x, y, line)
        y -= leading
    return y


def rect(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    fill_color: str = "#ffffff",
    stroke_color: str = GRID,
    line_width: float = 0.65,
) -> None:
    color(c, fill_color)
    color(c, stroke_color, stroke=True)
    c.setLineWidth(line_width)
    c.rect(x, y, width, height, fill=1, stroke=1)


def form_header(
    c: canvas.Canvas,
    attachment: str,
    title: str,
    page_no: int,
    include_metadata: bool = True,
) -> float:
    color(c, "#ffffff")
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    header_y = TOP_Y - 32
    rect(c, FORM_X, header_y, 70, 32, "#f7f7f7", BLUE, 0.75)
    rect(c, FORM_X + 76, header_y, FORM_W - 76, 32, "#ffffff", BLUE, 0.75)
    color(c, INK)
    c.setFont("FormKoreanBold", 12)
    c.drawCentredString(FORM_X + 35, header_y + 10, attachment)
    c.setFont("FormKoreanBold", 13)
    c.drawString(FORM_X + 89, header_y + 10, title)

    if include_metadata:
        meta_y = header_y - 50
        label_w = 90
        row_h = 25
        for row, (label, value) in enumerate(
            [("팀명", "FinGuard"), ("구성원 성명", "김동석(팀장)")]
        ):
            row_y = meta_y - (row + 1) * row_h
            rect(c, FORM_X, row_y, label_w, row_h, HEADER_GRAY, GRID, 0.65)
            rect(c, FORM_X + label_w, row_y, FORM_W - label_w, row_h, "#ffffff", GRID, 0.65)
            color(c, INK)
            c.setFont("FormKoreanBold", 8.7)
            c.drawCentredString(FORM_X + label_w / 2, row_y + 8, label)
            c.setFont("FormKorean", 8.7)
            c.drawString(FORM_X + label_w + 10, row_y + 8, value)
        color(c, MUTED)
        c.setFont("FormKorean", 7.5)
        c.drawRightString(FORM_X + FORM_W, meta_y - 58, "(* 필수항목)")
        content_top = meta_y - 73
    else:
        color(c, MUTED)
        c.setFont("FormKorean", 7.5)
        c.drawRightString(FORM_X + FORM_W, header_y - 18, f"FinGuard · {attachment} 계속")
        content_top = header_y - 39

    color(c, MUTED)
    c.setFont("FormKorean", 7)
    c.drawCentredString(PAGE_W / 2, 28, f"- {page_no} -")
    c.drawRightString(FORM_X + FORM_W, 28, "공식 양식 작성본")
    return content_top


def section_text(
    c: canvas.Canvas,
    y: float,
    number: str,
    title: str,
    body: str,
    size: float = 7.2,
    leading: float = 9.4,
) -> float:
    header_h = 24
    lines = wrap_text(body, size, FORM_W - 16)
    body_h = max(38, len(lines) * leading + 14)
    rect(c, FORM_X, y - header_h, FORM_W, header_h, HEADER_GRAY, GRID)
    rect(c, FORM_X, y - header_h - body_h, FORM_W, body_h, "#ffffff", GRID)
    color(c, INK)
    c.setFont("FormKoreanBold", 9.2)
    c.drawString(FORM_X + 7, y - 16, f"{number}. {title}")
    draw_lines(c, FORM_X + 8, y - header_h - 14, body, FORM_W - 16, size, leading)
    return y - header_h - body_h


def section_table(
    c: canvas.Canvas,
    y: float,
    number: str,
    title: str,
    columns: list[str],
    rows: list[list[str]],
    widths: list[float],
    size: float = 6.5,
    leading: float = 8.3,
    min_row_h: float = 26,
) -> float:
    header_h = 24
    rect(c, FORM_X, y - header_h, FORM_W, header_h, HEADER_GRAY, GRID)
    color(c, INK)
    c.setFont("FormKoreanBold", 9.2)
    c.drawString(FORM_X + 7, y - 16, f"{number}. {title}")

    table_top = y - header_h
    table_rows = [columns] + rows
    current_y = table_top
    for row_index, row in enumerate(table_rows):
        is_header = row_index == 0
        font = "FormKoreanBold" if is_header else "FormKorean"
        row_lines = [
            wrap_text(str(value), size, width - 10, font)
            for value, width in zip(row, widths)
        ]
        row_h = max(min_row_h, max(len(cell_lines) for cell_lines in row_lines) * leading + 10)
        fill_color = LIGHT_BLUE if is_header else "#ffffff"
        x = FORM_X
        for cell_index, width in enumerate(widths):
            rect(c, x, current_y - row_h, width, row_h, fill_color, GRID, 0.55)
            draw_lines(
                c,
                x + 5,
                current_y - 12,
                str(row[cell_index]),
                width - 10,
                size,
                leading,
                font,
                INK,
            )
            x += width
        current_y -= row_h
    return current_y


def plan_pdf() -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(PLAN_OUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("2026 금융 AI Challenge 기획서 - FinGuard")
    c.setAuthor("FinGuard")

    y = form_header(c, "첨부 1", "2026 금융 AI Challenge 기획서", 1)
    y = section_text(
        c,
        y,
        "1",
        "서비스 명칭*",
        "FinGuard — 금융사고 전후 증거·행동 연결 안전 게이트\nBEFORE 행동 직전, AFTER 송금 직후, FROZEN 계좌가 막힌 후, SHIELD 불법 추심 대응을 하나의 기록 원칙으로 연결합니다.",
        7.1,
        9.0,
    )
    y -= 7
    y = section_text(
        c,
        y,
        "2",
        "아이디어 기획 핵심내용(요약)*",
        "• MVP의 주인공은 FROZEN입니다. 거래·대화·문서를 원문 그대로 연결하고, 사용자가 확인한 사실·수정 이력·포함 범위를 분리해 소명팩을 준비합니다.\n• BEFORE는 원문 한 건을 30초 안전 게이트로 점검하고, AFTER는 송금 직후 72시간 행동 순서를 안내합니다.\n• SHIELD는 불법 여부를 자동 확정하지 않고 추심 연락 원문을 기록해 공식 상담 준비 자료로 연결합니다.\n• 현재 MVP는 실제 송금·계좌 조회·자동 신고·기관 전송을 하지 않으며, 합성자료로 안전하게 시연합니다.",
        7.0,
        9.0,
    )
    y -= 7
    y = section_text(
        c,
        y,
        "3",
        "문제 정의 및 제안 배경*",
        "• 문제: 금융사고가 발생하면 거래·대화·문서가 서로 다른 앱에 흩어지고, 사용자는 무엇이 원문인지 무엇을 본인이 확인했는지 설명하기 어렵습니다.\n• 대상: 지급정지 이후 금융회사에 소명해야 하는 소비자, 사기 의심 메시지를 받은 소비자와 가족·보호자, 반복 연락을 받는 채무·추심 상황의 당사자입니다.\n• 배경: 행동 전에는 압박 때문에 송금·인증을 진행하고, 사고 후에는 자료를 지우거나 수정하며, 계좌가 막힌 뒤에는 소명에 필요한 사실관계를 다시 찾습니다. FinGuard는 이 전후를 같은 증거 원칙으로 연결합니다.",
        7.0,
        9.0,
    )
    y -= 7
    y = section_text(
        c,
        y,
        "4",
        "서비스 컨셉 및 차별성*",
        "• 컨셉: ‘판정을 대신하는 AI’가 아니라 ‘원문과 다음 행동을 연결하는 안전 게이트’입니다.\n• 핵심 차별성: FROZEN에서 원문을 삭제하지 않고, 사용자 확인 상태·수정 이유·작업 이력을 분리해 금융회사 상담용 소명팩으로 묶습니다.\n• BEFORE·AFTER·SHIELD는 짧은 행동 안내로 진입시키고, 필요한 경우 같은 기록 구조로 FROZEN에 연결합니다.\n• 채무의 존재·금액, 연락 방식의 문제, 사기 여부를 한 번에 확정하지 않으며 금융기관·수사기관의 판단을 대체하지 않습니다.",
        7.0,
        9.0,
    )
    y -= 7
    section_text(
        c,
        y,
        "5",
        "활용 데이터 및 생성형 AI 모델 적용 방안*",
        "• 현재 데이터: 합성 문자·연락 기록·주문·입금·문서 예시와 사용자가 직접 입력한 텍스트입니다. 실제 개인정보는 사용하지 않습니다.\n• 현재 AI 처리: BEFORE 분석은 Python 표준 라이브러리 기반 규칙 엔진으로 기관 사칭·긴급성·이체·인증·원격제어·링크·입력 공격 신호를 탐지합니다. FROZEN·SHIELD의 문장 정리는 원문 보존과 사용자 확인을 돕는 구조화 기능이며 법적 판정이 아닙니다.\n• 현재 출력: 위험 라벨·근거·신뢰도·안전 행동, 원문별 확인 상태·수정 이력·타임라인·선택 자료 보고서입니다.\n• 개인정보 경계: 서버 로그에는 입력 본문을 기록하지 않고, 사건 자료는 현재 탭 메모리에만 보관합니다. 생성형 AI·OCR·금융기관 API·자동 제출은 MVP 이후 검토합니다.",
        6.8,
        8.6,
    )
    c.showPage()

    y = form_header(c, "첨부 1", "2026 금융 AI Challenge 기획서", 2, include_metadata=False)
    y = section_text(
        c,
        y,
        "6",
        "기대 효과 및 확장 가능성*",
        "• 기대 효과: 행동 직전에는 송금·인증·클릭을 늦추고, 사고 후에는 지급정지·공식 확인·증거 보존 순서를 지키게 합니다. 계좌가 막힌 뒤에는 원문·거래·확인 이력을 한 번에 설명할 수 있습니다.\n• 검증 기준: 원문 근거와 사용자 확인 상태의 연결, 확인 전 항목의 분리, 같은 주문 ID 기반 거래 비교, 선택 자료만 포함한 보고서 생성, SHIELD의 법적 단정 방지를 확인합니다.\n• 상위 단계 확장: 공개 배포 안정성, 사용자 동의 기반 저장·복원·삭제, 이미지/PDF OCR, 공식 기관 최신 안내 검증, 발표용 FROZEN 사례 시나리오로 확장합니다. 이 기능들은 현재 MVP의 구현 완료로 주장하지 않습니다.",
        7.0,
        9.0,
    )
    y -= 10
    section_text(
        c,
        y,
        "7",
        "MVP 범위와 안전 경계",
        "현재 제출 MVP의 중심은 FROZEN 지급정지 소명 준비입니다. BEFORE·AFTER·SHIELD는 같은 원문 보존 원칙을 공유하는 진입 흐름입니다. 입력은 합성 텍스트 또는 UTF-8 TXT이며, 이미지/PDF 자동 읽기와 실제 개인정보 처리는 지원하지 않습니다. HTML 다운로드와 브라우저 ‘PDF로 저장’은 사용자가 선택한 자료에 대해서만 동작하고 기관으로 자동 전송하지 않습니다.\n\n로컬 검증 주소: http://127.0.0.1:8876/#home  |  Render 공개 URL: 배포 후 최종 기입\n참고: 제출 전 공개 URL·기획서·기능명세서의 서비스 범위를 서로 대조해야 합니다.",
        7.0,
        9.0,
    )
    c.showPage()
    c.save()
    return PLAN_OUT


def spec_pdf() -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(SPEC_OUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("2026 금융 AI Challenge 기능 명세서 - FinGuard")
    c.setAuthor("FinGuard")

    y = form_header(c, "첨부 2", "2026 금융 AI Challenge 기능 명세서", 1)
    y = section_text(
        c,
        y,
        "1",
        "MVP 구현 범위*",
        "• 홈에서 BEFORE 행동 직전·AFTER 송금 직후·FROZEN 계좌가 막힌 후·SHIELD 불법 추심 대응으로 진입\n• BEFORE: 직접 입력 또는 스크린샷 미리보기, 규칙 기반 결과·근거·위험도·다음 행동\n• AFTER: 추가 송금·연락 중단, 공식 채널 확인, 72시간 증거 보존·FROZEN 연결 안내\n• FROZEN: G01~G03 진입 후 원문 추가, 원문·사실 확인, 거래 연결, 이슈·타임라인, 소명팩, 자료 보완\n• SHIELD: 연락 원문·시각·채널 기록, 확인 항목 구분, 상담 준비 자료와 공식 지원 경로\n• HTML/PDF 출력, 원문 보존·사용자 확인·수정 이력·사건 분리\n※ 실제 OCR·로그인·백엔드 저장·은행 API·자동 신고·기관 전송은 현재 MVP 범위에서 제외합니다.",
        6.8,
        8.5,
    )
    y -= 7
    y = section_table(
        c,
        y,
        "2",
        "주요 기능 목록*",
        ["기능명", "기능 설명", "관련 화면/API", "상태"],
        [
            ["BEFORE", "원문을 빠르게 점검하고 위험 라벨·근거·공식 확인 행동을 표시. 스크린샷은 미리보기이며 OCR은 미지원.", "#before", "구현"],
            ["AFTER", "송금 직후 3단계로 추가 행동을 줄이고 지급정지·증거 보존·FROZEN 연결을 안내.", "#after", "구현"],
            ["FROZEN 입력", "합성자료 또는 TXT 원문을 추가하고, 사건을 분리해 자료를 연결.", "#s00~#c02", "구현"],
            ["원문·사실 확인", "원문은 보존하고 확인 전·사용자 확인·추가 확인 상태와 수정 이력을 분리.", "#c03", "구현"],
            ["거래·이슈·타임라인", "같은 주문 ID 기반 금액 비교, 누락·상충 이슈, 발생 시각과 작업 이력 확인.", "#c04~#c06", "구현"],
            ["소명팩 출력", "선택한 원문·관련 확인 내용·이력으로 HTML을 내려받거나 브라우저 PDF 저장.", "#c07", "구현"],
            ["SHIELD", "추심 연락 원문을 기록하고 법적 결론 없이 상담 준비 자료·공식 지원 경로로 연결.", "#shield-workspace", "구현"],
            ["상태 점검", "프로세스와 분석 엔진 상태를 확인하는 healthz·readyz 계약 제공.", "/healthz, /readyz", "구현"],
        ],
        [78, 252, 75, 50],
        6.35,
        8.0,
        25,
    )
    y -= 8
    section_text(
        c,
        y,
        "3",
        "사용자 이용 흐름*",
        "1) 홈에서 ‘계좌가 막힌 후’의 소명 준비를 주 흐름으로 선택합니다.\n2) G01~G03에서 합성 메시지를 입력하고 결과·보관 범위를 확인한 뒤 사건을 시작합니다.\n3) C01 개요에서 C02 자료 수집으로 이동해 TXT 또는 합성 원문을 추가합니다.\n4) C03 원문·사실 확인에서 원문과 항목을 대조하고 확인 상태·수정 이유를 남깁니다.\n5) C04 거래 연결, C05 이슈 검토, C06 타임라인에서 연결·누락·상충·발생 시각을 확인합니다.\n6) C07 보고서에서 포함할 원문을 선택해 소명팩 HTML을 내려받거나 브라우저에서 PDF로 저장합니다.\n7) 보조 흐름은 BEFORE·AFTER·SHIELD 버튼에서 각각 30초 점검, 72시간 안내, 상담 준비를 확인합니다.",
        6.9,
        8.6,
    )
    c.showPage()

    y = form_header(c, "첨부 2", "2026 금융 AI Challenge 기능 명세서", 2, include_metadata=False)
    y = section_table(
        c,
        y,
        "4",
        "AI 및 데이터 처리 방식*",
        ["구분", "현재 MVP 처리 방식"],
        [
            ["BEFORE 입력", "직접 입력 텍스트. 스크린샷은 로컬 미리보기이며 자동 OCR·이미지 전송은 지원하지 않음."],
            ["분석 방식", "Python 표준 라이브러리 기반 결정론적 규칙 엔진. 기관 사칭·긴급성·이체·인증·원격제어·링크·프롬프트 공격 신호 탐지."],
            ["BEFORE 출력", "label, risk_score, injection_score, confidence, reason_codes, evidence, safe_action, model_version, disclaimer."],
            ["FROZEN·SHIELD 입력", "합성자료 또는 UTF-8 TXT 원문. 발생 시각·출처·종류·원문을 함께 기록."],
            ["원문·이력", "원문은 변경하지 않고 사용자 확인 상태·수정 내용·메모·변경 전후 이력으로 분리. 선택 자료만 보고서에 포함."],
            ["생성형 AI", "현재 MVP에서는 호출하지 않음. 향후 구조화·관계 설명·누락자료 질문·초안 작성에 제한적으로 적용하며 법적 판정은 하지 않음."],
            ["개인정보·보안", "서버 로그·localStorage·sessionStorage에 사건을 보관하지 않음. 외부 URL·금융 API·기관 자동 전송 없음."],
        ],
        [92, 363],
        6.65,
        8.3,
        27,
    )
    c.showPage()

    y = form_header(c, "첨부 2", "2026 금융 AI Challenge 기능 명세서", 3, include_metadata=False)
    y = section_table(
        c,
        y,
        "5",
        "MVP 검증 방법*",
        ["검증 항목", "예상 라벨", "확인할 근거", "예상 행동"],
        [
            ["기관 사칭 + 안전계좌 이체", "DANGER", "기관명·긴급성·이체", "송금·인증·클릭 중단"],
            ["원격제어 앱 설치 요청", "DANGER", "원격제어·인증 요구", "앱 설치·인증 중단"],
            ["분석기 우회 지시", "INJECTION", "입력 안의 지시문", "지시 격리·정보 입력 금지"],
            ["중고거래 결제 링크", "CAUTION", "결제 링크·외부 유도", "URL 방문 전 독립 확인"],
            ["일반 공지처럼 보이는 문장", "LOW_RISK_NOT_PROOF", "낮은 위험 신호", "안전 확정 금지"],
            ["빈 입력", "ABSTAIN", "판단할 원문 없음", "내용 입력 또는 사람 확인"],
            ["FROZEN 합성 3건", "사건 생성", "원문·거래·대화 연결", "C01~C07 순차 확인"],
            ["SHIELD 연락 3건", "상담 준비", "반복·위협·제3자 언급", "원문 보존·공식 상담"],
        ],
        [105, 95, 135, 120],
        6.35,
        8.0,
        27,
    )
    y -= 10
    section_text(
        c,
        y,
        "검증 환경 및 제한사항",
        "",
        "실행 명령(로컬): python3 -m app.server --host 127.0.0.1 --port 8876\n상태 확인: /healthz, /readyz  |  발표 모드: /pitch\nRender 시작 명령: python3 -m app.server --host 0.0.0.0 --port $PORT\n실행 환경: Python 3.12 이상, 최신 Chrome 또는 Safari 권장. 별도 계정 불필요. 새로고침·탭 종료 전 HTML/PDF를 내려받아야 합니다.\n제출 제한: Render 공개 URL은 배포 후 외부 네트워크에서 /healthz·홈·FROZEN 소명팩까지 확인한 뒤 문서와 제출 탭에 동일하게 기입합니다. 실제 OCR·로그인·백엔드 저장·은행 API·자동 신고·기관 전송·실제 개인정보는 MVP에 포함하지 않습니다.",
        6.8,
        8.6,
    )
    c.showPage()
    c.save()
    return SPEC_OUT


if __name__ == "__main__":
    print(plan_pdf())
    print(spec_pdf())

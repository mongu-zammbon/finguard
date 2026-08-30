import unittest

try:
    from app.server import DEMO_CASES, WEB_ROOT, validate_payload
    _IMPORT_ERROR = None
except Exception as exc:
    DEMO_CASES = None
    WEB_ROOT = None
    validate_payload = None
    _IMPORT_ERROR = exc


class ServerContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.assertIsNotNone(
            validate_payload,
            f"app.server is not implemented yet: {_IMPORT_ERROR}",
        )

    def test_accepts_text_payload_and_strips_whitespace(self) -> None:
        self.assertEqual(validate_payload({"text": "  hello  "}), "hello")

    def test_rejects_missing_or_non_string_text(self) -> None:
        with self.assertRaises(ValueError):
            validate_payload({})
        with self.assertRaises(ValueError):
            validate_payload({"text": 123})

    def test_rejects_oversized_payload(self) -> None:
        with self.assertRaises(ValueError):
            validate_payload({"text": "x" * 12001})

    def test_demo_cases_are_available_for_the_meeting(self) -> None:
        self.assertGreaterEqual(len(DEMO_CASES), 3)
        self.assertTrue(all("id" in item and "text" in item for item in DEMO_CASES))

    def test_demo_cases_cover_the_meeting_story(self) -> None:
        expected_ids = {
            "danger-transfer",
            "danger-remote",
            "danger-investment",
            "danger-marketplace",
            "prompt-injection",
            "low-risk-not-proof",
        }

        self.assertEqual({item["id"] for item in DEMO_CASES}, expected_ids)
        self.assertTrue(
            all(
                isinstance(item.get(field), str) and item[field].strip()
                for item in DEMO_CASES
                for field in ("id", "label", "title", "text")
            )
        )

    def test_pitch_assets_are_available(self) -> None:
        self.assertIsNotNone(WEB_ROOT)
        for asset in ("pitch.html", "pitch.css", "pitch.js"):
            self.assertTrue((WEB_ROOT / asset).is_file(), asset)

    def test_service_exposes_low_friction_entry_paths(self) -> None:
        index_html = (WEB_ROOT / "index.html").read_text(encoding="utf-8")
        app_js = (WEB_ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn('id="app-main"', index_html)
        self.assertIn('class="prototype-root"', index_html)
        for screen in ("s00", "g01", "g02", "g03", "workspace", "reviewer", "components"):
            self.assertIn(f'"{screen}"', app_js)
        self.assertIn("figma-mobile-screen", app_js)
        self.assertIn("figma-desktop-frame", app_js)

    def test_service_exposes_optional_consent_flow_without_storage_claim(self) -> None:
        app_js = (WEB_ROOT / "app.js").read_text(encoding="utf-8")
        for marker in (
            "동의하고 사건 생성",
            "아니요, 보류",
            '"create-case"',
            '"hold-consent"',
        ):
            self.assertIn(marker, app_js)
        self.assertIn("실제 사건 생성·저장은 실행하지 않는 mock 흐름입니다", app_js)

    def test_frontend_covers_the_figma_screen_map(self) -> None:
        app_js = (WEB_ROOT / "app.js").read_text(encoding="utf-8")
        for screen in ("C01", "C02", "C03", "C04", "C05A", "C05B", "C06", "C07", "C08"):
            self.assertIn(f'"{screen}"', app_js)
        for screen in ("R01", "R02A", "R02B", "R03", "R04", "R04B", "R05", "R06"):
            self.assertIn(f'"{screen}"', app_js)
        for state in ("DANGER", "LOW_RISK_NOT_PROOF", "ABSTAIN", "INJECTION_DETECTED"):
            self.assertIn(state, app_js)


if __name__ == "__main__":
    unittest.main()

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


if __name__ == "__main__":
    unittest.main()

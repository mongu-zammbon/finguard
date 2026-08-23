import unittest

try:
    from app.server import DEMO_CASES, validate_payload
    _IMPORT_ERROR = None
except Exception as exc:
    DEMO_CASES = None
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


if __name__ == "__main__":
    unittest.main()

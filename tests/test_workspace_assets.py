import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import urlopen

from app.server import FinGuardHandler


class WorkspaceAssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FinGuardHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_record_assets_are_served_and_loaded_before_app(self):
        with urlopen(self.base) as response:
            html = response.read().decode("utf-8")
        for asset in ("case-records.js", "case-workspace.js", "case-workspace.css"):
            with self.subTest(asset=asset), urlopen(f"{self.base}/{asset}") as response:
                self.assertEqual(response.status, 200)
                self.assertGreater(len(response.read()), 100)
            self.assertIn(asset, html)
        self.assertLess(html.index("case-records.js"), html.index("case-workspace.js"))
        self.assertLess(html.index("case-workspace.js"), html.index("/app.js"))


if __name__ == "__main__":
    unittest.main()

import io
import unittest
from app.ingestion.ascii_adapter import ASCIIAdapter
from app.ingestion.validation import filter_by_qc


class TestASCIIAdapter(unittest.TestCase):
    def test_ascii_adapter_parsing(self):
        csv_data = """latitude,longitude,depth,temperature,salinity,qc_flag
15.5,72.3,0.0,28.4,35.1,1
15.5,72.3,10.0,27.8,35.2,1
15.5,72.3,50.0,22.1,35.5,4
"""
        buffer = io.StringIO(csv_data)
        adapter = ASCIIAdapter(buffer)
        obs = adapter.parse_observations()

        self.assertEqual(len(obs), 1)
        profile = obs[0]
        self.assertEqual(profile["latitude"], 15.5)
        self.assertEqual(profile["longitude"], 72.3)
        self.assertEqual(profile["depths"], [0.0, 10.0, 50.0])
        self.assertEqual(profile["temperature"], [28.4, 27.8, 22.1])
        self.assertEqual(profile["qc_flags"], [1, 1, 4])

    def test_qc_flag_filtering(self):
        raw_temps = [28.4, 27.8, 999.0]
        qc_flags = [1, 1, 4]

        filtered = filter_by_qc(raw_temps, qc_flags, allowed_flags=(1, 2))
        self.assertEqual(filtered, [28.4, 27.8, None])


if __name__ == "__main__":
    unittest.main()

import unittest
import numpy as np
import xarray as xr
from app.processing.isosurface import extract_isosurface


class TestIsosurface(unittest.TestCase):
    def create_mock_3d_dataset(self):
        """Creates a mock 3D temperature dataset (depth x lat x lon)."""
        depths = np.array([0.0, 10.0, 50.0, 100.0])
        lats = np.array([10.0, 11.0, 12.0])
        lons = np.array([70.0, 71.0, 72.0])

        data = np.zeros((4, 3, 3))
        for d_idx, d in enumerate(depths):
            data[d_idx, :, :] = 28.0 - (d * 0.13)

        ds = xr.Dataset(
            data_vars={"thetao": (["depth", "latitude", "longitude"], data)},
            coords={"depth": depths, "latitude": lats, "longitude": lons}
        )
        return ds

    def test_extract_isosurface(self):
        ds = self.create_mock_3d_dataset()
        res = extract_isosurface(ds, variable="thetao", iso_value=20.0)

        self.assertIn("variable", res)
        self.assertEqual(res["variable"], "thetao")
        self.assertIn("vertices", res)
        self.assertIn("faces", res)
        self.assertIsInstance(res["vertices"], list)
        self.assertIsInstance(res["faces"], list)


if __name__ == "__main__":
    unittest.main()

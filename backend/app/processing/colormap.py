import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np

def apply_colormap(values: list[list[float]], min_val: float, max_val: float, cmap_name="turbo") -> list[list[str]]:
    """
    Takes a 2D list of numeric values and maps them to a 2D list of Hex color strings (#RRGGBB).
    Uses matplotlib's colormaps (e.g. 'turbo' for temperature).
    """
    # Create a normalizer that clamps values between min and max
    norm = mcolors.Normalize(vmin=min_val, vmax=max_val)
    cmap = plt.get_cmap(cmap_name)
    
    colors_2d = []
    for row in values:
        color_row = []
        for val in row:
            if val is None or np.isnan(val):
                color_row.append(None) # Transparent for land / No-Data
            else:
                # Convert normalized value to RGBA, then to Hex
                rgba = cmap(norm(val))
                hex_color = mcolors.to_hex(rgba)
                color_row.append(hex_color)
        colors_2d.append(color_row)
        
    return colors_2d

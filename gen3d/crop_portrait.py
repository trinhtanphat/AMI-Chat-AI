#!/usr/bin/env python3
"""
Crop portrait from an image for better 3D character generation.
Uses face detection to find and crop the subject's upper body/portrait.

Usage:
  python3 gen3d/crop_portrait.py [input_image] [output_image]
  
Default:
  input:  gen3d/image/image.png
  output: gen3d/image/portrait.png
"""

import sys
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent


def crop_portrait_smart(input_path: str, output_path: str) -> str:
    """
    Crop portrait from image. Tries multiple strategies:
    1. If bright/clear subject detected → crop to center subject
    2. Otherwise → center crop with portrait aspect ratio
    """
    from PIL import Image, ImageFilter, ImageStat

    img = Image.open(input_path).convert('RGB')
    w, h = img.size
    print(f"Original image: {w}x{h}")

    # Strategy: Find the main subject (person) by analyzing the image
    # We look for the area with the most detail/edges (likely the person)
    
    # Convert to grayscale for edge detection
    gray = img.convert('L')
    edges = gray.filter(ImageFilter.FIND_EDGES)
    
    # Divide image into grid and find the region with most edges (person area)
    grid_cols, grid_rows = 5, 5
    cell_w, cell_h = w // grid_cols, h // grid_rows
    
    max_score = 0
    best_col, best_row = grid_cols // 2, grid_rows // 2
    
    scores = []
    for row in range(grid_rows):
        for col in range(grid_cols):
            x1 = col * cell_w
            y1 = row * cell_h
            x2 = min(x1 + cell_w, w)
            y2 = min(y1 + cell_h, h)
            cell = edges.crop((x1, y1, x2, y2))
            stat = ImageStat.Stat(cell)
            score = stat.mean[0]  # Average edge intensity
            scores.append((score, col, row))
    
    # Sort by score, take top cells to find the "person center"
    scores.sort(reverse=True)
    top_cells = scores[:8]  # Top 8 cells with most detail
    
    avg_col = sum(c for _, c, _ in top_cells) / len(top_cells)
    avg_row = sum(r for _, _, r in top_cells) / len(top_cells)
    
    # Calculate subject center in pixels
    subject_cx = int((avg_col + 0.5) * cell_w)
    subject_cy = int((avg_row + 0.5) * cell_h)
    
    print(f"Detected subject center: ({subject_cx}, {subject_cy})")
    
    # Crop portrait: upper body region
    # Portrait aspect ratio ~3:4 (width:height)
    portrait_h = int(h * 0.7)  # Take 70% height from subject center upward
    portrait_w = int(portrait_h * 0.75)  # 3:4 aspect ratio
    
    # Ensure minimum size
    portrait_w = max(portrait_w, min(w, 512))
    portrait_h = max(portrait_h, min(h, 680))
    
    # Center crop around the subject
    # Bias upward for portrait (head should be in upper third)
    crop_cy = subject_cy - int(portrait_h * 0.1)  # Shift up slightly
    
    x1 = max(0, subject_cx - portrait_w // 2)
    y1 = max(0, crop_cy - portrait_h // 2)
    x2 = min(w, x1 + portrait_w)
    y2 = min(h, y1 + portrait_h)
    
    # Adjust if hitting edges
    if x2 - x1 < portrait_w:
        if x1 == 0:
            x2 = min(w, portrait_w)
        else:
            x1 = max(0, w - portrait_w)
    if y2 - y1 < portrait_h:
        if y1 == 0:
            y2 = min(h, portrait_h)
        else:
            y1 = max(0, h - portrait_h)
    
    cropped = img.crop((x1, y1, x2, y2))
    
    # Resize to a good size for 3D generation (1024x1024 or similar)
    final_size = 1024
    cropped = cropped.resize((final_size, final_size), Image.LANCZOS)
    
    cropped.save(output_path, quality=95)
    print(f"Portrait saved: {output_path} ({final_size}x{final_size})")
    
    return output_path


def crop_center_portrait(input_path: str, output_path: str) -> str:
    """Simple center crop focused on upper portion (face/torso area)."""
    from PIL import Image
    
    img = Image.open(input_path).convert('RGB')
    w, h = img.size
    
    # Take center 60% width, top 75% height
    margin_x = int(w * 0.2)
    crop_h = int(h * 0.75)
    
    x1 = margin_x
    y1 = 0
    x2 = w - margin_x
    y2 = crop_h
    
    cropped = img.crop((x1, y1, x2, y2))
    cropped = cropped.resize((1024, 1024), Image.LANCZOS)
    cropped.save(output_path, quality=95)
    
    print(f"Center portrait saved: {output_path}")
    return output_path


def main():
    input_path = sys.argv[1] if len(sys.argv) > 1 else str(SCRIPT_DIR / "image" / "image.png")
    output_path = sys.argv[2] if len(sys.argv) > 2 else str(SCRIPT_DIR / "image" / "portrait.png")
    
    if not os.path.exists(input_path):
        print(f"Error: Input image not found: {input_path}")
        sys.exit(1)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")
    print()
    
    result = crop_portrait_smart(input_path, output_path)
    
    size_kb = os.path.getsize(result) / 1024
    print(f"\nDone! Portrait: {result} ({size_kb:.1f} KB)")
    print("Now run: python3 gen3d/generate_3d.py gen3d/image/portrait.png MyCharacter")


if __name__ == "__main__":
    main()

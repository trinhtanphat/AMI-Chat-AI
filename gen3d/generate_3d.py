#!/usr/bin/env python3
"""
Generate 3D GLB model from a 2D image using Hugging Face Spaces.
Uses TRELLIS (Microsoft) or TripoSR (StabilityAI) via Gradio client.
"""

import sys
import os
import shutil
import time
from pathlib import Path
from gradio_client import Client, handle_file

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
MODELS_DIR = PROJECT_ROOT / "public" / "models" / "3d"

def try_trellis(image_path: str, output_path: str) -> bool:
    """Try TRELLIS (JeffreyXiang/TRELLIS) - best quality image-to-3D."""
    print("[TRELLIS] Connecting to JeffreyXiang/TRELLIS...")
    try:
        client = Client("JeffreyXiang/TRELLIS")
        print("[TRELLIS] Connected. Processing image...")

        # Step 1: Start session
        client.predict(api_name="/start_session")
        print("[TRELLIS] Session started")

        # Step 2: Preprocess image
        preprocessed = client.predict(
            image=handle_file(image_path),
            api_name="/preprocess_image"
        )
        print(f"[TRELLIS] Preprocessed: {preprocessed}")

        # Step 3: Get seed
        seed = client.predict(
            randomize_seed=True,
            seed=42,
            api_name="/get_seed"
        )
        print(f"[TRELLIS] Seed: {seed}")

        # Step 4: Generate 3D - pass image directly
        result = client.predict(
            image=handle_file(image_path),
            multiimages=[],
            seed=seed if isinstance(seed, (int, float)) else 42,
            ss_guidance_strength=7.5,
            ss_sampling_steps=12,
            slat_guidance_strength=3.0,
            slat_sampling_steps=12,
            multiimage_algo="stochastic",
            api_name="/image_to_3d"
        )
        print(f"[TRELLIS] 3D generated: {type(result)}")

        # Step 5: Extract GLB
        result = client.predict(
            mesh_simplify=0.95,
            texture_size=1024,
            api_name="/extract_glb"
        )
        print(f"[TRELLIS] GLB extracted: {result}")

        # Result is (glb_viewer_path, download_path)
        glb_path = None
        if isinstance(result, (list, tuple)):
            for item in result:
                path = str(item) if not isinstance(item, dict) else item.get('value', item.get('path', ''))
                if path and os.path.exists(str(path)) and str(path).endswith('.glb'):
                    glb_path = str(path)
                    break
            if not glb_path and len(result) > 0:
                path = str(result[0]) if not isinstance(result[0], dict) else result[0].get('value', result[0].get('path', ''))
                if path and os.path.exists(str(path)):
                    glb_path = str(path)
        elif isinstance(result, dict):
            glb_path = result.get('value', result.get('path', ''))
        else:
            glb_path = str(result)

        if glb_path and os.path.exists(str(glb_path)):
            shutil.copy2(str(glb_path), output_path)
            print(f"[TRELLIS] Saved GLB to {output_path}")
            return True
        else:
            # Try lambda_4 for download
            print("[TRELLIS] Trying download endpoint...")
            result2 = client.predict(api_name="/lambda_4")
            path = str(result2) if not isinstance(result2, dict) else result2.get('value', result2.get('path', ''))
            if path and os.path.exists(str(path)):
                shutil.copy2(str(path), output_path)
                print(f"[TRELLIS] Saved GLB to {output_path}")
                return True
            print(f"[TRELLIS] Could not find GLB file")
            return False

    except Exception as e:
        print(f"[TRELLIS] Failed: {e}")
        return False


def try_triposr(image_path: str, output_path: str) -> bool:
    """Try TripoSR (StabilityAI) - fast and reliable image-to-3D."""
    print("[TripoSR] Connecting to stabilityai/TripoSR...")
    try:
        client = Client("stabilityai/TripoSR")
        print("[TripoSR] Connected. Processing image...")

        result = client.predict(
            handle_file(image_path),
            api_name="/run"
        )
        print(f"[TripoSR] Result: {type(result)}")

        # TripoSR returns a list/tuple: [preprocessed_image, output_model_path]
        if isinstance(result, (list, tuple)) and len(result) >= 2:
            model_path = result[1]
        elif isinstance(result, str):
            model_path = result
        elif isinstance(result, dict):
            model_path = result.get('value', result.get('path', ''))
        else:
            model_path = str(result)

        if model_path and os.path.exists(str(model_path)):
            # TripoSR outputs OBJ, we might need to convert
            ext = Path(str(model_path)).suffix.lower()
            if ext == '.glb':
                shutil.copy2(str(model_path), output_path)
            elif ext in ('.obj', '.ply', '.stl'):
                # Copy as-is if no converter, or convert using trimesh
                try:
                    import trimesh
                    mesh = trimesh.load(str(model_path))
                    mesh.export(output_path, file_type='glb')
                except ImportError:
                    shutil.copy2(str(model_path), output_path)
            else:
                shutil.copy2(str(model_path), output_path)
            print(f"[TripoSR] Saved to {output_path}")
            return True
        else:
            print(f"[TripoSR] Could not find output at: {model_path}")
            return False

    except Exception as e:
        print(f"[TripoSR] Failed: {e}")
        return False


def try_instantmesh(image_path: str, output_path: str) -> bool:
    """Try InstantMesh (TencentARC) - good quality image-to-3D."""
    print("[InstantMesh] Connecting to TencentARC/InstantMesh...")
    try:
        client = Client("TencentARC/InstantMesh")
        print("[InstantMesh] Connected. Processing image...")

        # Step 1: Check input
        result = client.predict(
            input_image=handle_file(image_path),
            api_name="/check_input_image"
        )

        # Step 2: Preprocess
        result = client.predict(
            input_image=handle_file(image_path),
            do_remove_background=True,
            api_name="/preprocess"
        )
        print(f"[InstantMesh] Preprocessed: {result}")

        # Step 3: Generate multiview
        result = client.predict(
            input_image=handle_file(image_path),
            sample_steps=75,
            sample_seed=42,
            api_name="/generate_mvs"
        )
        print(f"[InstantMesh] Multiview generated")

        # Step 4: Generate 3D
        result = client.predict(
            api_name="/make3d"
        )
        print(f"[InstantMesh] 3D Result: {type(result)}")

        # Extract path
        if isinstance(result, (list, tuple)):
            # Usually [mesh_path, video_path]
            model_path = result[0]
        elif isinstance(result, dict):
            model_path = result.get('value', result.get('path', ''))
        else:
            model_path = str(result)

        if isinstance(model_path, dict):
            model_path = model_path.get('value', model_path.get('path', ''))

        if model_path and os.path.exists(str(model_path)):
            ext = Path(str(model_path)).suffix.lower()
            if ext == '.glb':
                shutil.copy2(str(model_path), output_path)
            else:
                try:
                    import trimesh
                    mesh = trimesh.load(str(model_path))
                    mesh.export(output_path, file_type='glb')
                except ImportError:
                    shutil.copy2(str(model_path), output_path)
            print(f"[InstantMesh] Saved to {output_path}")
            return True
        else:
            print(f"[InstantMesh] Could not find output at: {model_path}")
            return False

    except Exception as e:
        print(f"[InstantMesh] Failed: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        image_path = str(SCRIPT_DIR / "image" / "image.png")
    else:
        image_path = sys.argv[1]

    if len(sys.argv) >= 3:
        output_name = sys.argv[2]
    else:
        output_name = "MyCharacter"

    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        sys.exit(1)

    output_path = str(MODELS_DIR / f"{output_name}.glb")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Input image: {image_path}")
    print(f"Output model: {output_path}")
    print(f"File size: {os.path.getsize(image_path) / 1024:.1f} KB")
    print()

    # Try each service in order of quality
    services = [
        ("TRELLIS", try_trellis),
        ("TripoSR", try_triposr),
        ("InstantMesh", try_instantmesh),
    ]

    for name, func in services:
        print(f"{'='*50}")
        print(f"Trying {name}...")
        print(f"{'='*50}")
        if func(image_path, output_path):
            size = os.path.getsize(output_path)
            print(f"\nSUCCESS! Generated {output_name}.glb ({size / 1024:.1f} KB)")
            return output_path
        print()

    print("ERROR: All services failed. Please try again later.")
    sys.exit(1)


if __name__ == "__main__":
    main()

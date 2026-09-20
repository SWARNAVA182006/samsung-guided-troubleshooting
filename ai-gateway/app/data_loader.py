"""Read-only data loader for official Samsung Theme 2 data files."""
import json
from pathlib import Path
from typing import Any, Dict, Optional

# Path resolution relative to repository root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def get_data_file_path(filename: str, custom_data_dir: Optional[Path] = None) -> Path:
    base_dir = custom_data_dir if custom_data_dir is not None else DATA_DIR
    file_path = base_dir / filename
    if not file_path.exists():
        raise FileNotFoundError(f"Required data file does not exist: {file_path}")
    return file_path


def load_siis_responses(data_dir: Optional[Path] = None) -> Dict[str, Any]:
    file_path = get_data_file_path("siis_responses.json", data_dir)
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in siis_responses.json, got {type(data).__name__}")
    return data


def load_deeplinks(data_dir: Optional[Path] = None) -> Dict[str, Any]:
    file_path = get_data_file_path("deeplinks.json", data_dir)
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in deeplinks.json, got {type(data).__name__}")
    return data


def load_sample_output(data_dir: Optional[Path] = None) -> Dict[str, Any]:
    file_path = get_data_file_path("sample_output.json", data_dir)
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in sample_output.json, got {type(data).__name__}")
    return data


def load_input_text(data_dir: Optional[Path] = None) -> str:
    file_path = get_data_file_path("input.txt", data_dir)
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

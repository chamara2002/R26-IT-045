from pathlib import Path
import json
import pickle


def ensure_dir(path: Path) -> None:
    """Create a directory and all parent directories if they do not exist."""
    path.mkdir(parents=True, exist_ok=True)


def save_json(path: Path, data: dict) -> None:
    """Save a JSON document with indentation."""
    ensure_dir(path.parent)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def load_json(path: Path) -> dict:
    """Load a JSON document from disk."""
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_pickle(path: Path, value: object) -> None:
    """Serialize an object to a pickle file."""
    ensure_dir(path.parent)
    with open(path, "wb") as handle:
        pickle.dump(value, handle)


def load_pickle(path: Path) -> object:
    """Deserialize an object from a pickle file."""
    with open(path, "rb") as handle:
        return pickle.load(handle)

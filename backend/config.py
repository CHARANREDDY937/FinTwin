import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent


def _resolve_path(raw_path: str) -> str:
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return str(candidate)
    return str((BASE_DIR / candidate).resolve())


default_cache_dir = Path(_resolve_path(os.getenv("HF_HOME", "artifacts/hf-cache")))
default_cache_dir.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("HF_HOME", str(default_cache_dir))
os.environ.setdefault("TRANSFORMERS_CACHE", str(default_cache_dir / "transformers"))
os.environ.setdefault("HF_DATASETS_CACHE", str(default_cache_dir / "datasets"))
Path(os.environ["TRANSFORMERS_CACHE"]).mkdir(parents=True, exist_ok=True)
Path(os.environ["HF_DATASETS_CACHE"]).mkdir(parents=True, exist_ok=True)


@dataclass
class Settings:
    base_model_name: str = os.getenv("BASE_MODEL_NAME", "Qwen/Qwen2.5-1.5B-Instruct")
    personalized_model_dir: str = _resolve_path(os.getenv("PERSONALIZED_MODEL_DIR", "artifacts/personalized-fintwin-model"))
    hf_home: str = os.getenv("HF_HOME", str(default_cache_dir))
    dataset_dir: str = _resolve_path(os.getenv("DATASET_DIR", "Datasets"))
    agent_artifacts_dir: str = _resolve_path(os.getenv("AGENT_ARTIFACTS_DIR", "artifacts/agent_models"))
    db_connection_string: str = os.getenv("DB_CONNECTION_STRING", "sqlite+aiosqlite:///./fintwin.db")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    usd_to_inr_rate: float = float(os.getenv("USD_TO_INR_RATE", "95.91"))
    jwt_secret: str = os.getenv("JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24 * 7


settings = Settings()
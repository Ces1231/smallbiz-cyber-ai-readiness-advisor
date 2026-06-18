"""
SmallBiz Advisor — Backend Configuration
Settings loaded from environment variables via pydantic-settings.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str
    allowed_origins: str = "http://localhost:3000"
    app_env: str = "development"
    log_level: str = "INFO"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()

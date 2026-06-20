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

    # AI provider settings
    ai_provider: str = "anthropic"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-20241022"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ai_max_tokens: int = 1024
    ai_temperature: float = 0.7
    nvidia_api_key: str = ""
    nvidia_nim_model: str = "meta/llama-3.1-8b-instruct"
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_monthly: str = ""
    stripe_price_id_yearly: str = ""
    stripe_success_url: str = "http://localhost:3000?checkout=success"
    stripe_cancel_url: str = "http://localhost:3000?checkout=cancel"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()

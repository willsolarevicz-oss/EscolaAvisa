from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./escolaavisa.db"
    jwt_secret: str = "changeme"

    discord_application_id: str = ""
    discord_public_key: str = ""
    discord_token: str = ""
    discord_guild_id: str = ""
    discord_canal_id: str = ""


settings = Settings()

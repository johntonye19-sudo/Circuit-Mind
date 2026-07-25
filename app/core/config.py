from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CircuitMind Core Infrastructure"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # PostgreSQL & pgvector setup
    POSTGRES_USER: str = "circuitmind"
    POSTGRES_PASSWORD: str = "circuitmind_secret"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "circuitmind_db"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        case_sensitive = True

settings = Settings()

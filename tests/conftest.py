import pytest
from nacl.signing import SigningKey
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.main import app


@pytest.fixture
def signing_key() -> SigningKey:
    key = SigningKey.generate()
    settings.discord_public_key = key.verify_key.encode().hex()
    return key


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    session = testing_session_local()
    yield session
    session.close()
    app.dependency_overrides.clear()

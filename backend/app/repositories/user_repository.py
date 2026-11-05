from fastapi import Depends
from pymongo.database import Database

from app.core.database import get_metadata_db
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Database | None = None) -> None:
        super().__init__(User, "users", db=db)

    def get_by_email(self, email: str) -> User | None:
        return self.find_one({"email": email.lower().strip()})


def get_user_repository(db: Database = Depends(get_metadata_db)) -> UserRepository:
    return UserRepository(db=db)

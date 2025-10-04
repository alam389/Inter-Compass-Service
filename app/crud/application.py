"""
Application CRUD operations
"""
from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationUpdate


class CRUDApplication(CRUDBase[Application, ApplicationCreate, ApplicationUpdate]):
    def create_with_user(
        self, db: Session, *, obj_in: ApplicationCreate, user_id: int
    ) -> Application:
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Application]:
        return (
            db.query(self.model)
            .filter(Application.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_multi_by_internship(
        self, db: Session, *, internship_id: int, skip: int = 0, limit: int = 100
    ) -> List[Application]:
        return (
            db.query(self.model)
            .filter(Application.internship_id == internship_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def is_owner(self, application: Application, user_id: int) -> bool:
        return application.user_id == user_id


application = CRUDApplication(Application)

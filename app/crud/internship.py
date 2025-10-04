"""
Internship CRUD operations
"""
from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.crud.base import CRUDBase
from app.models.internship import Internship
from app.schemas.internship import InternshipCreate, InternshipUpdate


class CRUDInternship(CRUDBase[Internship, InternshipCreate, InternshipUpdate]):
    def create_with_owner(
        self, db: Session, *, obj_in: InternshipCreate, owner_id: int
    ) -> Internship:
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data, created_by=owner_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_owner(
        self, db: Session, *, owner_id: int, skip: int = 0, limit: int = 100
    ) -> List[Internship]:
        return (
            db.query(self.model)
            .filter(Internship.created_by == owner_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search(
        self,
        db: Session,
        *,
        query: Optional[str] = None,
        company: Optional[str] = None,
        location: Optional[str] = None,
        remote: Optional[bool] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        skills: Optional[List[str]] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Internship]:
        """Search internships with various filters"""
        q = db.query(self.model).filter(Internship.is_active == True)
        
        if query:
            q = q.filter(
                or_(
                    Internship.title.ilike(f"%{query}%"),
                    Internship.description.ilike(f"%{query}%"),
                    Internship.company.ilike(f"%{query}%")
                )
            )
        
        if company:
            q = q.filter(Internship.company.ilike(f"%{company}%"))
        
        if location:
            q = q.filter(Internship.location.ilike(f"%{location}%"))
        
        if remote is not None:
            q = q.filter(Internship.remote == remote)
        
        if min_salary is not None:
            q = q.filter(Internship.salary >= min_salary)
        
        if max_salary is not None:
            q = q.filter(Internship.salary <= max_salary)
        
        if skills:
            for skill in skills:
                q = q.filter(Internship.skills_required.ilike(f"%{skill}%"))
        
        return q.offset(skip).limit(limit).all()

    def is_owner(self, internship: Internship, user_id: int) -> bool:
        return internship.created_by == user_id


internship = CRUDInternship(Internship)

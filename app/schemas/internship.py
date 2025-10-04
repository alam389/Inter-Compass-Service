"""
Internship schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class InternshipBase(BaseModel):
    """Base internship schema"""
    title: str
    company: str
    description: str
    location: Optional[str] = None
    remote: bool = False
    duration_weeks: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    salary: Optional[float] = None
    currency: str = "USD"
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    skills_required: Optional[str] = None


class InternshipCreate(InternshipBase):
    """Internship creation schema"""
    pass


class InternshipUpdate(BaseModel):
    """Internship update schema"""
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    duration_weeks: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    salary: Optional[float] = None
    currency: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    skills_required: Optional[str] = None
    is_active: Optional[bool] = None


class InternshipInDBBase(InternshipBase):
    """Base internship in database schema"""
    id: int
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Internship(InternshipInDBBase):
    """Internship response schema"""
    pass


class InternshipInDB(InternshipInDBBase):
    """Internship in database schema"""
    pass


class InternshipSearch(BaseModel):
    """Internship search parameters"""
    query: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    skills: Optional[List[str]] = None
    page: int = 1
    limit: int = 20

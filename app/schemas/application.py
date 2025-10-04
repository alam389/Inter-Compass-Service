"""
Application schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.application import ApplicationStatus


class ApplicationBase(BaseModel):
    """Base application schema"""
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    additional_info: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    """Application creation schema"""
    internship_id: int


class ApplicationUpdate(BaseModel):
    """Application update schema"""
    status: Optional[ApplicationStatus] = None
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    additional_info: Optional[str] = None
    notes: Optional[str] = None


class ApplicationInDBBase(ApplicationBase):
    """Base application in database schema"""
    id: int
    user_id: int
    internship_id: int
    status: ApplicationStatus
    applied_at: datetime
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class Application(ApplicationInDBBase):
    """Application response schema"""
    pass


class ApplicationInDB(ApplicationInDBBase):
    """Application in database schema"""
    pass


class ApplicationWithDetails(Application):
    """Application with user and internship details"""
    user: Optional[dict] = None
    internship: Optional[dict] = None

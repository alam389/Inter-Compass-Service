"""
User schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class UserBase(BaseModel):
    """Base user schema"""
    email: str
    username: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema"""
    password: str


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None


class UserInDBBase(UserBase):
    """Base user in database schema"""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User(UserInDBBase):
    """User response schema"""
    pass


class UserInDB(UserInDBBase):
    """User in database schema with hashed password"""
    hashed_password: str

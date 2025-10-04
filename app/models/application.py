"""
Application model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ApplicationStatus(str, enum.Enum):
    """Application status enum"""
    PENDING = "pending"
    REVIEWED = "reviewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Application(Base):
    """Application model"""
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)
    cover_letter = Column(Text, nullable=True)
    resume_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="applications")
    internship = relationship("Internship", back_populates="applications")
    
    def __repr__(self):
        return f"<Application(id={self.id}, user_id={self.user_id}, internship_id={self.internship_id}, status='{self.status}')>"

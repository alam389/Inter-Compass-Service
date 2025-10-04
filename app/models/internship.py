"""
Internship model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Internship(Base):
    """Internship model"""
    __tablename__ = "internships"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    company = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=True)
    remote = Column(Boolean, default=False)
    duration_weeks = Column(Integer, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    salary = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    requirements = Column(Text, nullable=True)
    benefits = Column(Text, nullable=True)
    skills_required = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="internships")
    applications = relationship("Application", back_populates="internship")
    
    def __repr__(self):
        return f"<Internship(id={self.id}, title='{self.title}', company='{self.company}')>"

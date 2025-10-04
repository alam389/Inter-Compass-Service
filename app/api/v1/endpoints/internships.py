"""
Internship endpoints
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.internship import Internship, InternshipCreate, InternshipUpdate, InternshipSearch
from app.schemas.user import User
from app.crud import internship as internship_crud
from app.crud import user as user_crud

router = APIRouter()


@router.post("/", response_model=Internship)
def create_internship(
    *,
    db: Session = Depends(get_db),
    internship_in: InternshipCreate,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Create new internship
    """
    internship = internship_crud.create_with_owner(
        db=db, obj_in=internship_in, owner_id=current_user.id
    )
    return internship


@router.get("/", response_model=List[Internship])
def read_internships(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve internships
    """
    internships = internship_crud.get_multi(db, skip=skip, limit=limit)
    return internships


@router.get("/search", response_model=List[Internship])
def search_internships(
    *,
    db: Session = Depends(get_db),
    search_params: InternshipSearch = Depends(),
) -> Any:
    """
    Search internships
    """
    internships = internship_crud.search(
        db=db, 
        query=search_params.query,
        company=search_params.company,
        location=search_params.location,
        remote=search_params.remote,
        min_salary=search_params.min_salary,
        max_salary=search_params.max_salary,
        skills=search_params.skills,
        skip=(search_params.page - 1) * search_params.limit,
        limit=search_params.limit
    )
    return internships


@router.get("/{internship_id}", response_model=Internship)
def read_internship(
    *,
    db: Session = Depends(get_db),
    internship_id: int,
) -> Any:
    """
    Get internship by ID
    """
    internship = internship_crud.get(db, id=internship_id)
    if not internship:
        raise HTTPException(
            status_code=404,
            detail="The internship with this id does not exist in the system",
        )
    return internship


@router.put("/{internship_id}", response_model=Internship)
def update_internship(
    *,
    db: Session = Depends(get_db),
    internship_id: int,
    internship_in: InternshipUpdate,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Update an internship
    """
    internship = internship_crud.get(db, id=internship_id)
    if not internship:
        raise HTTPException(
            status_code=404,
            detail="The internship with this id does not exist in the system",
        )
    if not internship_crud.is_owner(internship, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Not enough permissions"
        )
    internship = internship_crud.update(db, db_obj=internship, obj_in=internship_in)
    return internship


@router.delete("/{internship_id}", response_model=Internship)
def delete_internship(
    *,
    db: Session = Depends(get_db),
    internship_id: int,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Delete an internship
    """
    internship = internship_crud.get(db, id=internship_id)
    if not internship:
        raise HTTPException(
            status_code=404,
            detail="The internship with this id does not exist in the system",
        )
    if not internship_crud.is_owner(internship, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Not enough permissions"
        )
    internship = internship_crud.remove(db, id=internship_id)
    return internship

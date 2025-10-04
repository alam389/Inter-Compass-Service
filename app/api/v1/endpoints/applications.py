"""
Application endpoints
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.application import Application, ApplicationCreate, ApplicationUpdate, ApplicationWithDetails
from app.schemas.user import User
from app.crud import application as application_crud
from app.crud import user as user_crud

router = APIRouter()


@router.post("/", response_model=Application)
def create_application(
    *,
    db: Session = Depends(get_db),
    application_in: ApplicationCreate,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Create new application
    """
    application = application_crud.create_with_user(
        db=db, obj_in=application_in, user_id=current_user.id
    )
    return application


@router.get("/", response_model=List[Application])
def read_applications(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Retrieve current user's applications
    """
    applications = application_crud.get_multi_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return applications


@router.get("/{application_id}", response_model=ApplicationWithDetails)
def read_application(
    *,
    db: Session = Depends(get_db),
    application_id: int,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Get application by ID
    """
    application = application_crud.get(db, id=application_id)
    if not application:
        raise HTTPException(
            status_code=404,
            detail="The application with this id does not exist in the system",
        )
    if not application_crud.is_owner(application, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Not enough permissions"
        )
    return application


@router.put("/{application_id}", response_model=Application)
def update_application(
    *,
    db: Session = Depends(get_db),
    application_id: int,
    application_in: ApplicationUpdate,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Update an application
    """
    application = application_crud.get(db, id=application_id)
    if not application:
        raise HTTPException(
            status_code=404,
            detail="The application with this id does not exist in the system",
        )
    if not application_crud.is_owner(application, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Not enough permissions"
        )
    application = application_crud.update(db, db_obj=application, obj_in=application_in)
    return application


@router.delete("/{application_id}", response_model=Application)
def delete_application(
    *,
    db: Session = Depends(get_db),
    application_id: int,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Delete an application
    """
    application = application_crud.get(db, id=application_id)
    if not application:
        raise HTTPException(
            status_code=404,
            detail="The application with this id does not exist in the system",
        )
    if not application_crud.is_owner(application, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Not enough permissions"
        )
    application = application_crud.remove(db, id=application_id)
    return application

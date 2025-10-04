"""
User endpoints
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import User, UserUpdate
from app.crud import user as user_crud

router = APIRouter()


@router.get("/me", response_model=User)
def read_user_me(
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Get current user
    """
    return current_user


@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Update current user
    """
    user = user_crud.update(db, db_obj=current_user, obj_in=user_in)
    return user


@router.get("/{user_id}", response_model=User)
def read_user_by_id(
    user_id: int,
    current_user: User = Depends(user_crud.get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get a specific user by id
    """
    user = user_crud.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    return user


@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(user_crud.get_current_user),
) -> Any:
    """
    Retrieve users
    """
    users = user_crud.get_multi(db, skip=skip, limit=limit)
    return users

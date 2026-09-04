from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_client_ip, get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserOut
from app.services import audit_service, auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=201,
    summary="Register a new developer account",
    description="Public self-registration. New accounts are always created with the 'developer' role; "
    "only an administrator can promote a user to analyst or admin.",
)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, payload)
    audit_service.record(
        db, user_id=user.id, action="auth.register", resource_type="user", resource_id=user.id,
        ip_address=get_client_ip(request),
    )
    token = auth_service.issue_token_for_user(user)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT access token",
    responses={401: {"description": "Invalid email or password"}, 403: {"description": "Account disabled"}},
)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    if not user:
        from fastapi import HTTPException, status

        audit_service.record(
            db, user_id=None, action="auth.login_failed", metadata={"email": payload.email},
            ip_address=get_client_ip(request),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    audit_service.record(
        db, user_id=user.id, action="auth.login", resource_type="user", resource_id=user.id,
        ip_address=get_client_ip(request),
    )
    token = auth_service.issue_token_for_user(user)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut, summary="Get the current authenticated user's profile")
def read_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/logout", summary="Log out (client should discard the JWT; this call is audited)")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # JWTs are stateless, so logout is enforced client-side by discarding the
    # token. We still audit the event for traceability.
    audit_service.record(
        db, user_id=current_user.id, action="auth.logout", resource_type="user", resource_id=current_user.id,
        ip_address=get_client_ip(request),
    )
    return {"detail": "Logged out. Please discard the access token on the client."}

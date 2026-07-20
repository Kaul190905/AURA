from fastapi import Request, status
from fastapi.responses import JSONResponse

class AURAException(Exception):
    """Base class for AURA exceptions."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code

class NotFoundException(AURAException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)

class UnauthorizedException(AURAException):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)

async def aura_exception_handler(request: Request, exc: AURAException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message},
    )

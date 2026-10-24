from src.model.credentials_model import CredentialsModel
from src.model.hazard_model import HazardModel
from src.model.key_token_model import KeyTokenModel
from src.model.map_segment_model import MapSegmentModel
from src.model.navigation_session_model import (
    NavigationSessionModel,
    NavigationStatus,
)
from src.model.otp_model import OtpModel
from src.model.profile_model import ProfileModel
from src.model.route_model import RouteModel
from src.model.user_model import UserModel

DOCUMENT_MODELS: list = [
    UserModel,
    CredentialsModel,
    OtpModel,
    KeyTokenModel,
    ProfileModel,
    MapSegmentModel,
    RouteModel,
    NavigationSessionModel,
    HazardModel,
]

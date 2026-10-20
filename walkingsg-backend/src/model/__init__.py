from src.model.credentials_model import CredentialsModel
from src.model.key_token_model import KeyTokenModel
from src.model.map_segment_model import MapSegmentModel
from src.model.otp_model import OtpModel
from src.model.route_model import RouteModel
from src.model.user_model import UserModel
from src.model.profile_model import ProfileModel

DOCUMENT_MODELS: list = [
    UserModel,
    CredentialsModel,
    OtpModel,
    KeyTokenModel,
    ProfileModel,
    MapSegmentModel,
    RouteModel,
]

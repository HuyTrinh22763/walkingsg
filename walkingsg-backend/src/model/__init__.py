from src.model.credentials_model import CredentialsModel
from src.model.key_token_model import KeyTokenModel
from src.model.otp_model import OtpModel
from src.model.user_model import UserModel

DOCUMENT_MODELS: list = [
    UserModel,
    CredentialsModel,
    OtpModel,
    KeyTokenModel,
]

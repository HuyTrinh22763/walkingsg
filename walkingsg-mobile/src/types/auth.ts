export interface SignUpRequest {
  user_email: string;
  password: string;
}

export interface SignUpResponse {
  user_id: string;
  user_email: string;
}

export interface OtpVerifyRequest {
  user_email: string;
  otp_code: string;
}

export interface OtpVerifyResponse {
  is_verified: boolean;
}

export interface ResendOtpRequest {
  user_email: string;
}

export interface LoginRequest {
  user_email: string;
  password: string;
}

export interface LoginResponse {
  user_id: string;
  user_email: string;
  access_token: string;
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  user_email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

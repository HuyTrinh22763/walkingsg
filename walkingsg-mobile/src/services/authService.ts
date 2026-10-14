import { apiRequest } from './apiClient';
import type {
  SignUpRequest,
  SignUpResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
  ResendOtpRequest,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth';

export const authService = {
  async signup(payload: SignUpRequest): Promise<SignUpResponse> {
    return apiRequest<SignUpResponse>('/access/signup', {
      method: 'POST',
      body: payload,
    });
  },

  async verifyOtp(payload: OtpVerifyRequest): Promise<OtpVerifyResponse> {
    return apiRequest<OtpVerifyResponse>('/access/verify-otp', {
      method: 'POST',
      body: payload,
    });
  },

  async resendOtp(payload: ResendOtpRequest): Promise<boolean> {
    return apiRequest<boolean>('/access/resend-otp', {
      method: 'POST',
      body: payload,
    });
  },

  async login(payload: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/access/login', {
      method: 'POST',
      body: payload,
    });
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<boolean> {
    return apiRequest<boolean>('/access/forgot-password', {
      method: 'POST',
      body: payload,
    });
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<boolean> {
    return apiRequest<boolean>('/access/reset-password', {
      method: 'POST',
      body: payload,
    });
  },

  async logout(token: string, clientId: string): Promise<boolean> {
    return apiRequest<boolean>('/access/logout', {
      method: 'POST',
      token,
      clientId,
    });
  },
};

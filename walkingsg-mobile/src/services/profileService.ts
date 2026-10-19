import { apiRequest } from './apiClient';
import type {
  DeleteAccountRequest,
  ProfileResponse,
  ProfileUpdateRequest,
} from '../types/profile';

export const profileService = {
  async getProfile(token: string, clientId: string): Promise<ProfileResponse> {
    return apiRequest<ProfileResponse>('/profile', {
      method: 'GET',
      token,
      clientId,
    });
  },

  async updateProfile(
    token: string,
    clientId: string,
    payload: ProfileUpdateRequest
  ): Promise<ProfileResponse> {
    return apiRequest<ProfileResponse>('/profile', {
      method: 'PUT',
      body: payload,
      token,
      clientId,
    });
  },

  async deleteAccount(
    token: string,
    clientId: string,
    payload: DeleteAccountRequest
  ): Promise<boolean> {
    return apiRequest<boolean>('/profile', {
      method: 'DELETE',
      body: payload,
      token,
      clientId,
    });
  },
};
import React, { createContext, useContext, useState, ReactNode, ReactElement } from 'react';
import type { RouteModel, FeedPostModel } from '../constants/mockData';
import { INITIAL_ROUTES, INITIAL_FEED_POSTS } from '../constants/mockData';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
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
import type {
  HeatUvSensitivity,
  MobilityNeeds,
  PreferredPace,
  ProfileResponse,
  ProfileUpdateRequest,
} from '../types/profile';

// Section App Context
export interface UserPreferences {
  fullName: string;
  email: string;
  age: number | null;
  mobilityMode: MobilityNeeds;
  maxStairs: number;
  heatSensitivity: HeatUvSensitivity;
  preferredPace: PreferredPace;
  maxDuration: '15 min' | '30 min' | '45 min' | '60 min';
  isDeclared: boolean;
}

export interface AuthSession {
  userId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface AppContextType {
  user: UserPreferences;
  auth: AuthSession;
  updateUser: (updates: Partial<UserPreferences>) => void;
  saveProfile: (updates: Partial<UserPreferences>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signup: (payload: SignUpRequest) => Promise<SignUpResponse>;
  verifyOtp: (payload: OtpVerifyRequest) => Promise<OtpVerifyResponse>;
  resendOtp: (payload: ResendOtpRequest) => Promise<boolean>;
  login: (payload: LoginRequest) => Promise<LoginResponse>;
  forgotPassword: (payload: ForgotPasswordRequest) => Promise<boolean>;
  resetPassword: (payload: ResetPasswordRequest) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  routes: RouteModel[];
  selectedSort: 'match' | 'stairs' | 'shade';
  setSelectedSort: (sort: 'match' | 'stairs' | 'shade') => void;
  selectedRoute: RouteModel;
  setSelectedRoute: (route: RouteModel) => void;
  feedPosts: FeedPostModel[];
  addFeedPost: (post: Omit<FeedPostModel, 'id' | 'timeAgo'>) => void;
  isMapOutOfBounds: boolean;
  toggleOutOfBounds: () => void;
}

const DEFAULT_USER: UserPreferences = {
  fullName: '',
  email: '',
  age: null,
  mobilityMode: 'None',
  maxStairs: 10,
  heatSensitivity: 'Medium',
  preferredPace: 'Relaxed',
  maxDuration: '45 min',
  isDeclared: false,
};

const DEFAULT_AUTH: AuthSession = {
  userId: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

function toUserPreferences(profile: ProfileResponse, prev: UserPreferences): UserPreferences {
  return {
    ...prev,
    fullName: profile.name,
    age: profile.age,
    mobilityMode: profile.mobility_needs,
    maxStairs: profile.max_stairs_per_route,
    heatSensitivity: profile.heat_uv_sensitivity,
    preferredPace: profile.preferred_pace,
  };
}

function toProfileUpdateRequest(user: UserPreferences): ProfileUpdateRequest {
  const name = user.fullName.trim();
  if (name.length < 2 || name.length > 50) {
    throw new Error('Please enter your full name (2–50 characters) in the Personal Declaration form');
  }
  if (user.age === null || user.age <= 0) {
    throw new Error('Please enter a valid age');
  }
  return {
    name,
    age: user.age,
    mobility_needs: user.mobilityMode,
    heat_uv_sensitivity: user.heatSensitivity,
    max_stairs_per_route: user.maxStairs,
    preferred_pace: user.preferredPace,
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children?: ReactNode }): ReactElement {
  const [user, setUser] = useState<UserPreferences>(DEFAULT_USER);
  const [auth, setAuth] = useState<AuthSession>(DEFAULT_AUTH);

  const [routes] = useState<RouteModel[]>(INITIAL_ROUTES);
  const [selectedSort, setSelectedSort] = useState<'match' | 'stairs' | 'shade'>('match');
  const [selectedRoute, setSelectedRoute] = useState<RouteModel>(INITIAL_ROUTES[0]);
  const [feedPosts, setFeedPosts] = useState<FeedPostModel[]>(INITIAL_FEED_POSTS);
  const [isMapOutOfBounds, setIsMapOutOfBounds] = useState<boolean>(false);

  const requireSession = (): { accessToken: string; userId: string } => {
    if (!auth.accessToken || !auth.userId) {
      throw new Error('You are not logged in');
    }
    return { accessToken: auth.accessToken, userId: auth.userId };
  };

  const updateUser = (updates: Partial<UserPreferences>) => {
    setUser((prev: UserPreferences) => ({ ...prev, ...updates }));
  };

  const saveProfile = async (updates: Partial<UserPreferences>): Promise<void> => {
    const { accessToken, userId } = requireSession();
    const request = toProfileUpdateRequest({ ...user, ...updates });
    const profile = await profileService.updateProfile(accessToken, userId, request);
    setUser((prev: UserPreferences) => toUserPreferences(profile, { ...prev, ...updates }));
  };

  const refreshProfile = async (): Promise<void> => {
    const { accessToken, userId } = requireSession();
    const profile = await profileService.getProfile(accessToken, userId);
    setUser((prev: UserPreferences) => toUserPreferences(profile, prev));
  };

  const signup = async (payload: SignUpRequest): Promise<SignUpResponse> => {
    return await authService.signup(payload);
  };

  const verifyOtp = async (payload: OtpVerifyRequest): Promise<OtpVerifyResponse> => {
    return await authService.verifyOtp(payload);
  };

  const resendOtp = async (payload: ResendOtpRequest): Promise<boolean> => {
    return await authService.resendOtp(payload);
  };

  const login = async (payload: LoginRequest): Promise<LoginResponse> => {
    const res = await authService.login(payload);
    const profile = await profileService.getProfile(res.access_token, res.user_id);
    setAuth({
      userId: res.user_id,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      isAuthenticated: true,
    });
    setUser((prev: UserPreferences) =>
      toUserPreferences(profile, { ...prev, email: res.user_email })
    );
    return res;
  };

  const forgotPassword = async (payload: ForgotPasswordRequest): Promise<boolean> => {
    return await authService.forgotPassword(payload);
  };

  const resetPassword = async (payload: ResetPasswordRequest): Promise<boolean> => {
    return await authService.resetPassword(payload);
  };

  const logoutUser = async () => {
    if (auth.accessToken && auth.userId) {
      try {
        await authService.logout(auth.accessToken, auth.userId);
      } catch {
        // Suppress network errors on logout to ensure client state cleans up regardless
      }
    }
    setAuth(DEFAULT_AUTH);
    setUser(DEFAULT_USER);
  };

  const deleteAccount = async (): Promise<void> => {
    const { accessToken, userId } = requireSession();
    await profileService.deleteAccount(accessToken, userId, { confirmation: true });
    setAuth(DEFAULT_AUTH);
    setUser(DEFAULT_USER);
    setFeedPosts(INITIAL_FEED_POSTS);
  };

  const addFeedPost = (post: Omit<FeedPostModel, 'id' | 'timeAgo'>) => {
    const newPost: FeedPostModel = {
      id: Date.now(),
      timeAgo: 'Just now',
      ...post,
    };
    setFeedPosts((prev: FeedPostModel[]) => [newPost, ...prev]);
  };

  const toggleOutOfBounds = () => {
    setIsMapOutOfBounds((prev: boolean) => !prev);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        auth,
        updateUser,
        saveProfile,
        refreshProfile,
        signup,
        verifyOtp,
        resendOtp,
        login,
        forgotPassword,
        resetPassword,
        logoutUser,
        deleteAccount,
        routes,
        selectedSort,
        setSelectedSort,
        selectedRoute,
        setSelectedRoute,
        feedPosts,
        addFeedPost,
        isMapOutOfBounds,
        toggleOutOfBounds,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
// End Section App Context
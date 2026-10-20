import React, { createContext, useContext, useState, ReactNode, ReactElement } from 'react';
import type { RouteModel, FeedPostModel } from '../constants/mockData';
import { INITIAL_ROUTES, INITIAL_FEED_POSTS } from '../constants/mockData';
import { authService } from '../services/authService';
import { routeService } from '../services/routeService';
import { toRouteCards } from '../types/route';
import type { RouteCoord, RouteDetailOut, RouteSearchOut } from '../types/route';
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

// Section App Context
export interface UserPreferences {
  fullName: string;
  email: string;
  age: number;
  mobilityMode: 'None' | 'Wheelchair' | 'Stroller' | 'Mobility aid';
  maxStairs: number;
  heatSensitivity: 'Low' | 'Medium' | 'High';
  preferredPace: 'Relaxed' | 'Moderate' | 'Brisk';
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
  signup: (payload: SignUpRequest) => Promise<SignUpResponse>;
  verifyOtp: (payload: OtpVerifyRequest) => Promise<OtpVerifyResponse>;
  resendOtp: (payload: ResendOtpRequest) => Promise<boolean>;
  login: (payload: LoginRequest) => Promise<LoginResponse>;
  forgotPassword: (payload: ForgotPasswordRequest) => Promise<boolean>;
  resetPassword: (payload: ResetPasswordRequest) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  deleteAccount: () => void;
  routes: RouteModel[];
  selectedSort: 'match' | 'stairs' | 'shade';
  setSelectedSort: (sort: 'match' | 'stairs' | 'shade') => void;
  selectedRoute: RouteModel;
  setSelectedRoute: (route: RouteModel) => void;
  generateRoutes: (origin: RouteCoord, destination: RouteCoord) => Promise<RouteSearchOut>;
  isRouteLoading: boolean;
  selectedRouteDetail: RouteDetailOut | null;
  fetchRouteDetail: (routeId: string) => Promise<RouteDetailOut>;
  isRouteDetailLoading: boolean;
  feedPosts: FeedPostModel[];
  addFeedPost: (post: Omit<FeedPostModel, 'id' | 'timeAgo'>) => void;
  isMapOutOfBounds: boolean;
  toggleOutOfBounds: () => void;
}

const DEFAULT_USER: UserPreferences = {
  fullName: 'Sam Tan',
  email: 'sam.tan@gmail.com',
  age: 34,
  mobilityMode: 'None',
  maxStairs: 10,
  heatSensitivity: 'Medium',
  preferredPace: 'Relaxed',
  maxDuration: '45 min',
  isDeclared: true,
};

const DEFAULT_AUTH: AuthSession = {
  userId: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children?: ReactNode }): ReactElement {
  const [user, setUser] = useState<UserPreferences>(DEFAULT_USER);
  const [auth, setAuth] = useState<AuthSession>(DEFAULT_AUTH);

  const [routes, setRoutes] = useState<RouteModel[]>(INITIAL_ROUTES);
  const [selectedSort, setSelectedSort] = useState<'match' | 'stairs' | 'shade'>('match');
  const [selectedRoute, setSelectedRouteState] = useState<RouteModel>(INITIAL_ROUTES[0]);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<RouteDetailOut | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [isRouteDetailLoading, setIsRouteDetailLoading] = useState<boolean>(false);
  const [feedPosts, setFeedPosts] = useState<FeedPostModel[]>(INITIAL_FEED_POSTS);
  const [isMapOutOfBounds, setIsMapOutOfBounds] = useState<boolean>(false);

  const updateUser = (updates: Partial<UserPreferences>) => {
    setUser((prev: UserPreferences) => ({ ...prev, ...updates }));
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
    setAuth({
      userId: res.user_id,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      isAuthenticated: true,
    });
    setUser((prev: UserPreferences) => ({ ...prev, email: res.user_email }));
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

  const deleteAccount = () => {
    setAuth(DEFAULT_AUTH);
    setUser({
      fullName: '',
      email: '',
      age: 18,
      mobilityMode: 'None',
      maxStairs: 0,
      heatSensitivity: 'Medium',
      preferredPace: 'Relaxed',
      maxDuration: '30 min',
      isDeclared: false,
    });
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

  const requireSession = (): { token: string; clientId: string } => {
    if (!auth.accessToken || !auth.userId) {
      throw new Error('You must be signed in to plan accessible routes.');
    }
    return { token: auth.accessToken, clientId: auth.userId };
  };

  const setSelectedRoute = (route: RouteModel) => {
    setSelectedRouteState(route);
    setSelectedRouteDetail(null);
  };

  const generateRoutes = async (
    origin: RouteCoord,
    destination: RouteCoord
  ): Promise<RouteSearchOut> => {
    const { token, clientId } = requireSession();
    setIsRouteLoading(true);
    try {
      const result = await routeService.generateRoutes(
        { origin_coord: origin, destination_coord: destination },
        token,
        clientId
      );
      const cards = toRouteCards(result);
      setRoutes(cards);
      setSelectedRouteState(cards[0]);
      setSelectedRouteDetail(null);
      return result;
    } finally {
      setIsRouteLoading(false);
    }
  };

  const fetchRouteDetail = async (routeId: string): Promise<RouteDetailOut> => {
    const { token, clientId } = requireSession();
    setIsRouteDetailLoading(true);
    try {
      const detail = await routeService.findRoute(routeId, token, clientId);
      setSelectedRouteDetail(detail);
      return detail;
    } finally {
      setIsRouteDetailLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        auth,
        updateUser,
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
        generateRoutes,
        isRouteLoading,
        selectedRouteDetail,
        fetchRouteDetail,
        isRouteDetailLoading,
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

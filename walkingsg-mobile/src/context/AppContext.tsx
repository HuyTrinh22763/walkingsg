import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, ReactElement } from 'react';
import type { RouteModel } from '../constants/mockData';
import { INITIAL_ROUTES } from '../constants/mockData';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { routeService } from '../services/routeService';
import { navigationService } from '../services/navigationService';
import { toRouteCards } from '../types/route';
import type { RouteCoord, RouteDetailOut, RouteSearchOut } from '../types/route';
import type {
  NavStartResponse,
  NavTrackResponse,
  NavEndResponse,
} from '../types/navigation';
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
import type {
  CoordinateValidationResponse,
  LocationResponse,
  PointType,
} from '../types/location';
import { useLocationState } from './useLocation';

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
  generateRoutes: (origin: RouteCoord, destination: RouteCoord) => Promise<RouteSearchOut>;
  isRouteLoading: boolean;
  selectedRouteDetail: RouteDetailOut | null;
  fetchRouteDetail: (routeId: string) => Promise<RouteDetailOut>;
  isRouteDetailLoading: boolean;
  activeNavSession: NavStartResponse | null;
  isNavigating: boolean;
  navTracking: NavTrackResponse | null;
  startNavigationSession: (routeId: string) => Promise<NavStartResponse>;
  trackNavPosition: (coord: [number, number], speedKmh: number) => Promise<NavTrackResponse>;
  endNavigationSession: (manualCancel?: boolean) => Promise<NavEndResponse>;
  isMapOutOfBounds: boolean;
  toggleOutOfBounds: () => void;
  origin: LocationResponse | null;
  destination: LocationResponse | null;
  searchLocations: (query: string) => Promise<LocationResponse[]>;
  selectLocation: (
    pointType: PointType,
    location: LocationResponse
  ) => Promise<CoordinateValidationResponse>;
  clearLocation: (pointType: PointType) => void;
  userGpsLocation: { latitude: number; longitude: number } | null;
  gpsStatus: 'prompt' | 'granted' | 'denied';
  requestGpsPermission: () => Promise<boolean>;
  setupInitialGpsLocation: () => Promise<boolean>;
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

  const [routes, setRoutes] = useState<RouteModel[]>(INITIAL_ROUTES);
  const [selectedSort, setSelectedSort] = useState<'match' | 'stairs' | 'shade'>('match');
  const [selectedRoute, setSelectedRouteState] = useState<RouteModel>(INITIAL_ROUTES[0]);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<RouteDetailOut | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [isRouteDetailLoading, setIsRouteDetailLoading] = useState<boolean>(false);
  const [isMapOutOfBounds, setIsMapOutOfBounds] = useState<boolean>(false);
  const [activeNavSession, setActiveNavSession] = useState<NavStartResponse | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navTracking, setNavTracking] = useState<NavTrackResponse | null>(null);
  const locationState = useLocationState();

  const requireSession = (): {
    accessToken: string;
    userId: string;
    token: string;
    clientId: string;
  } => {
    if (!auth.accessToken || !auth.userId) {
      throw new Error('You are not logged in');
    }
    return {
      accessToken: auth.accessToken,
      userId: auth.userId,
      token: auth.accessToken,
      clientId: auth.userId,
    };
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

  useEffect(() => {
    if (auth.isAuthenticated && !locationState.origin && locationState.gpsStatus === 'prompt') {
      locationState.setupInitialGpsLocation().catch((err) => {
        console.warn('GPS setup error on auth change:', err);
      });
    }
  }, [auth.isAuthenticated, locationState.origin, locationState.gpsStatus, locationState.setupInitialGpsLocation]);

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
  };

  const toggleOutOfBounds = () => {
    setIsMapOutOfBounds((prev: boolean) => !prev);
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
      try {
        const detail = await routeService.findRoute(result.starred_route.route_id, token, clientId);
        setSelectedRouteDetail(detail);
      } catch {
        setSelectedRouteDetail(null);
      }
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

  const startNavigationSession = async (routeId: string): Promise<NavStartResponse> => {
    const { token, clientId } = requireSession();
    const session = await navigationService.startNavigation(
      { route_id: routeId },
      token,
      clientId
    );
    setActiveNavSession(session);
    setIsNavigating(true);
    setNavTracking(null);
    return session;
  };

  const trackNavPosition = useCallback(async (
    coord: [number, number],
    speedKmh: number
  ): Promise<NavTrackResponse> => {
    if (!auth.accessToken || !auth.userId) {
      throw new Error('You are not logged in');
    }
    if (!activeNavSession) {
      throw new Error('No active navigation session');
    }
    const update = await navigationService.trackPosition(
      {
        session_id: activeNavSession.session_id,
        current_coord: coord,
        speed_kmh: speedKmh,
      },
      auth.accessToken,
      auth.userId
    );
    setNavTracking(update);
    if (update.status === 'COMPLETED') {
      setIsNavigating(false);
    }
    return update;
  }, [auth.accessToken, auth.userId, activeNavSession]);

  const endNavigationSession = async (
    manualCancel = false
  ): Promise<NavEndResponse> => {
    const { token, clientId } = requireSession();
    if (!activeNavSession) {
      throw new Error('No active navigation session');
    }
    const result = await navigationService.endNavigation(
      {
        session_id: activeNavSession.session_id,
        manual_cancel: manualCancel,
      },
      token,
      clientId
    );
    setActiveNavSession(null);
    setIsNavigating(false);
    return result;
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
        generateRoutes,
        isRouteLoading,
        selectedRouteDetail,
        fetchRouteDetail,
        isRouteDetailLoading,
        activeNavSession,
        isNavigating,
        navTracking,
        startNavigationSession,
        trackNavPosition,
        endNavigationSession,
        isMapOutOfBounds,
        toggleOutOfBounds,
        ...locationState,
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
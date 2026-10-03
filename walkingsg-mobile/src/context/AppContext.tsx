import React, { createContext, useContext, useState, ReactNode, ReactElement } from 'react';
import type { RouteModel, FeedPostModel } from '../constants/mockData';
import { INITIAL_ROUTES, INITIAL_FEED_POSTS } from '../constants/mockData';

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

interface AppContextType {
  user: UserPreferences;
  updateUser: (updates: Partial<UserPreferences>) => void;
  logoutUser: () => void;
  deleteAccount: () => void;
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children?: ReactNode }): ReactElement {
  const [user, setUser] = useState<UserPreferences>(DEFAULT_USER);

  const [routes] = useState<RouteModel[]>(INITIAL_ROUTES);
  const [selectedSort, setSelectedSort] = useState<'match' | 'stairs' | 'shade'>('match');
  const [selectedRoute, setSelectedRoute] = useState<RouteModel>(INITIAL_ROUTES[0]);
  const [feedPosts, setFeedPosts] = useState<FeedPostModel[]>(INITIAL_FEED_POSTS);
  const [isMapOutOfBounds, setIsMapOutOfBounds] = useState<boolean>(false);

  const updateUser = (updates: Partial<UserPreferences>) => {
    setUser((prev: UserPreferences) => ({ ...prev, ...updates }));
  };

  const logoutUser = () => {
    // Terminate session, preserve baseline defaults for next sign in
    setUser(DEFAULT_USER);
  };

  const deleteAccount = () => {
    // PDPA erasure: purge preferences and user data back to unconfigured state
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

  return (
    <AppContext.Provider
      value={{
        user,
        updateUser,
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

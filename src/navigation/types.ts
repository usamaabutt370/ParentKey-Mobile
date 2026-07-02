import type { NavigatorScreenParams } from '@react-navigation/native';
import type { UserRole } from '../types/auth';
import type { ChildProfileDraft } from '../types/child';

export type AuthStackParamList = {
  Login: undefined;
  Signup: { role?: UserRole } | undefined;
  ForgotPassword: undefined;
};

export type ChildrenStackParamList = {
  ChildrenList: undefined;
  ChildDetail: {
    childId: string;
  };
  AddChildProfile: undefined;
  AddChildAccount: {
    profile: ChildProfileDraft;
  };
  AddChildSuccess: {
    profile: ChildProfileDraft;
    email: string;
  };
};

export type ControlsStackParamList = {
  ControlsList: undefined;
  SelectChild: {
    mode: 'block' | 'limit';
  };
  SelectApps: {
    mode: 'block' | 'limit';
    childId: string;
  };
};

export type ParentTabParamList = {
  Home: undefined;
  Children: NavigatorScreenParams<ChildrenStackParamList> | undefined;
  Controls: NavigatorScreenParams<ControlsStackParamList> | undefined;
  Reports: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  ParentTabs: undefined;
  ChildHome: undefined;
};

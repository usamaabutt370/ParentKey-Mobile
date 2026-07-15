import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ChildProfileDraft } from '../types/child';

export type AuthStackParamList = {
  DeviceRole: undefined;
  Welcome: undefined;
  AddChildIntro: undefined;
  InstallChildApp: undefined;
  LinkChildQrAuth: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword:
    | {
        returnTo?: 'LinkChildQrAuth';
      }
    | undefined;
};

export type ParentOnboardingParamList = {
  AddChildIntro: undefined;
  InstallChildApp: undefined;
  ShowPairingQr: undefined;
  PairingSuccess: {
    childId: string;
  };
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
  PairChildQr: undefined;
  PairChildSuccess: {
    childId: string;
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

export type ChildStackParamList = {
  ChildConsent: undefined;
  ChildProfileSetup: undefined;
  ChildPermissions: undefined;
  ChildDeviceSync: undefined;
  ChildHome: undefined;
};

export type AppStackParamList = {
  ParentTabs: undefined;
  ChildFlow: undefined;
};

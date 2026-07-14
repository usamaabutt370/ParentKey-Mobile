import type { ImageSourcePropType } from 'react-native';

export const PARENT_ONBOARDING_TOTAL_STEPS = 4;

export type WelcomeOverlayKind =
  | 'appBlock'
  | 'screenTime'
  | 'sleepSchedule'
  | 'location'
  | 'webControl'
  | 'reward';

export type WelcomeSlide =
  | {
      layout: 'compare';
      before: ImageSourcePropType;
      after: ImageSourcePropType;
      overlay: Exclude<WelcomeOverlayKind, 'reward'>;
      title: string;
      buttonTitle: string;
      desaturateBefore?: boolean;
    }
  | {
      layout: 'grid';
      images: [
        ImageSourcePropType,
        ImageSourcePropType,
        ImageSourcePropType,
        ImageSourcePropType,
      ];
      overlay: 'reward';
      title: string;
      buttonTitle: string;
    };

export const PARENT_WELCOME_SLIDES: readonly WelcomeSlide[] = [
  {
    layout: 'compare',
    before: require('../../assets/onboarding/block-before.png'),
    after: require('../../assets/onboarding/block-after.png'),
    overlay: 'appBlock',
    title: "Block apps to reduce your kid's aggression and irritability",
    buttonTitle: 'Continue',
  },
  {
    layout: 'compare',
    before: require('../../assets/onboarding/grades-before.png'),
    after: require('../../assets/onboarding/grades-after.png'),
    overlay: 'screenTime',
    title: 'Reduce screen time to improve grades and school performance',
    buttonTitle: 'Continue',
  },
  {
    layout: 'compare',
    before: require('../../assets/onboarding/sleep-before.png'),
    after: require('../../assets/onboarding/sleep-after.png'),
    overlay: 'sleepSchedule',
    title: 'Set a sleep schedule to help your kid fall asleep and wake up on time',
    buttonTitle: 'Continue',
  },
  {
    layout: 'compare',
    before: require('../../assets/onboarding/location-before.png'),
    after: require('../../assets/onboarding/location-after.png'),
    overlay: 'location',
    title:
      "Track your kid's location to always know where they are without the need for calls or texts",
    buttonTitle: 'Continue',
  },
  {
    layout: 'compare',
    before: require('../../assets/onboarding/web-before.png'),
    after: require('../../assets/onboarding/web-after.png'),
    overlay: 'webControl',
    title: 'Turn on web control to keep your kid safe online',
    buttonTitle: 'Continue',
    desaturateBefore: true,
  },
  {
    layout: 'grid',
    images: [
      require('../../assets/onboarding/welcome-chores.png'),
      require('../../assets/onboarding/welcome-reading.png'),
      require('../../assets/onboarding/welcome-phone.png'),
      require('../../assets/onboarding/welcome-exercise.png'),
    ],
    overlay: 'reward',
    title: 'Reward your kid with extra screen time for completing useful tasks',
    buttonTitle: 'Get started',
  },
];

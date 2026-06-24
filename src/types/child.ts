export type ChildAvatarId =
  | 'fox'
  | 'bear'
  | 'panda'
  | 'lion'
  | 'koala'
  | 'unicorn'
  | 'frog'
  | 'octopus';

export type ChildProfileDraft = {
  firstName: string;
  lastName: string;
  age?: string;
  avatarId?: ChildAvatarId;
};

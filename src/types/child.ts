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

/** Child account: `children` row joined with linked `profiles` row. */
export type ChildProfile = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  parentId: string;
  age: number | null;
  avatarId: ChildAvatarId | null;
  createdAt: string;
  updatedAt: string;
};

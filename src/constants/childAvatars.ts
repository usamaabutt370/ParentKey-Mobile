import type { ChildAvatarId } from '../types/child';

export type ChildAvatarOption = {
  id: ChildAvatarId;
  emoji: string;
  background: string;
};

export const CHILD_AVATARS: ChildAvatarOption[] = [
  { id: 'fox', emoji: '🦊', background: 'rgba(251, 146, 60, 0.22)' },
  { id: 'bear', emoji: '🐻', background: 'rgba(180, 83, 9, 0.22)' },
  { id: 'panda', emoji: '🐼', background: 'rgba(148, 163, 184, 0.22)' },
  { id: 'lion', emoji: '🦁', background: 'rgba(245, 158, 11, 0.22)' },
  { id: 'koala', emoji: '🐨', background: 'rgba(100, 116, 139, 0.22)' },
  { id: 'unicorn', emoji: '🦄', background: 'rgba(168, 85, 247, 0.22)' },
  { id: 'frog', emoji: '🐸', background: 'rgba(16, 185, 129, 0.22)' },
  { id: 'octopus', emoji: '🐙', background: 'rgba(236, 72, 153, 0.22)' },
];

export function getChildAvatar(id?: ChildAvatarId) {
  return CHILD_AVATARS.find(avatar => avatar.id === id);
}

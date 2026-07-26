import { supabase } from './supabase';

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Permanently deletes the signed-in user's account via Supabase RPC.
 * Parents: deletes linked child accounts first, then the parent.
 * Children: deletes only the child account.
 */
export async function deleteOwnAccount(): Promise<DeleteAccountResult> {
  const { error } = await supabase.rpc('delete_own_account');

  if (error) {
    return { ok: false, message: mapDeleteAccountError(error.message) };
  }

  return { ok: true };
}

function mapDeleteAccountError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('not authenticated')) {
    return 'You must be signed in to delete your account.';
  }

  if (lowerMessage.includes('profile not found')) {
    return 'Your profile could not be found. Please sign in again and try once more.';
  }

  if (
    lowerMessage.includes('delete_own_account') &&
    lowerMessage.includes('does not exist')
  ) {
    return 'Delete is not available yet. Apply the latest database migration and try again.';
  }

  return message;
}

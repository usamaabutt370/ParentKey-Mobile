import { supabase } from './supabase';

const AVATAR_BUCKET = 'child-avatars';

function guessContentType(uri: string): string {
  const lowered = uri.toLowerCase();
  if (lowered.includes('.png')) {
    return 'image/png';
  }
  if (lowered.includes('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function extensionForContentType(contentType: string): string {
  if (contentType === 'image/png') {
    return 'png';
  }
  if (contentType === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

export async function uploadChildAvatar(params: {
  childId: string;
  localUri: string;
}): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  try {
    const contentType = guessContentType(params.localUri);
    const extension = extensionForContentType(contentType);
    const objectPath = `${params.childId}/avatar.${extension}`;

    const response = await fetch(params.localUri);
    if (!response.ok) {
      return { ok: false, message: 'Could not read the selected photo.' };
    }

    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(objectPath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return { ok: false, message: mapAvatarUploadError(uploadError.message) };
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

    return {
      ok: true,
      publicUrl: `${data.publicUrl}?t=${Date.now()}`,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not upload your photo. Please try again.';
    return { ok: false, message: mapAvatarUploadError(message) };
  }
}

function mapAvatarUploadError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('bucket') ||
    lowerMessage.includes('row-level security') ||
    lowerMessage.includes('not found')
  ) {
    return 'Photo upload is not set up yet. Apply migration 014_child_avatar_url.sql, then try again.';
  }

  return message;
}

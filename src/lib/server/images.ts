import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert } from '$lib/types/database';
import { optimizeImage } from './imageOptimizer';


export type PeakImage = Tables<'peak_images'>;
export type PeakImageInsert = TablesInsert<'peak_images'>;
export { PHOTO_CATEGORIES, type PhotoCategory } from '$lib/data/categories';

export type PeakImageWithUploader = PeakImage & {
  uploader: { id: string; display_name: string | null } | null;
};

export { isAdmin } from './admin';

const STORAGE_BUCKET = 'peak-images';

// Get images for a peak (approved + public only, with uploader info)
export async function getImagesForPeak(
  supabase: SupabaseClient<Database>,
  peakId: string
): Promise<PeakImageWithUploader[]> {
  const { data, error } = await supabase
    .from('peak_images')
    .select('*')
    .eq('peak_id', peakId)
    .eq('status', 'approved')
    .eq('is_private', false)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching peak images', { error: error });
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get uploader profiles
  const uploaderIds = [...new Set(data.map((img) => img.uploaded_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', uploaderIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return data.map((img) => ({
    ...img,
    uploader: profileMap.get(img.uploaded_by) ?? null
  }));
}

export function getImageUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string
): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

// Upload an image for a peak
export async function uploadPeakImage(
  supabase: SupabaseClient<Database>,
  peakId: string,
  userId: string,
  file: File,
  caption?: string,
  isPrivate?: boolean,
  category?: string
): Promise<PeakImage> {
  const arrayBuffer = await file.arrayBuffer();
  const optimizedBuffer = await optimizeImage(arrayBuffer, {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 80
  });

  const filename = `${peakId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, optimizedBuffer, {
      cacheControl: '31536000',
      contentType: 'image/jpeg',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data: existing } = await supabase
    .from('peak_images')
    .select('display_order')
    .eq('peak_id', peakId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('peak_images')
    .insert({
      peak_id: peakId,
      uploaded_by: userId,
      storage_path: filename,
      caption: caption || null,
      display_order: nextOrder,
      is_private: isPrivate ?? false,
      category: category || null
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
    throw error;
  }

  return data;
}

export async function deletePeakImage(
  supabase: SupabaseClient<Database>,
  imageId: string
): Promise<void> {
  const { data: image, error: fetchError } = await supabase
    .from('peak_images')
    .select('storage_path')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([image.storage_path]);

  if (storageError) {
    logger.error('Error deleting from storage', { error: storageError });
  }

  const { error } = await supabase
    .from('peak_images')
    .delete()
    .eq('id', imageId);

  if (error) throw error;
}

export async function updateImageCaption(
  supabase: SupabaseClient<Database>,
  imageId: string,
  caption: string
): Promise<PeakImage> {
  const { data, error } = await supabase
    .from('peak_images')
    .update({ caption })
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function reorderImages(
  supabase: SupabaseClient<Database>,
  peakId: string,
  imageIds: string[]
): Promise<void> {
  const updates = imageIds.map((id, index) =>
    supabase
      .from('peak_images')
      .update({ display_order: index })
      .eq('id', id)
      .eq('peak_id', peakId)
  );

  await Promise.all(updates);
}

// Flag an image — increments flag_count and auto-flags at threshold
export async function flagImage(
  supabase: SupabaseClient<Database>,
  imageId: string,
  userId: string,
  reason: 'inappropriate' | 'spam' | 'inaccurate' | 'other',
  details?: string
): Promise<void> {
  // Insert the flag
  const { error: flagError } = await supabase
    .from('content_flags')
    .insert({
      content_type: 'photo',
      content_id: imageId,
      reported_by: userId,
      reason,
      details: details || null
    });

  if (flagError) {
    if (flagError.code === '23505') {
      throw new Error('You have already reported this photo');
    }
    throw flagError;
  }

  // Increment flag_count on the image
  const { data: image } = await supabase
    .from('peak_images')
    .select('flag_count')
    .eq('id', imageId)
    .single();

  const newCount = (image?.flag_count ?? 0) + 1;
  const updates: Record<string, unknown> = { flag_count: newCount };

  // Auto-flag at 3 reports
  if (newCount >= 3) {
    updates.status = 'flagged';
  }

  await supabase
    .from('peak_images')
    .update(updates)
    .eq('id', imageId);
}

export type FlaggedImage = PeakImage & {
  peak: { id: string; name: string; slug: string };
  uploader: { id: string; display_name: string | null } | null;
};

// Get flagged images for admin moderation
export async function getFlaggedImages(
  supabase: SupabaseClient<Database>
): Promise<FlaggedImage[]> {
  const { data, error } = await supabase
    .from('peak_images')
    .select(`
      *,
      peak:peaks(id, name, slug)
    `)
    .eq('status', 'flagged')
    .order('flag_count', { ascending: false });

  if (error) {
    logger.error('Error fetching flagged images', { error: error });
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get uploader profiles
  const uploaderIds = [...new Set(data.map((img) => img.uploaded_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', uploaderIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return data.map((img) => ({
    ...img,
    peak: img.peak as FlaggedImage['peak'],
    uploader: profileMap.get(img.uploaded_by) ?? null
  }));
}

// Admin moderation action
export async function moderateImage(
  supabase: SupabaseClient<Database>,
  imageId: string,
  action: 'approve' | 'remove',
  reviewerId: string
): Promise<void> {
  const newStatus = action === 'approve' ? 'approved' : 'removed';

  // Update image status (and reset flag_count if approving)
  const updates: Record<string, unknown> = { status: newStatus };
  if (action === 'approve') {
    updates.flag_count = 0;
  }

  const { error } = await supabase
    .from('peak_images')
    .update(updates)
    .eq('id', imageId);

  if (error) throw error;

  // Resolve related content flags
  await supabase
    .from('content_flags')
    .update({
      status: action === 'approve' ? 'dismissed' : 'actioned',
      reviewed_by: reviewerId
    })
    .eq('content_type', 'photo')
    .eq('content_id', imageId)
    .eq('status', 'pending');
}

// Extended type with peak info for user's photo gallery
export type UserPhotoWithPeak = PeakImage & {
  peak: {
    id: string;
    name: string;
    slug: string;
  };
  url: string;
};

export async function getUserPhotos(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserPhotoWithPeak[]> {
  const { data, error } = await supabase
    .from('peak_images')
    .select(`
      *,
      peak:peaks(id, name, slug)
    `)
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching user photos', { error: error });
    return [];
  }

  return (data ?? []).map((photo) => ({
    ...photo,
    peak: photo.peak as UserPhotoWithPeak['peak'],
    url: getImageUrl(supabase, photo.storage_path)
  }));
}

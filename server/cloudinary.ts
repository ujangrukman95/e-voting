import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Extracts public_id from a Cloudinary URL.
 * Example: https://res.cloudinary.com/demo/image/upload/v1570979139/evoting/logo_123.jpg => evoting/logo_123
 */
export function extractCloudinaryPublicId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];
    const pathParts = path.split('/');
    // Filter out transformation tags (e.g. w_400,c_fill) and version tags (v123456789)
    const cleanParts = pathParts.filter(
      (part) => !/^v\d+$/.test(part) && !/^[a-z]_[a-z0-9_,]+/i.test(part)
    );
    path = cleanParts.join('/');

    const lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
      path = path.substring(0, lastDot);
    }
    return path || null;
  } catch (err) {
    return null;
  }
}

/**
 * Deletes an image from Cloudinary using URL or public_id.
 */
export async function deleteFromCloudinary(urlOrPublicId: string | undefined | null): Promise<boolean> {
  if (!urlOrPublicId) return false;
  const publicId = urlOrPublicId.includes('cloudinary.com')
    ? extractCloudinaryPublicId(urlOrPublicId)
    : urlOrPublicId;
  
  if (!publicId) return false;

  if (!isCloudinaryConfigured()) {
    console.log('[Cloudinary Delete] Skipping Cloudinary destroy (Credentials not configured in env). Public ID:', publicId);
    return false;
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId);
    console.log('[Cloudinary Delete] Successfully deleted image from Cloudinary:', publicId, res);
    return res.result === 'ok';
  } catch (err) {
    console.error('[Cloudinary Delete] Failed to delete image from Cloudinary:', err);
    return false;
  }
}

/**
 * Uploads a base64 string or file URL to Cloudinary.
 */
export async function uploadToCloudinary(
  fileBase64OrUrl: string,
  folder?: string
): Promise<{ url: string; public_id: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) not configured.');
  }

  // Use CLOUDINARY_FOLDER from env if provided, or default to specified folder / 'evoting'
  const rootFolder = process.env.CLOUDINARY_FOLDER || 'evoting';
  let targetFolder = folder ? folder : rootFolder;

  // If subfolder is provided (e.g. 'logo' or 'candidates') and rootFolder is configured, combine them
  if (folder && process.env.CLOUDINARY_FOLDER && !folder.startsWith(rootFolder)) {
    targetFolder = `${rootFolder}/${folder.replace(/^evoting\//, '')}`;
  }

  const result = await cloudinary.uploader.upload(fileBase64OrUrl, {
    folder: targetFolder,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
}

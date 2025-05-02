/**
 * Formats a file size in bytes to a human-readable string
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}

/**
 * Validates a video file's type and size
 * 
 * @param file - File object to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns Object containing validation result and error message if any
 */
export function validateVideoFile(file: File, maxSizeMB: number = 500): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an MP4, MOV, or AVI file.'
    };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds the ${maxSizeMB}MB limit.`
    };
  }
  
  return { valid: true };
}

/**
 * Gets a file extension from a filename
 * 
 * @param filename - Name of the file
 * @returns File extension (e.g., "mp4") or empty string if no extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

/**
 * Generates a unique filename with timestamp
 * 
 * @param originalName - Original filename
 * @returns New filename with timestamp
 */
export function generateUniqueFilename(originalName: string): string {
  const extension = getFileExtension(originalName);
  const baseFileName = originalName.substring(0, originalName.lastIndexOf('.'));
  const timestamp = new Date().getTime();
  
  return `${baseFileName}_${timestamp}.${extension}`;
}

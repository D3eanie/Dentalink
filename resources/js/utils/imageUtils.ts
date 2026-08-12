// utils/imageUtils.ts - Complete Image handling utilities

export interface ImageValidationResult {
    isValid: boolean;
    errors: string[];
    validFiles: File[];
    invalidFiles: { file: File; error: string }[];
}

export interface ImageResizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Validate image files based on type, size, and quantity constraints
 */
export const validateImageFiles = (
    files: File[],
    options: {
        maxFiles?: number;
        maxSizePerFile?: number; // in MB
        allowedTypes?: string[];
        existingCount?: number;
    } = {}
): ImageValidationResult => {
    const {
        maxFiles = 5,
        maxSizePerFile = 2, // 2MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        existingCount = 0
    } = options;

    const errors: string[] = [];
    const validFiles: File[] = [];
    const invalidFiles: { file: File; error: string }[] = [];

    // Check total file count
    if (files.length + existingCount > maxFiles) {
        errors.push(`Maximum ${maxFiles} images allowed. You're trying to add ${files.length} more to ${existingCount} existing images.`);
    }

    files.forEach((file) => {
        const fileErrors: string[] = [];

        // Check file type
        if (!allowedTypes.includes(file.type)) {
            fileErrors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        }

        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSizePerFile) {
            fileErrors.push(`File size (${fileSizeMB.toFixed(2)}MB) exceeds limit of ${maxSizePerFile}MB`);
        }

        // Check if file name is too long
        if (file.name.length > 255) {
            fileErrors.push('File name is too long (max 255 characters)');
        }

        if (fileErrors.length > 0) {
            invalidFiles.push({ file, error: fileErrors.join(', ') });
        } else {
            validFiles.push(file);
        }
    });

    // Limit valid files to remaining slots
    const remainingSlots = Math.max(0, maxFiles - existingCount);
    const finalValidFiles = validFiles.slice(0, remainingSlots);

    if (validFiles.length > remainingSlots) {
        errors.push(`Only ${remainingSlots} more images can be added`);
    }

    return {
        isValid: errors.length === 0 && invalidFiles.length === 0,
        errors,
        validFiles: finalValidFiles,
        invalidFiles
    };
};

/**
 * Resize image file to specified dimensions
 */
export const resizeImage = (
    file: File,
    options: ImageResizeOptions = {}
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const {
            maxWidth = 1200,
            maxHeight = 1200,
            quality = 0.8,
            format = 'jpeg'
        } = options;

        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Configure canvas for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw and compress image
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const resizedFile = new File([blob], file.name, {
                            type: `image/${format}`,
                            lastModified: Date.now()
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Failed to resize image'));
                    }
                },
                `image/${format}`,
                quality
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Get image URL for display (handles both File objects and server paths)
 */
export const getImageUrl = (image: File | string): string => {
    if (typeof image === 'string') {
        // Server path - add storage prefix if needed
        return image.startsWith('http') ? image : `/storage/${image}`;
    } else {
        // File object - create object URL
        return URL.createObjectURL(image);
    }
};

/**
 * Get display name for image
 */
export const getImageName = (image: File | string): string => {
    if (typeof image === 'string') {
        return image.split('/').pop() || 'Image';
    } else {
        return image.name;
    }
};

/**
 * Generate thumbnail from image file
 */
export const generateThumbnail = (
    file: File,
    size: number = 150
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        img.onload = () => {
            // Create square thumbnail
            canvas.width = size;
            canvas.height = size;

            // Calculate crop area (center crop)
            const { width, height } = img;
            const cropSize = Math.min(width, height);
            const cropX = (width - cropSize) / 2;
            const cropY = (height - cropSize) / 2;

            // Configure canvas for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw cropped and resized image
            ctx.drawImage(
                img,
                cropX, cropY, cropSize, cropSize,
                0, 0, size, size
            );

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        img.onerror = () => reject(new Error('Failed to generate thumbnail'));
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Convert file to base64 data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Check if image dimensions are within limits
 */
export const checkImageDimensions = (
    file: File,
    maxWidth: number = 4000,
    maxHeight: number = 4000
): Promise<{ isValid: boolean; width: number; height: number; error?: string }> => {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
            const { width, height } = img;
            const isValid = width <= maxWidth && height <= maxHeight;
            
            resolve({
                isValid,
                width,
                height,
                error: isValid ? undefined : `Image dimensions ${width}x${height} exceed limit of ${maxWidth}x${maxHeight}`
            });
            
            // Clean up object URL
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            resolve({
                isValid: false,
                width: 0,
                height: 0,
                error: 'Failed to read image dimensions'
            });
            URL.revokeObjectURL(img.src);
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Batch process multiple images (resize, validate, etc.)
 */
export const processImageBatch = async (
    files: File[],
    options: {
        resize?: ImageResizeOptions;
        validate?: boolean;
        generateThumbnails?: boolean;
        maxFiles?: number;
        maxSizePerFile?: number;
        existingCount?: number;
    } = {}
): Promise<{
    processedFiles: File[];
    thumbnails: string[];
    errors: { file: File; error: string }[];
}> => {
    const { 
        resize, 
        validate = true, 
        generateThumbnails = false,
        maxFiles = 5,
        maxSizePerFile = 2,
        existingCount = 0
    } = options;
    
    const processedFiles: File[] = [];
    const thumbnails: string[] = [];
    const errors: { file: File; error: string }[] = [];

    // Validate all files first if requested
    if (validate) {
        const validation = validateImageFiles(files, {
            maxFiles,
            maxSizePerFile,
            existingCount
        });
        
        if (!validation.isValid) {
            validation.invalidFiles.forEach(({ file, error }) => {
                errors.push({ file, error });
            });
            // Only process valid files
            files = validation.validFiles;
        }
    }

    for (const file of files) {
        try {
            let processedFile = file;

            // Resize if requested
            if (resize) {
                processedFile = await resizeImage(file, resize);
            }

            processedFiles.push(processedFile);

            // Generate thumbnail if requested
            if (generateThumbnails) {
                const thumbnail = await generateThumbnail(processedFile);
                thumbnails.push(thumbnail);
            }
        } catch (error) {
            errors.push({ 
                file, 
                error: error instanceof Error ? error.message : 'Processing failed'
            });
        }
    }

    return { processedFiles, thumbnails, errors };
};

/**
 * Create a placeholder image data URL
 */
export const createPlaceholderImage = (
    width: number = 200,
    height: number = 200,
    text: string = 'No Image',
    backgroundColor: string = '#f3f4f6',
    textColor: string = '#6b7280'
): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    if (ctx) {
        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Border
        ctx.strokeStyle = '#d4d4d7';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, height - 2);
        
        // Text
        ctx.fillStyle = textColor;
        ctx.font = `${Math.max(12, width / 12)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
    }
    
    return canvas.toDataURL('image/png');
};

/**
 * Clean up object URLs to prevent memory leaks
 */
export const cleanupImageUrls = (urls: string[]): void => {
    urls.forEach(url => {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get image file extension from MIME type
 */
export const getImageExtension = (mimeType: string): string => {
    const extensions: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg'
    };
    
    return extensions[mimeType] || 'jpg';
};

/**
 * Reorder array items (useful for drag & drop)
 */
export const reorderArray = <T>(
    array: T[],
    fromIndex: number,
    toIndex: number
): T[] => {
    const result = [...array];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
};

/**
 * Compress image file
 */
export const compressImage = async (
    file: File,
    quality: number = 0.8,
    maxWidth?: number,
    maxHeight?: number
): Promise<File> => {
    return resizeImage(file, {
        maxWidth: maxWidth || 1920,
        maxHeight: maxHeight || 1920,
        quality,
        format: 'jpeg'
    });
};

/**
 * Convert image to different format
 */
export const convertImageFormat = (
    file: File,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 0.9
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const fileName = file.name.replace(/\.[^/.]+$/, `.${getImageExtension(`image/${targetFormat}`)}`);
                        const convertedFile = new File([blob], fileName, {
                            type: `image/${targetFormat}`,
                            lastModified: Date.now()
                        });
                        resolve(convertedFile);
                    } else {
                        reject(new Error('Failed to convert image'));
                    }
                },
                `image/${targetFormat}`,
                quality
            );
            
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for conversion'));
            URL.revokeObjectURL(img.src);
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Extract image metadata
 */
export const getImageMetadata = (file: File): Promise<{
    name: string;
    size: number;
    type: string;
    width: number;
    height: number;
    aspectRatio: number;
    sizeFormatted: string;
}> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height,
                sizeFormatted: formatFileSize(file.size)
            });
            
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            reject(new Error('Failed to read image metadata'));
            URL.revokeObjectURL(img.src);
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Create image from data URL
 */
export const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/');
};

/**
 * Get optimized image for different use cases
 */
export const getOptimizedImage = async (
    file: File,
    purpose: 'thumbnail' | 'display' | 'upload'
): Promise<File> => {
    const configs = {
        thumbnail: { maxWidth: 200, maxHeight: 200, quality: 0.7 },
        display: { maxWidth: 800, maxHeight: 600, quality: 0.8 },
        upload: { maxWidth: 1920, maxHeight: 1080, quality: 0.85 }
    };
    
    return resizeImage(file, configs[purpose]);
};
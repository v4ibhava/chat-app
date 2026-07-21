/**
 * Browser-side image compression utility.
 * Downscales images to max dimensions and compresses to JPEG to ensure lightweight payloads.
 */
export const compressImage = (fileOrDataUrl, maxWidth = 800, maxHeight = 800, quality = 0.85) => {
    return new Promise((resolve, reject) => {
        if (!fileOrDataUrl) {
            return resolve(fileOrDataUrl);
        }

        const processImageSrc = (src) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width <= maxWidth && height <= maxHeight && src.length < 50000) {
                    // Already small enough
                    return resolve(src);
                }

                // Calculate aspect ratio downscaling
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    return resolve(src);
                }

                // Smooth resizing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(compressedDataUrl);
            };

            img.onerror = (err) => {
                console.error("Error loading image for compression:", err);
                // Fallback to original
                resolve(src);
            };

            img.src = src;
        };

        if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => processImageSrc(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(fileOrDataUrl);
        } else if (typeof fileOrDataUrl === "string") {
            processImageSrc(fileOrDataUrl);
        } else {
            resolve(fileOrDataUrl);
        }
    });
};

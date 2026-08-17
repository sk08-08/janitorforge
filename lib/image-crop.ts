export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error("The selected image could not be loaded."));
    };

    image.src = src;
  });
}

export async function createCroppedImageFile({
  imageSrc,
  crop,
  outputWidth,
  outputHeight,
  fileName = "cropped-image.jpg",
  quality = 0.92,
}: {
  imageSrc: string;
  crop: PixelCrop;
  outputWidth: number;
  outputHeight: number;
  fileName?: string;
  quality?: number;
}): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,

    crop.x,
    crop.y,
    crop.width,
    crop.height,

    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Failed to create cropped image."));
          return;
        }

        resolve(result);
      },
      "image/jpeg",
      quality,
    );
  });

  return new File([blob], fileName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

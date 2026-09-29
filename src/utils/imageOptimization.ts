const TARGET_BYTES = 300 * 1024;
const MAX_BYTES = 500 * 1024;
const MAX_DIMENSION = 1280;

const QUALITY_STEPS = [0.82, 0.76, 0.7, 0.66];
const DIMENSION_STEPS = [1280, 1152, 1024, 896, 768, 640];

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc ảnh đã tối ưu'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Không thể đọc ảnh nguồn'));
    image.onload = () => resolve(image);
    image.src = source;
  });
}

function drawResized(image: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Không thể tạo vùng xử lý ảnh');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp?.type === 'image/webp') return webp;

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);
  if (!jpeg) throw new Error('Thiết bị không thể xuất ảnh WebP hoặc JPEG');
  return jpeg;
}

export async function optimizeImageDataUrl(source: string): Promise<string> {
  if (source.startsWith('data:image/svg+xml')) return source;

  const image = await loadImage(source);
  const sourceMaxDimension = Math.max(image.naturalWidth, image.naturalHeight);
  const dimensions = Array.from(new Set(
    DIMENSION_STEPS
      .map(dimension => Math.min(MAX_DIMENSION, dimension, sourceMaxDimension))
      .filter(dimension => dimension > 0)
  ));

  let bestUnderMaximum: Blob | null = null;
  let smallestResult: Blob | null = null;

  for (const dimension of dimensions) {
    const canvas = drawResized(image, dimension);
    for (const quality of QUALITY_STEPS) {
      const result = await encodeCanvas(canvas, quality);
      if (!smallestResult || result.size < smallestResult.size) smallestResult = result;
      if (result.size <= MAX_BYTES && !bestUnderMaximum) bestUnderMaximum = result;
      if (result.size <= TARGET_BYTES) return blobToDataUrl(result);
    }
  }

  const fallback = bestUnderMaximum || smallestResult;
  if (!fallback || fallback.size > MAX_BYTES) {
    throw new Error('Ảnh vẫn lớn hơn 500 KB sau khi tối ưu');
  }
  return blobToDataUrl(fallback);
}

export function optimizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc file ảnh'));
    reader.onload = () => {
      optimizeImageDataUrl(reader.result as string).then(resolve).catch(reject);
    };
    reader.readAsDataURL(file);
  });
}

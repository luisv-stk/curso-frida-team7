export interface ImageData {
  filename: string;
  base64: string;
  size: number;
  type: string;
}


export interface UploadPayload {
  images: ImageData[];
  timestamp: string;
  totalImages: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  uploadedImages?: UploadedImage[];
}

export interface UploadedImage {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}

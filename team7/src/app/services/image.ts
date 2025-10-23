import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ImageData, UploadPayload, UploadResponse } from '../models/image-data.model';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadImages(images: ImageData[]): Observable<UploadResponse> {
    const payload: UploadPayload = {
      images: images,
      timestamp: new Date().toISOString(),
      totalImages: images.length
    };

    console.log('Sending payload to backend:', payload);

    return this.http.post<UploadResponse>(`${this.apiUrl}/images/upload`, payload);
  }

  classifyImages(imageIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/images/classify`, { imageIds });
  }

  searchImages(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/images/search?q=${query}`);
  }

  downloadImages(imageIds: string[]): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/images/download`, 
      { imageIds },
      { responseType: 'blob' }
    );
  }
}
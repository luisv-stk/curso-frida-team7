import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { ImageData } from '../models/image-data.model';

export interface ClaudeContentItem {
  type: string;
  text?: string;
  image_url?: {
    url: string;
    detail: string;
  };
}

export interface ClaudeMessage {
  role: string;
  content: ClaudeContentItem[];
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  stream: boolean;
  enable_caching: boolean;
}

// Respuesta de Frida API (formato OpenAI)
export interface FridaResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Formato normalizado para el componente
export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private apiUrl = 'http://localhost:5038/api';

  constructor(private http: HttpClient) {
    console.log('🔧 ImageService inicializado con URL:', this.apiUrl);
  }

  processImage(imageData: ImageData, prompt: string): Observable<ClaudeResponse> {
    const payload: ClaudeRequest = {
      model: 'claude-sonnet-4-20250514',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData.base64,
                detail: 'auto'
              }
            }
          ]
        }
      ],
      stream: false,
      enable_caching: true
    };

    const url = `${this.apiUrl}/ProcessImage/complete-image`;
    console.log('📤 Enviando POST a:', url);
    console.log('📦 Imagen:', imageData.filename);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<FridaResponse>(url, payload, { headers }).pipe(
      map(fridaResponse => {
        // Convertir respuesta de Frida (formato OpenAI) a formato Claude
        console.log('📥 Respuesta de Frida recibida:', fridaResponse);

        const normalizedResponse: ClaudeResponse = {
          id: fridaResponse.id,
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: fridaResponse.choices[0]?.message?.content || ''
            }
          ],
          model: fridaResponse.model,
          stop_reason: fridaResponse.choices[0]?.finish_reason || 'end_turn',
          usage: {
            input_tokens: fridaResponse.usage?.prompt_tokens || 0,
            output_tokens: fridaResponse.usage?.completion_tokens || 0
          }
        };

        console.log('✅ Respuesta normalizada:', normalizedResponse);
        return normalizedResponse;
      }),
      tap(response => {
        console.log('✅ Categoría detectada:', response.content[0]?.text);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error HTTP:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        return throwError(() => error);
      })
    );
  }

  processMultipleImages(images: ImageData[], prompt: string): Observable<ClaudeResponse[]> {
    console.log(`🔄 Iniciando procesamiento de ${images.length} imágenes`);
    const requests = images.map((image, index) => {
      console.log(`📸 Preparando imagen ${index + 1}/${images.length}: ${image.filename}`);
      return this.processImage(image, prompt);
    });
    return forkJoin(requests);
  }
}

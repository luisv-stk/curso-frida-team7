import { Component, ViewEncapsulation, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ImageData } from './models/image-data.model';
import { ImageService, ClaudeResponse } from './services/image';
import { HttpClientModule } from '@angular/common/http';

class CategoryImage {
  category: string;
  images: string[];

  constructor(category: string, images: string[]) {
    this.category = category;
    this.images = images.map(img => `img/${img}`);
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DragDropModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [ImageService]
})
export class App {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  user = 'Jane Doe';
  imageCategories = [
    { category: 'Architecture', images: ['img/Rectangle 13.png'] },
    { category: 'Food', images: ['img/Rectangle 14.png'] },
    { category: 'Nature', images: ['img/Rectangle 15.png'] },
    { category: 'Technology', images: ['img/Rectangle 16.png'] },
    { category: 'People', images: ['img/Rectangle 17.png'] },
    { category: 'Animals', images: ['img/Rectangle 18.png'] },
  ];

  uploadedImages: (ImageData & { category?: string; previewUrl: string; selected?: boolean })[] = [];
  isDragOver = false;
  categories = ['Architecture', 'Food', 'Nature', 'Technology', 'People', 'Animals'];
  selectedCategory = '';
  isSelectAllMode = false;
  selectedImageCount = 0;
  isUploading = false;

  constructor(private imageService: ImageService) {}

  getCategoryImages(): CategoryImage[] {
    return [
      new CategoryImage('Architecture', ['Rectangle 13.png', 'Rectangle 14.png', 'Rectangle 15.png']),
      new CategoryImage('Food', ['Rectangle 16.png', 'Rectangle 17.png', 'Rectangle 18.png']),
    ];
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onDropAreaClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]): void {
    this.isUploading = true;

    const filePromises = Array.from(files).map(file => {
      return new Promise<ImageData>((resolve, reject) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const imageData: ImageData = {
              filename: file.name,
              base64: base64,
              size: file.size,
              type: file.type
            };
            resolve(imageData);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } else {
          reject(new Error('Not an image file'));
        }
      });
    });

    Promise.all(filePromises)
      .then(images => {
        // Agregar imágenes a la lista de forma local primero (para preview inmediato)
        images.forEach(imageData => {
          const extendedImage = {
            ...imageData,
            category: this.selectedCategory || undefined,
            previewUrl: imageData.base64,
            selected: false
          };
          this.uploadedImages.push(extendedImage);
        });

        // Enviar a la API para clasificación automática
        return this.classifyImagesWithAI(images);
      })
      .then(() => {
        this.isUploading = false;
        this.updateSelectedCount();
        console.log('✅ ¡Proceso completado exitosamente!');
      })
      .catch(error => {
        console.error('Error processing images:', error);
        this.isUploading = false;
      });
  }

  private classifyImagesWithAI(images: ImageData[]): Promise<void> {
    const prompt = `Clasifica esta imagen en UNA de las siguientes categorías: Architecture, Food.

IMPORTANTE: Responde SOLO con el nombre EXACTO de la categoría, sin puntos, sin explicaciones, sin texto adicional.

Ejemplos de respuestas correctas:
- Food
- Architecture`;

    console.log('🚀 Iniciando clasificación de', images.length, 'imágenes...');

    return new Promise((resolve, reject) => {
      this.imageService.processMultipleImages(images, prompt).subscribe({
        next: (responses: ClaudeResponse[]) => {
          console.log('✅ Respuestas recibidas:', responses.length);

          responses.forEach((response: ClaudeResponse, index: number) => {
            if (response.content && response.content.length > 0) {
              let categoryRaw = response.content[0].text.trim();

              // Limpiar la respuesta
              categoryRaw = categoryRaw.replace(/[.,!?;:]/g, ''); // Remover puntuación
              categoryRaw = categoryRaw.split('\n')[0]; // Tomar solo la primera línea
              categoryRaw = categoryRaw.split(' ')[0]; // Tomar solo la primera palabra

              const category = categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1).toLowerCase();

              console.log(`📸 Imagen ${index + 1}: "${images[index].filename}"`);
              console.log(`   Respuesta raw: "${response.content[0].text}"`);
              console.log(`   Categoría limpia: "${category}"`);

              // Buscar la imagen cargada y asignarle la categoría
              const uploadedImage = this.uploadedImages.find(
                img => img.filename === images[index].filename
              );

              if (uploadedImage) {
                if (this.categories.includes(category)) {
                  uploadedImage.category = category;
                  console.log(`   ✓ Categoría "${category}" asignada correctamente`);
                } else {
                  console.warn(`   ⚠️ Categoría "${category}" no válida`);
                  console.warn(`   Categorías válidas:`, this.categories);
                  uploadedImage.category = undefined;
                }
              }
            }
          });

          console.log('✅ Clasificación completada exitosamente');
          resolve();
        },
        error: (error: any) => {
          console.error('❌ Error al clasificar imágenes:', error);
          resolve(); // Continuar aunque falle la clasificación
        }
      });
    });
  }

  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
    this.updateSelectedCount();
  }

  assignCategory(imageIndex: number, category: string): void {
    if (this.uploadedImages[imageIndex]) {
      this.uploadedImages[imageIndex].category = category;
    }
  }

  selectAllImages(): void {
    const shouldSelectAll = !this.isSelectAllMode;
    this.uploadedImages.forEach(image => {
      image.selected = shouldSelectAll;
    });
    this.isSelectAllMode = shouldSelectAll;
    this.updateSelectedCount();
  }

  deleteAllImages(): void {
    this.uploadedImages = [];
    this.selectedImageCount = 0;
    this.isSelectAllMode = false;
  }

  deleteSelectedImages(): void {
    this.uploadedImages = this.uploadedImages.filter(image => !image.selected);
    this.selectedImageCount = 0;
    this.isSelectAllMode = false;
    this.updateSelectedCount();
  }

  categorizeSelectedImages(category: string): void {
    if (category) {
      this.uploadedImages.forEach(image => {
        if (image.selected) {
          image.category = category;
        }
      });
    }
  }

  categorizeUncategorizedImages(category: string): void {
    this.uploadedImages.forEach(image => {
      if (!image.category) {
        image.category = category;
      }
    });
  }

  toggleImageSelection(index: number): void {
    this.uploadedImages[index].selected = !this.uploadedImages[index].selected;
    this.updateSelectedCount();
    this.checkSelectAllState();
  }

  private updateSelectedCount(): void {
    this.selectedImageCount = this.uploadedImages.filter(image => image.selected).length;
  }

  private checkSelectAllState(): void {
    const totalImages = this.uploadedImages.length;
    const selectedImages = this.selectedImageCount;

    if (selectedImages === 0) {
      this.isSelectAllMode = false;
    } else if (selectedImages === totalImages && totalImages > 0) {
      this.isSelectAllMode = true;
    } else {
      this.isSelectAllMode = false;
    }
  }

  moveSelectedToCategory(category: string): void {
    this.uploadedImages.forEach(image => {
      if (image.selected) {
        image.category = category;
        image.selected = false;
      }
    });
    this.updateSelectedCount();
    this.isSelectAllMode = false;
  }

  clearAllSelections(): void {
    this.uploadedImages.forEach(image => {
      image.selected = false;
    });
    this.selectedImageCount = 0;
    this.isSelectAllMode = false;
  }

  getSelectedImages(): (ImageData & { category?: string; previewUrl: string; selected?: boolean })[] {
    return this.uploadedImages.filter(image => image.selected);
  }

  downloadSelectedImages(): void {
    const selectedImages = this.getSelectedImages();
    selectedImages.forEach(image => {
      const link = document.createElement('a');
      link.href = image.previewUrl;
      link.download = image.filename;
      link.click();
    });
  }

  getTotalFileSize(): number {
    return this.uploadedImages.reduce((total, image) => total + image.size, 0);
  }

  getSelectedFileSize(): number {
    return this.getSelectedImages().reduce((total, image) => total + image.size, 0);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getImagesByCategory(category: string): (ImageData & { category?: string; previewUrl: string })[] {
    return this.uploadedImages.filter(image => image.category === category);
  }

  getUncategorizedImages(): (ImageData & { category?: string; previewUrl: string })[] {
    return this.uploadedImages.filter(image => !image.category);
  }
}

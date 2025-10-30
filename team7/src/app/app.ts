import { Component, ViewEncapsulation, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ImageData } from './models/image-data.model';

// Define la clase CategoryImage
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
  imports: [CommonModule, FormsModule, MatIconModule, DragDropModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  encapsulation: ViewEncapsulation.None
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

  // Properties for drag and drop functionality
  uploadedImages: (ImageData & { category?: string; previewUrl: string; selected?: boolean })[] = [];
  isDragOver = false;
  categories = ['Architecture', 'Food'];
  selectedCategory = '';
  isSelectAllMode = false;
  selectedImageCount = 0;
  isUploading = false;

  constructor() {}

  getCategoryImages(): CategoryImage[] {
    return [
      new CategoryImage('Architecture', ['Rectangle 13.png', 'Rectangle 14.png', 'Rectangle 15.png']),
      new CategoryImage('Food', ['Rectangle 16.png', 'Rectangle 17.png', 'Rectangle 18.png']),
    ];
  }

  // Drag and drop event handlers
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

  // Click to select files
  onDropAreaClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
  }

  // Process uploaded files
  private handleFiles(files: File[]): void {
    this.isUploading = true;

    const filePromises = Array.from(files).map(file => {
      return new Promise<void>((resolve) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const imageData: ImageData & { category?: string; previewUrl: string; selected?: boolean } = {
              filename: file.name,
              base64: base64,
              size: file.size,
              type: file.type,
              category: this.selectedCategory || undefined,
              previewUrl: base64,
              selected: false
            };
            this.uploadedImages.push(imageData);
            resolve();
          };
          reader.readAsDataURL(file);
        } else {
          resolve();
        }
      });
    });

    Promise.all(filePromises).then(() => {
      this.isUploading = false;
      this.updateSelectedCount();
    });
  }

  // Remove uploaded image
  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  // Category management
  assignCategory(imageIndex: number, category: string): void {
    if (this.uploadedImages[imageIndex]) {
      this.uploadedImages[imageIndex].category = category;
    }
  }

  // Bulk operations
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

  // Individual image selection
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

  // Enhanced category operations
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

  // Get selected images
  getSelectedImages(): (ImageData & { category?: string; previewUrl: string; selected?: boolean })[] {
    return this.uploadedImages.filter(image => image.selected);
  }

  // Download functionality for selected images
  downloadSelectedImages(): void {
    const selectedImages = this.getSelectedImages();
    selectedImages.forEach(image => {
      const link = document.createElement('a');
      link.href = image.previewUrl;
      link.download = image.filename;
      link.click();
    });
  }

  // Batch size validation
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

  // Get images by category
  getImagesByCategory(category: string): (ImageData & { category?: string; previewUrl: string })[] {
    return this.uploadedImages.filter(image => image.category === category);
  }

  // Get uncategorized images
  getUncategorizedImages(): (ImageData & { category?: string; previewUrl: string })[] {
    return this.uploadedImages.filter(image => !image.category);
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  isDragOver = false;
  uploadedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  isLoading = false;

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
    if (files) {
      this.handleFiles(files);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  onDropAreaClick(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  removeImage(index: number, event: Event): void {
    // Prevent event from bubbling up to the drop area
    event.preventDefault();
    event.stopPropagation();

    // Remove image from both arrays at the specified index
    this.uploadedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);

    console.log(`Image at index ${index} removed. Remaining images:`, this.uploadedImages.length);
  }

  private handleFiles(files: FileList): void {
    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) return;

    this.isLoading = true;
    let processedCount = 0;

    imageFiles.forEach(file => {
      if (!this.uploadedImages.some(existing => existing.name === file.name)) {
        this.uploadedImages.push(file);
        this.processImageFile(file, () => {
          processedCount++;
          if (processedCount === imageFiles.length) {
            // Agregar delay de 1.5 segundos antes de ocultar el spinner
            setTimeout(() => {
              this.isLoading = false;
            }, 1500);
          }
        });
      } else {
        processedCount++;
        if (processedCount === imageFiles.length) {
          // Agregar delay de 1.5 segundos antes de ocultar el spinner
          setTimeout(() => {
            this.isLoading = false;
          }, 1500);
        }
      }
    });

    console.log('Uploaded images:', this.uploadedImages);
  }

  private processImageFile(file: File, callback: () => void): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      console.log(`Image ${file.name} processed. Size: ${file.size} bytes`);

      // Add image URL to preview array
      this.imagePreviewUrls.push(imageUrl);

      // Create image preview element for validation
      const img = new Image();
      img.onload = () => {
        console.log(`Image ${file.name} dimensions: ${img.width}x${img.height}px`);
        callback();
      };
      img.onerror = () => {
        console.error(`Error loading image: ${file.name}`);
        callback();
      };
      img.src = imageUrl;
    };

    reader.onerror = () => {
      console.error(`Error reading file: ${file.name}`);
      callback();
    };

    reader.readAsDataURL(file);
  }
}

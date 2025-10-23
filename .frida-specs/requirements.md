# Requirements Specification

## 1. Overview
This project is an Angular standalone component that provides a client-side image upload experience using drag-and-drop or file-picker interactions. Users can drag images onto a designated drop zone or click the zone to open the file dialog. Uploaded images are previewed as thumbnails, and users can remove any image before final submission. The component prevents duplicate uploads and enforces client-side validation (file type and size).

---

## 2. Functional Requirements

### 2.1 Core Functionality
1. **Drag & Drop Upload** (Must Have)  
   - Detect when a file is dragged over the drop zone.  
   - Highlight the drop zone on drag over.  
   - Handle file drop and process image files.

2. **Click-to-Upload** (Must Have)  
   - Clicking the drop zone opens the native file selection dialog (`<input type="file">`).  
   - Support single or multiple file selection.

3. **Image Preview** (Must Have)  
   - Generate a Base64 data URL for each image.  
   - Display thumbnails in a grid below or within the drop zone.

4. **Remove Image** (Must Have)  
   - Each thumbnail has an “X” icon (or similar) to remove that image.  
   - Removal updates the internal file list and preview list.

5. **Duplicate Prevention** (Should Have)  
   - Prevent uploading the same image file name twice.  
   - Notify the user when a duplicate is detected (e.g., toast or console warning).

6. **File Type Validation** (Must Have)  
   - Only accept `image/*` MIME types.  
   - Reject non-image files and optionally display an error message.

7. **File Size Validation** (Could Have)  
   - Enforce a configurable maximum file size (e.g., 5 MB).  
   - Reject files exceeding the size limit with a clear user message.

### 2.2 User Interactions
- **Drag Over**:  
  - onDragOver(event) ⇒ `event.preventDefault()`, set `isDragOver = true`.
- **Drag Leave**:  
  - onDragLeave(event) ⇒ `event.preventDefault()`, set `isDragOver = false`.
- **Drop**:  
  - onDrop(event) ⇒ `event.preventDefault()`, set `isDragOver = false`, call `handleFiles(files)`.
- **Click Zone**:  
  - onDropAreaClick() ⇒ programmatically click hidden file input.
- **File Input Change**:  
  - onFileInputChange(event) ⇒ call `handleFiles(event.target.files)`.
- **Remove Click**:  
  - removeImage(index) ⇒ splice both `uploadedImages` and `imagePreviewUrls`.

### 2.3 Data Management
- **In-Memory Arrays**  
  - `uploadedImages: File[]` – list of File objects.  
  - `imagePreviewUrls: string[]` – Base64 URLs for previews.

- **FileReader Usage**  
  - Use `FileReader.readAsDataURL(file)` to generate preview URL.  
  - Log file processing details (size, dimensions).

- **No Persistent Storage**  
  - All data lives in client memory; no backend or local storage.

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Initial drop or click response time < 100 ms.  
- Ability to handle up to 20 images concurrently without UI lag.  
- Lazy rendering of previews if more than 10 images.

### 3.2 Security
- Enforce MIME-type checking (`file.type.startsWith('image/')`).  
- Prevent script injection via Base64 payloads (Angular binding sanitizes URLs).  
- No direct file upload to server; reduces attack surface.

### 3.3 Usability
- Highlight drop zone visually (border color change) on drag over.  
- Show clear “Click or drag images here” instructional text.  
- Accessible:  
  - Keyboard focus on drop zone (Enter/Space triggers file dialog).  
  - `aria-label` for drop zone and remove buttons.  
- Compatible with modern browsers (Chrome, Firefox, Edge, Safari).

### 3.4 Reliability
- Graceful error handling:  
  - onerror in FileReader logs or displays “Could not read file.”  
- State consistency after errors or removals.  
- Component remains functional after recoverable errors.

---

## 4. User Stories

1. As an **end user**, I want to drag one or more images onto the drop zone so that I can upload them without navigating file dialogs.  
2. As an **end user**, I want to click the drop zone to open the file dialog so that I can select files the traditional way.  
3. As an **end user**, I want to see thumbnail previews of uploaded images so that I can verify I selected the correct files.  
4. As an **end user**, I want to remove an image by clicking its “X” so that I can discard unwanted files before submission.  
5. As an **end user**, I want to receive a warning if I try to upload a duplicate image so that I don’t accidentally upload the same file twice.  
6. As a **power user**, I want the component to reject non-image files immediately so that I’m not confused by unsupported formats.  
7. As an **accessibility user**, I want keyboard support for file selection and removal so that I can use the component without a mouse.  
8. As a **developer**, I want console logs of file sizes and dimensions so that I can debug client-side image processing.  
9. As a **product owner**, I want the component to handle up to 20 images smoothly so that high-volume users aren’t frustrated.  
10. As a **tester**, I want clear error messages when file reading fails so that I can identify and report issues.

---

## 5. Constraints and Assumptions

### 5.1 Technical Constraints
- Must use **Angular** (v14+) standalone component architecture.  
- UI built with **Angular Material** (`MatIconModule`, `MatButtonModule`).  
- No backend integration in this scope (pure front-end).  
- Browser API: `DragEvent`, `FileReader`, `HTMLInputElement`.

### 5.2 Business Constraints
- Development timeline: 2 sprints (4 weeks).  
- Budget: 80 engineering hours.  
- Team: 1 FE developer, 1 QA engineer.

### 5.3 Assumptions
- Users have modern browsers with ES2015+ and FileReader support.  
- Maximum file size default is 5 MB (configurable).  
- No requirement for mobile-only drag events (tap-to-select only on mobile).

---

## 6. Acceptance Criteria

- [ ] Drop zone highlights on drag over and removes highlight on drag leave.  
- [ ] Dropping valid image files adds thumbnails to the preview grid.  
- [ ] Clicking the drop zone opens the file picker.  
- [ ] Non-image files are rejected and user is notified (console or UI).  
- [ ] Duplicate image names are prevented; user is notified.  
- [ ] Each thumbnail displays an “X” icon; clicking it removes the image.  
- [ ] Uploaded image count updates correctly after add/remove operations.  
- [ ] FileReader failures are caught and surface an error message.  
- [ ] Component works across Chrome, Firefox, Edge, Safari (latest versions).  
- [ ] Keyboard users can focus the drop zone and remove buttons and activate via Enter/Space.

---

## 7. Out of Scope
- Server-side upload or persistence.  
- Drag-and-drop support for entire folders.  
- Non-image file handling (e.g., PDF, DOCX).  
- Image editing (crop, rotate, resize).  
- Internationalization/localization.  
- Legacy browser support (IE11).  

---

**Prioritization (MoSCoW)**

| Requirement                              | Priority |
|------------------------------------------|----------|
| Drag & drop upload                       | Must     |
| Click-to-upload                          | Must     |
| Image preview                            | Must     |
| Remove image                             | Must     |
| File type validation                     | Must     |
| Duplicate prevention                     | Should   |
| File size validation                     | Could    |
| Keyboard accessibility                   | Should   |
| Performance up to 20 images              | Could    |
| Cross-browser compatibility (modern only)| Must     |

This specification provides a clear, testable, and prioritized guide for implementing the Angular image upload component. Ensure each acceptance criterion is validated during QA and demos.
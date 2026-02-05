import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FileUploadError {
  name: string;
  message: string;
}

export interface UploadProgressState {
  isOpen: boolean;
  isMinimized: boolean;
  progress: number;
  totalFiles: number;
  errors: FileUploadError[];
  uploadId: number;
}

export interface RootState {
  uploadProgress: UploadProgressState;
}

const initialState: UploadProgressState = {
  isOpen: false,
  isMinimized: false,
  progress: 0,
  totalFiles: 0,
  errors: [],
  uploadId: 0,
};

const uploadProgressSlice = createSlice({
  name: 'uploadProgress',
  initialState,
  reducers: {
    openUploadProgress(state, action: PayloadAction<{ totalFiles: number }>) {
      state.isOpen = true;
      state.isMinimized = false;
      state.progress = 0;
      state.totalFiles = action.payload.totalFiles;
      state.errors = [];
      state.uploadId += 1;
    },
    updateProgress(state, action: PayloadAction<number>) {
      // With single batch request, progress is directly from xhr.upload.onprogress (0-100)
      state.progress = action.payload;
    },
    addUploadErrors(state, action: PayloadAction<FileUploadError[]>) {
      state.errors = [...state.errors, ...action.payload];
    },
    closeUploadProgress(state) {
      state.isOpen = false;
      state.isMinimized = false;
      state.progress = 0;
      state.totalFiles = 0;
      state.errors = [];
    },
    toggleMinimize(state) {
      state.isMinimized = !state.isMinimized;
    },
  },
});

export const {
  openUploadProgress,
  updateProgress,
  addUploadErrors,
  closeUploadProgress,
  toggleMinimize,
} = uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;

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
  currentFileIndex: number;
  errors: FileUploadError[];
}

export interface RootState {
  uploadProgress: UploadProgressState;
}

const initialState: UploadProgressState = {
  isOpen: false,
  isMinimized: false,
  progress: 0,
  totalFiles: 0,
  currentFileIndex: 0,
  errors: [],
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
      state.currentFileIndex = 0;
      state.errors = [];
    },
    updateProgress(state, action: PayloadAction<number>) {
      // Calculate overall progress: (completed files + current file progress) / total files
      const completedFiles = state.currentFileIndex;
      const currentFileProgress = action.payload / 100;
      state.progress = Math.round(
        ((completedFiles + currentFileProgress) / state.totalFiles) * 100
      );
    },
    incrementFileIndex(state) {
      state.currentFileIndex += 1;
    },
    addUploadErrors(state, action: PayloadAction<FileUploadError[]>) {
      state.errors = [...state.errors, ...action.payload];
    },
    closeUploadProgress(state) {
      state.isOpen = false;
      state.isMinimized = false;
      state.progress = 0;
      state.totalFiles = 0;
      state.currentFileIndex = 0;
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
  incrementFileIndex,
  addUploadErrors,
  closeUploadProgress,
  toggleMinimize,
} = uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;

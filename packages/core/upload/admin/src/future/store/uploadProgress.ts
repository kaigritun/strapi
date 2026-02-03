import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UploadProgressState {
  isOpen: boolean;
  isMinimized: boolean;
  progress: number;
  totalFiles: number;
}

export interface RootState {
  uploadProgress: UploadProgressState;
}

const initialState: UploadProgressState = {
  isOpen: false,
  isMinimized: false,
  progress: 0,
  totalFiles: 0,
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
    },
    updateProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    closeUploadProgress(state) {
      state.isOpen = false;
      state.isMinimized = false;
      state.progress = 0;
      state.totalFiles = 0;
    },
    toggleMinimize(state) {
      state.isMinimized = !state.isMinimized;
    },
  },
});

export const { openUploadProgress, updateProgress, closeUploadProgress, toggleMinimize } =
  uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;

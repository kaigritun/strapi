import { adminApi } from '@strapi/admin/strapi-admin';

import { updateProgress, addUploadErrors } from '../store/uploadProgress';

import type { CreateFile } from '../../../../shared/contracts/files';

interface UploadFilesArgs {
  formData: FormData;
}

interface RootState {
  admin_app: {
    token?: string | null;
  };
}

const uploadApi = adminApi
  .enhanceEndpoints({
    addTagTypes: ['Asset', 'Folder'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      uploadFiles: builder.mutation<CreateFile.Response, UploadFilesArgs>({
        queryFn: async ({ formData }, { signal, dispatch, getState }) => {
          const token = (getState() as RootState).admin_app?.token;

          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                dispatch(updateProgress(percentComplete));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve({ data: response });
                } catch (error) {
                  reject({ error: { status: 'PARSING_ERROR', error: 'Failed to parse response' } });
                }
              } else {
                try {
                  const errorResponse = JSON.parse(xhr.responseText);

                  // Dispatch error to store immediately since RTK Query strips complex error objects
                  const fileErrors = [];

                  // Check for batch validation errors (multiple files)
                  if (
                    errorResponse.error?.details?.errors &&
                    Array.isArray(errorResponse.error.details.errors)
                  ) {
                    // Batch upload with multiple errors
                    for (const err of errorResponse.error.details.errors) {
                      if (err.name && err.message) {
                        fileErrors.push({
                          name: err.name,
                          message: err.message,
                        });
                      }
                    }
                  }
                  // Check for single file error
                  else if (errorResponse.error?.details?.fileName && errorResponse.error?.message) {
                    fileErrors.push({
                      name: errorResponse.error.details.fileName,
                      message: errorResponse.error.message,
                    });
                  }

                  if (fileErrors.length > 0) {
                    dispatch(addUploadErrors(fileErrors));
                  }

                  reject({ error: { status: xhr.status, data: errorResponse } });
                } catch {
                  reject({
                    error: { status: xhr.status, error: `Upload failed with status ${xhr.status}` },
                  });
                }
              }
            });

            xhr.addEventListener('error', () => {
              reject({ error: { status: 'FETCH_ERROR', error: 'Network error occurred' } });
            });

            xhr.addEventListener('abort', () => {
              reject({ error: { status: 'FETCH_ERROR', error: 'Upload cancelled' } });
            });

            if (signal) {
              signal.addEventListener('abort', () => {
                xhr.abort();
              });
            }

            const backendURL = window.strapi.backendURL;
            xhr.open('POST', `${backendURL}/upload`);

            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.send(formData);
          });
        },
        invalidatesTags: ['Asset'],
      }),
    }),
  });

export const { useUploadFilesMutation } = uploadApi;
export { uploadApi };

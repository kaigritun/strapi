import { adminApi } from '@strapi/admin/strapi-admin';

import { updateProgress, addUploadErrors } from '../store/uploadProgress';

import type { CreateFilesBatch } from '../../../../shared/contracts/files';

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
      /**
       * Batch upload files to the new /upload/batch endpoint.
       * Returns { data: File[], errors?: FileUploadError[] }
       */
      uploadFilesBatch: builder.mutation<CreateFilesBatch.Response, UploadFilesArgs>({
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
              try {
                const response: CreateFilesBatch.Response = JSON.parse(xhr.responseText);

                // Dispatch errors if any files failed
                if (response.errors && response.errors.length > 0) {
                  dispatch(addUploadErrors(response.errors));
                }

                // Resolve for both full success (201) and partial success (400 with some data)
                // This ensures cache invalidation triggers even with partial failures
                if (response.data && response.data.length > 0) {
                  resolve({ data: response });
                } else {
                  // Complete failure - no files uploaded
                  reject({ error: { status: xhr.status, data: response } });
                }
              } catch {
                reject({
                  error: { status: 'PARSING_ERROR', error: 'Failed to parse response' },
                });
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
            xhr.open('POST', `${backendURL}/upload/batch`);

            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.send(formData);
          });
        },
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),
    }),
  });

export const { useUploadFilesBatchMutation } = uploadApi;
export { uploadApi };

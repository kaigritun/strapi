import _ from 'lodash';
import { errors, async } from '@strapi/utils';

import type { Context } from 'koa';

import { getService } from '../utils';
import { ACTIONS, FILE_MODEL_UID } from '../constants';
import { validateBulkUpdateBody, validateUploadBody } from './validation/admin/upload';
import { findEntityAndCheckPermissions } from './utils/find-entity-and-check-permissions';
import { FileInfo } from '../types';
import { prepareUploadRequest, type FileUploadError } from '../utils/mime-validation';

export default {
  async bulkUpdateFileInfo(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body },
    } = ctx;

    const { updates } = await validateBulkUpdateBody(body);
    const uploadService = getService('upload');

    const results = await async.map(
      updates,
      async ({ id, fileInfo }: { id: number; fileInfo: FileInfo }) => {
        const { pm } = await findEntityAndCheckPermissions(
          userAbility,
          ACTIONS.update,
          FILE_MODEL_UID,
          id
        );

        const updated = await uploadService.updateFileInfo(id, fileInfo as any, { user });
        return pm.sanitizeOutput(updated, { action: ACTIONS.read });
      }
    );

    ctx.body = results;
  },

  async updateFileInfo(ctx: Context) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body },
    } = ctx;

    if (typeof id !== 'string') {
      throw new errors.ValidationError('File id is required');
    }

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    const data = await validateUploadBody(body);

    const file = await uploadService.updateFileInfo(id, data.fileInfo as any, { user });

    ctx.body = await pm.sanitizeOutput(file, { action: ACTIONS.read });
  },

  async replaceFile(ctx: Context) {
    const {
      state: { userAbility, user },
      query: { id },
      request: { body, files: { files } = {} },
    } = ctx;

    if (typeof id !== 'string') {
      throw new errors.ValidationError('File id is required');
    }

    const uploadService = getService('upload');
    const { pm } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.update,
      FILE_MODEL_UID,
      id
    );

    if (Array.isArray(files)) {
      throw new errors.ApplicationError('Cannot replace a file with multiple ones');
    }

    const { validFiles, filteredBody } = await prepareUploadRequest(files, body, strapi);

    const data = (await validateUploadBody(filteredBody)) as { fileInfo: FileInfo };
    const replacedFile = await uploadService.replace(id, { data, file: validFiles[0] }, { user });

    // Sign file urls for private providers
    const signedFile = await getService('file').signFileUrls(replacedFile);

    ctx.body = await pm.sanitizeOutput(signedFile, { action: ACTIONS.read });
  },

  async uploadFiles(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const { validFiles, filteredBody } = await prepareUploadRequest(files, body, strapi);

    const isMultipleFiles = validFiles.length > 1;
    const data = await validateUploadBody(filteredBody, isMultipleFiles);

    let filesArray = validFiles;

    if (
      data.fileInfo &&
      Array.isArray(data.fileInfo) &&
      filesArray.length === data.fileInfo.length
    ) {
      // Reorder filesArray to match data.fileInfo order
      const alignedFilesArray = data.fileInfo
        .map((info) => {
          return filesArray.find((file) => file.originalFilename === info.name);
        })
        .filter(Boolean) as any[];

      filesArray = alignedFilesArray;
    }

    // Upload files first to get thumbnails
    const uploadedFiles = await uploadService.upload({ data, files: filesArray }, { user });
    if (uploadedFiles.some((file) => file.mime?.startsWith('image/'))) {
      await getService('metrics').trackUsage('didUploadImage');
    }

    const aiMetadataService = getService('aiMetadata');

    // AFTER upload - generate AI metadata for images
    if (await aiMetadataService.isEnabled()) {
      try {
        const metadataResults = await aiMetadataService.processFiles(uploadedFiles);
        // Update the uploaded files with AI metadata
        await aiMetadataService.updateFilesWithAIMetadata(uploadedFiles, metadataResults, user);
      } catch (error) {
        strapi.log.warn('AI metadata generation failed, proceeding without AI enhancements', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sign file urls for private providers
    const signedFiles = await async.map(uploadedFiles, getService('file').signFileUrls);

    ctx.body = await pm.sanitizeOutput(signedFiles, { action: ACTIONS.read });
    ctx.status = 201;
  },

  /**
   * @experimental
   * Batch upload files with partial success and error collection
   *
   * TODO:
   * When this becomes stable, deprecate uploadFiles and mark it to be removed in v6
   */
  async unstable_uploadFilesBatch(ctx: Context) {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService('upload');
    const pm = strapi.service('admin::permission').createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: FILE_MODEL_UID,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    if (_.isEmpty(files) || (!Array.isArray(files) && files.size === 0)) {
      throw new errors.ApplicationError('Files are empty');
    }

    // Get validation errors from prepareUploadRequest
    const {
      validFiles,
      filteredBody,
      errors: validationErrors,
    } = await prepareUploadRequest(files, body, strapi);

    const uploadErrors: FileUploadError[] = [...validationErrors];
    const successfulFiles: any[] = [];

    // Parse fileInfo to align with files
    let parsedFileInfo: any[] = [];
    if (filteredBody?.fileInfo) {
      parsedFileInfo = Array.isArray(filteredBody.fileInfo)
        ? filteredBody.fileInfo
        : [filteredBody.fileInfo];
    }

    // Track uploaded files before signing (needed for AI metadata)
    const uploadedFiles: any[] = [];

    // Controlled concurrency to prevent OOM on bulk uploads
    const CONCURRENCY_LIMIT = 2;

    // Prepare upload tasks with their fileInfo
    const uploadTasks = validFiles.map((file, index) => ({
      file,
      fileInfo: parsedFileInfo[index] || {
        name: file.originalFilename,
        caption: null,
        alternativeText: null,
        folder: null,
      },
    }));

    // Process files in batches with controlled concurrency
    for (let i = 0; i < uploadTasks.length; i += CONCURRENCY_LIMIT) {
      const batch = uploadTasks.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.allSettled(
        batch.map(async ({ file, fileInfo }) => {
          const data = await validateUploadBody({ fileInfo }, false);
          const [uploadedFile] = await uploadService.upload({ data, files: [file] }, { user });

          // Sign file url
          const signedFile = await getService('file').signFileUrls(uploadedFile);
          return { uploadedFile, signedFile };
        })
      );

      // Collect successes and failures from this batch
      for (const [idx, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          uploadedFiles.push(result.value.uploadedFile);
          successfulFiles.push(result.value.signedFile);
        } else {
          const file = batch[idx].file;
          uploadErrors.push({
            name: file.originalFilename || 'unknown',
            message: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    }

    // Track image upload metric once if any images were uploaded
    if (uploadedFiles.some((file) => file.mime?.startsWith('image/'))) {
      await getService('metrics').trackUsage('didUploadImage');
    }

    // Generate AI metadata for all successful uploads (outside loop to avoid rate limiting)
    const aiMetadataService = getService('aiMetadata');
    if (uploadedFiles.length > 0 && (await aiMetadataService.isEnabled())) {
      try {
        const metadataResults = await aiMetadataService.processFiles(uploadedFiles);
        await aiMetadataService.updateFilesWithAIMetadata(uploadedFiles, metadataResults, user);
      } catch (error) {
        strapi.log.warn('AI metadata generation failed, proceeding without AI enhancements', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    ctx.body = {
      data: await pm.sanitizeOutput(successfulFiles, { action: ACTIONS.read }),
      errors: uploadErrors,
    };
    ctx.status = uploadErrors.length > 0 ? 400 : 201;
  },

  // TODO: split into multiple endpoints
  async upload(ctx: Context) {
    const {
      query: { id },
      request: { files: { files } = {} },
    } = ctx;

    if (_.isEmpty(files) || (!Array.isArray(files) && files.size === 0)) {
      if (id) {
        return this.updateFileInfo(ctx);
      }

      throw new errors.ApplicationError('Files are empty');
    }

    await (id ? this.replaceFile : this.uploadFiles)(ctx);
  },
};

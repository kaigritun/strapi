import * as Dialog from '@radix-ui/react-dialog';
import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  ProgressBar,
  Typography,
} from '@strapi/design-system';
import { CheckCircle, Cross, Minus, Plus, Upload, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useTypedDispatch, useTypedSelector } from '../store/hooks';
import { closeUploadProgress, toggleMinimize } from '../store/uploadProgress';
import { getTranslationKey } from '../utils/translations';

/* -------------------------------------------------------------------------------------------------
 * DialogHeader
 * -----------------------------------------------------------------------------------------------*/

const StyleDialogHeader = styled(Flex)`
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  justify-content: space-between;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.neutral100};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const DialogHeader = () => {
  const { formatMessage } = useIntl();
  const dispatch = useTypedDispatch();
  const { isMinimized, totalFiles } = useTypedSelector((state) => state.uploadProgress);

  const handleToggleMinimize = () => {
    dispatch(toggleMinimize());
  };

  const handleClose = () => {
    dispatch(closeUploadProgress());
  };

  return (
    <StyleDialogHeader>
      <Flex gap={2}>
        <Upload />
        <Typography variant="omega" fontWeight="semiBold">
          {formatMessage(
            {
              id: getTranslationKey('upload.progress.uploading-files'),
              defaultMessage: 'Uploading {count} files',
            },
            { count: totalFiles }
          )}
        </Typography>
      </Flex>
      <Flex gap={1}>
        <IconButton
          onClick={handleToggleMinimize}
          label={formatMessage({
            id: getTranslationKey(
              isMinimized ? 'upload.progress.maximize' : 'upload.progress.minimize'
            ),
            defaultMessage: isMinimized ? 'Maximize' : 'Minimize',
          })}
          variant="ghost"
        >
          {isMinimized ? <Plus /> : <Minus />}
        </IconButton>
        <IconButton
          onClick={handleClose}
          label={formatMessage({
            id: getTranslationKey('upload.progress.close'),
            defaultMessage: 'Close',
          })}
          variant="ghost"
        >
          <Cross />
        </IconButton>
      </Flex>
    </StyleDialogHeader>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UploadProgressDialog
 * -----------------------------------------------------------------------------------------------*/

const DialogContent = styled(Dialog.Content)`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[4]};
  right: ${({ theme }) => theme.spaces[4]};
  width: 400px;
  background-color: ${({ theme }) => theme.colors.neutral0};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
  z-index: 1000;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};

  &:focus {
    outline: none;
  }
`;

const DialogContentMinimized = styled(DialogContent)`
  cursor: pointer;
  width: 'auto';
`;

const DialogProgressBar = styled(ProgressBar)`
  width: 100%;
  height: ${({ theme }) => theme.spaces[1]};
  background-color: ${({ theme }) => theme.colors.neutral200};
  > div {
    background-color: ${({ theme }) => theme.colors.primary700};
  }
`;

const ErrorList = styled(Flex)`
  gap: ${({ theme }) => theme.spaces[2]};
  flex-direction: column;
`;

const ErrorRow = styled(Flex)`
  gap: ${({ theme }) => theme.spaces[4]};
  justify-content: space-between;
`;

const DialogFooter = styled(Flex)`
  padding: ${({ theme }) => theme.spaces[2]};
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

export const UploadProgressDialog = () => {
  const { formatMessage } = useIntl();

  const dispatch = useTypedDispatch();
  const { isOpen, isMinimized, progress, errors, uploadId } = useTypedSelector(
    (state) => state.uploadProgress
  );

  const hasErrors = errors.length > 0;
  const isComplete = progress === 100;

  const handleCancel = () => {
    dispatch(closeUploadProgress());
  };

  if (isMinimized) {
    return (
      <Dialog.Root open={isOpen} modal={false}>
        <Dialog.Portal>
          <DialogContentMinimized>
            <DialogHeader />
          </DialogContentMinimized>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} modal={false}>
      <Dialog.Portal>
        <DialogContent>
          {/* Header */}
          <DialogHeader />

          {/* Content */}
          <Box paddingTop={4} paddingBottom={4} paddingLeft={6} paddingRight={6}>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Flex direction="column" alignItems="stretch" gap={2}>
                <Flex gap={2} alignItems="center" justifyContent="space-between">
                  <Flex gap={2} alignItems="center">
                    {isComplete ? <CheckCircle fill="success600" /> : <Upload fill="neutral500" />}
                    <Flex>
                      <Typography variant="pi">
                        {formatMessage({
                          id: getTranslationKey('upload.progress.label'),
                          defaultMessage: 'Upload',
                        })}
                      </Typography>
                      {!isComplete && (
                        <Typography variant="pi" textColor="netural600">
                          {progress}%
                        </Typography>
                      )}
                    </Flex>
                  </Flex>
                  {hasErrors && (
                    <Badge
                      backgroundColor="warning100"
                      textColor="warning600"
                      size="S"
                      borderColor="warning200"
                    >
                      <Flex alignItems="center" gap="2px">
                        <WarningCircle width={12} height={12} />
                        {errors.length}
                      </Flex>
                    </Badge>
                  )}
                </Flex>

                <DialogProgressBar key={uploadId} value={progress} />
              </Flex>

              {hasErrors && (
                <Flex direction="column" alignItems="flex-start" gap={2}>
                  <Typography variant="omega" fontWeight="bold">
                    {formatMessage({
                      id: getTranslationKey('upload.progress.errors.title'),
                      defaultMessage: 'Failed to upload:',
                    })}
                  </Typography>

                  <ErrorList>
                    {errors.map((error, index) => (
                      <ErrorRow key={index}>
                        <Typography variant="pi" textColor="danger600">
                          {error.name}
                        </Typography>
                        <Typography variant="pi" textColor="danger600">
                          {error.message}
                        </Typography>
                      </ErrorRow>
                    ))}
                  </ErrorList>
                </Flex>
              )}
            </Flex>
          </Box>

          {/* Footer */}
          {!isComplete && (
            <DialogFooter>
              <Button onClick={handleCancel} variant="danger-light">
                {formatMessage({
                  id: getTranslationKey('upload.progress.cancel'),
                  defaultMessage: 'Cancel',
                })}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

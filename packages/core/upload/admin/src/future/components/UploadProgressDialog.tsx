import * as Dialog from '@radix-ui/react-dialog';
import { Box, Flex, IconButton, ProgressBar, Typography } from '@strapi/design-system';
import { Cross, Minus, Plus, Upload } from '@strapi/icons';
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

const DialogHeader = ({ totalFiles }: { totalFiles: number }) => {
  const { formatMessage } = useIntl();
  const dispatch = useTypedDispatch();
  const { isMinimized } = useTypedSelector((state) => state.uploadProgress);

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

export const UploadProgressDialog = () => {
  const { formatMessage } = useIntl();

  const { isOpen, isMinimized, progress, totalFiles } = useTypedSelector(
    (state) => state.uploadProgress
  );

  if (isMinimized) {
    return (
      <Dialog.Root open={isOpen} modal={false}>
        <Dialog.Portal>
          <DialogContentMinimized>
            <DialogHeader totalFiles={totalFiles} />
          </DialogContentMinimized>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} modal={false}>
      <Dialog.Portal>
        <DialogContent>
          <DialogHeader totalFiles={totalFiles} />

          <Box paddingTop={4} paddingBottom={4} paddingLeft={6} paddingRight={6}>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <Flex gap={2}>
                <Upload fill="neutral500" />
                <Typography variant="pi">
                  {formatMessage({
                    id: getTranslationKey('upload.progress.label'),
                    defaultMessage: 'Upload',
                  })}
                </Typography>
              </Flex>

              <DialogProgressBar value={progress} />
            </Flex>
          </Box>
        </DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object Model for the Assets Page (Future version)
 */
export class AssetsPage {
  readonly page: Page;
  readonly newButton: Locator;
  readonly importFilesMenuItem: Locator;
  readonly fileInput: Locator;
  readonly uploadProgressDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newButton = page.getByRole('button', { name: 'New' });
    this.importFilesMenuItem = page.getByRole('menuitem', { name: 'Import files' });
    this.fileInput = page.locator('input[type="file"]');
    this.uploadProgressDialog = page.getByRole('dialog', { name: 'Upload Progress' });
  }

  /**
   * Navigate to the Media Library page
   */
  async goto() {
    await this.page.goto('/admin/plugins/unstable-upload');
  }

  /**
   * Open the New menu dropdown
   */
  async openNewMenu() {
    await this.newButton.click();
  }

  async switchToTableView() {
    await this.page.getByRole('radio', { name: 'Table view' }).click();
  }

  /**
   * Upload files via the file picker dialog
   * This method opens the menu, clicks Import files, verifies the file picker opens, and uploads files
   */
  async uploadFilesWithFilePicker(filePaths: string | string[]) {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];

    // Open the New menu
    await this.openNewMenu();

    // Set up a promise to wait for the file chooser
    const fileChooserPromise = this.page.waitForEvent('filechooser');

    // Click the Import files menu item
    await this.importFilesMenuItem.click();

    // Wait for and verify the file picker is present
    const fileChooser = await fileChooserPromise;

    // Upload the files
    await fileChooser.setFiles(paths);

    return fileChooser;
  }

  /**
   * Get the Upload Progress dialog
   */
  getUploadProgressDialog() {
    return this.uploadProgressDialog;
  }

  /**
   * Get the Upload Progress progressbar
   */
  getUploadProgressDialogProgressBar() {
    return this.uploadProgressDialog.getByRole('progressbar').first();
  }

  getUploadProgressDialogUploadingIcon() {
    return this.uploadProgressDialog.getByLabel('Upload in progress indicator').first();
  }

  getUploadProgressDialogCompleteIcon() {
    return this.uploadProgressDialog.getByLabel('Upload complete indicator').first();
  }

  /**
   * Wait for upload progress dialog to open
   */
  async waitForUploadProgressDialogToOpen() {
    await this.uploadProgressDialog.waitFor({ state: 'visible' });
  }

  /**
   * Wait for upload progress dialog to complete and optionally close it
   */
  async waitForUploadProgressDialogToComplete({ close = true }: { close?: boolean } = {}) {
    await this.waitForUploadProgressDialogToOpen();

    const progressBar = this.getUploadProgressDialogProgressBar();
    await progressBar.waitFor({ state: 'visible' });

    const completeIcon = this.getUploadProgressDialogCompleteIcon();
    await completeIcon.waitFor({ state: 'visible' });

    const uploadingIcon = this.getUploadProgressDialogUploadingIcon();
    await uploadingIcon.waitFor({ state: 'hidden' });

    const cancelButton = this.uploadProgressDialog.getByRole('button', { name: 'Cancel' });
    await cancelButton.waitFor({ state: 'hidden' });

    if (close) {
      const closeButton = this.uploadProgressDialog.getByRole('button', { name: 'Close' });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }

  /**
   * Upload failures are displayed in the dialog under "Failed to upload:".
   */
  getUploadProgressDialogFailureSection() {
    return this.uploadProgressDialog.getByText('Failed to upload:');
  }

  /**
   * Wait for upload success notification
   */
  async waitForUploadSuccess() {
    // Wait for the success notification inside the Notifications region
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status');
    await notification.waitFor({ state: 'visible' });
  }

  /**
   * Get the success notification message
   */
  async getSuccessMessage() {
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('status')
      .first();
    return await notification.textContent();
  }

  /**
   * Get the error notification message
   */
  async getErrorMessage() {
    const notification = this.page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('alert')
      .first();
    return await notification.textContent();
  }

  /**
   * Check if the file input value is empty (reset)
   */
  async isFileInputReset() {
    const inputValue = await this.fileInput.inputValue();
    return inputValue === '';
  }

  /**
   * Get a specific asset row by name
   */
  getAssetRow(name: string) {
    return this.page.getByRole('row', { name: new RegExp(name) });
  }
}

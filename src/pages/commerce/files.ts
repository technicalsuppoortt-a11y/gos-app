export { storeFile, downloadFile, readStoredFile, uploadDigitalFile, MAX_DIGITAL_FILE_SIZE } from '../../backend/files';

export type ProductFileUploader = (file: File, onProgress?: (percent: number) => void) => Promise<{
  url: string; name: string; size: number; mime: string; storageId?: string;
}>;

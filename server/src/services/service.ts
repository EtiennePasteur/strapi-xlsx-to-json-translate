import type { Core } from '@strapi/strapi';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

export interface FileUpload {
  originalFilename: string;
  filepath: string;
  mimetype: string;
  size: number;
}

export interface FilesContext {
  file?: FileUpload;
}

export interface TranslationRow {
  Informations?: string;
  Key: string;
  [language: string]: string | undefined;
}

export interface ProcessResult {
  code: number;
  message: string;
}

const unflatten = (data: { [key: string]: any }): { [key: string]: any } => {
  const result: { [key: string]: any } = {};

  for (const key in data) {
    key
      .split('.')
      .reduce(
        (acc, part, index, array) =>
          (acc[part] = index === array.length - 1 ? data[key] : acc[part] || {}),
        result
      );
  }

  return result;
};

const processData = (data: TranslationRow[]): { [key: string]: any } => {
  const result: { [key: string]: { [key: string]: string } } = {};

  data.forEach((item) => {
    // Validate that Key field exists
    if (!item.Key) {
      console.warn('Skipping row without Key field:', item);
      return;
    }

    const { Informations, Key, ...translations } = item;

    Object.keys(translations).forEach((lang) => {
      if (!result[lang]) result[lang] = {};
      result[lang][Key] = translations[lang] || '';
    });
  });

  Object.keys(result).forEach((lang) => {
    result[lang] = unflatten(result[lang]);
  });

  return result;
};

const writeFiles = (fileName: string, data: { [key: string]: any }): void => {
  const i18nDir = path.join(strapi.config.get('server.dirs.public'), 'i18n', fileName);

  if (!fs.existsSync(i18nDir)) {
    fs.mkdirSync(i18nDir, { recursive: true });
  }

  Object.keys(data).forEach((lang) => {
    const filePath = path.join(i18nDir, `${lang}.json`);
    // Pretty-print JSON with 2-space indentation for better readability
    fs.writeFileSync(filePath, JSON.stringify(data[lang], null, 2), 'utf8');
  });
};

const getFileNameWithoutExtension = (filename: string): string => {
  // Handle filenames with multiple dots correctly
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
};

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  processXlsxFile(files: FilesContext): ProcessResult {
    try {
      // Validate that file exists
      if (!files || !files.file) {
        return { code: 400, message: 'No file uploaded' };
      }

      const uploadedFile = files.file;

      // Validate file properties
      if (!uploadedFile.filepath || !uploadedFile.originalFilename) {
        return { code: 400, message: 'Invalid file upload' };
      }

      // Validate file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (uploadedFile.size > MAX_FILE_SIZE) {
        return { code: 400, message: 'File size exceeds 10MB limit' };
      }

      // Validate file type
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      if (uploadedFile.mimetype && !validMimeTypes.includes(uploadedFile.mimetype)) {
        return { code: 400, message: 'Invalid file type. Only .xlsx and .xls files are allowed' };
      }

      // Extract filename without extension
      const fileName = getFileNameWithoutExtension(uploadedFile.originalFilename);

      // Read the workbook from file
      const workbook = xlsx.readFile(uploadedFile.filepath);

      // Validate that workbook has sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return { code: 400, message: 'Excel file contains no sheets' };
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Validate that sheet exists
      if (!sheet) {
        return { code: 400, message: 'Unable to read sheet from Excel file' };
      }

      const data = xlsx.utils.sheet_to_json<TranslationRow>(sheet);

      // Validate that sheet has data
      if (!data || data.length === 0) {
        return { code: 400, message: 'Excel sheet is empty' };
      }

      const processedData = processData(data);

      // Validate that we have some translations
      if (Object.keys(processedData).length === 0) {
        return { code: 400, message: 'No valid translations found in Excel file' };
      }

      writeFiles(fileName, processedData);

      return {
        code: 200,
        message: `Successfully processed ${Object.keys(processedData).length} language(s): ${Object.keys(processedData).join(', ')}`
      };
    } catch (error) {
      console.error('Error processing XLSX file:', error);
      return {
        code: 500,
        message: `Error processing XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

export default service;

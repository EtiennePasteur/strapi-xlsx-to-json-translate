import type { Core } from '@strapi/strapi';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const unflatten = (data: { [key: string]: any }) => {
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

const processData = (data) => {
  const result: { [key: string]: { [key: string]: string } } = {};

  data.forEach((item) => {
    const { Informations, Key, ...translations } = item;

    Object.keys(translations).forEach((lang) => {
      if (!result[lang]) result[lang] = {};
      result[lang][Key] = translations[lang];
    });
  });

  Object.keys(result).forEach((lang) => {
    result[lang] = unflatten(result[lang]);
  });

  return result;
};

const writeFiles = (data) => {
  const i18nDir = path.join(process.cwd(), process.env.PUBLIC_FOLDER || 'public', 'i18n');

  if (!fs.existsSync(i18nDir)) {
    fs.mkdirSync(i18nDir, { recursive: true });
  }

  Object.keys(data).forEach((lang) => {
    const filePath = path.join(i18nDir, `${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data[lang]), 'utf8');
  });
};

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  processXlsxFile(files) {
    try {
      const workbook = xlsx.read(files.file.filepath, { type: 'file' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      const processedData = processData(data);

      writeFiles(processedData);
      return { code: 200, message: 'XLSX file processed successfully' };
    } catch (error) {
      return { code: 500, message: 'Error processing XLSX file' };
    }
  },
});

export default service;

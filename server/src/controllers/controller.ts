import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async upload(ctx) {
    try {
      // Validate that files were uploaded
      if (!ctx.request.files) {
        ctx.badRequest('No files uploaded');
        return;
      }

      const process = await strapi
        .plugin('strapi-xlsx-to-json-translate')
        .service('service')
        .processXlsxFile(ctx.request.files);

      // Handle different response codes appropriately
      if (process.code === 500) {
        return ctx.internalServerError(process.message);
      } else if (process.code === 400) {
        return ctx.badRequest(process.message);
      } else if (process.code === 200) {
        ctx.status = 200;
        ctx.body = process;
      } else {
        // Handle unexpected status codes
        ctx.status = process.code;
        ctx.body = process;
      }
    } catch (error) {
      console.error('Controller error:', error);
      return ctx.internalServerError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

export default controller;

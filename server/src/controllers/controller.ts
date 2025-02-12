import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async upload(ctx) {
    const process = await strapi
      .plugin('strapi-xlsx-to-json-translate')
      .service('service')
      .processXlsxFile(ctx.request.files);

    if (process.code === 500) {
      return ctx.internalServerError(process.message);
    }

    ctx.body = process;
  },
});

export default controller;

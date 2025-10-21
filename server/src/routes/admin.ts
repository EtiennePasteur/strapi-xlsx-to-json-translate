export default [
  {
    method: "POST",
    path: "/upload",
    handler: "controller.upload",
    config: {
      policies: [],
    },
  },
  {
    method: "GET",
    path: "/folders",
    handler: "controller.listFolders",
    config: {
      policies: [],
    },
  },
];

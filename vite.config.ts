import { definePlaygroundViteConfig } from "../cadl-azure/core/packages/playground/dist-dev/src/build-utils/index.js";

const config = definePlaygroundViteConfig({
  defaultEmitter: "@cadl-lang/openapi3",
  libraries: [
    "@cadl-lang/compiler",
    "@cadl-lang/rest",
    "@cadl-lang/openapi",
    "@cadl-lang/versioning",
    "@cadl-lang/openapi3",
  ],
  samples: {
  },
  enableSwaggerUI: true,
});

config.build.rollupOptions = {};

export default config;
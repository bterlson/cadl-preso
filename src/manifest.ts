// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import manifest from "playground-manifest.js";

export interface PlaygroundConfig {
  defaultEmitter: string;
  libraries: string[];
  samples: Record<string, string>;
  enableSwaggerUI: boolean;
}


export const PlaygroundManifest: PlaygroundConfig = manifest;

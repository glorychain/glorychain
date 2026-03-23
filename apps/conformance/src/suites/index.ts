import { appendSuites } from "./append.js";
import { forkSuites } from "./fork.js";
import { genesisSuites } from "./genesis.js";
import { replaySuites } from "./replay.js";
import { verifySuites } from "./verify.js";

export const allSuites = [
  ...genesisSuites,
  ...appendSuites,
  ...verifySuites,
  ...forkSuites,
  ...replaySuites,
];

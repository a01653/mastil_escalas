import { createRequire } from "module";

const require = createRequire(import.meta.url);
// Leer la versión real de package.json para que las fixtures de test siempre
// reflejen la versión actual y el reset por versión no descarte la config inyectada.
export const TEST_APP_VERSION = require("../../package.json").version;

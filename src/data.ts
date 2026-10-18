/** Fachada temporal para mantener imports existentes durante la migración modular. */
export { frequencies, moduleById, modules } from './modules/catalog';
export { createDemoWorkspace as createSeed } from './demo/createDemoWorkspace';

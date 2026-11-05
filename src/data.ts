/** Fachada temporal para mantener imports existentes durante la migración modular. */
export { frequencies, moduleById, modules, workspaceModules, createGeneralModule } from './modules/catalog';
export { createDemoWorkspace as createSeed } from './demo/createDemoWorkspace';

// bridge so pages can import both without touching module cycles
export { loadWorlds, getWorld, loadUnits, unitsByWorld, stats, validateUnits, loadCore } from './content.mjs';
export { listInbox, intakeStats, template, addEntry } from './intake.mjs';

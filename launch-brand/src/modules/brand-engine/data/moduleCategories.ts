export const integrationModuleIds = new Set([
  "mail",
  "assistant",
  "whatsapp",
  "payments",
  "automation",
  "support",
]);

export const isCoreModule = (module: { id: string }) => !integrationModuleIds.has(module.id);

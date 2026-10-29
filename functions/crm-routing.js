// Routing comes from a tenant-owned configuration, never from a public submission.
export async function resolveCRMRoute(tx, root, configured, fallbackStage = 'LEAD_CAPTURED') {
  if (!configured?.pipelineId || !/^[\w-]{1,150}$/.test(configured.pipelineId)) return { pipelineId: 'main', stage: fallbackStage, lifecycleStage: fallbackStage };
  const pipeline = (await tx.get(root.collection('pipelines').doc(configured.pipelineId))).data();
  if (!pipeline && configured.pipelineId === 'main') {
    const builtInStages = ['LEAD_CAPTURED', 'CONTACT_CREATED', 'QUALIFIED', 'CONVERSATION', 'PAYMENT_COMPLETED', 'BOOKING', 'CLOSED_LOST', 'FOLLOW_UP_NEEDED', 'ACTIVE_CUSTOMER', 'RENEWAL_UPSELL'];
    const stage = builtInStages.includes(configured.stageId) ? configured.stageId : fallbackStage;
    return { pipelineId: 'main', stage, lifecycleStage: stage };
  }
  if (!pipeline || pipeline.archived) return { pipelineId: 'main', stage: fallbackStage, lifecycleStage: fallbackStage };
  const stage = pipeline.stages?.find(s => s.id === configured.stageId)?.id ?? pipeline.stages?.[0]?.id ?? fallbackStage;
  return { pipelineId: configured.pipelineId, stage, lifecycleStage: stage };
}

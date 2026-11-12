export type SequenceStep = { id: string; delay: string; unit: string; action: string };

export type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  active: boolean;
  from: string;
  to: string;
  actionType: string;
  messageText?: string;
  sequenceSteps: SequenceStep[];
};

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  content: { steps: string[] };
  automationTemplate?: Workflow;
};

export const WORKFLOWS_KEY = 'gos.ai-followup.workflows.v1';

export function workflowFromTemplate(template: WorkflowTemplate): Workflow {
  const { id, name, description, automationTemplate } = template;
  if (automationTemplate) return { ...structuredClone(automationTemplate), id, name, description, active: false, trigger: '0 triggered' };
  return {
    id, name, description, active: false, trigger: '0 triggered', from: 'NEW', to: 'CONTACTED', actionType: 'Email',
    sequenceSteps: template.content.steps.map((step, index) => ({
      id: `${id}-${index}`, delay: String(index + 1), unit: 'hours',
      action: step.toLowerCase().includes('message') ? 'WhatsApp' : 'Email',
    })),
  };
}

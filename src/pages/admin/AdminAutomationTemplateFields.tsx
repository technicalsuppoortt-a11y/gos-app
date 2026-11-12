import { useRef, useState } from 'react';
import { backendError, callBackend } from '../../backend/firebase';
import { useAgentConfiguration } from '../../backend/useAgentConfiguration';
import { useUILanguage, translateText } from '../../i18n/display';
import { WorkflowActionField, WorkflowMessageField, WorkflowTimeline, WorkflowTriggerFields } from '../follow-up-workflow-fields';
import type { Workflow } from '../follow-up-workflow';

export function AdminAutomationTemplateFields({ value, onChange }: {
  value: Workflow;
  onChange: (patch: Partial<Workflow>) => void;
}) {
  useUILanguage();
  const agent = useAgentConfiguration();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(false);
  const current = useRef(value);
  current.current = value;
  const channel = value.actionType.toLowerCase();
  async function generate() {
    if (generation.current) return;
    generation.current = true;
    setGenerating(true);
    setError('');
    try {
      const result = await callBackend<{ text: string }>('generateFollowUp', {
        channel,
        instruction: `Workflow: ${value.name}. From ${value.from} to ${value.to}. ${value.messageText || ''}`,
      });
      const latest = current.current;
      if (latest.name === value.name && latest.from === value.from && latest.to === value.to && latest.actionType === value.actionType) {
        onChange({ messageText: result.text });
      }
    } catch (cause) {
      setError(backendError(cause));
    } finally {
      generation.current = false;
      setGenerating(false);
    }
  }

  return <div className="af-modal-form">
    <WorkflowTriggerFields name={value.name} from={value.from} to={value.to}
      onName={name => onChange({ name })} onFrom={from => onChange({ from })} onTo={to => onChange({ to })}/>
    <WorkflowActionField value={value.actionType} onChange={actionType => onChange({ actionType })}/>
    <WorkflowMessageField value={value.messageText || ''} onChange={messageText => onChange({ messageText })}
      generate={() => void generate()} generating={generating}
      disabled={agent.loading || Boolean(agent.error) || !['email', 'whatsapp'].includes(channel)}/>
    <WorkflowTimeline sequenceSteps={value.sequenceSteps}
      setSequenceSteps={update => onChange({ sequenceSteps: update(value.sequenceSteps) })}/>
    {error && <p role="alert">{translateText(error)}</p>}
  </div>;
}

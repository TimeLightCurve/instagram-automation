import { HumanApprovalNode, MetaCapabilityNode, StoreDraftNode, ValidateContentNode } from './nodes';
import { WorkflowEngine } from './engine';

export const workflowCatalog = [
  {
    id: 'content-prep',
    name: 'Content preparation',
    description: 'Validate captions and store ready-to-publish drafts.',
    requiresProfessional: false,
    nodes: ['Validate content', 'Store draft'],
  },
  {
    id: 'manual-engagement',
    name: 'Manual engagement approval',
    description: 'Require a human decision before opening an unrelated Instagram post.',
    requiresProfessional: false,
    nodes: ['Human approval'],
  },
  {
    id: 'official-publish',
    name: 'Official Meta publishing',
    description: 'Publish approved media through the Meta Graph API.',
    requiresProfessional: true,
    nodes: ['Validate content', 'Human approval', 'Meta capability'],
  },
  {
    id: 'comment-inbox',
    name: 'Comment and inbox routing',
    description: 'Process owned-post comments and eligible inbound conversations.',
    requiresProfessional: true,
    nodes: ['Meta capability'],
  },
] as const;

export function getWorkflowEngine(workflowId: string) {
  if (workflowId === 'content-prep') {
    return new WorkflowEngine([
      new ValidateContentNode('validate-content', 'Validate content'),
      new StoreDraftNode('store-draft', 'Store draft'),
    ]);
  }

  if (workflowId === 'manual-engagement') {
    return new WorkflowEngine([new HumanApprovalNode('human-approval', 'Human approval')]);
  }

  if (workflowId === 'official-publish') {
    return new WorkflowEngine([
      new ValidateContentNode('validate-content', 'Validate content'),
      new HumanApprovalNode('human-approval', 'Human approval'),
      new MetaCapabilityNode('meta-capability', 'Meta capability'),
    ]);
  }

  if (workflowId === 'comment-inbox') {
    return new WorkflowEngine([new MetaCapabilityNode('meta-capability', 'Meta capability')]);
  }

  return null;
}

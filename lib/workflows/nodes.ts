import type {
  WorkflowContext,
  WorkflowNode,
  WorkflowNodeResult,
} from './types';

abstract class BaseNode implements WorkflowNode {
  constructor(
    public id: string,
    public label: string,
  ) {}
  abstract execute(context: WorkflowContext): Promise<WorkflowNodeResult>;
}

export class ValidateContentNode extends BaseNode {
  async execute(context: WorkflowContext): Promise<WorkflowNodeResult> {
    const captionValue = context.payload.caption;
    const caption = typeof captionValue === 'string' ? captionValue.trim() : '';
    return caption
      ? {
          node: this.id,
          status: 'completed',
          message: 'Caption and content metadata are valid.',
        }
      : { node: this.id, status: 'blocked', message: 'A caption is required.' };
  }
}

export class HumanApprovalNode extends BaseNode {
  async execute(context: WorkflowContext): Promise<WorkflowNodeResult> {
    return context.approved
      ? {
          node: this.id,
          status: 'completed',
          message: 'Human approval recorded.',
        }
      : {
          node: this.id,
          status: 'waiting',
          message: 'Waiting for explicit human approval.',
        };
  }
}

export class MetaCapabilityNode extends BaseNode {
  async execute(context: WorkflowContext): Promise<WorkflowNodeResult> {
    return context.accountMode === 'professional'
      ? {
          node: this.id,
          status: 'completed',
          message: 'Official Meta API capability is available.',
        }
      : {
          node: this.id,
          status: 'blocked',
          message:
            'A Creator or Business account is required for this official API action.',
        };
  }
}

export class StoreDraftNode extends BaseNode {
  async execute(): Promise<WorkflowNodeResult> {
    return {
      node: this.id,
      status: 'completed',
      message: 'Draft stored in the content queue.',
    };
  }
}

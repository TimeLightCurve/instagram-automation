export type AccountMode = 'personal' | 'professional';

export type WorkflowContext = {
  accountMode: AccountMode;
  payload: Record<string, unknown>;
  approved?: boolean;
};

export type WorkflowNodeResult = {
  node: string;
  status: 'completed' | 'waiting' | 'blocked';
  message: string;
};

export type WorkflowRun = {
  id: string;
  status: WorkflowNodeResult['status'];
  results: WorkflowNodeResult[];
};

export interface WorkflowNode {
  id: string;
  label: string;
  execute(context: WorkflowContext): Promise<WorkflowNodeResult>;
}

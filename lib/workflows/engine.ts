import type { WorkflowContext, WorkflowNode, WorkflowRun } from './types';

export class WorkflowEngine {
  constructor(private readonly nodes: WorkflowNode[]) {}

  async run(context: WorkflowContext): Promise<WorkflowRun> {
    const results = [];

    for (const node of this.nodes) {
      const result = await node.execute(context);
      results.push(result);
      if (result.status !== 'completed') break;
    }

    return {
      id: crypto.randomUUID(),
      status: results.at(-1)?.status ?? 'completed',
      results,
    };
  }
}

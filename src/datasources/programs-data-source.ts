import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { BaseOpenMRSDataSource } from './data-source';

export class ProgramsWorkflowDataSource extends BaseOpenMRSDataSource {
  constructor() {
    super(null);
  }

  async fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
    const rep = 'v=custom:(uuid,display,allWorkflows,concept:(uuid,display))';
    const url = `${restBaseUrl}/program/${config}?${rep}`;
    const { data } = await openmrsFetch(url);

    const formattedWorkFlows = data?.allWorkflows.map((workflow) =>({
        uuid: workflow.uuid,
        display: workflow.concept.display
    }))
    return formattedWorkFlows;
  }
}

export class ProgramsWorkflowStateDataSource extends BaseOpenMRSDataSource {
    constructor() {
      super(null);
    }
  
    async fetchData(searchTerm: string, config?: Record<string, any>): Promise<any[]> {
      const rep = 'v=custom:(uuid,states,concept:(uuid,display))';
      const url = `${restBaseUrl}/workflow/70921392-4e3e-5465-978d-45b68b7def5f?${rep}`;
      const { data } = await openmrsFetch(url);

      const formattedStates = data?.states.map((state) =>({
        uuid: state.uuid,
        display: state.concept.display
      }))
      return formattedStates;
    }
  }

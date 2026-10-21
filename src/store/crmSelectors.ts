import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { mergeCRMLeads } from '../pages/crm/model';

export const selectUnifiedCRMLeads = createSelector(
  [(state: RootState) => state.crm.leads,
    (state: RootState) => state.crm.apiLeadIds,
    (state: RootState) => state.crm.apiLeadScope,
    (state: RootState) => state.auth.tenant?.id],
  (leads, apiIds, apiScope, tenantId) => {
    const ids = new Set(apiScope === tenantId ? apiIds : []);
    return mergeCRMLeads(leads.filter(lead => ids.has(lead.id)), leads.filter(lead => !ids.has(lead.id)));
  },
);

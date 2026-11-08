import { AIManagement } from '../../../modules/brand-engine/components/superadmin/AIManagement';
import { PhoenixAdminBridge } from '../../../modules/brand-engine/components/superadmin/PhoenixAdminBridge';

export default function AICenterManagementTab() {
  return <PhoenixAdminBridge><AIManagement /></PhoenixAdminBridge>;
}

import { DiscoveryConsole } from '../../../modules/brand-engine/components/superadmin/DiscoveryConsole';
import { PhoenixAdminBridge } from '../../../modules/brand-engine/components/superadmin/PhoenixAdminBridge';

export default function BusinessDiscoveryManagementTab() {
  return <PhoenixAdminBridge discovery><DiscoveryConsole /></PhoenixAdminBridge>;
}

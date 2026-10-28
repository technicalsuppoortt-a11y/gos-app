import { UserLayout } from '../../components/layout/UserLayout';
import { SupportChat } from './SupportChat';

/** Retain the existing user layout while support uses its normal sidebar route. */
export function UserLayoutWithSupport() {
  return <UserLayout/>;
}
export function UserSupportPage() {
  return <SupportChat/>;
}

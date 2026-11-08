// gos-app: "/dashboard" here meant Joe Academy's dashboard; Launch Brand now runs on gos-app.
const JOE_ACADEMY_ORIGIN = import.meta.env.VITE_JOE_ACADEMY_ORIGIN || 'https://academy.mohamedjoe.com';
export function openPhoenixAccount(_origin?: string, _uid?: string) {
  window.location.assign(`${JOE_ACADEMY_ORIGIN}/dashboard`);
}

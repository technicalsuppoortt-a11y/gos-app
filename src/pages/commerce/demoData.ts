import type { Product, Student } from './model';

// Only missing collections and unchanged legacy demo fixtures get sample content.
// Explicitly empty collections and customer edits remain intact.
export function populateCommerceDemo(product: Product, now = new Date()): Product {
  if (!product.config) return product;
  const c = { ...product.config }, prefix = product.id || 'draft';
  const people = ['Sarah Ahmed', 'Omar Khaled', 'Lina Mansour', 'Nour Hassan', 'Karim Adel', 'Mona Ibrahim', 'Youssef Ali', 'Diana George'];
  const avatars = ['sarah', 'omar', 'lina', 'nour', 'karim', 'mona', 'youssef', 'diana'];
  const date = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
  const legacyOrders = c.orders?.length === 2 && c.orders.every((o, i) => o.sample && o.id === `DEMO-${prefix}-0${i + 1}` && Object.keys(o).length === 8 && o.email === `${avatars[i]}@example.com` && o.currency === c.currency && o.customer === people[i] && o.amount === c.amount && o.status === (i ? 'Pending' : 'Paid') && o.at.startsWith(i ? '2026-10-10' : '2026-10-09'));
  if (c.orders === undefined || legacyOrders) c.orders = Array.from({ length: 18 }, (_, i) => ({
    id: `SAMPLE-${prefix}-${1048 - i}`, customer: people[i % people.length], email: `${avatars[i % avatars.length]}@example.com`,
    productName: product.name, at: date(i < 6 ? i * 3 : (i - 5) * 11 + 18), amount: c.amount || (product.type === 'Course' ? 297 : 97), currency: c.currency,
    status: i === 2 || i === 8 ? 'Pending' : i === 5 ? 'Refunded' : 'Paid', sample: true,
  }));
  const legacyStudent = c.students?.length === 1 && Object.keys(c.students[0]).length === 6 && c.students[0].id === `student-${prefix}-01` && c.students[0].name === 'Sarah Ahmed' && c.students[0].email === 'sarah@example.com' && c.students[0].progress === 45 && c.students[0].status === 'Active' && c.students[0].enrolledAt === '2026-10-09';
  if (product.type === 'Course' && (c.students === undefined || legacyStudent)) c.students = people.map((name, i): Student => ({
    id: `SAMPLE-student-${prefix}-${i}`, name, email: `${avatars[i]}@example.com`, avatar: avatars[i], sample: true,
    status: i === 2 ? 'Pending' : i === 1 || i === 4 ? 'Completed' : 'Active', progress: [72, 100, 0, 38, 100, 56, 18, 84][i], enrolledAt: date([3, 31, 6, 48, 74, 95, 121, 150][i]).slice(0, 10),
  }));
  if (c.activities === undefined || (c.activities.length === 1 && c.activities[0].id === `created-${prefix}` && c.activities[0].title === 'Product added to catalog' && c.activities[0].at === '2026-10-08T09:00:00+03:00')) {
    const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency, maximumFractionDigits: 0 }).format(c.orders?.[0]?.amount ?? c.amount);
    c.activities = [
      { id: `SAMPLE-activity-${prefix}-1`, title: `Sample · Payment received ${money} from Sarah Ahmed`, at: date(0) },
      { id: `SAMPLE-activity-${prefix}-2`, title: product.type === 'Course' ? 'Sample · New student enrolled: Sarah Ahmed' : product.type === 'Service' ? 'Sample · Strategy session booked by Nour Hassan' : 'Sample · Download access delivered to Lina Mansour', at: date(1) },
      { id: `SAMPLE-activity-${prefix}-3`, title: product.type === 'Course' ? 'Sample · Course completed by Omar Khaled' : 'Sample · Customer receipt delivered to Omar Khaled', at: date(2) },
      { id: `SAMPLE-activity-${prefix}-4`, title: 'Sample · Checkout opened by a returning customer', at: date(3) },
    ];
  }
  return { ...product, config: c };
}

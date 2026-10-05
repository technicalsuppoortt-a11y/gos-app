export type Discount = { id: string; code: string; description: string; type: 'Percentage' | 'Fixed Amount'; value: number; applies: string; uses: number; limit: number; expiry: string; active: boolean; minimum: number; customersOnly: boolean; once: boolean };
const seed: Discount[] = [
 ['LAUNCH20','Launch offer','Percentage',20,'All Products',84,200,'2025-12-31',true],
 ['WELCOME10','New customers','Percentage',10,'All Products',156,500,'',true],
 ['COURSES50','Course offer','Fixed Amount',50,'Specific Products',32,100,'2025-11-30',true],
 ['BLACKFRIDAY','Black Friday','Percentage',30,'All Products',420,1000,'2025-11-29',true],
 ['VIP20','VIP customers','Percentage',20,'Memberships',18,100,'',false],
 ['SUMMER25','Summer campaign','Percentage',25,'Specific Products',96,300,'2025-08-31',true],
 ['FREESHIP','Free shipping','Fixed Amount',5,'All Products',220,500,'',true],
 ['FIRSTPAY','First payment','Percentage',15,'Payment Plans',41,200,'2025-12-15',false],
 ['LOYALTY15','Returning customers','Percentage',15,'All Products',24,200,'',true],
 ['BUNDLE30','Bundle offer','Fixed Amount',30,'Specific Products',12,100,'',true],
 ['MEMBER10','Member offer','Percentage',10,'Memberships',9,100,'',false],
 ['AUTUMN20','Autumn campaign','Percentage',20,'All Products',16,200,'2025-10-31',true],
].map((row,i)=>({id:`discount-${i}`,code:row[0],description:row[1],type:row[2],value:row[3],applies:row[4],uses:row[5],limit:row[6],expiry:row[7],active:row[8],minimum:0,customersOnly:false,once:false})) as Discount[];
export const initialForm: Discount = {...seed[0],id:'',description:'Special launch discount for new customers.'};
const storageKey='gos-discounts-v1';
export function readDiscounts(): Discount[] { try {const saved=JSON.parse(localStorage.getItem(storageKey)??'null');return Array.isArray(saved)&&saved.every(d=>typeof d.code==='string'&&typeof d.id==='string')?saved:seed;}catch{return seed;} }

export function writeDiscounts(discounts: Discount[]) { localStorage.setItem(storageKey, JSON.stringify(discounts)); }
export const discountsPath = '/dashboard/products-payments?tab=discounts';
export const discountNewPath = '/dashboard/products-payments/discounts/new';
export const discountEditPath = (id: string) => '/dashboard/products-payments/discounts/' + encodeURIComponent(id) + '/edit';

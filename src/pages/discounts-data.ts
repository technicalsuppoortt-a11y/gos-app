import { cloudStorage } from '../backend/workspace';
export type Discount = { id: string; code: string; description: string; type: 'Percentage' | 'Fixed Amount'; value: number; applies: string; uses: number; limit: number; expiry: string; active: boolean; minimum: number; customersOnly: boolean; once: boolean };
const seed: Discount[] = [];
export const initialForm: Discount = {id:'',code:'',description:'',type:'Percentage',value:0,applies:'All Products',uses:0,limit:0,expiry:'',active:true,minimum:0,customersOnly:false,once:false};
const storageKey='gos-discounts-v1';
export function readDiscounts(): Discount[] { try {const saved=JSON.parse(cloudStorage.getItem(storageKey)??'null');return Array.isArray(saved)&&saved.every(d=>typeof d.code==='string'&&typeof d.id==='string')?saved:seed;}catch{return seed;} }

export function writeDiscounts(discounts: Discount[]) { cloudStorage.setItem(storageKey, JSON.stringify(discounts)); }
export const discountsPath = '/dashboard/products-payments?tab=discounts';
export const discountNewPath = '/dashboard/products-payments/discounts/new';
export const discountEditPath = (id: string) => '/dashboard/products-payments/discounts/' + encodeURIComponent(id) + '/edit';

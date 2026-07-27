/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, SKU } from '../types';

import productMasterJson from './osaka_product_master.json';

export const INITIAL_STORES: Store[] = [
  {
    id: 'store_1',
    name: 'WinMart+ Nguyễn Thị Minh Khai',
    address: '12 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. HCM',
    gps: '10.7852, 106.6985',
  },
  {
    id: 'store_2',
    name: 'Bách Hóa Xanh Cách Mạng Tháng 8',
    address: '245 Cách Mạng Tháng Tám, Phường 4, Quận 3, TP. HCM',
    gps: '10.7781, 106.6814',
  },
  {
    id: 'store_3',
    name: 'Co.op Food Huỳnh Tấn Phát',
    address: '512 Huỳnh Tấn Phát, Phường Bình Thuận, Quận 7, TP. HCM',
    gps: '10.7382, 106.7329',
  },
  {
    id: 'store_4',
    name: 'Circle K Bùi Viện',
    address: '102 Bùi Viện, Phường Phạm Ngũ Lão, Quận 1, TP. HCM',
    gps: '10.7674, 106.6917',
  },
  {
    id: 'store_5',
    name: 'Aeon Citimart Cao Thắng',
    address: '96 Cao Thắng, Phường 4, Quận 3, TP. HCM',
    gps: '10.7725, 106.6798',
  }
];

export const MANUFACTURERS: string[] = productMasterJson.manufacturers.map(m => m.name);

export const INITIAL_SKUS: SKU[] = productMasterJson.manufacturers.flatMap((mfg) => {
  return mfg.skus.map((sku, index) => ({
    id: `sku_${mfg.id}_${index + 1}`,
    name: sku.name,
    manufacturer: mfg.name,
    storeFrequency: sku.store_frequency,
  }));
});

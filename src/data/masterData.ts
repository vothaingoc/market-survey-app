/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, SKU } from '../types';

import productMasterJson from './osaka_product_master.json';

export const INITIAL_STORES: Store[] = [];

export const MANUFACTURERS: string[] = productMasterJson.manufacturers.map(m => m.name);

export const INITIAL_SKUS: SKU[] = productMasterJson.manufacturers.flatMap((mfg) => {
  return mfg.skus.map((sku, index) => ({
    id: `sku_${mfg.id}_${index + 1}`,
    name: sku.name,
    manufacturer: mfg.name,
    storeFrequency: sku.store_frequency,
  }));
});

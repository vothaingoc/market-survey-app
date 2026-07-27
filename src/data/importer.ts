/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, SKU, Survey, SurveyRecord, DistributionType } from '../types';
import { OfflineDB } from './store';
import { SEED_SURVEY_INFO, SEED_STORES, SEED_MANUFACTURERS, ImportReport, SeedObservation } from './seedData';
import rawSeedJson from './osaka_full_survey_seed.json';

export function runOsakaSeedImport(options?: { force?: boolean }): ImportReport {
  // If seed data has already been imported once and force is not true, do not re-import
  if (!options?.force && localStorage.getItem('osaka_seed_imported_v1') === 'true') {
    return {
      surveysImported: 0,
      storesImported: 0,
      manufacturersImported: 0,
      skusImported: 0,
      observationsImported: 0,
      entriesImported: 0,
      skippedDuplicates: 0,
      invalidRecords: 0,
    };
  }
  const existingStores = OfflineDB.getStores();
  const existingSKUs = OfflineDB.getSKUs();
  const existingSurveys = OfflineDB.getSurveys();
  const existingRecords = OfflineDB.getRecords();

  const existingStoreIds = new Set(existingStores.map(s => s.id));
  const existingSkuIds = new Set(existingSKUs.map(s => s.id));
  const existingSurveyIds = new Set(existingSurveys.map(s => s.id));
  const existingRecordIds = new Set(existingRecords.map(r => r.id));

  let surveysImported = 0;
  let storesImported = 0;
  let manufacturersImported = 0;
  let skusImported = 0;
  let observationsImported = 0;
  let entriesImported = 0;
  let skippedDuplicates = 0;
  let invalidRecords = 0;

  // 1. Import Stores
  const storesToSave = [...existingStores];
  for (const storeSeed of SEED_STORES) {
    if (!existingStoreIds.has(storeSeed.id)) {
      const newStore: Store = {
        id: storeSeed.id,
        name: storeSeed.name,
        address: storeSeed.address_raw || '',
        gps: storeSeed.gps || '',
        photo: storeSeed.storefront_photo || undefined,
      };
      storesToSave.push(newStore);
      existingStoreIds.add(storeSeed.id);
      storesImported++;
    }
  }
  localStorage.setItem('survey_stores', JSON.stringify(storesToSave));

  // 2. Import Manufacturers and SKUs (Sorted by store_frequency descending)
  const skuMapByName = new Map<string, SKU>();
  existingSKUs.forEach(sku => {
    skuMapByName.set(`${sku.manufacturer}::${sku.name}`, sku);
  });

  const skusToSave = [...existingSKUs];
  const mfgNames = new Set<string>();

  for (const mfg of SEED_MANUFACTURERS) {
    mfgNames.add(mfg.name);
    // Sort SKUs within manufacturer by store_frequency descending
    const sortedSkus = [...mfg.skus].sort((a, b) => b.store_frequency - a.store_frequency);

    for (const skuSeed of sortedSkus) {
      const key = `${mfg.name}::${skuSeed.name}`;
      if (!skuMapByName.has(key)) {
        const generatedSkuId = `sku_${mfg.name}_${skuSeed.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const newSku: SKU = {
          id: generatedSkuId,
          name: skuSeed.name,
          manufacturer: mfg.name,
          storeFrequency: skuSeed.store_frequency,
        };
        skusToSave.push(newSku);
        skuMapByName.set(key, newSku);
        existingSkuIds.add(generatedSkuId);
        skusImported++;
      }
    }
  }
  manufacturersImported = SEED_MANUFACTURERS.length;
  localStorage.setItem('survey_skus', JSON.stringify(skusToSave));

  // 3. Import Surveys (One per store for survey osaka_2026_07_03)
  const surveysToSave = [...existingSurveys];
  for (const storeSeed of SEED_STORES) {
    const surveyIdForStore = `survey_${SEED_SURVEY_INFO.id}_${storeSeed.id}`;
    if (!existingSurveyIds.has(surveyIdForStore)) {
      const newSurvey: Survey = {
        id: surveyIdForStore,
        storeId: storeSeed.id,
        date: SEED_SURVEY_INFO.survey_date.replace(/-/g, '/'),
        status: 'đã hoàn thành',
      };
      surveysToSave.push(newSurvey);
      existingSurveyIds.add(surveyIdForStore);
      surveysImported++;
    }
  }
  localStorage.setItem('survey_list', JSON.stringify(surveysToSave));

  // 4. Import Observations and Entries
  const rawObservations: SeedObservation[] = (rawSeedJson as any).observations || [];
  const recordsToSave = [...existingRecords];

  for (const obs of rawObservations) {
    if (!obs || !obs.id || !obs.sku || !obs.manufacturer) {
      invalidRecords++;
      continue;
    }

    const skuKey = `${obs.manufacturer}::${obs.sku}`;
    const targetSku = skuMapByName.get(skuKey);
    const targetSurveyId = `survey_${SEED_SURVEY_INFO.id}_${obs.store_id}`;

    if (!targetSku) {
      invalidRecords++;
      continue;
    }

    let obsValid = false;
    for (let i = 0; i < (obs.entries || []).length; i++) {
      const entry = obs.entries[i];
      const recordId = `rec_${obs.id}_${i}`;

      if (existingRecordIds.has(recordId)) {
        skippedDuplicates++;
        continue;
      }

      // Map distribution type
      let distType: DistributionType = 'Không rõ';
      if (entry.distribution_type === 'official') distType = 'Chính ngạch';
      else if (entry.distribution_type === 'parallel') distType = 'Tiểu ngạch';
      else distType = 'Không rõ';

      // Map prices
      let p1: number | null = null;
      let p5: number | null = null;
      let pCarton: number | null = null;

      if (entry.sale_price) {
        const amt = entry.sale_price.amount_yen;
        if (amt !== null && amt !== undefined) {
          if (entry.sale_price.unit_hint === '5_pack') {
            p5 = Number(amt);
          } else {
            p1 = Number(amt);
          }
        }
      }

      if (entry.case_price && entry.case_price.amount_yen !== null && entry.case_price.amount_yen !== undefined) {
        pCarton = Number(entry.case_price.amount_yen);
      }

      // Map expiry date
      let finalExpiry = '';
      if (entry.expiration_date) {
        finalExpiry = String(entry.expiration_date).replace(/-/g, '/');
      } else if (entry.expiration_raw !== null && entry.expiration_raw !== undefined) {
        finalExpiry = String(entry.expiration_raw);
      }

      const newRecord: SurveyRecord = {
        id: recordId,
        surveyId: targetSurveyId,
        skuId: targetSku.id,
        type: distType,
        price1: p1,
        price5: p5,
        priceCarton: pCarton,
        expiryDate: finalExpiry,
        factoryCode: entry.factory_code || null,
        facing: obs.face_count !== null && obs.face_count !== undefined ? obs.face_count : 1,
        photo: null,
        timestamp: `${SEED_SURVEY_INFO.survey_date} 00:00:00`,
      };

      recordsToSave.push(newRecord);
      existingRecordIds.add(recordId);
      entriesImported++;
      obsValid = true;
    }

    if (obsValid) {
      observationsImported++;
    }
  }

  localStorage.setItem('survey_records', JSON.stringify(recordsToSave));
  localStorage.setItem('osaka_seed_imported_v1', 'true');

  return {
    surveysImported,
    storesImported,
    manufacturersImported,
    skusImported,
    observationsImported,
    entriesImported,
    skippedDuplicates,
    invalidRecords,
  };
}

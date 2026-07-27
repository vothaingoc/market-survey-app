/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, SKU, Survey, SurveyRecord, DistributionType } from '../types';
import { INITIAL_STORES, INITIAL_SKUS } from './masterData';

// Helper to get from localstorage with fallback
function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

// Helper to set localstorage
function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

export const OfflineDB = {
  // Stores
  getStores(): Store[] {
    const raw = localStorage.getItem('survey_stores');
    if (raw === null) {
      setLocal('survey_stores', INITIAL_STORES);
      return INITIAL_STORES;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading survey_stores from localStorage', e);
      return [];
    }
  },
  
  saveStore(store: Store): void {
    const stores = this.getStores();
    const index = stores.findIndex(s => s.id === store.id);
    if (index >= 0) {
      stores[index] = store;
    } else {
      stores.unshift(store); // Add newest first
    }
    setLocal('survey_stores', stores);
  },

  deleteStore(id: string): void {
    const stores = this.getStores().filter(s => s.id !== id);
    setLocal('survey_stores', stores);
  },

  // SKUs
  getSKUs(): SKU[] {
    const raw = localStorage.getItem('survey_skus');
    if (raw === null) {
      setLocal('survey_skus', INITIAL_SKUS);
      return INITIAL_SKUS;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading survey_skus from localStorage', e);
      return [];
    }
  },

  saveSKU(sku: SKU): void {
    const skus = this.getSKUs();
    const index = skus.findIndex(s => s.id === sku.id);
    if (index >= 0) {
      skus[index] = sku;
    } else {
      skus.unshift(sku); // Add newest first
    }
    setLocal('survey_skus', skus);
  },

  deleteSKU(id: string): void {
    const skus = this.getSKUs().filter(s => s.id !== id);
    setLocal('survey_skus', skus);
  },

  // Surveys
  getSurveys(): Survey[] {
    return getLocal<Survey[]>('survey_list', []);
  },

  saveSurvey(survey: Survey): void {
    const surveys = this.getSurveys();
    const index = surveys.findIndex(s => s.id === survey.id);
    if (index >= 0) {
      surveys[index] = survey;
    } else {
      surveys.unshift(survey);
    }
    setLocal('survey_list', surveys);
  },

  deleteSurvey(id: string): void {
    const surveys = this.getSurveys().filter(s => s.id !== id);
    setLocal('survey_list', surveys);
    // Delete all records in this survey
    const records = this.getRecords().filter(r => r.surveyId !== id);
    setLocal('survey_records', records);
  },

  // Survey Records
  getRecords(): SurveyRecord[] {
    return getLocal<SurveyRecord[]>('survey_records', []);
  },

  getRecordsForSurvey(surveyId: string): SurveyRecord[] {
    return this.getRecords().filter(r => r.surveyId === surveyId);
  },

  saveRecord(record: SurveyRecord): void {
    const records = this.getRecords();
    const index = records.findIndex(r => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.unshift(record); // Add newest first so it's recorded in shelf order
    }
    setLocal('survey_records', records);
  },

  deleteRecord(id: string): void {
    const records = this.getRecords().filter(r => r.id !== id);
    setLocal('survey_records', records);
  },

  // Fast Export - Generates standard CSV text for Vietnam Market Survey
  exportCSV(surveyIds?: string[]): string {
    let records = this.getRecords();
    if (surveyIds && surveyIds.length > 0) {
      records = records.filter(r => surveyIds.includes(r.surveyId));
    }
    const stores = this.getStores();
    const skus = this.getSKUs();
    const surveys = this.getSurveys();

    // Map helpers
    const storeMap = new Map<string, Store>(stores.map(s => [s.id, s]));
    const skuMap = new Map<string, SKU>(skus.map(s => [s.id, s]));
    const surveyMap = new Map<string, Survey>(surveys.map(s => [s.id, s]));

    // CSV Headers
    const headers = [
      'Mã Khảo Sát',
      'Thời Gian',
      'Tên Cửa Hàng',
      'Địa Chỉ Cửa Hàng',
      'Tọa Độ GPS',
      'Nhà Sản Xuất',
      'Tên SKU',
      'Loại Hàng',
      'Giá 1 Gói (Yên)',
      'Giá 5 Gói (Yên)',
      'Giá 1 Thùng (Yên)',
      'Hạn Sử Dụng',
      'Mã Nhà Máy',
      'Số Face',
      'Có Ảnh Chụp'
    ];

    const rows = records.map(r => {
      const survey = surveyMap.get(r.surveyId);
      const store = survey ? storeMap.get(survey.storeId) : undefined;
      const sku = skuMap.get(r.skuId);

      return [
        r.surveyId,
        survey?.date || '',
        store?.name || 'Cửa hàng đã xóa',
        store?.address || '',
        store?.gps || '',
        sku?.manufacturer || 'Không rõ',
        sku?.name || 'SKU đã xóa',
        r.type,
        r.price1 !== null ? r.price1 : '',
        r.price5 !== null ? r.price5 : '',
        r.priceCarton !== null ? r.priceCarton : '',
        r.expiryDate,
        r.factoryCode || '',
        r.facing,
        r.photoCount || (r.photos && r.photos.length > 0 ? `Có (${r.photos.length} ảnh)` : (r.photo ? 'Có (1 ảnh)' : 'Không'))
      ];
    });

    // Add BOM for Excel UTF-8 display compatibility in Vietnamese
    const BOM = '\uFEFF';
    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => {
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(','))].join('\n');

    return BOM + csvContent;
  },

  // Fast Export - Generates structured JSON text for AI analysis (ChatGPT / Gemini / Claude)
  exportJSON(surveyIds?: string[]): string {
    let surveys = this.getSurveys();
    if (surveyIds && surveyIds.length > 0) {
      surveys = surveys.filter(s => surveyIds.includes(s.id));
    }
    const stores = this.getStores();
    const skus = this.getSKUs();
    const allRecords = this.getRecords();

    const storeMap = new Map<string, Store>(stores.map(s => [s.id, s]));
    const skuMap = new Map<string, SKU>(skus.map(s => [s.id, s]));

    const exportedAt = new Date().toISOString();

    const storeEntries = surveys.map(survey => {
      const store = storeMap.get(survey.storeId);
      const records = allRecords.filter(r => r.surveyId === survey.id);

      let surveyDateStr = survey.date || '';
      if (survey.date) {
        const datePart = survey.date.split(' ')[0];
        surveyDateStr = datePart.replace(/\//g, '-');
      }

      const products = records.map(r => {
        const sku = skuMap.get(r.skuId);
        return {
          manufacturer: sku?.manufacturer || 'Không rõ',
          sku: sku?.name || 'SKU không xác định',
          distributionType: r.type,
          priceSingle: r.price1 !== null && r.price1 !== undefined ? Number(r.price1) : null,
          priceFivePack: r.price5 !== null && r.price5 !== undefined ? Number(r.price5) : null,
          priceCarton: r.priceCarton !== null && r.priceCarton !== undefined ? Number(r.priceCarton) : null,
          expirationDate: r.expiryDate || '',
          factoryCode: r.factoryCode || null,
          faceCount: r.facing || 0,
          photoCount: r.photos && r.photos.length > 0 ? r.photos.length : (r.photo ? 1 : 0),
        };
      });

      return {
        storeName: store?.name || 'Cửa hàng không xác định',
        address: store?.address || '',
        surveyDate: surveyDateStr,
        products,
      };
    });

    const jsonObj = {
      survey: {
        exportedAt,
        stores: storeEntries,
      },
    };

    return JSON.stringify(jsonObj, null, 2);
  },

  // Reset entire DB for testing
  resetAll(): void {
    localStorage.removeItem('survey_stores');
    localStorage.removeItem('survey_skus');
    localStorage.removeItem('survey_list');
    localStorage.removeItem('survey_records');
    localStorage.removeItem('osaka_seed_imported_v1');
    this.getStores(); // triggers re-initialization
    this.getSKUs();   // triggers re-initialization
  }
};

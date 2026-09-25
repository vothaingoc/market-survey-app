/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, SKU, Survey, SurveyRecord, DistributionType } from '../types';
import { INITIAL_STORES, INITIAL_SKUS } from './masterData';

const SCHEMA_VERSION = '1.0';

type NormalizedDistribution = 'official' | 'parallel' | 'unknown';

const OFFICIAL_DISTRIBUTION = '\u0043h\u00ednh ng\u1ea1ch' as DistributionType;
const PARALLEL_DISTRIBUTION = 'Ti\u1ec3u ng\u1ea1ch' as DistributionType;
const UNKNOWN_DISTRIBUTION = 'Kh\u00f4ng r\u00f5' as DistributionType;
const DEFAULT_SURVEY_STATUS = '\u0111ang th\u1ef1c hi\u1ec7n' as Survey['status'];

type JsonPhoto = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  type: 'product';
};

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseGps(value: string | null | undefined): { lat: number; lng: number } | null {
  if (!value) return null;
  const parts = value.split(',').map(part => Number(part.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function stringifyGps(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const gps = value as { lat?: unknown; lng?: unknown };
  const lat = Number(gps.lat);
  const lng = Number(gps.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return '';
  return `${lat}, ${lng}`;
}

function normalizeIsoDate(value: unknown): string | null {
  if (isBlank(value)) return null;
  const raw = String(value).trim();
  if (/^(khong ro hsd|không rõ hsd)$/i.test(raw)) return null;
  const datePart = raw.split(/[ T]/)[0];
  const monthOnlyMatch = datePart.match(/^(\d{4})[-/](\d{1,2})$/);
  if (monthOnlyMatch) {
    const year = Number(monthOnlyMatch[1]);
    const month = Number(monthOnlyMatch[2]);
    if (month < 1 || month > 12) return null;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const match = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);

  if (month > 12 && day >= 1 && day <= 12) {
    const originalMonth = month;
    month = day;
    day = originalMonth;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toUiDate(value: unknown): string {
  const iso = normalizeIsoDate(value);
  return iso ? iso.replace(/-/g, '/') : '';
}

function normalizeDistribution(value: unknown): { value: NormalizedDistribution; label: string; legacy: DistributionType } {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('official') || raw.includes('ch') || raw.includes('ngach')) {
    return { value: 'official', label: '\u0043h\u00ednh ng\u1ea1ch', legacy: OFFICIAL_DISTRIBUTION };
  }
  if (raw.includes('parallel') || raw.includes('tieu')) {
    return { value: 'parallel', label: 'Ti\u1ec3u ng\u1ea1ch', legacy: PARALLEL_DISTRIBUTION };
  }
  return { value: 'unknown', label: 'Kh\u00f4ng r\u00f5', legacy: UNKNOWN_DISTRIBUTION };
}

function getPhotoMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : 'application/octet-stream';
}

function getDataUrlSize(dataUrl: string): number {
  const payload = dataUrl.split(',')[1] || '';
  return Math.ceil((payload.length * 3) / 4);
}

function photoToExport(photo: string, observationId: string, index: number): JsonPhoto {
  const mimeType = getPhotoMimeType(photo);
  const extension = mimeType.split('/')[1] || 'jpg';
  return {
    id: `${observationId}_photo_${index + 1}`,
    filename: `${observationId}_photo_${index + 1}.${extension}`,
    mimeType,
    size: getDataUrlSize(photo),
    type: 'product',
  };
}

function validateUniqueIds(label: string, ids: string[], errors: string[]): void {
  const seen = new Set<string>();
  ids.forEach(id => {
    if (!id) errors.push(`Missing ${label} id`);
    if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  });
}

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
function setLocal<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
    return false;
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

  saveRecord(record: SurveyRecord): boolean {
    const photos = record.photos && record.photos.length > 0
      ? record.photos
      : (record.photo ? [record.photo] : []);
    const normalizedRecord: SurveyRecord = {
      ...record,
      photo: photos.length > 0 ? null : record.photo,
      photos,
    };
    const records = this.getRecords().map(r => {
      if (r.photos && r.photos.length > 0 && r.photo) {
        return { ...r, photo: null };
      }
      return r;
    });
    const index = records.findIndex(r => r.id === normalizedRecord.id);
    if (index >= 0) {
      records[index] = normalizedRecord;
    } else {
      records.unshift(normalizedRecord); // Add newest first so it's recorded in shelf order
    }
    return setLocal('survey_records', records);
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

  // Fast Export - Generates structured JSON text for AI analysis and re-import
  exportJSON(surveyIds?: string[]): string {
    let surveys = this.getSurveys();
    if (surveyIds && surveyIds.length > 0) {
      surveys = surveys.filter(s => surveyIds.includes(s.id));
    }

    const surveyIdSet = new Set(surveys.map(s => s.id));
    const allRecords = this.getRecords().filter(r => surveyIdSet.has(r.surveyId));
    const allStores = this.getStores();
    const allSkus = this.getSKUs();

    const storeMap = new Map<string, Store>(allStores.map(s => [s.id, s]));
    const skuMap = new Map<string, SKU>(allSkus.map(s => [s.id, s]));
    const surveyMap = new Map<string, Survey>(surveys.map(s => [s.id, s]));
    const manufacturerNames: string[] = Array.from(new Set<string>(allSkus.map(sku => sku.manufacturer).filter((name): name is string => typeof name === 'string' && name.length > 0))).sort();
    const manufacturerIdMap = new Map<string, string>(manufacturerNames.map((name): [string, string] => [name, name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unknown']));

    const errors: string[] = [];
    validateUniqueIds('survey', surveys.map(s => s.id), errors);
    validateUniqueIds('observation', allRecords.map(r => r.id), errors);
    validateUniqueIds('store', allStores.map(s => s.id), errors);
    validateUniqueIds('sku', allSkus.map(s => s.id), errors);

    const neededStoreIds = new Set(surveys.map(s => s.storeId));
    const neededSkuIds = new Set(allRecords.map(r => r.skuId));
    const stores = allStores.filter(store => neededStoreIds.has(store.id));
    const skus = allSkus.filter(sku => neededSkuIds.has(sku.id));

    const surveySummaries = surveys.map(survey => {
      const surveyDate = normalizeIsoDate(survey.date);
      if (!surveyDate && survey.date) errors.push(`Invalid survey date for ${survey.id}: ${survey.date}`);
      const store = storeMap.get(survey.storeId);
      return {
        surveyId: survey.id,
        surveyName: store ? `${store.name} - ${surveyDate || survey.date || 'No date'}` : survey.id,
        surveyDate,
        surveyor: null,
        storeId: survey.storeId,
        storeName: store?.name || null,
        status: survey.status || null,
      };
    });

    const observations = allRecords.map(record => {
      const sku = skuMap.get(record.skuId);
      const survey = surveyMap.get(record.surveyId);
      const store = survey ? storeMap.get(survey.storeId) : undefined;
      const distribution = normalizeDistribution(record.type);
      const expirationDate = normalizeIsoDate(record.expiryDate);
      if (!expirationDate && record.expiryDate) errors.push(`Invalid expiration date for ${record.id}: ${record.expiryDate}`);
      const rawPhotos = record.photos && record.photos.length > 0 ? record.photos : (record.photo ? [record.photo] : []);

      return {
        observationId: record.id,
        surveyId: record.surveyId,
        storeId: survey?.storeId || null,
        storeName: store?.name || null,
        manufacturerId: sku ? manufacturerIdMap.get(sku.manufacturer) || null : null,
        manufacturerName: sku?.manufacturer || null,
        skuId: record.skuId,
        skuName: sku?.name || null,
        distributionType: distribution.value,
        distributionLabel: distribution.label,
        priceSingle: record.price1 ?? null,
        priceFivePack: record.price5 ?? null,
        priceCarton: record.priceCarton ?? null,
        expirationDate,
        factoryCode: normalizeText(record.factoryCode),
        faceCount: record.facing ?? null,
        notes: null,
        photos: rawPhotos.map((photo, index) => photoToExport(photo, record.id, index)),
      };
    });

    const exportObject = {
      schemaVersion: SCHEMA_VERSION,
      surveyInfo: {
        surveyId: surveys.length === 1 ? surveys[0].id : null,
        surveyName: surveys.length === 1 ? surveySummaries[0]?.surveyName || null : null,
        surveyDate: surveys.length === 1 ? surveySummaries[0]?.surveyDate || null : null,
        surveyor: null,
        exportedAt: new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION,
        surveys: surveySummaries,
      },
      stores: stores.map(store => ({
        storeId: store.id,
        storeName: store.name || null,
        address: store.address || null,
        gps: parseGps(store.gps),
      })),
      manufacturerMaster: manufacturerNames.map(name => ({
        manufacturerId: manufacturerIdMap.get(name) || null,
        manufacturerName: name,
      })),
      skuMaster: skus.map(sku => ({
        skuId: sku.id,
        skuName: sku.name || null,
        manufacturerId: manufacturerIdMap.get(sku.manufacturer) || null,
        manufacturerName: sku.manufacturer || null,
      })),
      observations,
      validation: {
        valid: errors.length === 0,
        errors,
      },
    };

    return JSON.stringify(exportObject, null, 2);
  },

  exportBackupPhotos(surveyIds?: string[]): { filename: string; mimeType: string; dataUrl: string }[] {
    let surveys = this.getSurveys();
    if (surveyIds && surveyIds.length > 0) {
      surveys = surveys.filter(s => surveyIds.includes(s.id));
    }
    const surveyIdSet = new Set(surveys.map(s => s.id));
    return this.getRecords()
      .filter(record => surveyIdSet.has(record.surveyId))
      .flatMap(record => {
        const rawPhotos = record.photos && record.photos.length > 0 ? record.photos : (record.photo ? [record.photo] : []);
        return rawPhotos.map((photo, index) => {
          const exportedPhoto = photoToExport(photo, record.id, index);
          return {
            filename: exportedPhoto.filename,
            mimeType: exportedPhoto.mimeType,
            dataUrl: photo,
          };
        });
      });
  },

  importJSON(jsonText: string, photoDataByFilename?: Record<string, string>): { ok: boolean; imported: { surveys: number; stores: number; skus: number; observations: number }; errors: string[] } {
    const errors: string[] = [];
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      return { ok: false, imported: { surveys: 0, stores: 0, skus: 0, observations: 0 }, errors: ['Invalid JSON file'] };
    }

    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.observations)) {
      return { ok: false, imported: { surveys: 0, stores: 0, skus: 0, observations: 0 }, errors: ['Unsupported Survey.json schema'] };
    }

    validateUniqueIds('store', (parsed.stores || []).map((store: any) => store.storeId), errors);
    validateUniqueIds('sku', (parsed.skuMaster || []).map((sku: any) => sku.skuId), errors);
    validateUniqueIds('observation', parsed.observations.map((observation: any) => observation.observationId), errors);
    if (errors.length > 0) {
      return { ok: false, imported: { surveys: 0, stores: 0, skus: 0, observations: 0 }, errors };
    }

    const currentStores = this.getStores();
    const currentSkus = this.getSKUs();
    const currentSurveys = this.getSurveys();
    const currentRecords = this.getRecords();

    const nextStoresById = new Map<string, Store>(currentStores.map(store => [store.id, store]));
    (parsed.stores || []).forEach((store: any) => {
      if (!store.storeId) return;
      nextStoresById.set(store.storeId, {
        ...(nextStoresById.get(store.storeId) || {} as Store),
        id: store.storeId,
        name: store.storeName || '',
        address: store.address || '',
        gps: stringifyGps(store.gps),
      });
    });

    const nextSkusById = new Map<string, SKU>(currentSkus.map(sku => [sku.id, sku]));
    (parsed.skuMaster || []).forEach((sku: any) => {
      if (!sku.skuId) return;
      nextSkusById.set(sku.skuId, {
        ...(nextSkusById.get(sku.skuId) || {} as SKU),
        id: sku.skuId,
        name: sku.skuName || '',
        manufacturer: sku.manufacturerName || '',
      });
    });

    const surveyInfoList = Array.isArray(parsed.surveyInfo?.surveys) ? parsed.surveyInfo.surveys : [];
    const surveyStoreById = new Map<string, string>();
    surveyInfoList.forEach((survey: any) => {
      if (survey.surveyId && survey.storeId) surveyStoreById.set(survey.surveyId, survey.storeId);
    });
    parsed.observations.forEach((observation: any) => {
      if (observation.surveyId && observation.storeId && !surveyStoreById.has(observation.surveyId)) {
        surveyStoreById.set(observation.surveyId, observation.storeId);
      }
    });

    const nextSurveysById = new Map<string, Survey>(currentSurveys.map(survey => [survey.id, survey]));
    surveyInfoList.forEach((survey: any) => {
      if (!survey.surveyId) return;
      const date = toUiDate(survey.surveyDate);
      nextSurveysById.set(survey.surveyId, {
        ...(nextSurveysById.get(survey.surveyId) || {} as Survey),
        id: survey.surveyId,
        storeId: survey.storeId || surveyStoreById.get(survey.surveyId) || '',
        date,
        status: (survey.status || nextSurveysById.get(survey.surveyId)?.status || currentSurveys[0]?.status || DEFAULT_SURVEY_STATUS) as Survey['status'],
      });
    });

    surveyStoreById.forEach((storeId, surveyId) => {
      if (!nextSurveysById.has(surveyId)) {
        nextSurveysById.set(surveyId, {
          id: surveyId,
          storeId,
          date: '',
          status: currentSurveys[0]?.status || DEFAULT_SURVEY_STATUS,
        });
      }
    });

    const nextRecordsById = new Map<string, SurveyRecord>(currentRecords.map(record => [record.id, record]));
    parsed.observations.forEach((observation: any) => {
      if (!observation.observationId || !observation.surveyId || !observation.skuId) return;
      const distribution = normalizeDistribution(observation.distributionType || observation.distributionLabel);
      const photos = Array.isArray(observation.photos)
        ? observation.photos.map((photo: any) => photoDataByFilename?.[photo?.filename]).filter((photo: unknown): photo is string => typeof photo === 'string' && photo.length > 0)
        : [];
      nextRecordsById.set(observation.observationId, {
        ...(nextRecordsById.get(observation.observationId) || {} as SurveyRecord),
        id: observation.observationId,
        surveyId: observation.surveyId,
        skuId: observation.skuId,
        type: distribution.legacy,
        price1: observation.priceSingle ?? null,
        price5: observation.priceFivePack ?? null,
        priceCarton: observation.priceCarton ?? null,
        expiryDate: toUiDate(observation.expirationDate),
        factoryCode: normalizeText(observation.factoryCode),
        facing: observation.faceCount ?? 1,
        photo: null,
        photos,
        timestamp: new Date().toISOString(),
      });
    });

    const savedStores = setLocal('survey_stores', Array.from(nextStoresById.values()));
    const savedSkus = setLocal('survey_skus', Array.from(nextSkusById.values()));
    const savedSurveys = setLocal('survey_list', Array.from(nextSurveysById.values()));
    const savedRecords = setLocal('survey_records', Array.from(nextRecordsById.values()));
    const ok = savedStores && savedSkus && savedSurveys && savedRecords;

    return {
      ok,
      imported: {
        surveys: surveyInfoList.length || surveyStoreById.size,
        stores: (parsed.stores || []).length,
        skus: (parsed.skuMaster || []).length,
        observations: parsed.observations.length,
      },
      errors: ok ? [] : ['Could not save imported data to browser storage'],
    };
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, SKU, Survey, SurveyRecord, DistributionType } from '../types';
import { OfflineDB } from './store';

export interface SeedSurvey {
  id: string;
  name: string;
  area: string;
  survey_date: string;
  source_file: string;
}

export interface SeedStore {
  id: string;
  name: string;
  address_raw: string;
  gps: string | null;
  storefront_photo: string | null;
}

export interface SeedSKU {
  name: string;
  store_frequency: number;
  factory_codes: string[];
}

export interface SeedManufacturer {
  name: string;
  skus: SeedSKU[];
}

export interface SeedPrice {
  raw: any;
  amount_yen: number | null;
  unit_hint: string | null;
}

export interface SeedEntry {
  distribution_type: 'official' | 'parallel' | 'unknown' | string;
  distribution_marker_raw: string | null;
  sale_price: SeedPrice;
  case_price: SeedPrice;
  expiration_raw: any;
  expiration_date: string | null;
  factory_code: string | null;
  notes: string | null;
}

export interface SeedObservation {
  id: string;
  survey_id: string;
  store_id: string;
  survey_date: string;
  manufacturer: string;
  sku: string;
  store_frequency_previous_survey: number;
  available_marker_raw: string;
  face_count: number | null;
  photo_refs: string[];
  source?: any;
  entries: SeedEntry[];
}

export interface SeedDataSet {
  survey: SeedSurvey;
  stores: SeedStore[];
  manufacturers: SeedManufacturer[];
  observations: SeedObservation[];
}

export interface ImportReport {
  surveysImported: number;
  storesImported: number;
  manufacturersImported: number;
  skusImported: number;
  observationsImported: number;
  entriesImported: number;
  skippedDuplicates: number;
  invalidRecords: number;
}

export const SEED_SURVEY_INFO: SeedSurvey = {
  id: "osaka_2026_07_03",
  name: "Khảo sát thị trường mì gói Việt Nam tại Osaka",
  area: "Osaka",
  survey_date: "2026-07-03",
  source_file: "20260428 ACVと競合他社の商品の調査報告書 - コピー xoa anh(3).xlsx"
};

export const SEED_STORES: SeedStore[] = [
  { id: "store_01", name: "KENCOOK", address_raw: "八尾市南本町6-7-5", gps: null, storefront_photo: null },
  { id: "store_02", name: "TRA VINH MART", address_raw: "八尾市高美町４丁目１２-３３", gps: null, storefront_photo: null },
  { id: "store_03", name: "DUY ANH MART", address_raw: "八尾市南本町６丁目６-４１", gps: null, storefront_photo: null },
  { id: "store_04", name: "XUAN SHOP", address_raw: "西成区鶴見橋１丁目１２-１１", gps: null, storefront_photo: null },
  { id: "store_05", name: "XUAN SHOP", address_raw: "生野区新今里４丁目３", gps: null, storefront_photo: null },
  { id: "store_06", name: "SHOP QUÊ", address_raw: "西成区花園北１丁目４-２２", gps: null, storefront_photo: null },
  { id: "store_07", name: "THAI DUONG MART 25", address_raw: "浪速区大国１丁目１２-２３", gps: null, storefront_photo: null },
  { id: "store_08", name: "THAI DUONG 48", address_raw: "生野区新今里４丁目９-４", gps: null, storefront_photo: null },
  { id: "store_09", name: "VIETCOOK", address_raw: "生野区新今里４丁目２-１２", gps: null, storefront_photo: null }
];

export const SEED_MANUFACTURERS: SeedManufacturer[] = [
  {
    name: "ACV",
    skus: [
      { name: "HAO HAO TCC", store_frequency: 9, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MUOI HAO HAO", store_frequency: 6, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "SIUKAY HAI SAN", store_frequency: 6, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "HANDY HAO HAO", store_frequency: 5, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MI LAU THAI VI TOM", store_frequency: 5, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MIEN PHU HUONG LAU THAI TOM", store_frequency: 5, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "HAO HAO TOM XAO CHUA NGOT", store_frequency: 3, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MIEN PHU HUONG SUON HEO", store_frequency: 3, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MIEN PHU HUONG THIT BAM", store_frequency: 3, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "DE NHAT PHO BO", store_frequency: 2, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MI GOOD PHO GA", store_frequency: 2, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MIEN PHU HUONG BLOCK", store_frequency: 2, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "MODERN", store_frequency: 2, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "DE NHAT PHO TRON BO", store_frequency: 1, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "DE NHAT PHO TRON THAP CAM CHAY", store_frequency: 1, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "SIUKAY BO", store_frequency: 1, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] },
      { name: "SIUKAY PHO TRON HS", store_frequency: 1, factory_codes: ["SG 1", "SG 2", "BD", "HY", "VL", "DN", "NV", "BN", "HV"] }
    ]
  },
  {
    name: "AFOTECH",
    skus: [
      { name: "CUNG DINH BO HAM", store_frequency: 6, factory_codes: [] },
      { name: "CUNG DINH PHO GA HN", store_frequency: 6, factory_codes: [] },
      { name: "CUNG DINH LAU TCC", store_frequency: 5, factory_codes: [] },
      { name: "CUNG DINH PHO BO HN", store_frequency: 5, factory_codes: [] },
      { name: "CUNG DINH SUON HEO HAM MANG", store_frequency: 5, factory_codes: [] },
      { name: "LY CUNG DINH BO HAM", store_frequency: 4, factory_codes: [] },
      { name: "LY CUNG DINH GA HAM", store_frequency: 3, factory_codes: [] },
      { name: "CUNG DINH KOOL SPAGHETTI", store_frequency: 1, factory_codes: [] },
      { name: "LY CUNG DINH LAU TCC", store_frequency: 1, factory_codes: [] },
      { name: "LY CUNG DINH PHO HN", store_frequency: 1, factory_codes: [] },
      { name: "MICOEM MI GA NAM", store_frequency: 1, factory_codes: [] }
    ]
  },
  {
    name: "ASIAFOOD",
    skus: [
      { name: "GAU DO TCC", store_frequency: 3, factory_codes: [] },
      { name: "GAU DO TOM VA GA", store_frequency: 1, factory_codes: [] }
    ]
  },
  {
    name: "MASAN",
    skus: [
      { name: "OMACHI LAU TCC", store_frequency: 9, factory_codes: [] },
      { name: "OMACHI SUON HAM NGU QUA", store_frequency: 9, factory_codes: [] },
      { name: "KOKOMI MI TCC", store_frequency: 6, factory_codes: [] },
      { name: "OMACHI MI TRON XOT SPAGHETTI", store_frequency: 6, factory_codes: [] },
      { name: "PHO STORY BO", store_frequency: 6, factory_codes: [] },
      { name: "OMACHI XOT BO HAM", store_frequency: 5, factory_codes: [] },
      { name: "OMACHI MI BAP BO HAM DUA CHUA", store_frequency: 3, factory_codes: [] },
      { name: "PHO STORY GA", store_frequency: 3, factory_codes: [] }
    ]
  },
  {
    name: "MIHAMEX",
    skus: [
      { name: "ZUM ZUM TCC", store_frequency: 2, factory_codes: [] },
      { name: "ZUM ZUM BO XOT TIEU XANH", store_frequency: 1, factory_codes: [] }
    ]
  },
  {
    name: "SAFOCO",
    skus: [
      { name: "MILIKET SATE", store_frequency: 2, factory_codes: [] },
      { name: "MILIKET LAU THAI TOM", store_frequency: 1, factory_codes: [] },
      { name: "MILIKET MI HAI TOM HAI SAN", store_frequency: 1, factory_codes: [] },
      { name: "MILIKET MI HAI TOM SATE", store_frequency: 1, factory_codes: [] }
    ]
  },
  {
    name: "UNIBEN",
    skus: [
      { name: "3 MIEN MI BO SOI PHO", store_frequency: 4, factory_codes: [] },
      { name: "3 MIEN MI TCC", store_frequency: 3, factory_codes: [] },
      { name: "3 MIEN GOLD MI BO HAM RAU THOM", store_frequency: 2, factory_codes: [] },
      { name: "3 MIEN GOLD MI CC THAI", store_frequency: 2, factory_codes: [] },
      { name: "3 MIEN GOLD MI TCC", store_frequency: 1, factory_codes: [] }
    ]
  },
  {
    name: "VIFON",
    skus: [
      { name: "VIFON HU TIEU NAM VANG", store_frequency: 8, factory_codes: [] },
      { name: "VIFON PHO BO", store_frequency: 7, factory_codes: [] },
      { name: "VIFON BUN BO HUE", store_frequency: 6, factory_codes: [] },
      { name: "VIFON BUN RIEU CUA", store_frequency: 6, factory_codes: [] },
      { name: "VIFON BANH DA CUA", store_frequency: 5, factory_codes: [] },
      { name: "VIFON PHO GA", store_frequency: 5, factory_codes: [] },
      { name: "VIFON BUN GIO HEO", store_frequency: 4, factory_codes: [] },
      { name: "VIFON NHAT VI TCC", store_frequency: 2, factory_codes: [] },
      { name: "HOANG GIAミー", store_frequency: 1, factory_codes: [] }
    ]
  }
];

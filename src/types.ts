/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Store {
  id: string;
  name: string;
  address: string;
  gps: string; // "latitude, longitude"
  photo?: string; // base64 string
  isCustom?: boolean; // added by surveyor in the field
}

export interface SKU {
  id: string;
  name: string;
  manufacturer: string; // ACV, MASAN, AFOTECH, VIFON, UNIBEN, ASIAFOOD, MIHAMEX, SAFOCO
  image?: string; // base64 or placeholder keyword
  isCustom?: boolean; // added by surveyor in the field
  storeFrequency?: number; // frequency count from previous survey for sorting
}

export type DistributionType = 'Chính ngạch' | 'Tiểu ngạch' | 'Không rõ';

export interface SurveyRecord {
  id: string;
  surveyId: string;
  skuId: string;
  type: DistributionType;
  price1: number | null; // Giá 1 gói
  price5: number | null; // Giá 5 gói
  priceCarton: number | null; // Giá 1 thùng
  expiryDate: string; // E.g., '2026/09/15', '2026/09', etc.
  factoryCode?: string | null; // Mã nhà máy (dành riêng cho ACV, e.g. 'SG 1', 'BD', etc.)
  facing: number; // Shelf facing count
  photo: string | null; // base64 string
  photos?: string[]; // array of base64 photo strings
  timestamp: string; // YYYY-MM-DD HH:mm:ss
}

export interface Survey {
  id: string;
  storeId: string;
  date: string; // YYYY-MM-DD HH:mm
  status: 'đang thực hiện' | 'đã hoàn thành';
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SKU, DistributionType, SurveyRecord } from '../types';
import { OfflineDB } from '../data/store';
import { ArrowLeft, Plus, Minus, Camera, Save, RefreshCw, X, AlertCircle } from 'lucide-react';

const ACV_FACTORY_CODES = ['SG 1', 'SG 2', 'BD', 'HY', 'VL', 'DN', 'NV', 'BN', 'HV'];

interface ProductEntryProps {
  sku: SKU;
  surveyId: string;
  initialRecord?: SurveyRecord | null; // if editing
  onSave: (record: Omit<SurveyRecord, 'id' | 'timestamp'> & { id?: string }, continueSameSku: boolean) => void;
  onCancel: () => void;
}

export const ProductEntry: React.FC<ProductEntryProps> = ({
  sku,
  surveyId,
  initialRecord,
  onSave,
  onCancel,
}) => {
  const [type, setType] = useState<DistributionType>('Chính ngạch');
  const [price1, setPrice1] = useState<string>('');
  const [price5, setPrice5] = useState<string>('');
  const [priceCarton, setPriceCarton] = useState<string>('');
  const [expiryRaw, setExpiryRaw] = useState<string>('');
  const [factoryCode, setFactoryCode] = useState<string>('');
  const [facing, setFacing] = useState<number>(1);
  const [photos, setPhotos] = useState<string[]>([]);

  const isACV = useMemo(() => {
    return sku.manufacturer?.trim().toUpperCase() === 'ACV';
  }, [sku.manufacturer]);

  // Load initial values if editing
  useEffect(() => {
    if (initialRecord) {
      setType(initialRecord.type);
      setPrice1(initialRecord.price1 !== null ? String(initialRecord.price1) : '');
      setPrice5(initialRecord.price5 !== null ? String(initialRecord.price5) : '');
      setPriceCarton(initialRecord.priceCarton !== null ? String(initialRecord.priceCarton) : '');
      // If it is stored formatted, try to strip formatting or keep it
      setExpiryRaw(initialRecord.expiryDate.replace(/\//g, '').replace(/^20/, ''));
      setFactoryCode(initialRecord.factoryCode || '');
      setFacing(initialRecord.facing);
      
      const loadedPhotos = initialRecord.photos && initialRecord.photos.length > 0
        ? initialRecord.photos
        : (initialRecord.photo ? [initialRecord.photo] : []);
      setPhotos(loadedPhotos);
    }
  }, [initialRecord]);

  // Handle expiration date auto-formatting
  // Rule: surveyor simply types the printed date: e.g. 260915 -> 2026/09/15, 2609 -> 2026/09
  const handleExpiryChange = (val: string) => {
    // Only accept numbers
    const digits = val.replace(/\D/g, '').substring(0, 6);
    setExpiryRaw(digits);
  };

  // Convert raw digits to Vietnamese-standard formatted string
  const formattedExpiryPreview = () => {
    if (expiryRaw.length === 4) {
      // '2609' -> '2026/09'
      return `20${expiryRaw.substring(0, 2)}/${expiryRaw.substring(2, 4)}`;
    } else if (expiryRaw.length === 6) {
      // '260915' -> '2026/09/15'
      return `20${expiryRaw.substring(0, 2)}/${expiryRaw.substring(2, 4)}/${expiryRaw.substring(4, 6)}`;
    } else if (expiryRaw.length > 0) {
      return `Chưa đủ chữ số (Gõ ví dụ: 2609 hoặc 260915)`;
    }
    return 'Chưa nhập';
  };

  // Dynamic price suggestions based on previous surveys
  const suggestedPrices = useMemo(() => {
    // 1. Get current store ID from current survey
    const currentSurvey = OfflineDB.getSurveys().find(s => s.id === surveyId);
    const currentStoreId = currentSurvey?.storeId;

    // 2. Find other surveys of this store
    const storeSurveys = currentStoreId 
      ? OfflineDB.getSurveys().filter(s => s.storeId === currentStoreId && s.id !== surveyId)
      : [];
    const storeSurveyIds = storeSurveys.map(s => s.id);

    // 3. Get all records for this SKU
    const allRecordsForSku = OfflineDB.getRecords().filter(r => r.skuId === sku.id);

    // 4. Find records of this SKU specifically at this store
    const thisStoreRecords = allRecordsForSku.filter(r => storeSurveyIds.includes(r.surveyId));

    // Determine the source of suggestions and the matching records
    const hasThisStoreHistory = thisStoreRecords.length > 0;
    const hasOtherStoreHistory = allRecordsForSku.length > 0;
    const targetRecords = hasThisStoreHistory ? thisStoreRecords : allRecordsForSku;

    const getUniquePrices = (key: 'price1' | 'price5' | 'priceCarton'): number[] => {
      const pricesSet = new Set<number>();
      targetRecords.forEach(r => {
        const val = r[key];
        if (val !== null && val > 0) {
          pricesSet.add(val);
        }
      });
      return Array.from(pricesSet).sort((a, b) => a - b);
    };

    const p1 = getUniquePrices('price1');
    const p5 = getUniquePrices('price5');
    const pCarton = getUniquePrices('priceCarton');

    const DEFAULT_P1 = [70, 80, 90, 100, 120, 150];
    const DEFAULT_P5 = [350, 400, 450, 500, 600, 750];
    const DEFAULT_CARTON = [1800, 2000, 2200, 2400, 2800, 3000];

    return {
      price1: p1.length > 0 ? p1 : DEFAULT_P1,
      price5: p5.length > 0 ? p5 : DEFAULT_P5,
      priceCarton: pCarton.length > 0 ? pCarton : DEFAULT_CARTON,
      source: hasThisStoreHistory ? 'this-store' : (hasOtherStoreHistory ? 'other-stores' : 'default')
    };
  }, [sku.id, surveyId]);

  const handleQuickPrice1 = (price: number) => {
    setPrice1(String(price));
  };

  const handleQuickPrice5 = (price: number) => {
    setPrice5(String(price));
  };

  const handleQuickPriceCarton = (price: number) => {
    setPriceCarton(String(price));
  };

  // Photo handlers
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      let loadedCount = 0;
      const newPhotoList: string[] = [];

      fileArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            newPhotoList.push(reader.result as string);
          }
          loadedCount++;
          if (loadedCount === fileArray.length) {
            setPhotos(prev => [...prev, ...newPhotoList]);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const handleSimulatePhoto = () => {
    const index = photos.length + 1;
    const cleanSkuName = sku.name.replace(/</g, '').replace(/>/g, '');
    const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23b91c1c"/><rect x="30" y="30" width="240" height="140" fill="%23fff" stroke="%23ff0" stroke-width="4"/><text x="150" y="80" fill="%23b91c1c" font-family="sans-serif" font-weight="bold" font-size="18" text-anchor="middle">${cleanSkuName}</text><text x="150" y="115" fill="%23ff9f00" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle">Ảnh %23${index}</text><text x="150" y="150" fill="%23555" font-family="sans-serif" font-size="10" text-anchor="middle">MẪU KHẢO SÁT CHỤP</text></svg>`;
    setPhotos(prev => [...prev, mockSvg]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (continueSameSku: boolean) => {
    // Determine final expiry format
    let finalExpiry = '';
    if (expiryRaw.length === 4) {
      finalExpiry = `20${expiryRaw.substring(0, 2)}/${expiryRaw.substring(2, 4)}`;
    } else if (expiryRaw.length === 6) {
      finalExpiry = `20${expiryRaw.substring(0, 2)}/${expiryRaw.substring(2, 4)}/${expiryRaw.substring(4, 6)}`;
    } else {
      finalExpiry = expiryRaw || 'Không rõ HSD';
    }

    onSave({
      id: initialRecord?.id,
      surveyId,
      skuId: sku.id,
      type,
      price1: price1 ? Number(price1) : null,
      price5: price5 ? Number(price5) : null,
      priceCarton: priceCarton ? Number(priceCarton) : null,
      expiryDate: finalExpiry,
      factoryCode: isACV ? (factoryCode || null) : null,
      facing,
      photo: photos.length > 0 ? photos[0] : null,
      photos: photos,
    }, continueSameSku);

    if (continueSameSku) {
      // Clear specific fields as requested by "Save & Nhập lại SKU này"
      setType('Chính ngạch');
      setPrice1('');
      setPrice5('');
      setPriceCarton('');
      setExpiryRaw('');
      setFactoryCode('');
      setFacing(1);
      setPhotos([]);
    }
  };

  return (
    <div id="product-entry-screen" className="flex flex-col h-full bg-slate-50">
      
      {/* 1. Header with SKU Info */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-6 shadow-sm flex items-center space-x-3 shrink-0">
        <button
          id="btn-product-entry-back"
          onClick={onCancel}
          className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded font-mono">
              {sku.manufacturer}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {initialRecord ? 'Chỉnh Sửa Ghi Chép' : 'Nhập Số Liệu Điểm Bán'}
            </span>
          </div>
          <h1 className="text-base font-extrabold tracking-tight text-white leading-tight truncate">
            {sku.name}
          </h1>
        </div>
      </div>

      {/* 2. Scrollable Data Entry Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36">
        
        {/* FIELD A: LOẠI HÀNG (DISTRIBUTION TYPE) - Massive, clickable horizontal options */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Loại Hàng Phân Phối
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            {(['Chính ngạch', 'Tiểu ngạch'] as DistributionType[]).map((dist) => {
              const isSelected = type === dist;
              return (
                <button
                  key={dist}
                  id={`radio-dist-${dist}`}
                  type="button"
                  onClick={() => setType(dist)}
                  className={`py-3 text-xs font-extrabold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {dist}
                </button>
              );
            })}
          </div>
        </div>

        {/* FIELD B: SHELF FACING (SỐ FACE) - Huge counter instead of text box */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Số Lượng Trưng Bày (Facing)
            </span>
            <span className="text-xs text-slate-400">Số lượng hàng nhìn thấy trên kệ</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              id="btn-decrement-facing"
              type="button"
              onClick={() => setFacing(Math.max(1, facing - 1))}
              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center text-slate-700 transition-all"
            >
              <Minus className="w-5 h-5 stroke-[3]" />
            </button>
            <span id="txt-facing-value" className="text-2xl font-black font-mono text-slate-800 w-8 text-center">
              {facing}
            </span>
            <button
              id="btn-increment-facing"
              type="button"
              onClick={() => setFacing(facing + 1)}
              className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center text-slate-700 transition-all"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* FIELD C: PRICES (GIÁ 1 GÓI, 5 GÓI, 1 THÙNG) */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Giá Bán Lẻ Thực Tế (円)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block self-start ${
              suggestedPrices.source === 'this-store'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/50'
                : suggestedPrices.source === 'other-stores'
                  ? 'text-blue-700 bg-blue-50 border border-blue-200/50'
                  : 'text-slate-600 bg-slate-100 border border-slate-200/50'
            }`}>
              {suggestedPrices.source === 'this-store' 
                ? 'Nguồn gợi ý: Lịch sử tiệm này' 
                : suggestedPrices.source === 'other-stores' 
                  ? 'Nguồn gợi ý: Tiệm khác cùng SKU' 
                  : 'Nguồn gợi ý: Giá phổ biến'}
            </span>
          </div>

          {/* Price 1 Pack */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Giá 1 gói</label>
              {price1 && <span className="text-[10px] font-mono text-emerald-600 font-bold">~ {Number(price1).toLocaleString('ja-JP')} 円</span>}
            </div>
            <input
              id="input-price-1"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={price1}
              onChange={(e) => setPrice1(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Nhập giá bán lẻ 1 gói..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-sm font-mono font-bold rounded-xl outline-none"
            />
            {/* Quick-fill pricing pills for pack */}
            <div className="flex flex-wrap gap-1">
              {suggestedPrices.price1.map((p) => (
                <button
                  key={p}
                  id={`btn-quick-price1-${p}`}
                  type="button"
                  onClick={() => handleQuickPrice1(p)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 rounded text-[10px] font-bold font-mono"
                >
                  {p >= 1000 ? `${(p / 1000).toLocaleString('ja-JP')}k 円` : `${p.toLocaleString('ja-JP')} 円`}
                </button>
              ))}
            </div>
          </div>

          {/* Price 5 Packs */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Giá 5 gói</label>
              {price5 && <span className="text-[10px] font-mono text-emerald-600 font-bold">~ {Number(price5).toLocaleString('ja-JP')} 円</span>}
            </div>
            <input
              id="input-price-5"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={price5}
              onChange={(e) => setPrice5(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Nhập giá block 5 gói..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-sm font-mono font-bold rounded-xl outline-none"
            />
            {/* Quick-fill pricing pills for 5 packs */}
            <div className="flex flex-wrap gap-1">
              {suggestedPrices.price5.map((p) => (
                <button
                  key={p}
                  id={`btn-quick-price5-${p}`}
                  type="button"
                  onClick={() => handleQuickPrice5(p)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 rounded text-[10px] font-bold font-mono"
                >
                  {p >= 1000 ? `${(p / 1000).toLocaleString('ja-JP')}k 円` : `${p.toLocaleString('ja-JP')} 円`}
                </button>
              ))}
            </div>
          </div>

          {/* Price 1 Carton */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Giá 1 thùng</label>
              {priceCarton && <span className="text-[10px] font-mono text-emerald-600 font-bold">~ {Number(priceCarton).toLocaleString('ja-JP')} 円</span>}
            </div>
            <input
              id="input-price-carton"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={priceCarton}
              onChange={(e) => setPriceCarton(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Nhập giá bán lẻ 1 thùng..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-sm font-mono font-bold rounded-xl outline-none"
            />
            {/* Quick-fill pricing pills for box */}
            <div className="flex flex-wrap gap-1">
              {suggestedPrices.priceCarton.map((p) => (
                <button
                  key={p}
                  id={`btn-quick-price-box-${p}`}
                  type="button"
                  onClick={() => handleQuickPriceCarton(p)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 rounded text-[10px] font-bold font-mono"
                >
                  {p.toLocaleString('ja-JP')} 円
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FIELD D: EXPIRATION DATE (HẠN SỬ DỤNG) & FACTORY CODE */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm space-y-2.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Hạn Sử Dụng (HSD)
            </label>
            <span className="text-[11px] font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">
              Xem trước: {formattedExpiryPreview()}
            </span>
          </div>
          
          <input
            id="input-expiry-raw"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={expiryRaw}
            onChange={(e) => handleExpiryChange(e.target.value)}
            placeholder="Gõ nhanh số in trên vỏ: e.g. 260915 hoặc 2609"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-base font-mono font-bold rounded-xl outline-none"
          />

          {/* Factory codes for ACV products: placed between input and tip */}
          {isACV && (
            <div className="pt-0.5 pb-0.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Mã nhà máy:</span>
                {factoryCode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFactoryCode('');
                    }}
                    className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Bỏ chọn ({factoryCode})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ACV_FACTORY_CODES.map((code) => {
                  const isSelected = factoryCode === code;
                  return (
                    <button
                      key={code}
                      id={`btn-factory-code-${code.replace(/\s+/g, '-')}`}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFactoryCode(prev => prev === code ? '' : code);
                      }}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 active:bg-slate-200'
                      }`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-start space-x-1 text-[11px] text-slate-400 pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
            <p>Mẹo: Gõ <span className="font-bold text-slate-500">260915</span> tương ứng với 2026/09/15. Chỉ gõ số, máy tự thêm năm và gạch chéo!</p>
          </div>
        </div>

        {/* FIELD E: SKU PHOTO */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Ảnh chụp sản phẩm (Chụp nhiều ảnh)
            </span>
            {photos.length > 0 && (
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                Đã chụp {photos.length} ảnh
              </span>
            )}
          </div>

          <div className="flex flex-col space-y-2.5">
            {/* List of captured photos */}
            {photos.length > 0 && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
                {photos.map((pUrl, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={pUrl}
                      alt={`Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white font-mono text-[9px] px-1 py-0.2 rounded font-bold">
                      #{idx + 1}
                    </span>
                    <button
                      id={`btn-remove-record-photo-${idx}`}
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full hover:bg-red-700 active:scale-95 shadow-xs"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              {/* Real File input */}
              <label className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 cursor-pointer shadow-xs flex items-center justify-center space-x-1.5 transition-colors">
                <Camera className="w-4 h-4 text-slate-600" />
                <span>{photos.length > 0 ? 'Chụp thêm ảnh' : 'Chụp ảnh thực tế'}</span>
                <input
                  id="input-record-photo-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </label>

              {/* Simulated Quick Photo */}
              <button
                id="btn-simulate-record-photo"
                type="button"
                onClick={handleSimulatePhoto}
                className="bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-800 text-xs font-bold px-3 py-2 rounded-xl border border-purple-200 transition-colors"
              >
                Giả lập ảnh
              </button>
            </div>

            <span className="text-[10px] text-slate-400 block leading-tight">
              Có thể chụp nhiều ảnh cho cùng 1 SKU (chụp nhãn giá, HSD, kệ hàng, bao bì...)
            </span>
          </div>
        </div>

      </div>

      {/* 3. Sticky Bottom Double Actions - Massive Target for One-Thumb Saving */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-xl grid grid-cols-2 gap-3 shrink-0">
        
        {/* Left: SAVE & RE-ENTER (Lưu & Nhập tiếp SKU này) - For Official & Parallel Imports easily */}
        <button
          id="btn-save-re-enter"
          type="button"
          onClick={() => handleFormSubmit(true)}
          className="h-14 border-2 border-slate-900 hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wide flex flex-col items-center justify-center leading-none"
        >
          <span className="flex items-center space-x-1 mb-0.5 font-bold">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Lưu & Nhập Lại</span>
          </span>
          <span className="text-[10px] text-slate-500 font-normal">Đăng ký thêm loại hàng</span>
        </button>

        {/* Right: SAVE & RETURN (Lưu & Trở về danh sách) */}
        <button
          id="btn-save-finish"
          type="button"
          onClick={() => handleFormSubmit(false)}
          className="h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-sm uppercase tracking-wide flex items-center justify-center space-x-1.5 shadow-lg active:scale-[0.98] transition-all"
        >
          <Save className="w-5 h-5" />
          <span>{initialRecord ? 'Cập Nhật & Trở Về' : 'Lưu & Trở Về'}</span>
        </button>
      </div>
    </div>
  );
};

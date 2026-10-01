/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SKU, DistributionType, SurveyRecord } from '../types';
import { OfflineDB } from '../data/store';
import { optimizeImageFile } from '../utils/imageOptimization';
import { ArrowLeft, Plus, Minus, Camera, Save, RefreshCw, X, AlertCircle, ZoomIn } from 'lucide-react';

const ACV_FACTORY_CODES = ['SG 1', 'SG 2', 'BD', 'HY', 'VL', 'DN', 'NV', 'BN', 'HV'];
const MAX_PRICE_SUGGESTIONS = 10;

interface ProductEntryProps {
  sku: SKU;
  surveyId: string;
  initialRecord?: SurveyRecord | null; // if editing
  onSave: (record: Omit<SurveyRecord, 'id' | 'timestamp'> & { id?: string }, continueSameSku: boolean) => Promise<boolean>;
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
  const [expiryError, setExpiryError] = useState('');
  const [factoryCode, setFactoryCode] = useState<string>('');
  const [facing, setFacing] = useState<number>(1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const expiryInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const suggestedYears = [currentYear, currentYear + 1, currentYear + 2];

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
      // Missing expiry stays empty so the surveyor can type immediately when returning to edit.
      const storedExpiry = initialRecord.expiryDate?.trim() || '';
      setExpiryRaw(/^(khong ro hsd|không rõ hsd)$/i.test(storedExpiry)
        ? ''
        : storedExpiry.replace(/\//g, '').replace(/^20/, ''));
      setFactoryCode(initialRecord.factoryCode || '');
      setFacing(initialRecord.facing);
      
      const loadedPhotos = initialRecord.photos && initialRecord.photos.length > 0
        ? initialRecord.photos
        : (initialRecord.photo ? [initialRecord.photo] : []);
      setPhotos(loadedPhotos);
    }
  }, [initialRecord]);

  // Handle expiration date auto-formatting
  // Rule: 260915 -> 2026/09/15. A month-only value such as 2609 uses that month's last day.
  const handleExpiryChange = (val: string) => {
    // Only accept numbers
    const digits = val.replace(/\D/g, '').substring(0, 6);
    setExpiryRaw(digits);
    setExpiryError('');
  };

  const interpretExpiry = (digits: string): { year: number; month: number; day: number | null } => {
    if (digits.length === 4) {
      const firstPair = Number(digits.slice(0, 2));
      const secondPair = Number(digits.slice(2, 4));
      if (firstPair >= 1 && firstPair <= 12) {
        return { year: currentYear, month: firstPair, day: secondPair };
      }
      return { year: 2000 + firstPair, month: secondPair, day: null };
    }

    return {
      year: 2000 + Number(digits.slice(0, 2)),
      month: Number(digits.slice(2, 4)),
      day: Number(digits.slice(4, 6)),
    };
  };

  const validateExpiry = (digits: string): string => {
    if (!digits) return '';
    if (digits.length !== 4 && digits.length !== 6) return 'HSD cần có 4 số (MMDD hoặc YYMM) hoặc 6 số (YYMMDD).';

    const { year, month, day } = interpretExpiry(digits);
    if (month < 1 || month > 12) return 'Tháng phải nằm trong khoảng 01–12.';
    if (day === null) return '';

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) return `Ngày không hợp lệ. Tháng ${String(month).padStart(2, '0')}/${year} có ${daysInMonth} ngày.`;
    return '';
  };

  // Convert raw digits to Vietnamese-standard formatted string
  const formattedExpiryPreview = () => {
    if (expiryRaw.length === 4 || expiryRaw.length === 6) {
      const error = validateExpiry(expiryRaw);
      if (error) return 'Ngày không hợp lệ';
      const { year, month, day } = interpretExpiry(expiryRaw);
      if (day !== null) {
        return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      }
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return `${year}/${String(month).padStart(2, '0')}/${String(lastDay).padStart(2, '0')}`;
    } else if (expiryRaw.length > 0) {
      return 'Chưa đủ chữ số';
    }
    return 'Chưa nhập';
  };

  const handleSuggestedYear = (year: number) => {
    const shortYear = String(year).slice(-2);
    let nextValue = shortYear;

    if (expiryRaw.length === 4) {
      const firstPair = Number(expiryRaw.slice(0, 2));
      nextValue = firstPair >= 1 && firstPair <= 12
        ? `${shortYear}${expiryRaw}`
        : `${shortYear}${expiryRaw.slice(2)}`;
    } else if (expiryRaw.length === 6) {
      nextValue = `${shortYear}${expiryRaw.slice(2)}`;
    }

    setExpiryRaw(nextValue);
    setExpiryError('');
    expiryInputRef.current?.focus();
    requestAnimationFrame(() => {
      const input = expiryInputRef.current;
      input?.setSelectionRange(nextValue.length, nextValue.length);
    });
  };

  // Dynamic price suggestions based on previous surveys
  const suggestedPrices = useMemo(() => {
    const DEFAULT_P1 = [70, 80, 90, 100, 120, 150];
    const DEFAULT_P5 = [350, 400, 450, 500, 600, 750];
    const DEFAULT_CARTON = [1800, 2000, 2200, 2400, 2500, 2600, 2700, 2800, 3000];

    // Always combine the built-in baseline with this SKU's prices from every store.
    const allRecordsForSku = OfflineDB.getRecords().filter(r => r.skuId === sku.id);

    const getRankedPrices = (
      key: 'price1' | 'price5' | 'priceCarton',
      baseline: number[]
    ): number[] => {
      const stats = new Map<number, { count: number; latestTime: number }>();
      baseline.forEach(price => stats.set(price, { count: 1, latestTime: 0 }));

      allRecordsForSku.forEach(r => {
        // An unconfirmed copied record is not a new market observation.
        if (r.verificationStatus === 'copied') return;
        const val = r[key];
        if (val !== null && val > 0) {
          const normalizedTimestamp = r.timestamp?.replace(/\//g, '-').replace(' ', 'T') || '';
          const recordedAt = Date.parse(normalizedTimestamp) || 0;
          const current = stats.get(val) ?? { count: 0, latestTime: 0 };
          stats.set(val, {
            count: current.count + 1,
            latestTime: Math.max(current.latestTime, recordedAt),
          });
        }
      });

      return Array.from(stats.entries())
        .sort(([priceA, statA], [priceB, statB]) => (
          statB.count - statA.count
          || statB.latestTime - statA.latestTime
          || priceA - priceB
        ))
        .slice(0, MAX_PRICE_SUGGESTIONS)
        .map(([price]) => price)
        .sort((a, b) => a - b);
    };

    return {
      price1: getRankedPrices('price1', DEFAULT_P1),
      price5: getRankedPrices('price5', DEFAULT_P5),
      priceCarton: getRankedPrices('priceCarton', DEFAULT_CARTON),
      hasHistory: allRecordsForSku.length > 0,
    };
  }, [sku.id]);

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
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      e.target.value = '';
      setIsProcessingPhotos(true);
      try {
        const newPhotoList = await Promise.all(fileArray.map(optimizeImageFile));
        setPhotos(prev => [...prev, ...newPhotoList]);
      } catch (error) {
        console.error('Error processing photos', error);
        window.alert('Khong the xu ly anh vua chon. Vui long chup lai.');
      } finally {
        setIsProcessingPhotos(false);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (continueSameSku: boolean) => {
    if (isProcessingPhotos) return;
    const dateError = validateExpiry(expiryRaw);
    if (dateError) {
      setExpiryError(dateError);
      return;
    }
    setIsProcessingPhotos(true);

    // Determine final expiry format
    let finalExpiry = '';
    if (expiryRaw.length === 4 || expiryRaw.length === 6) {
      const { year, month, day } = interpretExpiry(expiryRaw);
      const resolvedDay = day ?? new Date(Date.UTC(year, month, 0)).getUTCDate();
      finalExpiry = `${year}/${String(month).padStart(2, '0')}/${String(resolvedDay).padStart(2, '0')}`;
    } else {
      finalExpiry = expiryRaw;
    }

    try {
      const saved = await onSave({
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
        photo: null,
        photos,
      }, continueSameSku);

      if (saved && continueSameSku) {
        // Clear specific fields as requested by Save & re-enter this SKU
        setType('Chính ngạch');
        setPrice1('');
        setPrice5('');
        setPriceCarton('');
        setExpiryRaw('');
        setFactoryCode('');
        setFacing(1);
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error optimizing photos before save', error);
      window.alert('Khong the toi uu anh truoc khi luu. Vui long thu lai.');
    } finally {
      setIsProcessingPhotos(false);
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
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block self-start border ${
              suggestedPrices.hasHistory
                ? 'text-blue-700 bg-blue-50 border-blue-200/50'
                : 'text-slate-600 bg-slate-100 border-slate-200/50'
            }`}>
              {suggestedPrices.hasHistory
                ? 'Nguồn gợi ý: Giá nền + lịch sử tất cả điểm bán'
                : 'Nguồn gợi ý: Giá nền trong app'}
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

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-0.5">Chọn nhanh năm:</span>
            {suggestedYears.map(year => (
              <button
                key={year}
                id={`btn-expiry-year-${year}`}
                type="button"
                onClick={() => handleSuggestedYear(year)}
                className="px-3 py-1.5 text-xs font-extrabold font-mono rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                {year}
              </button>
            ))}
          </div>
          
          <input
            ref={expiryInputRef}
            id="input-expiry-raw"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={expiryRaw}
            onChange={(e) => handleExpiryChange(e.target.value)}
            aria-invalid={Boolean(expiryError)}
            aria-describedby={expiryError ? 'expiry-date-error' : undefined}
            placeholder="MMDD, YYMM hoặc YYMMDD"
            className={`w-full px-4 py-3 bg-slate-50 border focus:bg-white text-base font-mono font-bold rounded-xl outline-none ${expiryError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'}`}
          />
          {expiryError && <p id="expiry-date-error" role="alert" className="text-xs font-medium text-red-600">{expiryError}</p>}

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
            <p>Mẹo: Gõ <span className="font-bold text-slate-500">1204</span> để nhập 04/12 năm nay; <span className="font-bold text-slate-500">2609</span> lấy ngày cuối tháng 09/2026.</p>
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
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(pUrl)}
                      className="block w-full h-full cursor-zoom-in"
                      aria-label={`Xem anh ${idx + 1}`}
                    >
                    <img
                      src={pUrl}
                      alt={`Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <ZoomIn className="absolute bottom-1 right-1 w-4 h-4 text-white drop-shadow-md" />
                    </button>
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

            <div>
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
                  disabled={isProcessingPhotos}
                />
              </label>

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
          disabled={isProcessingPhotos}
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
          disabled={isProcessingPhotos}
          className="h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-xl text-sm uppercase tracking-wide flex items-center justify-center space-x-1.5 shadow-lg active:scale-[0.98] transition-all"
        >
          <Save className="w-5 h-5" />
          <span>{initialRecord ? 'Cập Nhật & Trở Về' : 'Lưu & Trở Về'}</span>
        </button>
      </div>

      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Xem anh da chup" onClick={() => setPreviewPhoto(null)}>
          <img src={previewPhoto} alt="Anh da chup phong lon" className="max-w-full max-h-full object-contain rounded-lg" onClick={(event) => event.stopPropagation()} />
          <button type="button" onClick={() => setPreviewPhoto(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white" aria-label="Dong anh">
            <X className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
};

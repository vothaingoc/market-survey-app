/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SKU, Store, Survey, SurveyRecord } from '../types';
import { Search, Plus, MapPin, ChevronRight, X, ArrowLeft, ClipboardList, CheckCircle2, ShoppingBag } from 'lucide-react';
import { MANUFACTURERS } from '../data/masterData';

interface ProductSelectionProps {
  skus: SKU[];
  survey: Survey;
  store: Store;
  records: SurveyRecord[];
  onSelectSku: (skuId: string) => void;
  onAddNewSku: (name: string, manufacturer: string) => void;
  onNavigateToRecords: () => void;
  onFinishSurvey: () => void;
  onBack: () => void;
}

export const ProductSelection: React.FC<ProductSelectionProps> = ({
  skus,
  survey,
  store,
  records,
  onSelectSku,
  onAddNewSku,
  onNavigateToRecords,
  onFinishSurvey,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  
  // Custom SKU and Manufacturer inputs
  const [showAddCustomSku, setShowAddCustomSku] = useState(false);
  const [customSkuName, setCustomSkuName] = useState('');
  const [customSkuManufacturer, setCustomSkuManufacturer] = useState('ACV');
  const [isCustomMfgInput, setIsCustomMfgInput] = useState(false);

  // Quick Add Manufacturer Modal state
  const [showAddMfgModal, setShowAddMfgModal] = useState(false);
  const [newMfgName, setNewMfgName] = useState('');

  // Dynamic list of manufacturers from master and current SKUs
  const manufacturerList = useMemo(() => {
    const set = new Set(MANUFACTURERS);
    skus.forEach(sku => {
      if (sku.manufacturer) set.add(sku.manufacturer);
    });
    return Array.from(set);
  }, [skus]);

  // Find which SKU IDs have already been surveyed in this session
  const surveyedSkuIds = useMemo(() => {
    return new Set(records.filter(r => r.surveyId === survey.id).map(r => r.skuId));
  }, [records, survey.id]);

  // Compute records count for active survey
  const activeRecordsCount = useMemo(() => {
    return records.filter(r => r.surveyId === survey.id).length;
  }, [records, survey.id]);

  // Filter SKUs based on search box (across all manufacturers) or selected manufacturer, and sort by store_frequency descending
  const filteredSkus = useMemo(() => {
    let result = skus;
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      // Searching across ALL manufacturers by SKU name
      result = result.filter(item => 
        item.name.toLowerCase().includes(q)
      );
    } else if (selectedManufacturer) {
      // Filter strictly by selected manufacturer
      result = result.filter(item => item.manufacturer === selectedManufacturer);
    }

    // Sort by store_frequency descending
    return [...result].sort((a, b) => {
      const freqA = a.storeFrequency ?? 0;
      const freqB = b.storeFrequency ?? 0;
      if (freqB !== freqA) {
        return freqB - freqA;
      }
      return 0;
    });
  }, [skus, searchQuery, selectedManufacturer]);

  const handleToggleManufacturer = (mfg: string) => {
    if (selectedManufacturer === mfg) {
      setSelectedManufacturer(null); // Uncheck if clicked again
    } else {
      setSelectedManufacturer(mfg);
      // Inherit into custom SKU creator if opened
      setCustomSkuManufacturer(mfg);
    }
  };

  const handleOpenCustomSku = () => {
    setCustomSkuName(searchQuery); // pre-populate with search term
    if (selectedManufacturer) {
      setCustomSkuManufacturer(selectedManufacturer);
    }
    setShowAddCustomSku(true);
  };

  const handleCreateCustomSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSkuName.trim()) return;
    
    onAddNewSku(customSkuName.trim(), customSkuManufacturer);
    
    // Clear state
    setCustomSkuName('');
    setShowAddCustomSku(false);
    setSearchQuery('');
  };

  return (
    <div id="product-selection-screen" className="flex flex-col h-full bg-slate-50">
      
      {/* 1. Header with Store Banner */}
      <div className="bg-slate-900 text-white px-3 py-3.5 pt-5 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            id="btn-product-selection-back"
            onClick={onBack}
            className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight line-clamp-1">{store.name}</h1>
            <p className="text-[11px] text-slate-400 flex items-center">
              <MapPin className="w-3 h-3 mr-0.5" />
              <span className="truncate max-w-[200px]">{store.address}</span>
            </p>
          </div>
        </div>

        {/* Complete Survey Action Header Button */}
        <button
          id="btn-finish-survey-header"
          onClick={onFinishSurvey}
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          Xong
        </button>
      </div>

      {/* 2. Unified Product Finder (Search + Manufacturers) */}
      <div className="bg-white p-3 border-b border-slate-200 shadow-sm space-y-3 shrink-0">
        
        {/* SKU SEARCH BOX */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-sku"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm SKU..."
            className="w-full pl-10 pr-16 py-3 bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-base font-semibold rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {searchQuery && (
              <button
                id="btn-clear-sku-search"
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-bold text-slate-400 bg-slate-200 hover:bg-slate-300 px-1.5 py-1 rounded"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* MANUFACTURER FILTER GRID - Big tap areas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Lọc theo Nhà sản xuất
            </span>
            <button
              id="btn-add-mfg-header"
              onClick={() => {
                setNewMfgName('');
                setShowAddMfgModal(true);
              }}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            >
              <Plus className="w-3 h-3 mr-0.5 stroke-[3]" />
              Thêm NSX Mới
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {manufacturerList.map((mfg) => {
              const isSelected = selectedManufacturer === mfg;
              return (
                <button
                  key={mfg}
                  id={`mfg-btn-${mfg}`}
                  onClick={() => handleToggleManufacturer(mfg)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center truncate ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-150 border-transparent text-slate-700'
                  }`}
                >
                  {mfg}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SKU List Catalog Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-32">
        
        {/* Add custom SKU quick promo */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {selectedManufacturer ? `SKU của ${selectedManufacturer}` : 'Tất cả SKU hệ thống'} ({filteredSkus.length})
          </span>
          
          <button
            id="btn-open-custom-sku"
            onClick={handleOpenCustomSku}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100"
          >
            <Plus className="w-3.5 h-3.5 mr-0.5 stroke-[3]" />
            Thêm SKU mới
          </button>
        </div>

        {/* Catalog Items list */}
        {filteredSkus.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm space-y-3">
            <p className="text-sm text-slate-500 font-medium">Không tìm thấy SKU nào trùng khớp</p>
            <button
              id="btn-add-custom-sku-not-found"
              onClick={handleOpenCustomSku}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Tạo SKU "{searchQuery || 'Mới'}"</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredSkus.map((sku) => {
              const hasBeenSurveyed = surveyedSkuIds.has(sku.id);
              
              return (
                <button
                  key={sku.id}
                  id={`sku-row-${sku.id}`}
                  onClick={() => onSelectSku(sku.id)}
                  className={`w-full text-left bg-white border rounded-xl p-2.5 shadow-xs flex items-center justify-between transition-all hover:border-slate-350 active:bg-slate-50 ${
                    hasBeenSurveyed 
                      ? 'border-emerald-300 bg-emerald-50/20' 
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Compact Image Placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-slate-400 text-[11px] font-mono select-none">
                      {sku.manufacturer}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded uppercase tracking-wider font-mono">
                          {sku.manufacturer}
                        </span>
                        {hasBeenSurveyed && (
                          <span className="text-[9px] font-bold text-emerald-600 flex items-center font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-0.5" />
                            ĐÃ GHI
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mt-0.5 leading-tight truncate">
                        {sku.name}
                      </h3>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 ml-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Slide-Up Custom SKU Creation Drawer (Overlay) */}
      {showAddCustomSku && (
        <div className="absolute inset-0 bg-slate-900/60 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl p-4 shadow-2xl border-t border-slate-200 space-y-4 max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-base">Tạo SKU Mới Lập Tức</h3>
              <button
                id="btn-close-custom-sku-drawer"
                onClick={() => setShowAddCustomSku(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomSku} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nhà Sản Xuất <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMfgInput(!isCustomMfgInput);
                      if (!isCustomMfgInput) {
                        setCustomSkuManufacturer('');
                      } else {
                        setCustomSkuManufacturer(manufacturerList[0] || 'ACV');
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    {isCustomMfgInput ? 'Chọn NSX có sẵn' : '+ Nhập NSX mới'}
                  </button>
                </div>

                {isCustomMfgInput ? (
                  <input
                    id="input-custom-mfg-text"
                    type="text"
                    required
                    value={customSkuManufacturer}
                    onChange={(e) => setCustomSkuManufacturer(e.target.value)}
                    placeholder="Nhập tên Nhà Sản Xuất mới (Ví dụ: Knorr, VinaAce...)"
                    className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 outline-none rounded-lg text-sm font-semibold"
                  />
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {manufacturerList.map((mfg) => (
                      <button
                        key={mfg}
                        type="button"
                        onClick={() => setCustomSkuManufacturer(mfg)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all truncate ${
                          customSkuManufacturer === mfg
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 border-transparent'
                        }`}
                      >
                        {mfg}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMfgInput(true);
                        setCustomSkuManufacturer('');
                      }}
                      className="py-2 px-1 text-xs font-bold rounded-lg border border-dashed border-emerald-400 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-center flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3] mr-0.5" />
                      Khác...
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tên SKU Mới <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-custom-sku-name"
                  type="text"
                  required
                  value={customSkuName}
                  onChange={(e) => setCustomSkuName(e.target.value)}
                  placeholder="Nhập tên nhãn hàng, trọng lượng..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-slate-400"
                />
              </div>

              <button
                id="btn-save-custom-sku"
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md uppercase tracking-wider"
              >
                Thêm SKU và chọn ngay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Quick Add Manufacturer Modal */}
      {showAddMfgModal && (
        <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-base">Thêm Nhà Sản Xuất Mới</h3>
              <button
                id="btn-close-add-mfg-modal"
                onClick={() => setShowAddMfgModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newMfgName.trim();
                if (trimmed) {
                  setSelectedManufacturer(trimmed);
                  setCustomSkuManufacturer(trimmed);
                  setShowAddMfgModal(false);
                  setNewMfgName('');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Tên Nhà Sản Xuất <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-new-mfg-name"
                  type="text"
                  required
                  autoFocus
                  value={newMfgName}
                  onChange={(e) => setNewMfgName(e.target.value)}
                  placeholder="Ví dụ: Ajinomoto, Knorr, VinaAce..."
                  className="w-full px-3 py-2.5 border border-slate-200 focus:border-slate-400 outline-none rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  id="btn-cancel-add-mfg"
                  type="button"
                  onClick={() => setShowAddMfgModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  id="btn-confirm-add-mfg"
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Thêm & Chọn Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Sticky Bottom Action Widget - Optimized for one-thumb check */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-xl flex items-center justify-between space-x-2 shrink-0">
        
        {/* Left Side: Count of entered items that surveyor can tap to view list */}
        <button
          id="btn-view-entered-skus"
          onClick={onNavigateToRecords}
          className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-350 text-slate-800 rounded-xl px-3 flex items-center justify-center space-x-2 transition-all"
        >
          <ShoppingBag className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-left min-w-0">
            <span className="block text-[11px] text-slate-500 font-medium leading-tight">Đã khảo sát</span>
            <span className="block text-xs font-extrabold text-slate-800 font-mono leading-tight">
              {activeRecordsCount} sản phẩm
            </span>
          </div>
        </button>

        {/* Right Side: Primary Save / finish button */}
        <button
          id="btn-finish-survey-footer"
          onClick={onFinishSurvey}
          className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 shadow-md transition-all active:scale-[0.98]"
        >
          <ClipboardList className="w-4 h-4 shrink-0" />
          <span>Hoàn thành đợt</span>
        </button>

      </div>
    </div>
  );
};

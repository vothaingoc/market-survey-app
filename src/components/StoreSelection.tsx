/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Store } from '../types';
import { Search, Plus, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';

interface StoreSelectionProps {
  stores: Store[];
  onSelectStore: (storeId: string) => void;
  onNavigateAddStore: () => void;
  onBack: () => void;
}

export const StoreSelection: React.FC<StoreSelectionProps> = ({
  stores,
  onSelectStore,
  onNavigateAddStore,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering stores based on search query
  const filteredStores = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  return (
    <div id="store-selection-screen" className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-6 shadow-sm flex items-center space-x-3 shrink-0">
        <button
          id="btn-store-selection-back"
          onClick={onBack}
          className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Chọn Điểm Bán Khảo Sát</h1>
          <p className="text-xs text-slate-400">Chọn cửa hàng hiện có hoặc thêm mới</p>
        </div>
      </div>

      {/* Search Input Box - Huge and clear */}
      <div className="bg-white p-3 border-b border-slate-200 shadow-sm shrink-0">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-store"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên hoặc địa chỉ cửa hàng..."
            className="w-full pl-10 pr-4 py-3 bg-slate-100 hover:bg-slate-150 focus:bg-white text-slate-800 placeholder-slate-400 text-base font-medium rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all"
            autoFocus
          />
          {searchQuery && (
            <button
              id="btn-clear-store-search"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Store List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-32">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Danh sách điểm bán ({filteredStores.length})
          </span>
          {searchQuery && (
            <span className="text-[11px] text-amber-600 font-mono">Đang lọc kết quả</span>
          )}
        </div>

        {filteredStores.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500 font-medium">Không tìm thấy cửa hàng nào</p>
            <p className="text-xs text-slate-400 mt-1">
              Thử tìm kiếm với từ khóa khác hoặc bấm nút thêm mới bên dưới.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStores.map((store) => (
              <button
                key={store.id}
                id={`store-item-${store.id}`}
                onClick={() => onSelectStore(store.id)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 active:bg-slate-50 transition-all"
              >
                <div className="flex-1 pr-3">
                  <h3 className="font-bold text-slate-800 text-base leading-snug">{store.name}</h3>
                  <div className="flex items-start text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{store.address}</span>
                  </div>
                  {store.gps && (
                    <span className="inline-block mt-1 text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      GPS: {store.gps}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Floating Action Area - Optimized for one-thumb reach */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-xl">
        <button
          id="btn-navigate-add-store"
          onClick={onNavigateAddStore}
          className="w-full h-14 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span className="text-base tracking-wide uppercase">Thêm Cửa Hàng Mới</span>
        </button>
      </div>
    </div>
  );
};

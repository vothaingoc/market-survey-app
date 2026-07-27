/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Store } from '../types';
import { ArrowLeft, Plus, Trash2, Pencil, Search, MapPin, Navigation } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface ManageStoresProps {
  stores: Store[];
  onSelectStore?: (storeId: string) => void;
  onAddStoreNavigate: () => void;
  onEditStore: (store: Store) => void;
  onDeleteStore: (id: string) => void;
  onBack: () => void;
}

export const ManageStores: React.FC<ManageStoresProps> = ({
  stores,
  onSelectStore,
  onAddStoreNavigate,
  onEditStore,
  onDeleteStore,
  onBack,
}) => {
  const [deleteStore, setDeleteStore] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    <div id="manage-stores-screen" className="flex flex-col h-full bg-slate-50">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-6 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            id="btn-manage-stores-back"
            onClick={onBack}
            className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Danh Sách Điểm Bán</h1>
            <p className="text-xs text-slate-400">Các cửa hàng trong địa bàn</p>
          </div>
        </div>

        <button
          id="btn-add-store-management"
          onClick={onAddStoreNavigate}
          className="bg-emerald-600 hover:bg-emerald-750 text-white p-2 rounded-lg"
          title="Thêm điểm bán mới"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-3 border-b border-slate-200 shadow-sm shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-manage-stores-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên hoặc địa chỉ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 text-sm font-medium rounded-xl border border-transparent focus:border-slate-300 focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Scrollable Store list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
        <div className="px-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Hệ thống có ({filteredStores.length} điểm bán)
          </span>
        </div>

        {filteredStores.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500 font-medium font-sans">Không tìm thấy điểm bán nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStores.map((store) => (
              <div
                key={store.id}
                id={`manage-store-item-${store.id}`}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-start justify-between"
              >
                <div
                  className={`min-w-0 flex-1 pr-3 ${onSelectStore ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => onSelectStore?.(store.id)}
                >
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{store.name}</h3>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 flex items-start">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{store.address}</span>
                  </p>

                  {store.gps && (
                    <div className="mt-1 flex items-center space-x-1 text-[9px] text-slate-400 font-mono">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{store.gps}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons: Edit & Delete */}
                <div className="flex items-center space-x-1">
                  <button
                    id={`btn-edit-master-store-${store.id}`}
                    onClick={() => onEditStore(store)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 active:bg-blue-50 rounded transition-colors"
                    title="Chỉnh sửa điểm bán"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    id={`btn-delete-master-store-${store.id}`}
                    onClick={() => setDeleteStore(store)}
                    className="p-1.5 text-slate-300 hover:text-red-500 active:bg-red-50 rounded transition-colors"
                    title="Xóa điểm bán này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteStore !== null}
        title="Xóa điểm bán"
        message={`Bạn muốn xóa điểm bán "${deleteStore?.name}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          if (deleteStore) {
            onDeleteStore(deleteStore.id);
          }
          setDeleteStore(null);
        }}
        onCancel={() => setDeleteStore(null)}
        idPrefix="delete-store-modal"
      />
    </div>
  );
};

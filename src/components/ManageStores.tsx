/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Store } from '../types';
import { ArrowLeft, Plus, Trash2, Pencil, Search, MapPin, Navigation, Download, FileSpreadsheet, Archive, X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { createZip, dataUrlToBytes, textToBytes } from '../utils/zip';

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
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const filteredStores = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  const storesToExport = selectedStoreIds.length > 0
    ? stores.filter(store => selectedStoreIds.includes(store.id))
    : stores;

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStoreIds(current => current.includes(storeId)
      ? current.filter(id => id !== storeId)
      : [...current, storeId]);
  };

  const allFilteredSelected = filteredStores.length > 0
    && filteredStores.every(store => selectedStoreIds.includes(store.id));

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredStores.map(store => store.id);
    setSelectedStoreIds(current => allFilteredSelected
      ? current.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  };

  const getPhotoMimeType = (photo: string): string => {
    const match = photo.match(/^data:([^;,]+)/);
    return match?.[1] || 'application/octet-stream';
  };

  const getPhotoExtension = (mimeType: string): string => {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/svg+xml') return 'svg';
    return mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
  };

  const sanitizeFilename = (value: string): string => value
    .normalize('NFKC')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'diem_ban';

  const buildExportData = () => {
    const usedNames = new Set<string>();
    return storesToExport.map((store, index) => {
      let filename = '';
      let mimeType = '';
      let photoBytes: Uint8Array | null = null;

      if (store.photo) {
        mimeType = getPhotoMimeType(store.photo);
        const extension = getPhotoExtension(mimeType);
        const baseName = `${index + 1}. ${sanitizeFilename(store.name)}_storefront`;
        let candidate = `${baseName}.${extension}`;
        let duplicateIndex = 2;
        while (usedNames.has(candidate.toLocaleLowerCase())) {
          candidate = `${baseName}_${duplicateIndex}.${extension}`;
          duplicateIndex += 1;
        }
        filename = candidate;
        usedNames.add(candidate.toLocaleLowerCase());
        photoBytes = dataUrlToBytes(store.photo);
      }

      return { store, sequence: index + 1, filename, mimeType, photoBytes };
    });
  };

  const escapeCsv = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const createStoresCsv = (exportData: ReturnType<typeof buildExportData>): string => {
    const headers = ['STT', 'Tên điểm bán', 'Địa chỉ', 'GPS', 'Tên file ảnh', 'Loại ảnh', 'Dung lượng ảnh (byte)'];
    const rows = exportData.map(({ store, sequence, filename, mimeType, photoBytes }) => [
      sequence,
      store.name,
      store.address,
      store.gps || '',
      filename,
      mimeType,
      photoBytes?.length ?? '',
    ]);
    return `\uFEFF${[headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n')}`;
  };

  const shareOrDownload = async (file: File) => {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name });
        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.warn('Could not share store export', error);
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportCsvOnly = async () => {
    const exportData = buildExportData();
    const file = new File([createStoresCsv(exportData)], 'Danh_sach_diem_ban.csv', { type: 'text/csv;charset=utf-8' });
    await shareOrDownload(file);
    setShowExportOptions(false);
  };

  const exportCsvWithPhotos = async () => {
    const exportData = buildExportData();
    const csv = createStoresCsv(exportData);
    const zip = createZip([
      { path: 'Danh_sach_diem_ban.csv', data: textToBytes(csv) },
      ...exportData
        .filter(item => item.photoBytes && item.filename)
        .map(item => ({ path: `photos/${item.filename}`, data: item.photoBytes! })),
    ]);
    const file = new File([zip], 'Danh_sach_diem_ban_kem_anh.zip', { type: 'application/zip' });
    await shareOrDownload(file);
    setShowExportOptions(false);
  };

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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-28">
        <div className="px-1 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Hệ thống có ({filteredStores.length} điểm bán)
          </span>
          {filteredStores.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="text-[11px] font-bold text-emerald-700"
            >
              {allFilteredSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
            </button>
          )}
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
                className={`bg-white border rounded-xl p-3 shadow-xs grid grid-cols-[1.5rem_minmax(0,1fr)_6rem_2.5rem] gap-2 items-center ${
                  selectedStoreIds.includes(store.id) ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedStoreIds.includes(store.id)}
                  onChange={() => toggleStoreSelection(store.id)}
                  onClick={(event) => event.stopPropagation()}
                  className="h-4 w-4 accent-emerald-600"
                  aria-label={`Chọn điểm bán ${store.name}`}
                />
                <div
                  className={`min-w-0 flex-1 ${onSelectStore ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
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

                {store.photo ? (
                  <div
                    className="w-24 h-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    aria-label={`Ảnh mặt tiền ${store.name}`}
                  >
                    <img
                      src={store.photo}
                      alt={`Ảnh mặt tiền ${store.name}`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                )}

                {/* Action buttons: Edit & Delete */}
                <div className="flex flex-col items-center justify-center gap-2">
                  <button
                    id={`btn-edit-master-store-${store.id}`}
                    onClick={() => onEditStore(store)}
                    className="w-9 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 active:bg-blue-50 rounded-lg transition-colors"
                    title="Chỉnh sửa điểm bán"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    id={`btn-delete-master-store-${store.id}`}
                    onClick={() => setDeleteStore(store)}
                    className="w-9 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 active:bg-red-50 rounded-lg transition-colors"
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

      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 shadow-xl">
        <button
          type="button"
          onClick={() => setShowExportOptions(true)}
          disabled={stores.length === 0}
          className="h-14 w-full rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-lg disabled:bg-slate-300 flex items-center justify-center gap-2"
        >
          <Download className="h-5 w-5" />
          <span>{selectedStoreIds.length > 0 ? `Xuất ${selectedStoreIds.length} điểm bán` : 'Xuất toàn bộ điểm bán'}</span>
        </button>
      </div>

      {showExportOptions && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
          <div className="w-full rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="font-extrabold text-slate-900">Xuất điểm bán</h2>
                <p className="text-xs text-slate-500 mt-0.5">{storesToExport.length} điểm bán sẽ được xuất</p>
              </div>
              <button type="button" onClick={() => setShowExportOptions(false)} className="p-2 text-slate-400" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button type="button" onClick={exportCsvOnly} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left flex items-center gap-3">
                <span className="rounded-lg bg-emerald-600 p-2 text-white"><FileSpreadsheet className="h-5 w-5" /></span>
                <span><strong className="block text-sm text-slate-900">Chỉ CSV</strong><span className="text-xs text-slate-500">Danh sách điểm bán, GPS và thông tin ảnh</span></span>
              </button>
              <button type="button" onClick={exportCsvWithPhotos} className="w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-left flex items-center gap-3">
                <span className="rounded-lg bg-blue-600 p-2 text-white"><Archive className="h-5 w-5" /></span>
                <span><strong className="block text-sm text-slate-900">CSV kèm ảnh</strong><span className="text-xs text-slate-500">File ZIP gồm CSV và thư mục photos</span></span>
              </button>
            </div>
          </div>
        </div>
      )}

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

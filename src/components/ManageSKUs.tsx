/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SKU } from '../types';
import { ArrowLeft, Plus, Trash2, Search, PackageOpen, Check, Pencil, X } from 'lucide-react';
import { MANUFACTURERS } from '../data/masterData';
import { ConfirmModal } from './ConfirmModal';

interface ManageSKUsProps {
  skus: SKU[];
  onAddSku: (sku: Omit<SKU, 'id'>) => void;
  onUpdateSku: (sku: SKU) => void;
  onDeleteSku: (id: string) => void;
  onBack: () => void;
}

export const ManageSKUs: React.FC<ManageSKUsProps> = ({
  skus,
  onAddSku,
  onUpdateSku,
  onDeleteSku,
  onBack,
}) => {
  const [deleteSku, setDeleteSku] = useState<SKU | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [newSkuName, setNewSkuName] = useState('');
  const [newSkuMfg, setNewSkuMfg] = useState('ACV');
  const [isCustomMfgInput, setIsCustomMfgInput] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [editSkuName, setEditSkuName] = useState('');
  const [editSkuManufacturer, setEditSkuManufacturer] = useState('');

  // Dynamic list of manufacturers
  const manufacturerList = useMemo(() => {
    const set = new Set(MANUFACTURERS);
    skus.forEach(s => {
      if (s.manufacturer) set.add(s.manufacturer);
    });
    return Array.from(set);
  }, [skus]);

  const filteredSkus = useMemo(() => {
    let result = skus;
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      result = result.filter(s => s.name.toLowerCase().includes(q));
    } else if (selectedManufacturer) {
      result = result.filter(s => s.manufacturer === selectedManufacturer);
    }

    return [...result].sort((a, b) => {
      const freqA = a.storeFrequency ?? 0;
      const freqB = b.storeFrequency ?? 0;
      if (freqB !== freqA) {
        return freqB - freqA;
      }
      return 0;
    });
  }, [skus, searchQuery, selectedManufacturer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkuName.trim()) return;
    onAddSku({
      name: newSkuName.trim(),
      manufacturer: newSkuMfg,
      isCustom: true,
    });
    setNewSkuName('');
    setShowAddForm(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSku || !editSkuName.trim() || !editSkuManufacturer.trim()) return;
    onUpdateSku({ ...editingSku, name: editSkuName.trim(), manufacturer: editSkuManufacturer.trim() });
    setEditingSku(null);
  };

  return (
    <div id="manage-skus-screen" className="flex flex-col h-full bg-slate-50">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-6 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            id="btn-manage-skus-back"
            onClick={onBack}
            className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Mục Lục SKU Hệ Thống</h1>
            <p className="text-xs text-slate-400">Danh mục sản phẩm khảo sát</p>
          </div>
        </div>

        <button
          id="btn-toggle-add-sku-form"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-600 hover:bg-emerald-750 text-white p-2 rounded-lg"
          title="Thêm SKU mới"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>
      </div>

      {/* Add SKU Inline Panel */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 border-b border-slate-200 shadow-md space-y-3 shrink-0">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đăng ký SKU mới vào Danh mục</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">Tên SKU / Trọng lượng</label>
            <input
              id="input-new-sku-name"
              type="text"
              required
              value={newSkuName}
              onChange={(e) => setNewSkuName(e.target.value)}
              placeholder="Ví dụ: Mì hảo hảo vị bò..."
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 focus:border-slate-400 outline-none rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 block">Nhà Sản Xuất</label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMfgInput(!isCustomMfgInput);
                  if (!isCustomMfgInput) {
                    setNewSkuMfg('');
                  } else {
                    setNewSkuMfg(manufacturerList[0] || 'ACV');
                  }
                }}
                className="text-[11px] font-bold text-emerald-600 hover:underline"
              >
                {isCustomMfgInput ? 'Chọn NSX có sẵn' : '+ Nhập NSX mới'}
              </button>
            </div>

            {isCustomMfgInput ? (
              <input
                id="input-manage-custom-mfg"
                type="text"
                required
                value={newSkuMfg}
                onChange={(e) => setNewSkuMfg(e.target.value)}
                placeholder="Ví dụ: Knorr, VinaAce, Ajinomoto..."
                className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 focus:border-slate-400 outline-none rounded-xl"
              />
            ) : (
              <div className="flex flex-wrap gap-1">
                {manufacturerList.map((m) => (
                  <button
                    key={m}
                    id={`btn-new-sku-mfg-${m}`}
                    type="button"
                    onClick={() => setNewSkuMfg(m)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      newSkuMfg === m
                        ? 'bg-slate-800 border-slate-800 text-white'
                        : 'bg-slate-100 border-transparent text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMfgInput(true);
                    setNewSkuMfg('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-dashed border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  + NSX Mới
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              id="btn-cancel-add-sku"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-250"
            >
              Hủy
            </button>
            <button
              id="btn-save-new-sku"
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow"
            >
              Lưu vào Master
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 border-b border-slate-200 space-y-2 shrink-0 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-catalog-sku-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm SKU..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 text-sm font-medium rounded-xl border border-transparent focus:border-slate-300 focus:bg-white outline-none"
          />
        </div>

        {/* Quick horizontal category chip filter */}
        <div className="flex space-x-1 overflow-x-auto pb-1">
          <button
            id="btn-catalog-mfg-all"
            onClick={() => setSelectedManufacturer(null)}
            className={`px-3 py-1 text-xs font-bold rounded-full border shrink-0 transition-all ${
              selectedManufacturer === null
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Tất cả
          </button>
          {manufacturerList.map((m) => (
            <button
              key={m}
              id={`btn-catalog-mfg-chip-${m}`}
              onClick={() => setSelectedManufacturer(selectedManufacturer === m ? null : m)}
              className={`px-3 py-1 text-xs font-bold rounded-full border shrink-0 transition-all ${
                selectedManufacturer === m
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable SKU list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 pb-24">
        {filteredSkus.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium font-sans">Không tìm thấy SKU nào</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredSkus.map((sku) => (
              <div
                key={sku.id}
                id={`sku-master-${sku.id}`}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-xs flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono uppercase">
                      {sku.manufacturer}
                    </span>
                    {sku.isCustom && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono uppercase">
                        Khách tự thêm
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-1 leading-snug truncate">
                    {sku.name}
                  </h3>
                </div>

                {/* Allow deleting any SKU */}
                <div className="flex items-center shrink-0">
                  <button
                    id={`btn-edit-master-sku-${sku.id}`}
                    onClick={() => {
                      setEditingSku(sku);
                      setEditSkuName(sku.name);
                      setEditSkuManufacturer(sku.manufacturer);
                      setShowAddForm(false);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 active:bg-blue-50 rounded transition-colors"
                    title="Sửa SKU này"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    id={`btn-delete-master-sku-${sku.id}`}
                    onClick={() => setDeleteSku(sku)}
                    className="p-1.5 text-slate-300 hover:text-red-500 active:bg-red-50 rounded transition-colors"
                    title="Xóa SKU này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingSku && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-3" role="presentation">
          <form onSubmit={handleEditSubmit} className="w-full max-w-md bg-white rounded-2xl p-4 space-y-4 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-sku-title">
            <div className="flex items-center justify-between">
              <h2 id="edit-sku-title" className="font-bold text-slate-800">Sửa thông tin SKU</h2>
              <button type="button" onClick={() => setEditingSku(null)} className="p-1 text-slate-500" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Tên SKU</span>
              <input autoFocus required value={editSkuName} onChange={e => setEditSkuName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Nhà sản xuất</span>
              <input required list="edit-sku-manufacturers" value={editSkuManufacturer} onChange={e => setEditSkuManufacturer(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              <datalist id="edit-sku-manufacturers">{manufacturerList.map(manufacturer => <option key={manufacturer} value={manufacturer} />)}</datalist>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingSku(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteSku !== null}
        title="Xóa sản phẩm"
        message={`Bạn muốn xóa SKU "${deleteSku?.name}" khỏi danh mục hệ thống?`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          if (deleteSku) {
            onDeleteSku(deleteSku.id);
          }
          setDeleteSku(null);
        }}
        onCancel={() => setDeleteSku(null)}
        idPrefix="delete-sku-modal"
      />
    </div>
  );
};

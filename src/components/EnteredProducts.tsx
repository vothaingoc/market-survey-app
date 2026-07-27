/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SurveyRecord, SKU, Store, Survey } from '../types';
import { ArrowLeft, Trash2, ShieldCheck, ShoppingBag, Plus, Edit3 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface EnteredProductsProps {
  records: SurveyRecord[];
  skus: SKU[];
  store: Store;
  survey: Survey;
  onEditRecord: (record: SurveyRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onContinueSurvey: () => void;
  onFinishSurvey: () => void;
  onBack: () => void;
}

export const EnteredProducts: React.FC<EnteredProductsProps> = ({
  records,
  skus,
  store,
  survey,
  onEditRecord,
  onDeleteRecord,
  onContinueSurvey,
  onFinishSurvey,
  onBack,
}) => {
  const [deleteRecordId, setDeleteRecordId] = React.useState<string | null>(null);
  const skuMap = React.useMemo(() => new Map(skus.map(s => [s.id, s])), [skus]);

  // Filter records belonging to the active survey
  const activeRecords = React.useMemo(() => {
    return records.filter(r => r.surveyId === survey.id);
  }, [records, survey.id]);

  const totalFacings = React.useMemo(() => {
    return activeRecords.reduce((sum, r) => sum + r.facing, 0);
  }, [activeRecords]);

  return (
    <div id="entered-products-screen" className="flex flex-col h-full bg-slate-50">
      
      {/* 1. Header banner */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-5 shadow-sm flex items-center space-x-3 shrink-0">
        <button
          id="btn-entered-products-back"
          onClick={onBack}
          className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold tracking-tight line-clamp-1">{store.name}</h1>
          <p className="text-[11px] text-slate-400 font-mono">
            Đợt khảo sát: {survey.date}
          </p>
        </div>
      </div>

      {/* 2. Session Summary Stats strip */}
      <div className="bg-slate-200 border-b border-slate-300 px-4 py-3 flex items-center justify-between shrink-0 font-mono">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Đã Khảo Sát</span>
          <span id="txt-records-count" className="text-lg font-black text-slate-800">
            {activeRecords.length} Mặt Hàng (SKU)
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Tổng Số Face</span>
          <span id="txt-total-facings" className="text-lg font-black text-emerald-700">
            {totalFacings} Trưng Bày
          </span>
        </div>
      </div>

      {/* 3. Record Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-32">
        {activeRecords.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Chưa có sản phẩm nào được nhập</p>
            <p className="text-xs text-slate-400 mt-1">Ấn "Nhập thêm SKU" bên dưới để ghi nhận sản phẩm trên kệ.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeRecords.map((record) => {
              const sku = skuMap.get(record.skuId);
              return (
                <div
                  key={record.id}
                  id={`record-item-${record.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col space-y-2.5 hover:border-slate-350"
                >
                  <div className="flex items-start justify-between">
                    {/* Sku Details */}
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase font-mono">
                          {sku?.manufacturer || 'Không rõ'}
                        </span>
                        
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                          record.type === 'Chính ngạch'
                            ? 'bg-blue-50 text-blue-700'
                            : record.type === 'Tiểu ngạch'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {record.type}
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {record.timestamp ? record.timestamp.split(' ')[1] : ''}
                        </span>
                      </div>
                      
                      <h3 className="font-extrabold text-slate-800 text-sm mt-1 leading-tight">
                        {sku?.name || 'Mẫu sản phẩm đã xóa'}
                      </h3>
                    </div>

                    {/* Quick Edit & Delete Actions */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        id={`btn-edit-record-${record.id}`}
                        onClick={() => onEditRecord(record)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 active:bg-blue-50 rounded transition-colors"
                        title="Chỉnh sửa dòng này"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-record-${record.id}`}
                        onClick={() => setDeleteRecordId(record.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 active:bg-red-50 rounded transition-colors"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing and Attributes Details grid */}
                  <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-2 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold leading-tight">Giá 1 gói</span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {record.price1 !== null ? `${record.price1.toLocaleString('ja-JP')} 円` : '—'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold leading-tight">Giá 5 gói</span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {record.price5 !== null ? `${record.price5.toLocaleString('ja-JP')} 円` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold leading-tight">Giá thùng</span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {record.priceCarton !== null ? `${record.priceCarton.toLocaleString('ja-JP')} 円` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold leading-tight">HSD / Face</span>
                      <span className="text-xs font-bold font-mono text-emerald-700 leading-tight block truncate">
                        {record.expiryDate || '—'}{record.factoryCode ? ` ${record.factoryCode}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({record.facing} Face)
                      </span>
                    </div>
                  </div>

                  {/* Optional Photos visual indicator */}
                  {((record.photos && record.photos.length > 0) || record.photo) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>Ảnh chụp đính kèm:</span>
                        <span className="font-bold font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-150">
                          {record.photos && record.photos.length > 0 ? record.photos.length : 1} ảnh
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 overflow-x-auto pt-0.5 pb-0.5">
                        {(record.photos && record.photos.length > 0 ? record.photos : [record.photo!]).map((pUrl, pIdx) => (
                          <img
                            key={pIdx}
                            src={pUrl}
                            alt={`Ảnh ${pIdx + 1}`}
                            className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0 shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Sticky Bottom Double Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-xl grid grid-cols-2 gap-3 shrink-0">
        
        {/* Left: CONTINUE ADDING MORE */}
        <button
          id="btn-continue-survey"
          type="button"
          onClick={onContinueSurvey}
          className="h-14 border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-xs uppercase tracking-wide flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Nhập Thêm SKU</span>
        </button>

        {/* Right: FINISH SURVEY */}
        <button
          id="btn-complete-survey-session"
          type="button"
          onClick={onFinishSurvey}
          className="h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 text-white font-extrabold rounded-xl text-xs uppercase tracking-wide flex items-center justify-center space-x-1 shadow-lg active:scale-[0.98]"
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Hoàn Thành Đợt</span>
        </button>
      </div>

      <ConfirmModal
        isOpen={deleteRecordId !== null}
        title="Xóa dòng ghi chép"
        message="Bạn muốn xóa dòng ghi chép này khỏi phiên khảo sát?"
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          if (deleteRecordId) {
            onDeleteRecord(deleteRecordId);
          }
          setDeleteRecordId(null);
        }}
        onCancel={() => setDeleteRecordId(null)}
        idPrefix="delete-record-modal"
      />
    </div>
  );
};

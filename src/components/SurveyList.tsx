/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Survey, Store, SurveyRecord } from '../types';
import { Play, Plus, MapPin, Database, Archive, Download, Trash2, Calendar, FileText, CheckSquare, Square } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ExportModal } from './ExportModal';

interface SurveyListProps {
  surveys: Survey[];
  stores: Store[];
  records: SurveyRecord[];
  selectedSurveyIds: string[];
  onToggleSelectSurvey: (surveyId: string) => void;
  onClearSelection: () => void;
  onStartNewSurvey: () => void;
  onSelectSurvey: (surveyId: string) => void;
  onDeleteSurvey: (surveyId: string) => void;
  onNavigate: (screen: string) => void;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  surveys,
  stores,
  records,
  selectedSurveyIds,
  onToggleSelectSurvey,
  onClearSelection,
  onStartNewSurvey,
  onSelectSurvey,
  onDeleteSurvey,
  onNavigate,
}) => {
  const storeMap = React.useMemo(() => new Map(stores.map(s => [s.id, s])), [stores]);
  const [deleteSurveyId, setDeleteSurveyId] = React.useState<string | null>(null);
  const [showExportModal, setShowExportModal] = React.useState(false);

  const getSurveyStats = React.useCallback((surveyId: string) => {
    const surveyRecords = records.filter(r => r.surveyId === surveyId);
    return {
      count: surveyRecords.length,
      facings: surveyRecords.reduce((sum, r) => sum + r.facing, 0),
    };
  }, [records]);

  return (
    <div id="survey-list-screen" className="flex flex-col h-full bg-slate-50">
      {/* Header Banner - Minimal, Professional */}
      <div className="bg-slate-900 text-white px-4 py-4 pt-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">SỔ TAY THỊ TRƯỜNG</h1>
          </div>
          <div className="flex items-center space-x-1 bg-green-950 text-green-400 border border-green-800 text-xs px-2 py-1 rounded font-mono">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>OFFLINE</span>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 pb-40">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Lịch sử khảo sát ({surveys.length})
          </h2>
          {selectedSurveyIds.length > 0 && (
            <button
              id="btn-clear-selection"
              onClick={onClearSelection}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-2 py-0.5 rounded-full"
            >
              Bỏ chọn ({selectedSurveyIds.length})
            </button>
          )}
        </div>

        {surveys.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Chưa có phiên khảo sát nào</p>
            <p className="text-xs text-slate-400 mt-1">Ấn nút xanh bên dưới để bắt đầu khảo sát cửa hàng đầu tiên của bạn.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {surveys.map((survey) => {
              const store = storeMap.get(survey.storeId);
              const stats = getSurveyStats(survey.id);
              const isOngoing = survey.status === 'đang thực hiện';
              const isSelectedSurvey = selectedSurveyIds.includes(survey.id);

              return (
                <div
                  key={survey.id}
                  id={`survey-card-${survey.id}`}
                  className={`bg-white border rounded-xl p-3 shadow-sm transition-all flex flex-col justify-between active:scale-[0.99] ${
                    isOngoing 
                      ? 'border-amber-400 ring-1 ring-amber-200' 
                      : isSelectedSurvey
                        ? 'border-emerald-500 ring-1 ring-emerald-100 bg-emerald-50/10'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => onSelectSurvey(survey.id)}>
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isOngoing ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isOngoing ? 'Đang ghi' : 'Hoàn thành'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {survey.date}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 mt-1 text-base leading-tight truncate">
                        {store?.name || 'Cửa hàng không xác định'}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1 shrink-0 text-slate-400" />
                        <span className="truncate">{store?.address || 'Chưa ghi nhận địa chỉ'}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                      <div className="flex items-center space-x-1">
                        {/* Selector checkbox */}
                        <button
                          id={`btn-select-survey-${survey.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelectSurvey(survey.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isSelectedSurvey
                              ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50'
                              : 'text-slate-300 hover:text-slate-400'
                          }`}
                          title={isSelectedSurvey ? 'Bỏ chọn' : 'Chọn xuất dữ liệu'}
                        >
                          {isSelectedSurvey ? (
                            <CheckSquare className="w-4.5 h-4.5 fill-emerald-50" />
                          ) : (
                            <Square className="w-4.5 h-4.5" />
                          )}
                        </button>

                        <button
                          id={`btn-delete-survey-${survey.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSurveyId(survey.id);
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 active:bg-red-50 rounded"
                          title="Xóa khảo sát"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {stats.count} SKU ({stats.facings} Face)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      id={`btn-open-survey-${survey.id}`}
                      onClick={() => onSelectSurvey(survey.id)}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isOngoing ? 'Ghi chép tiếp' : 'Xem / Sửa dữ liệu'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteSurveyId !== null}
        title="Xóa phiên khảo sát"
        message="Bạn chắc chắn muốn xóa phiên khảo sát này và toàn bộ sản phẩm đã nhập?"
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          if (deleteSurveyId) {
            onDeleteSurvey(deleteSurveyId);
          }
          setDeleteSurveyId(null);
        }}
        onCancel={() => setDeleteSurveyId(null)}
        idPrefix="delete-survey-modal"
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedSurveyIds={selectedSurveyIds}
      />

      {/* Sticky Bottom Actions Container - Optimized for One-Hand thumb reach */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-xl flex flex-col space-y-3">
        {/* Rapid New Survey Button - Large, Green, Central Target */}
        <button
          id="btn-new-survey"
          onClick={onStartNewSurvey}
          className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.97]"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
          <span className="text-lg tracking-wide uppercase">Khảo sát mới</span>
        </button>

        {/* Secondary Toolbar - Row of 3 big touch squares for management */}
        <div className="grid grid-cols-3 gap-2">
          <button
            id="btn-manage-skus"
            onClick={() => onNavigate('manage-skus')}
            className="flex flex-col items-center justify-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all active:bg-slate-300"
          >
            <Archive className="w-5 h-5 mb-1 text-slate-500" />
            <span>Mục lục SKU</span>
          </button>
          
          <button
            id="btn-manage-stores"
            onClick={() => onNavigate('manage-stores')}
            className="flex flex-col items-center justify-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all active:bg-slate-300"
          >
            <MapPin className="w-5 h-5 mb-1 text-slate-500" />
            <span>Điểm Bán</span>
          </button>

          <button
            id="btn-export-data"
            onClick={() => setShowExportModal(true)}
            className="flex flex-col items-center justify-center py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-medium transition-all active:bg-emerald-200"
          >
            <Download className="w-5 h-5 mb-1 text-emerald-600" />
            <span>Xuất Dữ Liệu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

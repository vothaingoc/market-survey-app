/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { OfflineDB } from '../data/store';
import { ArrowLeft, Copy, Check, Trash2, ShieldCheck, FileSpreadsheet, Bot, Share2, Upload } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface ExportRawDataProps {
  onBack: () => void;
  onDataReset: () => void;
  selectedSurveyIds: string[];
}

export const ExportRawData: React.FC<ExportRawDataProps> = ({ onBack, onDataReset, selectedSurveyIds }) => {
  const [copiedFormat, setCopiedFormat] = useState<'csv' | 'json' | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [previewTab, setPreviewTab] = useState<'json' | 'csv'>('json');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Read sizes
  const stats = useMemo(() => {
    const surveysAll = OfflineDB.getSurveys();
    const recordsAll = OfflineDB.getRecords();
    const storesAll = OfflineDB.getStores();
    const skusAll = OfflineDB.getSKUs();

    const filteredSurveys = selectedSurveyIds.length > 0
      ? surveysAll.filter(s => selectedSurveyIds.includes(s.id))
      : surveysAll;

    const filteredRecords = selectedSurveyIds.length > 0
      ? recordsAll.filter(r => selectedSurveyIds.includes(r.surveyId))
      : recordsAll;

    return {
      surveys: filteredSurveys.length,
      records: filteredRecords.length,
      stores: storesAll.length,
      skus: skusAll.length,
      isFiltered: selectedSurveyIds.length > 0,
    };
  }, [selectedSurveyIds]);

  // Compute text contents
  const csvText = useMemo(() => {
    return OfflineDB.exportCSV(selectedSurveyIds);
  }, [selectedSurveyIds]);

  const jsonText = useMemo(() => {
    return OfflineDB.exportJSON(selectedSurveyIds);
  }, [selectedSurveyIds]);

  const handleCopy = (format: 'csv' | 'json') => {
    try {
      const textToCopy = format === 'csv' ? csvText : jsonText;
      navigator.clipboard.writeText(textToCopy);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Lỗi sao chép clipboard:', err);
    }
  };

  const handleShareOrDownload = async (file: File) => {
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: file.name,
        });
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('Native share failed, using download link:', err);
    }

    try {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi tải file:', err);
    }
  };

  const getExportValidationErrors = (jsonContent: string): string[] => {
    try {
      const parsed = JSON.parse(jsonContent);
      return parsed?.validation?.valid === false && Array.isArray(parsed.validation.errors)
        ? parsed.validation.errors
        : [];
    } catch (error) {
      return ['Khong kiem tra duoc Survey.json truoc khi xuat'];
    }
  };

  const handleExportExcel = () => {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], `KHAO_SAT_THI_TRUONG_${new Date().toISOString().slice(0, 10)}.csv`, {
      type: 'text/csv;charset=utf-8;',
    });
    handleShareOrDownload(file);
  };

  const handleExportJSON = () => {
    const validationErrors = getExportValidationErrors(jsonText);
    if (validationErrors.length > 0) {
      window.alert(`Survey.json chua hop le: ${validationErrors.join('; ')}`);
      return;
    }
    const blob = new Blob([jsonText], { type: 'application/json' });
    const file = new File([blob], 'Survey.json', {
      type: 'application/json',
    });
    handleShareOrDownload(file);
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const result = OfflineDB.importJSON(text);
      if (!result.ok) {
        setImportMessage(`Khong import duoc Survey.json: ${result.errors.join('; ')}`);
        return;
      }
      setImportMessage(`Da import Survey.json: ${result.imported.surveys} dot, ${result.imported.stores} cua hang, ${result.imported.skus} SKU, ${result.imported.observations} ban ghi.`);
      onDataReset();
    } catch (error) {
      console.error('Error importing Survey.json', error);
      setImportMessage('Khong doc duoc file Survey.json. Vui long thu lai.');
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  return (
    <div id="export-raw-data-screen" className="flex flex-col h-full bg-slate-50">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-6 shadow-sm flex items-center space-x-3 shrink-0">
        <button
          id="btn-export-back"
          onClick={onBack}
          className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Xuất Dữ Liệu Khảo Sát</h1>
          <p className="text-xs text-slate-400">Trích xuất kết quả cho Excel hoặc phân tích AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        
        {stats.isFiltered && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-2.5 shadow-sm text-amber-950 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 animate-pulse shrink-0"></span>
            <div>
              <p className="font-bold text-amber-900">Bộ lọc đang hoạt động</p>
              <p className="text-amber-800 mt-0.5">
                Chỉ xuất dữ liệu cho <span className="font-black font-mono text-amber-900 bg-amber-100 px-1 py-0.5 rounded">{stats.surveys} phiên khảo sát</span> đã chọn ở màn hình lịch sử.
              </p>
            </div>
          </div>
        )}

        {/* Statistics Widgets Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng số đợt</span>
            <span className="text-2xl font-black font-mono text-slate-800 block mt-1">{stats.surveys} đợt</span>
            <span className="text-[10px] text-slate-500 leading-none">Phân chia theo điểm bán</span>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng số dòng</span>
            <span className="text-2xl font-black font-mono text-emerald-700 block mt-1">{stats.records} dòng</span>
            <span className="text-[10px] text-slate-500 leading-none">Bản ghi sản phẩm thực tế</span>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex items-start space-x-2 shadow-sm text-emerald-950 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            Hệ thống hỗ trợ xuất file <span className="font-extrabold text-emerald-800">Excel (.csv)</span> để tính toán và <span className="font-extrabold text-purple-800">JSON cho AI</span> để phân tích dữ liệu tự động.
          </p>
        </div>

        {/* Option Buttons Area */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn định dạng xuất</h2>

          {/* Excel Button */}
          <button
            id="btn-export-excel-page"
            onClick={handleExportExcel}
            className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200 border border-emerald-200 rounded-xl flex items-center space-x-3 text-left transition-all"
          >
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm">Xuất Excel</div>
              <div className="text-xs text-slate-500 mt-0.5">Dùng để kiểm tra và xử lý bằng Excel</div>
            </div>
            <Share2 className="w-5 h-5 text-emerald-600 shrink-0" />
          </button>

          {/* JSON for AI Button */}
          <button
            id="btn-export-json-page"
            onClick={handleExportJSON}
            className="w-full p-3.5 bg-purple-50 hover:bg-purple-100/80 active:bg-purple-200 border border-purple-200 rounded-xl flex items-center space-x-3 text-left transition-all"
          >
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm">Xuất JSON cho AI</div>
              <div className="text-xs text-slate-500 mt-0.5">Dùng để phân tích bằng ChatGPT hoặc công cụ AI</div>
            </div>
            <Share2 className="w-5 h-5 text-purple-600 shrink-0" />
          </button>

          <label className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl flex items-center space-x-3 text-left transition-all cursor-pointer">
            <div className="p-2.5 bg-slate-700 text-white rounded-xl shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm">Nhap lai Survey.json</div>
              <div className="text-xs text-slate-500 mt-0.5">Khoi phuc du lieu tu file JSON da xuat</div>
            </div>
            <input
              id="input-import-survey-json"
              type="file"
              accept="application/json,.json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {importMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs font-semibold">
              {importMessage}
            </div>
          )}

          {/* Quick Copy buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              id="btn-copy-json"
              onClick={() => handleCopy('json')}
              className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 shadow-xs"
            >
              {copiedFormat === 'json' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-purple-700">Đã chép JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sao chép JSON</span>
                </>
              )}
            </button>

            <button
              id="btn-copy-csv"
              onClick={() => handleCopy('csv')}
              className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 shadow-xs"
            >
              {copiedFormat === 'csv' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép CSV</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sao chép CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Tabs */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Xem trước cấu trúc dữ liệu
            </span>
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                id="btn-tab-json"
                onClick={() => setPreviewTab('json')}
                className={`px-2.5 py-0.5 rounded-md transition-all ${
                  previewTab === 'json' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                JSON (AI)
              </button>
              <button
                id="btn-tab-csv"
                onClick={() => setPreviewTab('csv')}
                className={`px-2.5 py-0.5 rounded-md transition-all ${
                  previewTab === 'csv' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                CSV (Excel)
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl p-3 text-[11px] font-mono overflow-auto max-h-60 leading-relaxed whitespace-pre shadow-inner">
            {previewTab === 'json'
              ? (jsonText.length > 1500 ? jsonText.substring(0, 1500) + '\n  ...\n}' : jsonText)
              : (csvText.length > 1200 ? csvText.substring(1, 1200) + '\n(Còn tiếp...)' : csvText)}
          </div>
        </div>

        {/* Destructive reset area */}
        <div className="border border-red-200 bg-red-50/50 rounded-xl p-3.5 space-y-2 text-center mt-4">
          <div>
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider block">Vùng Nguy Hiểm</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Xóa toàn bộ các phiên khảo sát và dữ liệu thực địa cục bộ</span>
          </div>
          <button
            id="btn-wipe-database"
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg inline-flex items-center space-x-1 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Sạch Dữ Liệu Khảo Sát</span>
          </button>
        </div>

      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Xóa toàn bộ dữ liệu khảo sát?"
        message="BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU KHẢO SÁT? Thao tác này sẽ dọn sạch lịch sử và không thể khôi phục!"
        confirmText="Xóa sạch"
        cancelText="Hủy"
        onConfirm={() => {
          OfflineDB.resetAll();
          onDataReset();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
        idPrefix="reset-all-modal"
      />
    </div>
  );
};

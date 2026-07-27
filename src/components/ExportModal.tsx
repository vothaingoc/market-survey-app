/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OfflineDB } from '../data/store';
import { FileSpreadsheet, Bot, X, Check, Share2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSurveyIds: string[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selectedSurveyIds,
}) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShareOrDownload = async (file: File) => {
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: file.name,
        });
        setSuccessMsg(`Đã xuất thành công: ${file.name}`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1800);
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User closed native share dialog
        return;
      }
      console.warn('Native share error, falling back to download:', err);
    }

    // Direct browser file download fallback
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg(`Đã xuất thành công: ${file.name}`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1800);
    } catch (e) {
      console.error('Lỗi khi tải file:', e);
    }
  };

  const handleExportExcel = () => {
    const csvContent = OfflineDB.exportCSV(selectedSurveyIds);
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], `KHAO_SAT_THI_TRUONG_${dateStr}.csv`, {
      type: 'text/csv;charset=utf-8;',
    });
    handleShareOrDownload(file);
  };

  const handleExportJSON = () => {
    const jsonContent = OfflineDB.exportJSON(selectedSurveyIds);
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const file = new File([blob], `KHAO_SAT_THI_TRUONG_AI_${dateStr}.json`, {
      type: 'application/json',
    });
    handleShareOrDownload(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        id="export-format-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-slideUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Chọn định dạng xuất</h3>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 active:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Button 1: Xuất Excel */}
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="w-full text-left p-4 bg-emerald-50/80 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200/80 rounded-xl flex items-start space-x-3.5 transition-all group"
          >
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-base">Xuất Excel</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dùng để kiểm tra và xử lý bằng Excel
              </div>
            </div>
          </button>

          {/* Button 2: Xuất JSON cho AI */}
          <button
            id="btn-export-json-ai"
            onClick={handleExportJSON}
            className="w-full text-left p-4 bg-purple-50/80 hover:bg-purple-100 active:bg-purple-200 border border-purple-200/80 rounded-xl flex items-start space-x-3.5 transition-all group"
          >
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-base">Xuất JSON cho AI</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dùng để phân tích bằng ChatGPT hoặc công cụ AI
              </div>
            </div>
          </button>

          {/* Button 3: Hủy */}
          <button
            id="btn-cancel-export"
            onClick={onClose}
            className="w-full py-3 mt-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-sm rounded-xl transition-colors text-center"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

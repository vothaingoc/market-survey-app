/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OfflineDB } from '../data/store';
import { FileSpreadsheet, Bot, X, Check, Share2, Archive, Images, Upload } from 'lucide-react';
import { bytesToDataUrl, bytesToText, createZipFromBlobs, readZip, textToBytes } from '../utils/zip';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: () => void;
  selectedSurveyIds: string[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
  selectedSurveyIds,
}) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
    const validationErrors = getExportValidationErrors(jsonContent);
    if (validationErrors.length > 0) {
      window.alert(`Survey.json chua hop le: ${validationErrors.join('; ')}`);
      return;
    }
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const file = new File([blob], 'Survey.json', {
      type: 'application/json',
    });
    handleShareOrDownload(file);
  };

  const handleExportExcelWithPhotos = async () => {
    if (isBuildingZip) return;
    setIsBuildingZip(true);
    try {
      const exportData = OfflineDB.exportCSVWithPhotos(selectedSurveyIds);
      const zipBlob = await createZipFromBlobs([
        { path: 'KHAO_SAT_THI_TRUONG.csv', data: textToBytes(exportData.csv) },
        ...exportData.photos.map(photo => ({
          path: `photos/${photo.filename}`,
          data: photo.blob,
        })),
      ]);
      const file = new File([zipBlob], 'KHAO_SAT_KEM_ANH.zip', { type: 'application/zip' });
      await handleShareOrDownload(file);
    } catch (error) {
      console.error('Could not export survey photos', error);
      window.alert('Không thể tạo file ZIP. Vui lòng đóng các ứng dụng khác rồi thử lại.');
    } finally {
      setIsBuildingZip(false);
    }
  };

  const handleExportBackup = async () => {
    const jsonContent = OfflineDB.exportJSON(selectedSurveyIds);
    const validationErrors = getExportValidationErrors(jsonContent);
    if (validationErrors.length > 0) {
      window.alert(`Survey.json chua hop le: ${validationErrors.join('; ')}`);
      return;
    }

    if (isBuildingZip) return;
    setIsBuildingZip(true);
    try {
      const backupPhotos = OfflineDB.exportBackupPhotos(selectedSurveyIds);
      const zipBlob = await createZipFromBlobs([
        { path: 'Survey.json', data: textToBytes(jsonContent) },
        ...backupPhotos.map(photo => ({
          path: `photos/${photo.filename}`,
          data: photo.blob,
        })),
      ]);
      const file = new File([zipBlob], 'Survey_backup.zip', { type: 'application/zip' });
      await handleShareOrDownload(file);
    } catch (error) {
      console.error('Could not create full backup', error);
      window.alert('Không thể tạo file sao lưu. Vui lòng đóng các ứng dụng khác rồi thử lại.');
    } finally {
      setIsBuildingZip(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImporting) return;

    setIsImporting(true);
    try {
      const files = await readZip(file);
      const surveyJson = files.find(item => item.path === 'Survey.json');
      if (!surveyJson) throw new Error('Survey.json is missing from the ZIP file');

      const jsonText = bytesToText(surveyJson.data);
      const parsed = JSON.parse(jsonText);
      const photoMimeByFilename = new Map<string, string>();
      parsed.stores?.forEach((store: any) => {
        store.photos?.forEach((photo: any) => {
          if (photo?.filename && photo?.mimeType) {
            photoMimeByFilename.set(photo.filename, photo.mimeType);
          }
        });
      });
      parsed.observations?.forEach((observation: any) => {
        observation.photos?.forEach((photo: any) => {
          if (photo?.filename && photo?.mimeType) {
            photoMimeByFilename.set(photo.filename, photo.mimeType);
          }
        });
      });

      const photoDataByFilename: Record<string, string> = {};
      files
        .filter(item => item.path.startsWith('photos/'))
        .forEach(item => {
          const filename = item.path.replace(/^photos\//, '');
          photoDataByFilename[filename] = bytesToDataUrl(
            item.data,
            photoMimeByFilename.get(filename) || 'application/octet-stream'
          );
        });

      const result = await OfflineDB.importJSON(jsonText, photoDataByFilename);
      if (!result.ok) throw new Error(result.errors.join('; '));

      onDataImported();
      setSuccessMsg(`Đã khôi phục ${result.imported.surveys} đợt, ${result.imported.stores} điểm bán và ${result.imported.observations} bản ghi.`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2200);
    } catch (error) {
      console.error('Could not restore backup', error);
      window.alert('Không thể khôi phục. Hãy chọn đúng file Survey_backup.zip được xuất từ app.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        id="export-format-modal"
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-slideUp flex flex-col"
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
        <div className="p-5 space-y-3 overflow-y-auto">
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

          {/* Button 2: Xuất Excel kèm ảnh SKU */}
          <button
            id="btn-export-excel-with-photos"
            onClick={handleExportExcelWithPhotos}
            disabled={isBuildingZip}
            className="w-full text-left p-4 bg-teal-50/80 hover:bg-teal-100 active:bg-teal-200 border border-teal-200/80 rounded-xl flex items-start space-x-3.5 transition-all group"
          >
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Images className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-base">{isBuildingZip ? 'Đang tạo ZIP...' : 'Xuất Excel kèm ảnh'}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                ZIP gồm CSV và ảnh chụp của từng SKU
              </div>
            </div>
          </button>

          {/* Button 3: Xuất JSON cho AI */}
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

          {/* Button 4: Sao lưu đầy đủ */}
          <button
            id="btn-export-backup"
            onClick={handleExportBackup}
            disabled={isBuildingZip}
            className="w-full text-left p-4 bg-blue-50/80 hover:bg-blue-100 active:bg-blue-200 border border-blue-200/80 rounded-xl flex items-start space-x-3.5 transition-all group"
          >
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Archive className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-base">Sao luu day du</div>
              <div className="text-xs text-slate-500 mt-0.5">
                ZIP gom Survey.json va thu muc photos de khoi phuc du lieu
              </div>
            </div>
          </button>

          <label
            htmlFor="input-restore-backup"
            className={`w-full text-left p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start space-x-3.5 transition-all group ${
              isImporting ? 'opacity-60 cursor-wait' : 'hover:bg-amber-100 active:bg-amber-200 cursor-pointer'
            }`}
          >
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-base">
                {isImporting ? 'Đang khôi phục...' : 'Khôi phục từ bản sao lưu'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Chọn file Survey_backup.zip đã xuất từ app
              </div>
            </div>
          </label>
          <input
            id="input-restore-backup"
            type="file"
            accept="application/zip,.zip"
            disabled={isImporting}
            onChange={handleImportBackup}
            className="hidden"
          />

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

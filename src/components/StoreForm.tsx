/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Store } from '../types';
import { Camera, MapPin, Navigation, Save, X } from 'lucide-react';

interface StoreFormProps {
  initialStore?: Store | null;
  onSaveStore: (store: Omit<Store, 'id'>) => void;
  onCancel: () => void;
}

export const StoreForm: React.FC<StoreFormProps> = ({ initialStore, onSaveStore, onCancel }) => {
  const [name, setName] = useState(initialStore?.name || '');
  const [address, setAddress] = useState(initialStore?.address || '');
  const [gps, setGps] = useState(initialStore?.gps || '');
  const [photo, setPhoto] = useState<string | null>(initialStore?.photo || null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Read the device's actual location. Never substitute simulated coordinates.
  const handleGetGps = () => {
    setGpsError('');
    if (!window.isSecureContext) {
      setGpsError('Trình duyệt chỉ cho phép định vị trên HTTPS hoặc localhost.');
      return;
    }
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt này không hỗ trợ định vị GPS.');
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        setIsCapturingGps(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Bạn chưa cấp quyền định vị cho trang web. Hãy cho phép vị trí trong cài đặt trình duyệt rồi thử lại.',
          2: 'Thiết bị chưa xác định được vị trí. Hãy bật dịch vụ vị trí/GPS và thử lại.',
          3: 'Lấy vị trí quá thời gian chờ. Hãy thử lại ở nơi có tín hiệu tốt hơn.'
        };
        setGpsError(messages[error.code] || 'Không lấy được vị trí thật từ thiết bị.');
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Simulate fast photo taking with camera or file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulatePhoto = () => {
    // Generates a mock store facade SVG in base64
    const colors = ['#0f766e', '#1e3a8a', '#b91c1c', '#3f2b96', '#15803d'];
    const selectedColor = colors[Math.floor(Math.random() * colors.length)];
    const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="${encodeURIComponent(selectedColor)}"/><rect x="20" y="60" width="260" height="120" fill="white" stroke="black" stroke-width="3"/><rect x="40" y="90" width="70" height="90" fill="%23ddd" stroke="black"/><rect x="190" y="90" width="70" height="90" fill="%23ddd" stroke="black"/><text x="150" y="40" fill="white" font-family="sans-serif" font-weight="bold" font-size="20" text-anchor="middle">CỬA HÀNG THỊ TRƯỜNG</text><text x="150" y="140" fill="black" font-family="sans-serif" font-size="12" text-anchor="middle">MẶT TIỀN ĐIỂM BÁN</text></svg>`;
    setPhoto(mockSvg);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Cửa hàng không tên (Mới)';
    const finalAddress = address.trim() || 'Chưa xác định địa chỉ';
    const finalGps = gps.trim();

    onSaveStore({
      name: finalName,
      address: finalAddress,
      gps: finalGps,
      photo: photo || undefined,
      isCustom: true
    });
  };

  return (
    <div id="add-store-screen" className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-3 py-4 pt-6 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button
            id="btn-store-form-cancel"
            onClick={onCancel}
            type="button"
            className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {initialStore ? 'Sửa Thông Tin Điểm Bán' : 'Thêm Điểm Bán Mới'}
            </h1>
            <p className="text-xs text-slate-400">
              {initialStore ? 'Cập nhật tên, địa chỉ, GPS cửa hàng' : 'Ghi nhận thông tin thực địa cực nhanh'}
            </p>
          </div>
        </div>
        
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 pb-36">
        
        {/* 1. Shop Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Tên Điểm Bán <span className="text-red-500">*</span>
          </label>
          <input
            id="input-store-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Tạp hóa cô Ba, WinMart Lý Tự Trọng..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-base font-semibold focus:border-slate-400 outline-none shadow-sm"
          />
        </div>

        {/* 2. GPS Location - High Contrast with auto-capture */}
        <div className="bg-slate-100 rounded-2xl p-3.5 border border-slate-200 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center">
              <Navigation className="w-4 h-4 mr-1 text-slate-500" />
              Tọa Độ Thực Địa (GPS)
            </span>
              {gps && <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-green-100 text-green-800">Tọa độ đã ghi nhận</span>}
          </div>

          <div className="flex gap-2">
            <input
              id="input-store-gps"
              type="text"
              value={gps}
              onChange={(e) => setGps(e.target.value)}
              placeholder="Bấm 'Lấy GPS' để lấy vị trí thật"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:border-slate-400"
            />
            <button
              id="btn-capture-gps"
              type="button"
              onClick={handleGetGps}
              disabled={isCapturingGps}
              className="px-4 py-2 bg-emerald-600 active:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-sm min-w-[100px]"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isCapturingGps ? 'Đang lấy...' : 'Lấy GPS'}</span>
            </button>
          </div>
          {gpsError && <p role="alert" className="text-xs text-red-700">{gpsError}</p>}
        </div>

        {/* 3. Address */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Địa Chỉ Điểm Bán <span className="text-red-500">*</span>
          </label>
          <textarea
            id="input-store-address"
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-slate-400 outline-none shadow-sm resize-none"
          />
        </div>

        {/* 4. Storefront Photo - Optional with dual capture */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Ảnh Mặt Tiền Điểm Bán (Không bắt buộc)
          </label>
          
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center bg-white min-h-[140px] text-center relative overflow-hidden">
            {photo ? (
              <div className="relative w-full h-full">
                <img
                  src={photo}
                  alt="Mặt tiền điểm bán"
                  className="w-full h-32 object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
                <button
                  id="btn-remove-store-photo"
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-slate-900 active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="flex flex-col space-y-2 items-center">
                  <span className="text-xs text-slate-500 font-medium">Chụp trực tiếp bằng điện thoại hoặc tải file ảnh</span>
                  <div className="flex space-x-2">
                    {/* Real Camera / File Upload Trigger */}
                    <label className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-all border border-slate-200 shadow-sm">
                      Chọn File / Chụp Máy Ảnh
                      <input
                        id="input-store-photo-file"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Simulation Button for instant testing in AI studio preview */}
                    <button
                      id="btn-simulate-store-photo"
                      type="button"
                      onClick={handleSimulatePhoto}
                      className="bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                    >
                      Giả Lập Ảnh Chụp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </form>

      {/* Sticky Bottom Actions - Thumb accessible */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-xl grid grid-cols-2 gap-3">
        <button
          id="btn-store-form-cancel-footer"
          type="button"
          onClick={onCancel}
          className="h-14 border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold rounded-xl text-base tracking-wide uppercase"
        >
          Hủy bỏ
        </button>
        
        <button
          id="btn-store-form-save"
          type="button"
          onClick={handleSubmit}
          className="h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-base tracking-wide uppercase flex items-center justify-center space-x-1.5 shadow-lg"
        >
          <Save className="w-5 h-5" />
          <span>{initialStore ? 'Lưu Thay Đổi' : 'Lưu & Khảo sát'}</span>
        </button>
      </div>
    </div>
  );
};

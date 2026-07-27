/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Store } from '../types';
import { Camera, MapPin, Navigation, Save, X, RotateCcw } from 'lucide-react';

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
  const [gpsSource, setGpsSource] = useState<'simulated' | 'real' | null>(initialStore?.gps ? 'real' : null);

  // Suggest Vietnamese addresses for extremely rapid store registration
  const VN_ADDRESS_SUGGESTIONS = [
    '180 Cao Lỗ, Phường 4, Quận 8, TP. HCM',
    '342 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP. HCM',
    '101 Tôn Dật Tiên, Phường Tân Phong, Quận 7, TP. HCM',
    '87 Láng Hạ, Phường Thành Công, Quận Ba Đình, Hà Nội',
    '52 Lê Duẩn, Phường Hải Châu I, Quận Hải Châu, Đà Nẵng'
  ];

  // Auto-fill random Vietnamese retail shop name
  const STORE_NAME_SUGGESTIONS = [
    'Tạp Hóa Cô Hoa',
    'WinMart+ Hoàng Diệu',
    'Bách Hóa Xanh Phạm Hùng',
    'Tạp Hóa Minh Phát',
    'Co.op Food Lý Thường Kiệt'
  ];

  const handleQuickFill = () => {
    const randomIdx = Math.floor(Math.random() * VN_ADDRESS_SUGGESTIONS.length);
    setName(STORE_NAME_SUGGESTIONS[randomIdx]);
    setAddress(VN_ADDRESS_SUGGESTIONS[randomIdx]);
    // Simulate GPS near matching city centers
    const lats = [10.7431, 10.7725, 10.7291, 21.0189, 16.0713];
    const lngs = [106.6789, 106.6852, 106.7214, 105.8192, 108.2208];
    setGps(`${lats[randomIdx].toFixed(4)}, ${lngs[randomIdx].toFixed(4)}`);
    setGpsSource('simulated');
  };

  // Capture GPS using browser geolocation or fallback
  const handleGetGps = () => {
    setIsCapturingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setGps(`${lat}, ${lng}`);
          setGpsSource('real');
          setIsCapturingGps(false);
          // Suggest a random address if empty
          if (!address) {
            const randomAddr = VN_ADDRESS_SUGGESTIONS[Math.floor(Math.random() * VN_ADDRESS_SUGGESTIONS.length)];
            setAddress(randomAddr);
          }
        },
        (error) => {
          console.warn('Geolocation error, falling back to simulation:', error);
          // Fallback to high-fidelity simulated coordinates in Saigon Center
          const simLat = (10.776 + (Math.random() - 0.5) * 0.01).toFixed(6);
          const simLng = (106.701 + (Math.random() - 0.5) * 0.01).toFixed(6);
          setGps(`${simLat}, ${simLng}`);
          setGpsSource('simulated');
          setIsCapturingGps(false);
          if (!address) {
            setAddress('Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // Direct simulation
      const simLat = (10.7767 + (Math.random() - 0.5) * 0.01).toFixed(6);
      const simLng = (106.7011 + (Math.random() - 0.5) * 0.01).toFixed(6);
      setGps(`${simLat}, ${simLng}`);
      setGpsSource('simulated');
      setIsCapturingGps(false);
    }
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
    const finalGps = gps.trim() || '10.7756, 106.7019'; // Default Saigon Center

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
        
        {/* Quick Fill Magic Button for testing in-field */}
        <button
          id="btn-quick-fill-store"
          type="button"
          onClick={handleQuickFill}
          className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-sm"
          title="Điền nhanh dữ liệu mẫu"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Điền Nhanh</span>
        </button>
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
            {gpsSource && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                gpsSource === 'real' ? 'bg-green-150 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {gpsSource === 'real' ? 'GPS Thật' : 'GPS Giả Lập'}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              id="input-store-gps"
              type="text"
              value={gps}
              onChange={(e) => setGps(e.target.value)}
              placeholder="Nhấp 'Lấy GPS' hoặc điền 'vĩ độ, kinh độ'"
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

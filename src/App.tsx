/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Store, SKU, Survey, SurveyRecord } from './types';
import { OfflineDB } from './data/store';
import { runOsakaSeedImport } from './data/importer';
import { SurveyList } from './components/SurveyList';
import { StoreSelection } from './components/StoreSelection';
import { StoreForm } from './components/StoreForm';
import { ProductSelection } from './components/ProductSelection';
import { ProductEntry } from './components/ProductEntry';
import { EnteredProducts } from './components/EnteredProducts';
import { ManageSKUs } from './components/ManageSKUs';
import { ManageStores } from './components/ManageStores';
import { ExportRawData } from './components/ExportRawData';
import { Smartphone, Copy, FilePlus2, X } from 'lucide-react';

export default function App() {
  const [currentScreen, setScreen] = useState<string>('survey-list');
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [activeSkuId, setActiveSkuId] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingRecord, setEditingRecord] = useState<SurveyRecord | null>(null);
  const [pendingStoreChoiceId, setPendingStoreChoiceId] = useState<string | null>(null);

  // Synced local DB states
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [records, setRecords] = useState<SurveyRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);

  // Toggle selection
  const handleToggleSelectSurvey = (surveyId: string) => {
    setSelectedSurveyIds(prev =>
      prev.includes(surveyId)
        ? prev.filter(id => id !== surveyId)
        : [...prev, surveyId]
    );
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedSurveyIds([]);
  };

  // Format Helper: YYYY-MM-DD HH:mm
  const formatCurrentTime = (): string => {
    const d = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const refreshData = () => {
    setSurveys(OfflineDB.getSurveys());
    setRecords(OfflineDB.getRecords());
    setStores(OfflineDB.getStores());
    setSKUs(OfflineDB.getSKUs());
  };

  // Initial load
  useEffect(() => {
    runOsakaSeedImport();
    refreshData();
  }, []);

  // --- ACTIONS ---

  // Start new survey flow
  const handleStartNewSurvey = () => {
    setScreen('store-selection');
  };

  const getDatePart = (value: string): string => value.split(' ')[0].replace(/\//g, '-');

  const isTodaySurvey = (survey: Survey): boolean => getDatePart(survey.date) === getDatePart(formatCurrentTime());

  const getSurveyTime = (survey: Survey): number => {
    const normalized = survey.date.replace(/\//g, '-').replace(' ', 'T');
    const time = new Date(normalized).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const getLatestSurveyForStore = (storeId: string, sourceSurveys = OfflineDB.getSurveys()): Survey | null => {
    const storeSurveys = sourceSurveys
      .filter(survey => survey.storeId === storeId)
      .sort((a, b) => getSurveyTime(b) - getSurveyTime(a));
    return storeSurveys[0] || null;
  };

  const openSurvey = (surveyId: string, screen: 'product-selection' | 'entered-products' = 'product-selection') => {
    setActiveSurveyId(surveyId);
    setPendingStoreChoiceId(null);
    setScreen(screen);
  };

  const createBlankSurvey = (storeId: string) => {
    const newSurvey: Survey = {
      id: `survey_${Date.now()}`,
      storeId,
      date: formatCurrentTime(),
      status: 'đang thực hiện',
    };
    OfflineDB.saveSurvey(newSurvey);
    refreshData();
    openSurvey(newSurvey.id);
  };

  const createSurveyFromPrevious = (storeId: string) => {
    const previousSurvey = getLatestSurveyForStore(storeId);
    if (!previousSurvey) {
      createBlankSurvey(storeId);
      return;
    }

    const timestamp = Date.now();
    const newSurvey: Survey = {
      id: `survey_${timestamp}`,
      storeId,
      date: formatCurrentTime(),
      status: 'đang thực hiện',
    };
    OfflineDB.saveSurvey(newSurvey);

    const previousRecords = OfflineDB.getRecords().filter(record => record.surveyId === previousSurvey.id);
    previousRecords.forEach((record, index) => {
      OfflineDB.saveRecord({
        ...record,
        id: `record_${timestamp}_${index + 1}`,
        surveyId: newSurvey.id,
        photo: null,
        photos: [],
        timestamp: formatCurrentTime(),
      });
    });

    refreshData();
    openSurvey(newSurvey.id, previousRecords.length > 0 ? 'entered-products' : 'product-selection');
  };

  // Selection of a store to create/resume survey
  const handleSelectStore = (storeId: string) => {
    setEditingRecord(null);
    const currentSurveys = OfflineDB.getSurveys();

    // Open an unfinished survey only when it belongs to today. Older unfinished surveys can be used as previous data.
    const existing = currentSurveys.find(
      s => s.storeId === storeId && s.status === 'đang thực hiện' && isTodaySurvey(s)
    );

    if (existing) {
      refreshData();
      openSurvey(existing.id);
      return;
    }

    const previousSurvey = getLatestSurveyForStore(storeId, currentSurveys);
    if (previousSurvey && OfflineDB.getRecords().some(record => record.surveyId === previousSurvey.id)) {
      setPendingStoreChoiceId(storeId);
      return;
    }

    createBlankSurvey(storeId);
  };

  // Creating or editing a store from the field form
  const handleSaveStore = (storeData: Omit<Store, 'id'>) => {
    const currentStores = OfflineDB.getStores();
    const currentSurveys = OfflineDB.getSurveys();

    if (editingStore) {
      const updatedStore: Store = {
        ...editingStore,
        ...storeData,
      };
      OfflineDB.saveStore(updatedStore);
      const nextStores = currentStores.map(s => s.id === updatedStore.id ? updatedStore : s);
      setEditingStore(null);
      setStores(nextStores);
      setScreen('manage-stores');
    } else {
      const newStoreId = `store_${Date.now()}`;
      const newStore: Store = {
        ...storeData,
        id: newStoreId,
      };
      OfflineDB.saveStore(newStore);

      // Create a new survey for this store immediately
      const newSurvey: Survey = {
        id: `survey_${Date.now()}`,
        storeId: newStoreId,
        date: formatCurrentTime(),
        status: 'đang thực hiện',
      };
      OfflineDB.saveSurvey(newSurvey);

      setStores([...currentStores, newStore]);
      setSurveys([...currentSurveys, newSurvey]);
      setActiveSurveyId(newSurvey.id);
      setScreen('product-selection');
    }
  };

  // Select an existing survey from the list
  const handleSelectSurvey = (surveyId: string) => {
    setEditingRecord(null);
    setActiveSurveyId(surveyId);
    setScreen('product-selection');
  };

  // Delete an entire survey session
  const handleDeleteSurvey = (surveyId: string) => {
    OfflineDB.deleteSurvey(surveyId);
    if (activeSurveyId === surveyId) {
      setActiveSurveyId(null);
    }
    setSelectedSurveyIds(prev => prev.filter(id => id !== surveyId));
    refreshData();
  };

  // Adding custom SKU from inside product selection screen
  const handleAddNewSku = (name: string, manufacturer: string) => {
    setEditingRecord(null);
    const newSkuId = `sku_${Date.now()}`;
    const newSku: SKU = {
      id: newSkuId,
      name,
      manufacturer,
      isCustom: true,
    };
    OfflineDB.saveSKU(newSku);
    refreshData();
    // Auto-select this SKU immediately for entering data
    setActiveSkuId(newSkuId);
    setScreen('product-entry');
  };

  // Selecting SKU to enter product information
  const handleSelectSku = (skuId: string) => {
    // Check if there is already a record for this SKU in the active survey session
    const existingRecord = activeSurveyId
      ? OfflineDB.getRecords().find(r => r.surveyId === activeSurveyId && r.skuId === skuId)
      : undefined;

    setEditingRecord(existingRecord || null);
    setActiveSkuId(skuId);
    setScreen('product-entry');
  };

  // Editing an existing recorded item inside a survey
  const handleEditRecord = (record: SurveyRecord) => {
    setEditingRecord(record);
    setActiveSkuId(record.skuId);
    setScreen('product-entry');
  };

  // Saving product survey record
  const handleSaveProductRecord = (
    recordData: Omit<SurveyRecord, 'id' | 'timestamp'> & { id?: string },
    continueSameSku: boolean
  ) => {
    const wasEditing = !!editingRecord;
    const newRecord: SurveyRecord = {
      ...recordData,
      id: recordData.id || `record_${Date.now()}`,
      timestamp: formatCurrentTime(),
    };
    const saved = OfflineDB.saveRecord(newRecord);
    if (!saved) {
      window.alert('Khong the luu anh vao bo nho cua trinh duyet. Anh da duoc nen, vui long thu lai hoac xoa bot anh/du lieu cu neu van bi lap lai.');
      return false;
    }
    refreshData();
    setEditingRecord(null);

    if (!continueSameSku) {
      // Return to entered products list if we were editing, otherwise back to product selection
      setScreen(wasEditing ? 'entered-products' : 'product-selection');
    }
    return true;
  };

  // Deleting a recorded item inside a survey
  const handleDeleteRecord = (recordId: string) => {
    OfflineDB.deleteRecord(recordId);
    refreshData();
  };

  // Finish a survey đợt
  const handleFinishSurveySession = () => {
    if (activeSurveyId) {
      const s = surveys.find(item => item.id === activeSurveyId);
      if (s) {
        OfflineDB.saveSurvey({
          ...s,
          status: 'đã hoàn thành',
        });
      }
    }
    setActiveSurveyId(null);
    setScreen('survey-list');
    refreshData();
  };

  // Global delete SKU
  const handleDeleteMasterSku = (skuId: string) => {
    OfflineDB.deleteSKU(skuId);
    refreshData();
  };

  // Global delete store
  const handleDeleteMasterStore = (storeId: string) => {
    OfflineDB.deleteStore(storeId);
    refreshData();
  };

  // Manage custom adding SKU
  const handleAddMasterSku = (skuData: Omit<SKU, 'id'>) => {
    OfflineDB.saveSKU({
      ...skuData,
      id: `sku_${Date.now()}`,
    });
    refreshData();
  };

  // Rendering screen routing
  const activeSurvey = surveys.find(s => s.id === activeSurveyId);
  const activeStore = activeSurvey ? stores.find(s => s.id === activeSurvey.storeId) : null;
  const activeSku = skus.find(s => s.id === activeSkuId);
  const pendingStoreChoice = pendingStoreChoiceId ? stores.find(store => store.id === pendingStoreChoiceId) : null;
  const pendingPreviousSurvey = pendingStoreChoiceId ? getLatestSurveyForStore(pendingStoreChoiceId, surveys) : null;
  const pendingPreviousRecordCount = pendingPreviousSurvey
    ? records.filter(record => record.surveyId === pendingPreviousSurvey.id).length
    : 0;

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'survey-list':
        return (
          <SurveyList
            surveys={surveys}
            stores={stores}
            records={records}
            selectedSurveyIds={selectedSurveyIds}
            onToggleSelectSurvey={handleToggleSelectSurvey}
            onClearSelection={handleClearSelection}
            onStartNewSurvey={handleStartNewSurvey}
            onSelectSurvey={handleSelectSurvey}
            onDeleteSurvey={handleDeleteSurvey}
            onNavigate={(scr) => setScreen(scr)}
          />
        );

      case 'store-selection':
        return (
          <StoreSelection
            stores={stores}
            onSelectStore={handleSelectStore}
            onNavigateAddStore={() => {
              setEditingStore(null);
              setScreen('add-store');
            }}
            onBack={() => setScreen('survey-list')}
          />
        );

      case 'add-store':
        return (
          <StoreForm
            initialStore={editingStore}
            onSaveStore={handleSaveStore}
            onCancel={() => {
              const prev = editingStore ? 'manage-stores' : 'store-selection';
              setEditingStore(null);
              setScreen(prev);
            }}
          />
        );

      case 'product-selection':
        if (!activeSurvey || !activeStore) {
          setScreen('survey-list');
          return null;
        }
        return (
          <ProductSelection
            skus={skus}
            survey={activeSurvey}
            store={activeStore}
            records={records}
            onSelectSku={handleSelectSku}
            onAddNewSku={handleAddNewSku}
            onNavigateToRecords={() => setScreen('entered-products')}
            onFinishSurvey={handleFinishSurveySession}
            onBack={() => setScreen('survey-list')}
          />
        );

      case 'product-entry':
        if (!activeSurvey || !activeSku) {
          setScreen('product-selection');
          return null;
        }
        return (
          <ProductEntry
            sku={activeSku}
            surveyId={activeSurvey.id}
            initialRecord={editingRecord}
            onSave={handleSaveProductRecord}
            onCancel={() => {
              const returnScreen = editingRecord ? 'entered-products' : 'product-selection';
              setEditingRecord(null);
              setScreen(returnScreen);
            }}
          />
        );

      case 'entered-products':
        if (!activeSurvey || !activeStore) {
          setScreen('survey-list');
          return null;
        }
        return (
          <EnteredProducts
            records={records}
            skus={skus}
            store={activeStore}
            survey={activeSurvey}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onContinueSurvey={() => {
              setEditingRecord(null);
              setScreen('product-selection');
            }}
            onFinishSurvey={handleFinishSurveySession}
            onBack={() => setScreen('product-selection')}
          />
        );

      case 'manage-skus':
        return (
          <ManageSKUs
            skus={skus}
            onAddSku={handleAddMasterSku}
            onDeleteSku={handleDeleteMasterSku}
            onBack={() => setScreen('survey-list')}
          />
        );

      case 'manage-stores':
        return (
          <ManageStores
            stores={stores}
            onSelectStore={handleSelectStore}
            onAddStoreNavigate={() => {
              setEditingStore(null);
              setScreen('add-store');
            }}
            onEditStore={(store) => {
              setEditingStore(store);
              setScreen('add-store');
            }}
            onDeleteStore={handleDeleteMasterStore}
            onBack={() => setScreen('survey-list')}
          />
        );

      case 'export-data':
        return (
          <ExportRawData
            selectedSurveyIds={selectedSurveyIds}
            onBack={() => setScreen('survey-list')}
            onDataReset={() => {
              setSelectedSurveyIds([]);
              refreshData();
              setScreen('survey-list');
            }}
          />
        );

      default:
        return (
          <div className="p-8 text-center text-slate-500">
            Đang tải dữ liệu...
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 md:py-6 flex flex-col md:flex-row justify-center items-center font-sans antialiased text-slate-800">
      
      {/* Visual Instruction Panel on the Left - Describing the Craft (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col max-w-sm text-slate-400 p-6 space-y-4 self-center mr-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Smartphone className="w-5 h-5" />
            <span className="text-sm font-bold tracking-wider uppercase">THIẾT KẾ MỘT THAO TÁC</span>
          </div>
          <h2 className="text-xl font-black text-white leading-snug">SỔ TAY KHẢO SÁT THỊ TRƯỜNG</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ứng dụng ghi chép nhanh số liệu trưng bày, giá cả trực tiếp tại điểm bán dành cho nhân viên thị trường Việt Nam.
          </p>
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="flex items-start space-x-2 text-xs">
              <span className="bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded font-bold">1</span>
              <span><strong className="text-slate-200">Ngoại tuyến 100%</strong>: Dữ liệu lưu cục bộ trong LocalStorage. Không lo mất mạng trong kho siêu thị.</span>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <span className="bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded font-bold">2</span>
              <span><strong className="text-slate-200">Tối ưu một tay</strong>: Toàn bộ nút lưu, nhập liệu và đổi nhãn đều nằm ở vùng ngón tay cái tiếp cận tốt nhất.</span>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <span className="bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded font-bold">3</span>
              <span><strong className="text-slate-200">HSD Thông minh</strong>: Gõ <code className="text-amber-400 font-mono">260915</code> tự động định dạng thành <code className="text-amber-400 font-mono">2026/09/15</code> khi lưu.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Mobile Container (Fills screen on real phone, centered card on desktop) */}
      <div className="w-full max-w-md h-screen md:h-[840px] md:rounded-3xl bg-white border border-slate-800 md:shadow-2xl overflow-hidden relative flex flex-col">
        {renderActiveScreen()}
        {pendingStoreChoice && pendingPreviousSurvey && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-4">
            <div className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Chọn cách bắt đầu khảo sát</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pendingStoreChoice.name} có data kỳ trước ({pendingPreviousRecordCount} SKU).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingStoreChoiceId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <button
                  id="btn-create-survey-from-previous"
                  type="button"
                  onClick={() => createSurveyFromPrevious(pendingStoreChoice.id)}
                  className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-xl flex items-start gap-3 text-left transition-all"
                >
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Tạo từ data kỳ trước</div>
                    <div className="text-xs text-slate-500 mt-0.5">Copy giá, HSD, loại hàng, facing và mã nhà máy. Không copy ảnh.</div>
                  </div>
                </button>

                <button
                  id="btn-create-blank-survey"
                  type="button"
                  onClick={() => createBlankSurvey(pendingStoreChoice.id)}
                  className="w-full p-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl flex items-start gap-3 text-left transition-all"
                >
                  <div className="p-2 bg-slate-700 text-white rounded-xl shrink-0">
                    <FilePlus2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Tạo khảo sát mới</div>
                    <div className="text-xs text-slate-500 mt-0.5">Bắt đầu khảo sát trống như workflow hiện tại.</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
import { Smartphone, BookOpen, Layers } from 'lucide-react';

export default function App() {
  const [currentScreen, setScreen] = useState<string>('survey-list');
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [activeSkuId, setActiveSkuId] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingRecord, setEditingRecord] = useState<SurveyRecord | null>(null);

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

  // Selection of a store to create/resume survey
  const handleSelectStore = (storeId: string) => {
    setEditingRecord(null);
    const currentSurveys = OfflineDB.getSurveys();
    const currentStores = OfflineDB.getStores();

    // Check if there is already an in-progress survey for this store today
    const existing = currentSurveys.find(
      s => s.storeId === storeId && s.status === 'đang thực hiện'
    );

    let targetSurveyId: string;
    let nextSurveys = [...currentSurveys];

    if (existing) {
      targetSurveyId = existing.id;
    } else {
      const newSurvey: Survey = {
        id: `survey_${Date.now()}`,
        storeId,
        date: formatCurrentTime(),
        status: 'đang thực hiện',
      };
      OfflineDB.saveSurvey(newSurvey);
      nextSurveys.push(newSurvey);
      targetSurveyId = newSurvey.id;
    }

    setStores(currentStores);
    setSurveys(nextSurveys);
    setActiveSurveyId(targetSurveyId);
    setScreen('product-selection');
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
    OfflineDB.saveRecord(newRecord);
    refreshData();
    setEditingRecord(null);

    if (!continueSameSku) {
      // Return to entered products list if we were editing, otherwise back to product selection
      setScreen(wasEditing ? 'entered-products' : 'product-selection');
    }
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
      </div>
    </div>
  );
}

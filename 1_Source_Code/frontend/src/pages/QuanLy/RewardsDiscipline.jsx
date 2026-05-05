import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DecisionList from './DecisionList';
import DecisionForm from './DecisionForm';
import DecisionDetail from './DecisionDetail';

export default function RewardsDiscipline() {
  const location = useLocation();

  // Dùng lazy initializer để lấy prefill 1 lần duy nhất khi mount, tránh setState trong effect
  const [currentView, setCurrentView] = useState(
    () => (location.state?.prefillData ? 'create' : 'list')
  );
  const [selectedId, setSelectedId] = useState(null);
  const [prefillData, setPrefillData] = useState(
    () => location.state?.prefillData ?? null
  );

  // Side-effect only: xóa navigation state để tránh khi refresh lại bị nhảy vào form
  useEffect(() => {
    if (location.state?.prefillData) {
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackToList = () => {
    setSelectedId(null);
    setPrefillData(null);
    setCurrentView('list');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {currentView === 'list' && (
        <DecisionList
          onCreateNew={() => {
            setSelectedId(null);
            setPrefillData(null);
            setCurrentView('create');
          }}
          onViewDetail={(id) => {
            setSelectedId(id);
            setCurrentView('detail');
          }}
          onEdit={(id) => {
            setSelectedId(id);
            setPrefillData(null);
            setCurrentView('edit');
          }}
        />
      )}

      {currentView === 'detail' && selectedId && (
        <DecisionDetail
          decisionId={selectedId}
          onBack={handleBackToList}
        />
      )}

      {currentView === 'create' && (
        <DecisionForm 
          prefillData={prefillData}
          onCancel={handleBackToList} 
          onSuccess={handleBackToList} 
        />
      )}

      {currentView === 'edit' && selectedId && (
        <DecisionForm
          editDecisionId={selectedId}
          onCancel={handleBackToList}
          onSuccess={handleBackToList}
        />
      )}
    </div>
  );
}

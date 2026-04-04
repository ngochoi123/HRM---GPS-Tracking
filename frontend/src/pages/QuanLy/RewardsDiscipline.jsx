import React, { useState } from 'react';
import DecisionList from './DecisionList';
import DecisionForm from './DecisionForm';
import DecisionDetail from './DecisionDetail';

export default function RewardsDiscipline() {
  const [currentView, setCurrentView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {currentView === 'list' && (
        <DecisionList
          onCreateNew={() => {
            setSelectedId(null);
            setCurrentView('create');
          }}
          onViewDetail={(id) => {
            setSelectedId(id);
            setCurrentView('detail');
          }}
          onEdit={(id) => {
            setSelectedId(id);
            setCurrentView('edit');
          }}
        />
      )}

      {currentView === 'detail' && selectedId && (
        <DecisionDetail
          decisionId={selectedId}
          onBack={() => {
            setSelectedId(null);
            setCurrentView('list');
          }}
        />
      )}

      {currentView === 'create' && (
        <DecisionForm onCancel={() => setCurrentView('list')} onSuccess={() => setCurrentView('list')} />
      )}

      {currentView === 'edit' && selectedId && (
        <DecisionForm
          editDecisionId={selectedId}
          onCancel={() => {
            setSelectedId(null);
            setCurrentView('list');
          }}
          onSuccess={() => {
            setSelectedId(null);
            setCurrentView('list');
          }}
        />
      )}
    </div>
  );
}

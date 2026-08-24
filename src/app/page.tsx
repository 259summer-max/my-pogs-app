'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  AlertCircle, 
  MessageSquare, 
  RefreshCw, 
  Loader2,
  Plus
} from 'lucide-react';

interface StandardItem {
  id: string | number;
  objective?: string;
  goal?: string;
  standard?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'long_term';
  target_count?: number;
  target_days?: string;
  is_active?: boolean | string;
}

interface LogItem {
  log_id: string;
  date: string;
  standard_id: string | number;
  is_completed: boolean;
  reason_if_failed?: string;
}

interface AppConfig {
  purpose?: string;
  start_date?: string;
  end_date?: string;
  period?: string;
}

export default function POGSDashboard() {
  const [config, setConfig] = useState<AppConfig>({
    purpose: '목적을 불러오는 중...',
    period: '2026.01.01 ~ 2026.06.30'
  });
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'long_term'>('daily');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // 미실천 사유 작성 모달
  const [selectedStandard, setSelectedStandard] = useState<StandardItem | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  // 어플 내 신규 항목 추가 모달
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newObjective, setNewObjective] = useState('하나님과의 관계');
  const [newGoal, setNewGoal] = useState('');
  const [newStandard, setNewStandard] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'long_term'>('daily');
  const [newTargetDays, setNewTargetDays] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_POGS_API_URL || '';
  const todayStr = new Date().toISOString().split('T')[0];

  const formatDateStr = (rawDate?: string) => {
    if (!rawDate) return '';
    if (rawDate.includes('T')) return rawDate.split('T')[0].replace(/-/g, '.');
    return String(rawDate).slice(0, 10).replace(/-/g, '.');
  };

  const fetchData = async () => {
    if (!API_URL) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.config) setConfig(data.config);
      if (data.standards) {
        setStandards(data.standards.filter((s: any) => s.is_active !== false && String(s.is_active).toUpperCase() !== 'FALSE'));
      }
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleComplete = async (standardId: string | number, currentCompleted: boolean) => {
    const nextStatus = !currentCompleted;
    setSyncing(true);

    const existingLogIdx = logs.findIndex(
      l => String(l.standard_id) === String(standardId) && String(l.date).startsWith(todayStr)
    );

    let updatedLogs = [...logs];
    if (existingLogIdx > -1) {
      updatedLogs[existingLogIdx] = { ...updatedLogs[existingLogIdx], is_completed: nextStatus };
    } else {
      updatedLogs.push({
        log_id: Date.now().toString(),
        date: todayStr,
        standard_id: standardId,
        is_completed: nextStatus
      });
    }
    setLogs(updatedLogs);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'LOG_CHECK',
          date: todayStr,
          standard_id: standardId,
          is_completed: nextStatus,
          reason_if_failed: ''
        })
      });
    } catch (err) {
      console.error('동기화 실패:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveReason = async () => {
    if (!selectedStandard) return;
    setSyncing(true);

    const standardId = selectedStandard.id;
    const existingLogIdx = logs.findIndex(
      l => String(l.standard_id) === String(standardId) && String(l.date).startsWith(todayStr)
    );

    let updatedLogs = [...logs];
    if (existingLogIdx > -1) {
      updatedLogs[existingLogIdx] = { 
        ...updatedLogs[existingLogIdx], 
        reason_if_failed: reasonInput,
        is_completed: false 
      };
    } else {
      updatedLogs.push({
        log_id: Date.now().toString(),
        date: todayStr,
        standard_id: standardId,
        is_completed: false,
        reason_if_failed: reasonInput
      });
    }
    setLogs(updatedLogs);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'LOG_CHECK',
          date: todayStr,
          standard_id: standardId,
          is_completed: false,
          reason_if_failed: reasonInput
        })
      });
    } catch (err) {
      console.error('사유 저장 실패:', err);
    } finally {
      setSyncing(false);
      setSelectedStandard(null);
      setReasonInput('');
    }
  };

  // 어플에서 새 항목 추가 핸들러
  const handleAddNewStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStandard.trim()) return;

    setSyncing(true);
    const tempId = Date.now().toString();
    const newItem: StandardItem = {
      id: tempId,
      objective: newObjective,
      goal: newGoal,
      standard: newStandard,
      frequency: newFrequency,
      target_days: newTargetDays,
      is_active: true
    };

    setStandards(prev => [...prev, newItem]);
    setIsAddModalOpen(false);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ADD_STANDARD',
          objective: newObjective,
          goal: newGoal,
          standard: newStandard,
          frequency: newFrequency,
          target_days: newTargetDays
        })
      });
      // 등록 후 리프레시
      fetchData();
    } catch (err) {
      console.error('신규 항목 추가 실패:', err);
    } finally {
      setSyncing(false);
      setNewGoal('');
      setNewStandard('');
      setNewTargetDays('');
    }
  };

  const currentStandards = standards.filter(s => (s.frequency || 'daily') === activeTab);
  const dailyStandards = standards.filter(s => (s.frequency || 'daily') === 'daily');
  const dailyCompletedCount = dailyStandards.filter(s => {
    const log = logs.find(l => String(l.standard_id) === String(s.id) && String(l.date).startsWith(todayStr));
    return log?.is_completed;
  }).length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* 1. 최상단 헤더 */}
      <header className="bg-white border-b border-slate-200 px-5 pt-7 pb-5 sticky top-0 z-10 shadow-xs">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>POGS Dashboard</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchData} 
                disabled={loading || syncing} 
                title="시트 새로고침"
                className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || syncing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
                {config.start_date && config.end_date 
                  ? `${formatDateStr(config.start_date)} ~ ${formatDateStr(config.end_date)}` 
                  : config.period || '시즌'}
              </span>
            </div>
          </div>

          <h1 className="text-lg font-bold text-slate-900 leading-snug">
            {config.purpose || '목적을 설정해주세요'}
          </h1>

          <div className="mt-4 bg-slate-100 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-600 font-medium">오늘의 실천 달성도</div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${dailyStandards.length ? (dailyCompletedCount / dailyStandards.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-indigo-700">
                {dailyCompletedCount}/{dailyStandards.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 네비게이션 탭 */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <nav className="flex bg-slate-200/80 p-1 rounded-xl gap-1 text-xs font-medium text-slate-600">
          {[
            { key: 'daily', label: '오늘의 실천' },
            { key: 'weekly', label: '이번 주' },
            { key: 'monthly', label: '이번 달' },
            { key: 'long_term', label: '장기 과제' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 font-bold shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 3. 체크리스트 목록 */}
        <section className="mt-4 space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">데이터를 불러오는 중...</p>
            </div>
          ) : currentStandards.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 border border-dashed rounded-2xl p-6">
              등록된 항목이 없습니다.<br />우측 하단 '+' 버튼을 눌러 새 실천 항목을 등록해보세요.
            </div>
          ) : (
            currentStandards.map((std) => {
              const todayLog = logs.find(
                l => String(l.standard_id) === String(std.id) && String(l.date).startsWith(todayStr)
              );
              const isCompleted = todayLog?.is_completed || false;
              const failReason = todayLog?.reason_if_failed;

              return (
                <div 
                  key={std.id}
                  className={`p-4 rounded-2xl bg-white border transition-all ${
                    isCompleted 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button 
                      onClick={() => handleToggleComplete(std.id, isCompleted)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {std.objective && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {std.objective}
                          </span>
                        )}
                        {std.target_days && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            {std.target_days}
                          </span>
                        )}
                      </div>

                      <p className={`text-sm font-semibold leading-snug ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}>
                        {std.standard || '실천 내용 없음'}
                      </p>

                      {std.goal && (
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          🎯 {std.goal}
                        </p>
                      )}

                      {failReason && (
                        <div className="mt-2 text-xs bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-100 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{failReason}</span>
                        </div>
                      )}
                    </div>

                    {!isCompleted && (
                      <button 
                        onClick={() => {
                          setSelectedStandard(std);
                          setReasonInput(failReason || '');
                        }}
                        title="미실천 사유 적기"
                        className="text-slate-300 hover:text-slate-600 p-1 shrink-0"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* 4. 플로팅 추가 버튼 (+) */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-20"
        title="새 실천 항목 추가"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 5. 새 항목 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              새로운 POGS 실천 항목 추가
            </h3>
            
            <form onSubmit={handleAddNewStandard} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">영역 (Objective)</label>
                <select 
                  value={newObjective} 
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="하나님과의 관계">하나님과의 관계</option>
                  <option value="자기 자신과의 관계">자기 자신과의 관계</option>
                  <option value="공동체와의 관계">공동체와의 관계</option>
                  <option value="세상과의 관계">세상과의 관계</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">상위 목표 (Goal)</label>
                <input 
                  type="text"
                  placeholder="예: 독서를 통해 지적 채움을 실현하자"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">구체적 실천 기준 (Standard)</label>
                <input 
                  type="text"
                  placeholder="예: 매일 성경 읽기 20분"
                  value={newStandard}
                  onChange={(e) => setNewStandard(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">주기 (Frequency)</label>
                  <select 
                    value={newFrequency} 
                    onChange={(e) => setNewFrequency(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="daily">매일 (Daily)</option>
                    <option value="weekly">이번 주 (Weekly)</option>
                    <option value="monthly">이번 달 (Monthly)</option>
                    <option value="long_term">장기 과제</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">요일 지정 (선택)</label>
                  <input 
                    type="text"
                    placeholder="예: 월-금, 토"
                    value={newTargetDays}
                    onChange={(e) => setNewTargetDays(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                >
                  시트에 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 미실천 사유 모달 */}
      {selectedStandard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              미실천 피드백 기록
            </h3>
            <p className="text-xs text-slate-500 mb-3 truncate">
              {selectedStandard.standard}
            </p>
            <textarea 
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="오늘 실천하지 못한 사유나 점검 노트를 적어주세요..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => setSelectedStandard(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                닫기
              </button>
              <button 
                onClick={handleSaveReason}
                className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
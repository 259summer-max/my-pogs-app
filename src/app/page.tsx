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
  Plus,
  BarChart3,
  ListTodo,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';

interface SeasonItem {
  season_id: string;
  title: string;
  purpose: string;
  start_date: string;
  end_date: string;
  is_active: boolean | string;
}

interface StandardItem {
  id: string | number;
  season_id?: string;
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
  season_id?: string;
}

// 일요일~토요일 주간 범위 계산
const getSundayToSaturdayWeekRange = (targetDate: Date = new Date()) => {
  const current = new Date(targetDate);
  const day = current.getDay();
  
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - day);
  sunday.setHours(0, 0, 0, 0);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  return { sunday, saturday };
};

export default function POGSDashboard() {
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string>('');
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  
  // 📅 현재 조회 및 기록 중인 날짜 (기본: 오늘)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [mainView, setMainView] = useState<'checklist' | 'analytics'>('checklist');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'long_term'>('daily');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // 미실천 사유 모달
  const [selectedStandard, setSelectedStandard] = useState<StandardItem | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  // 실천 항목 추가 모달
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newObjective, setNewObjective] = useState('하나님과의 관계');
  const [newGoal, setNewGoal] = useState('');
  const [newStandard, setNewStandard] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'long_term'>('daily');
  const [newTargetDays, setNewTargetDays] = useState('');

  // 새 시즌 생성 모달
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [newSeasonTitle, setNewSeasonTitle] = useState('');
  const [newSeasonPurpose, setNewSeasonPurpose] = useState('');
  const [newSeasonStart, setNewSeasonStart] = useState('');
  const [newSeasonEnd, setNewSeasonEnd] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_POGS_API_URL || '';
  const todayStr = new Date().toISOString().split('T')[0];

  const formatDateStr = (rawDate?: string) => {
    if (!rawDate) return '';
    if (String(rawDate).includes('T')) return String(rawDate).split('T')[0].replace(/-/g, '.');
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
      if (data.seasons && data.seasons.length > 0) {
        setSeasons(data.seasons);
        const active = data.seasons.find((s: SeasonItem) => s.is_active === true || String(s.is_active).toUpperCase() === 'TRUE');
        if (active) setCurrentSeasonId(active.season_id);
        else setCurrentSeasonId(data.seasons[0].season_id);
      }
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

  const currentSeason = seasons.find(s => s.season_id === currentSeasonId) || seasons[0];

  // 📅 날짜 이동 핸들러 (하루 전 / 하루 후)
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // 체크 토글 (선택된 날짜 기준)
  const handleToggleComplete = async (standardId: string | number, currentCompleted: boolean) => {
    const nextStatus = !currentCompleted;
    setSyncing(true);

    const existingLogIdx = logs.findIndex(
      l => String(l.standard_id) === String(standardId) && String(l.date).startsWith(selectedDate)
    );

    let updatedLogs = [...logs];
    if (existingLogIdx > -1) {
      updatedLogs[existingLogIdx] = { ...updatedLogs[existingLogIdx], is_completed: nextStatus };
    } else {
      updatedLogs.push({
        log_id: Date.now().toString(),
        date: selectedDate,
        standard_id: standardId,
        is_completed: nextStatus,
        season_id: currentSeasonId
      });
    }
    setLogs(updatedLogs);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'LOG_CHECK',
          date: selectedDate,
          standard_id: standardId,
          is_completed: nextStatus,
          reason_if_failed: '',
          season_id: currentSeasonId
        })
      });
    } catch (err) {
      console.error('동기화 실패:', err);
    } finally {
      setSyncing(false);
    }
  };

  // 피드백 저장 (선택된 날짜 기준)
  const handleSaveReason = async () => {
    if (!selectedStandard) return;
    setSyncing(true);

    const standardId = selectedStandard.id;
    const existingLogIdx = logs.findIndex(
      l => String(l.standard_id) === String(standardId) && String(l.date).startsWith(selectedDate)
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
        date: selectedDate,
        standard_id: standardId,
        is_completed: false,
        reason_if_failed: reasonInput,
        season_id: currentSeasonId
      });
    }
    setLogs(updatedLogs);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'LOG_CHECK',
          date: selectedDate,
          standard_id: standardId,
          is_completed: false,
          reason_if_failed: reasonInput,
          season_id: currentSeasonId
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

  // 새 실천 항목 추가
  const handleAddNewStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStandard.trim()) return;

    setSyncing(true);
    const tempId = Date.now().toString();
    const newItem: StandardItem = {
      id: tempId,
      season_id: currentSeasonId,
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
          season_id: currentSeasonId,
          objective: newObjective,
          goal: newGoal,
          standard: newStandard,
          frequency: newFrequency,
          target_days: newTargetDays
        })
      });
      fetchData();
    } catch (err) {
      console.error('항목 추가 실패:', err);
    } finally {
      setSyncing(false);
      setNewGoal('');
      setNewStandard('');
      setNewTargetDays('');
    }
  };

  // 새 시즌 생성
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonTitle || !newSeasonPurpose) return;

    setSyncing(true);
    setIsNewSeasonModalOpen(false);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'CREATE_SEASON',
          title: newSeasonTitle,
          purpose: newSeasonPurpose,
          start_date: newSeasonStart,
          end_date: newSeasonEnd
        })
      });
      fetchData();
    } catch (err) {
      console.error('새 시즌 생성 실패:', err);
    } finally {
      setSyncing(false);
      setNewSeasonTitle('');
      setNewSeasonPurpose('');
      setNewSeasonStart('');
      setNewSeasonEnd('');
    }
  };

  const seasonStandards = standards.filter(s => !s.season_id || s.season_id === currentSeasonId);
  const currentStandards = seasonStandards.filter(s => (s.frequency || 'daily') === activeTab);
  
  // 선택된 날짜 기준 실천 달성률
  const dailyStandards = seasonStandards.filter(s => (s.frequency || 'daily') === 'daily');
  const dailyCompletedCount = dailyStandards.filter(s => {
    const log = logs.find(l => String(l.standard_id) === String(s.id) && String(l.date).startsWith(selectedDate));
    return log?.is_completed;
  }).length;

  // 선택된 날짜가 속한 주(일~토) 카운팅
  const { sunday, saturday } = getSundayToSaturdayWeekRange(new Date(selectedDate));
  const getWeeklyCompletedCount = (stdId: string | number) => {
    return logs.filter(l => {
      if (String(l.standard_id) !== String(stdId) || !l.is_completed) return false;
      const logDate = new Date(l.date);
      return logDate >= sunday && logDate <= saturday;
    }).length;
  };

  // 통계 리포트 데이터
  const objectives = ['하나님과의 관계', '자기 자신과의 관계', '공동체와의 관계', '세상과의 관계'];
  const analyticsData = objectives.map(obj => {
    const objStandards = seasonStandards.filter(s => s.objective === obj);
    const objStandardIds = objStandards.map(s => String(s.id));
    const completedLogsCount = logs.filter(l => objStandardIds.includes(String(l.standard_id)) && l.is_completed).length;
    return {
      objective: obj,
      standardCount: objStandards.length,
      totalCompleted: completedLogsCount
    };
  });

  const failureLogs = logs.filter(l => l.reason_if_failed && l.reason_if_failed.trim() !== '');

  const isSelectedToday = selectedDate === todayStr;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* 1. 최상단 시즌 & Purpose 헤더 */}
      <header className="bg-white border-b border-slate-200 px-5 pt-6 pb-4 sticky top-0 z-10 shadow-xs">
        <div className="max-w-md mx-auto">
          {/* 상단 컨트롤러 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <select 
                value={currentSeasonId} 
                onChange={(e) => setCurrentSeasonId(e.target.value)}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg focus:outline-none"
              >
                {seasons.map(s => (
                  <option key={s.season_id} value={s.season_id}>
                    {s.title}
                  </option>
                ))}
              </select>
              
              <button 
                onClick={() => setIsNewSeasonModalOpen(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> 새 시즌
              </button>
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
              <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                {currentSeason ? `${formatDateStr(currentSeason.start_date)} ~ ${formatDateStr(currentSeason.end_date)}` : ''}
              </span>
            </div>
          </div>

          {/* 현재 시즌 Purpose */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 mb-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Purpose (인생의 중심 목적)
            </div>
            <h1 className="text-sm font-bold text-slate-900 leading-snug">
              {currentSeason?.purpose || '등록된 목적이 없습니다.'}
            </h1>
          </div>

          {/* 📅 날짜 네비게이터 (소급 기록 기능) */}
          {mainView === 'checklist' && (
            <div className="bg-indigo-50/70 border border-indigo-100 p-2 rounded-xl flex items-center justify-between mb-3">
              <button 
                onClick={() => handleShiftDate(-1)} 
                className="p-1 rounded-lg hover:bg-white text-indigo-700 transition-colors"
                title="하루 전으로 이동"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-indigo-950 bg-transparent border-0 focus:outline-none cursor-pointer"
                />
                {isSelectedToday ? (
                  <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full shadow-2xs">
                    오늘
                  </span>
                ) : (
                  <button 
                    onClick={() => setSelectedDate(todayStr)}
                    className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full hover:bg-indigo-700 transition-colors"
                  >
                    오늘로 복귀
                  </button>
                )}
              </div>

              <button 
                onClick={() => handleShiftDate(1)} 
                className="p-1 rounded-lg hover:bg-white text-indigo-700 transition-colors"
                title="다음 날로 이동"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 뷰 전환 탭 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMainView('checklist')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mainView === 'checklist' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ListTodo className="w-4 h-4" /> 실천 체크리스트
            </button>
            <button
              onClick={() => setMainView('analytics')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mainView === 'analytics' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> 시즌 점검 & 회고
            </button>
          </div>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="max-w-md mx-auto px-4 mt-4">
        {mainView === 'checklist' ? (
          <>
            {/* 주기별 탭 */}
            <nav className="flex bg-slate-200/80 p-1 rounded-xl gap-1 text-xs font-medium text-slate-600 mb-4">
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

            {/* 선택 날짜 달성도 게이지 */}
            {activeTab === 'daily' && (
              <div className="mb-4 bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="text-xs text-slate-600 font-medium">
                  {formatDateStr(selectedDate)} 실천율
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
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
            )}

            {/* 체크리스트 카드 리스트 */}
            <section className="space-y-3">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs font-medium">데이터를 불러오는 중...</p>
                </div>
              ) : currentStandards.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 border border-dashed rounded-2xl p-6 bg-white">
                  현재 시즌에 등록된 실천 기준이 없습니다.<br />우측 하단 '+' 버튼을 눌러 새 항목을 등록해보세요.
                </div>
              ) : (
                currentStandards.map((std) => {
                  const logOnDate = logs.find(
                    l => String(l.standard_id) === String(std.id) && String(l.date).startsWith(selectedDate)
                  );
                  const isCompletedOnDate = logOnDate?.is_completed || false;
                  const failReason = logOnDate?.reason_if_failed;
                  const weeklyCount = getWeeklyCompletedCount(std.id);

                  return (
                    <div 
                      key={std.id}
                      className={`p-4 rounded-2xl bg-white border transition-all ${
                        isCompletedOnDate 
                          ? 'border-emerald-200 bg-emerald-50/20' 
                          : 'border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button 
                          onClick={() => handleToggleComplete(std.id, isCompletedOnDate)}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        >
                          {isCompletedOnDate ? (
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
                            {std.frequency === 'weekly' && (
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                해당 주간 (일~토): {weeklyCount}회 실천
                              </span>
                            )}
                            {std.target_days && (
                              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                {std.target_days}
                              </span>
                            )}
                          </div>

                          <p className={`text-sm font-semibold leading-snug ${
                            isCompletedOnDate ? 'line-through text-slate-400' : 'text-slate-800'
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

                        {!isCompletedOnDate && (
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
          </>
        ) : (
          /* 시즌 점검 & 회고(Analytics) 뷰 */
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                4대 영역별 누적 실천 현황
              </h3>
              
              <div className="space-y-3">
                {analyticsData.map((data, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{data.objective}</span>
                      <span className="font-bold text-indigo-600">{data.totalCompleted}회 달성</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, data.totalCompleted * 5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                미실천 사유 & 피드백 기록 ({failureLogs.length}건)
              </h3>

              {failureLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">기록된 미실천 피드백이 없습니다.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {failureLogs.slice().reverse().map((l, idx) => (
                    <div key={idx} className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 text-xs text-slate-700">
                      <div className="text-[10px] font-semibold text-rose-600 mb-0.5">{formatDateStr(l.date)}</div>
                      <div>{l.reason_if_failed}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. 플로팅 추가 버튼 (+) */}
      {mainView === 'checklist' && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-20"
          title="새 실천 항목 추가"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* 5. 새 시즌 등록 모달 */}
      {isNewSeasonModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              새로운 시즌(기간) 시작하기
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              새로운 시기의 명칭과 중심 목적(Purpose)을 정합니다.
            </p>

            <form onSubmit={handleCreateSeason} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">시즌 명칭</label>
                <input 
                  type="text"
                  placeholder="예: 2026 하반기 / 새로운 도전기"
                  value={newSeasonTitle}
                  onChange={(e) => setNewSeasonTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">이 시즌의 핵심 목적 (Purpose)</label>
                <textarea 
                  rows={2}
                  placeholder="예: 하나님과의 깊은 동행과 이웃을 섬기는 리더십의 삶"
                  value={newSeasonPurpose}
                  onChange={(e) => setNewSeasonPurpose(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">시작일</label>
                  <input 
                    type="date"
                    value={newSeasonStart}
                    onChange={(e) => setNewSeasonStart(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">종료일</label>
                  <input 
                    type="date"
                    value={newSeasonEnd}
                    onChange={(e) => setNewSeasonEnd(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsNewSeasonModalOpen(false)}
                  className="flex-1 py-2.5 font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                >
                  새 시즌 개시
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 실천 항목 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              현재 시즌 실천 항목 추가
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

      {/* 7. 미실천 사유 모달 */}
      {selectedStandard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              미실천 피드백 기록 ({formatDateStr(selectedDate)})
            </h3>
            <p className="text-xs text-slate-500 mb-3 truncate">
              {selectedStandard.standard}
            </p>
            <textarea 
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="해당 일자에 실천하지 못한 사유나 점검 노트를 적어주세요..."
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
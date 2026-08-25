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
  Calendar as CalendarIcon,
  Filter,
  Target,
  Edit2,
  EyeOff,
  RotateCcw,
  User
} from 'lucide-react';

interface SeasonItem {
  user_id?: string;
  season_id: string;
  title: string;
  purpose: string;
  start_date: string;
  end_date: string;
  is_active: boolean | string;
}

interface StandardItem {
  user_id?: string;
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
  user_id?: string;
  log_id: string;
  date: string;
  standard_id: string | number;
  is_completed: boolean;
  reason_if_failed?: string;
  season_id?: string;
}

const FREQUENCY_MAP = {
  daily: { label: '일일', color: 'emerald', badge: 'bg-emerald-100 text-emerald-800' },
  weekly: { label: '주간', color: 'indigo', badge: 'bg-indigo-100 text-indigo-800' },
  monthly: { label: '월간', color: 'amber', badge: 'bg-amber-100 text-amber-800' },
  long_term: { label: '장기', color: 'purple', badge: 'bg-purple-100 text-purple-800' },
};

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const ITEM_ACCENT_COLORS = [
  'border-l-indigo-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-sky-500',
  'border-l-purple-500',
];

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
  const [userId, setUserId] = useState<string>('Nathan');
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [tempUserIdInput, setTempUserIdInput] = useState<string>('');

  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string>('');
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [mainView, setMainView] = useState<'checklist' | 'analytics'>('checklist');
  const [filterFrequency, setFilterFrequency] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'long_term' | 'hidden'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  const [selectedStandard, setSelectedStandard] = useState<StandardItem | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const [editingStandard, setEditingStandard] = useState<StandardItem | null>(null);
  const [editStandardText, setEditStandardText] = useState('');
  const [editGoalText, setEditGoalText] = useState('');
  const [editObjective, setEditObjective] = useState('하나님과의 관계');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'long_term'>('daily');
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newObjective, setNewObjective] = useState('하나님과의 관계');
  const [newGoal, setNewGoal] = useState('');
  const [newStandard, setNewStandard] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'long_term'>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['월', '화', '수', '목', '금']);

  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [newSeasonTitle, setNewSeasonTitle] = useState('');
  const [newSeasonPurpose, setNewSeasonPurpose] = useState('');
  const [newSeasonStart, setNewSeasonStart] = useState('');
  const [newSeasonEnd, setNewSeasonEnd] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_POGS_API_URL || 'https://script.google.com/macros/s/AKfycbzqgBsCTWSAtbaFqM7biRAm7uutWuWcGLMykV_5tA_tUxa8rWT93IDzR16K8R2gjOcqCw/exec';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('pogs_user_id');
      if (savedUser && savedUser.trim() !== '') {
        setUserId(savedUser.trim());
      } else {
        localStorage.setItem('pogs_user_id', 'Nathan');
        setUserId('Nathan');
      }
    } catch {
      setUserId('Nathan');
    }
  }, []);

  const formatDateStr = (rawDate?: string) => {
    if (!rawDate) return '';
    const s = String(rawDate);
    if (s.includes('T')) return s.split('T')[0].replace(/-/g, '.');
    return s.slice(0, 10).replace(/-/g, '.');
  };

  const getDayName = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return DAYS_OF_WEEK[d.getDay()] || '월';
    } catch {
      return '월';
    }
  };

  const fetchData = async () => {
    if (!API_URL || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      
      if (data && Array.isArray(data.seasons) && data.seasons.length > 0) {
        setSeasons(data.seasons);
        const active = data.seasons.find((s: any) => s.is_active === true || String(s.is_active).toUpperCase() === 'TRUE');
        if (active) setCurrentSeasonId(String(active.season_id));
        else setCurrentSeasonId(String(data.seasons[0].season_id));
      } else {
        setSeasons([]);
        setCurrentSeasonId('');
      }

      if (data && Array.isArray(data.standards)) {
        const mappedStandards: StandardItem[] = data.standards.map((raw: any) => {
          const findVal = (keys: string[]) => {
            for (const k of keys) {
              if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') return raw[k];
              const lowerKey = Object.keys(raw).find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
              if (lowerKey && raw[lowerKey] !== undefined && raw[lowerKey] !== null && String(raw[lowerKey]).trim() !== '') return raw[lowerKey];
            }
            return '';
          };

          const activeRaw = findVal(['is_active', 'Is_active', 'isActive']);
          const isActive = activeRaw === '' || activeRaw === undefined ? true : (String(activeRaw).toUpperCase() !== 'FALSE' && activeRaw !== false);

          return {
            id: findVal(['id', 'ID', 'no', 'No']) || Math.random().toString(),
            season_id: String(findVal(['season_id', 'SEASON_ID']) || ''),
            objective: String(findVal(['objective', 'objectives', 'Objective', 'Objectives']) || '하나님과의 관계'),
            goal: String(findVal(['goal', 'Goal', 'GOAL']) || '공통 목표'),
            standard: String(findVal(['standard', 'Standard', 'STANDARD', '실천내용', '기준']) || ''),
            frequency: (String(findVal(['frequency', 'Frequency']) || 'daily').toLowerCase()) as any,
            target_count: Number(findVal(['target_count', 'Target_count', 'targetCount'])) || 1,
            target_days: String(findVal(['target_days', 'Target_days', 'targetDays', '요일']) || ''),
            is_active: isActive,
          };
        });

        setStandards(mappedStandards);
      } else {
        setStandards([]);
      }

      if (data && Array.isArray(data.logs)) {
        const mappedLogs: LogItem[] = data.logs.map((l: any) => ({
          log_id: String(l.log_id || ''),
          date: String(l.date || ''),
          standard_id: String(l.standard_id || ''),
          is_completed: l.is_completed === true || String(l.is_completed).toUpperCase() === 'TRUE',
          reason_if_failed: String(l.reason_if_failed || ''),
          season_id: String(l.season_id || '')
        }));
        setLogs(mappedLogs);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const handleUserChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserIdInput.trim()) return;
    const cleanUser = tempUserIdInput.trim();
    setUserId(cleanUser);
    try {
      localStorage.setItem('pogs_user_id', cleanUser);
    } catch {}
    setIsUserModalOpen(false);
    setTempUserIdInput('');
  };

  const currentSeason = seasons.find(s => String(s.season_id) === String(currentSeasonId)) || seasons[0];

  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

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
        user_id: userId,
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
          user_id: userId,
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
        user_id: userId,
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
          user_id: userId,
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

  const handleOpenAddForGoal = (goal: string, obj: string, defaultFreq: 'daily' | 'weekly' | 'monthly' | 'long_term' = 'daily') => {
    setNewGoal(goal === '공통 목표' ? '' : goal);
    setNewObjective(obj || '하나님과의 관계');
    setNewFrequency(filterFrequency === 'all' || filterFrequency === 'hidden' ? defaultFreq : filterFrequency);
    setIsAddModalOpen(true);
  };

  const handleAddNewStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStandard.trim()) return;

    setSyncing(true);
    const targetDaysString = newFrequency === 'daily' ? selectedDays.join(', ') : '';
    const tempId = Date.now().toString();
    const newItem: StandardItem = {
      user_id: userId,
      id: tempId,
      season_id: currentSeasonId,
      objective: newObjective,
      goal: newGoal || '공통 목표',
      standard: newStandard,
      frequency: newFrequency,
      target_days: targetDaysString,
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
          user_id: userId,
          season_id: currentSeasonId,
          objective: newObjective,
          goal: newGoal,
          standard: newStandard,
          frequency: newFrequency,
          target_days: targetDaysString
        })
      });
      fetchData();
    } catch (err) {
      console.error('항목 추가 실패:', err);
    } finally {
      setSyncing(false);
      setNewGoal('');
      setNewStandard('');
    }
  };

  const handleOpenEdit = (std: StandardItem) => {
    setEditingStandard(std);
    setEditStandardText(String(std.standard || ''));
    setEditGoalText(String(std.goal || ''));
    setEditObjective(String(std.objective || '하나님과의 관계'));
    setEditFrequency(std.frequency || 'daily');
    setEditIsActive(std.is_active === true || String(std.is_active).toUpperCase() === 'TRUE');
    const daysArr = std.target_days ? String(std.target_days).split(',').map(d => d.trim()).filter(Boolean) : [];
    setEditDays(daysArr);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStandard || !editStandardText.trim()) return;

    setSyncing(true);
    const targetDaysString = editFrequency === 'daily' ? editDays.join(', ') : '';
    
    setStandards(prev => prev.map(s => {
      if (s.id === editingStandard.id) {
        return {
          ...s,
          standard: editStandardText,
          goal: editGoalText || '공통 목표',
          objective: editObjective,
          frequency: editFrequency,
          target_days: targetDaysString,
          is_active: editIsActive
        };
      }
      return s;
    }));

    const stdId = editingStandard.id;
    setEditingStandard(null);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPDATE_STANDARD',
          user_id: userId,
          id: stdId,
          standard: editStandardText,
          goal: editGoalText,
          objective: editObjective,
          frequency: editFrequency,
          target_days: targetDaysString,
          is_active: editIsActive
        })
      });
      fetchData();
    } catch (err) {
      console.error('수정 저장 실패:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActiveState = async (stdId: string | number, nextActive: boolean) => {
    setSyncing(true);
    setStandards(prev => prev.map(s => s.id === stdId ? { ...s, is_active: nextActive } : s));
    if (editingStandard) setEditingStandard(null);

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPDATE_STANDARD',
          user_id: userId,
          id: stdId,
          is_active: nextActive
        })
      });
      fetchData();
    } catch (err) {
      console.error('상태 변경 실패:', err);
    } finally {
      setSyncing(false);
    }
  };

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
          user_id: userId,
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

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const toggleEditDaySelection = (day: string) => {
    if (editDays.includes(day)) {
      setEditDays(editDays.filter(d => d !== day));
    } else {
      setEditDays([...editDays, day]);
    }
  };

  const seasonStandards = standards.filter(s => !s.season_id || !currentSeasonId || String(s.season_id) === String(currentSeasonId));
  const hiddenCount = seasonStandards.filter(s => s.is_active === false || String(s.is_active).toUpperCase() === 'FALSE').length;

  const filteredStandards = seasonStandards.filter(s => {
    const isActive = s.is_active === true || String(s.is_active).toUpperCase() === 'TRUE';
    if (filterFrequency === 'hidden') return !isActive;
    if (!isActive) return false;
    if (filterFrequency === 'all') return true;
    return (s.frequency || 'daily') === filterFrequency;
  });

  const groupedByGoal = filteredStandards.reduce((acc, std) => {
    const goalKey = String(std.goal || '').trim() || '공통 목표';
    if (!acc[goalKey]) {
      acc[goalKey] = {
        objective: String(std.objective || ''),
        items: []
      };
    }
    acc[goalKey].items.push(std);
    return acc;
  }, {} as Record<string, { objective: string; items: StandardItem[] }>);

  const selectedDayName = getDayName(selectedDate);

  const { sunday, saturday } = getSundayToSaturdayWeekRange(new Date(selectedDate));
  const getWeeklyCompletedCount = (stdId: string | number) => {
    return logs.filter(l => {
      if (String(l.standard_id) !== String(stdId) || !l.is_completed) return false;
      const logDate = new Date(l.date);
      return logDate >= sunday && logDate <= saturday;
    }).length;
  };

  const objectives = ['하나님과의 관계', '자기 자신과의 관계', '공동체와의 관계', '세상과의 관계'];
  const activeStandards = seasonStandards.filter(s => s.is_active === true || String(s.is_active).toUpperCase() === 'TRUE');
  const analyticsData = objectives.map(obj => {
    const objStandards = activeStandards.filter(s => String(s.objective) === obj);
    const objStandardIds = objStandards.map(s => String(s.id));
    const completedLogsCount = logs.filter(l => objStandardIds.includes(String(l.standard_id)) && l.is_completed).length;
    return {
      objective: obj,
      standardCount: objStandards.length,
      totalCompleted: completedLogsCount
    };
  });

  const failureLogs = logs.filter(l => l.reason_if_failed && String(l.reason_if_failed).trim() !== '');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-sans">
      <header className="bg-white border-b border-slate-200 px-5 pt-5 pb-4 sticky top-0 z-10 shadow-xs">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              {seasons.length > 0 ? (
                <select 
                  value={currentSeasonId} 
                  onChange={(e) => setCurrentSeasonId(e.target.value)}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg focus:outline-none"
                >
                  {seasons.map(s => (
                    <option key={s.season_id} value={s.season_id}>{s.title}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">시즌 없음</span>
              )}
              
              <button 
                onClick={() => setIsNewSeasonModalOpen(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-0.5"
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
              
              <button
                onClick={() => {
                  setTempUserIdInput(userId);
                  setIsUserModalOpen(true);
                }}
                className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="사용자 변경"
              >
                <User className="w-3 h-3 text-indigo-600" />
                <span>{userId}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-3">
            <div className="flex justify-between items-center mb-0.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> PURPOSE (인생 목적)
              </div>
              {currentSeason && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatDateStr(currentSeason.start_date)} ~ {formatDateStr(currentSeason.end_date)}
                </span>
              )}
            </div>
            <h1 className="text-sm font-bold text-slate-900 leading-snug">
              {currentSeason?.purpose || '등록된 시즌 및 목적이 없습니다. [+ 새 시즌]을 시작해보세요.'}
            </h1>
          </div>

          {mainView === 'checklist' && (
            <div className="bg-indigo-50/70 border border-indigo-100 p-2 rounded-xl flex items-center justify-between mb-3">
              <button 
                onClick={() => handleShiftDate(-1)} 
                className="p-1 rounded-lg hover:bg-white text-indigo-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-indigo-950 bg-transparent border-0 focus:outline-none cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-600">({selectedDayName})</span>
                {selectedDate !== todayStr && (
                  <button 
                    onClick={() => setSelectedDate(todayStr)}
                    className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full hover:bg-indigo-700 ml-1"
                  >
                    오늘로
                  </button>
                )}
              </div>

              <button 
                onClick={() => handleShiftDate(1)} 
                className="p-1 rounded-lg hover:bg-white text-indigo-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMainView('checklist')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mainView === 'checklist' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ListTodo className="w-4 h-4" /> 실천 체크리스트
            </button>
            <button
              onClick={() => setMainView('analytics')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                mainView === 'analytics' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> 시즌 점검 & 회고
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-4">
        {mainView === 'checklist' ? (
          <>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-0.5 shrink-0 pr-1">
                <Filter className="w-3 h-3" /> 보기:
              </span>
              {[
                { key: 'all', label: '전체' },
                { key: 'daily', label: '일일' },
                { key: 'weekly', label: '주간' },
                { key: 'monthly', label: '월간' },
                { key: 'long_term', label: '장기' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterFrequency(f.key as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                    filterFrequency === f.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {hiddenCount > 0 && (
                <button
                  onClick={() => setFilterFrequency('hidden')}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                    filterFrequency === 'hidden'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <EyeOff className="w-3 h-3" /> 숨김 ({hiddenCount})
                </button>
              )}
            </div>

            {filterFrequency === 'hidden' && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mb-4 text-xs text-rose-800 flex items-center justify-between">
                <span>일시 중단된 항목들입니다.</span>
                <button
                  onClick={() => setFilterFrequency('all')}
                  className="font-bold underline text-rose-900 ml-2 shrink-0"
                >
                  전체 보기로 복귀
                </button>
              </div>
            )}

            <section className="space-y-4">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs font-medium">실천 데이터를 불러오는 중...</p>
                </div>
              ) : Object.keys(groupedByGoal).length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 border border-dashed rounded-2xl p-6 bg-white">
                  {filterFrequency === 'hidden' ? '숨겨진 실천 항목이 없습니다.' : `${userId} 님으로 등록된 실천 항목이 없습니다.`}<br />
                  {filterFrequency !== 'hidden' && "하단 '+' 버튼으로 첫 실천 기준을 추가해보세요."}
                </div>
              ) : (
                Object.entries(groupedByGoal).map(([goalTitle, groupData], gIdx) => {
                  const groupCompletedCount = groupData.items.filter(std => {
                    const log = logs.find(l => String(l.standard_id) === String(std.id) && String(l.date).startsWith(selectedDate));
                    return log?.is_completed;
                  }).length;

                  return (
                    <div key={gIdx} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                      <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {groupData.objective && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-1.5">
                              {groupData.objective}
                            </span>
                          )}
                          <div className="text-xs font-bold text-slate-900 mt-1 flex items-start gap-1 leading-snug">
                            <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{goalTitle}</span>
                          </div>
                        </div>

                        {filterFrequency !== 'hidden' && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenAddForGoal(goalTitle, groupData.objective)}
                              title="이 목표에 실천 기준 바로 추가"
                              className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> 추가
                            </button>
                            <div className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                              {groupCompletedCount}/{groupData.items.length}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="divide-y divide-slate-100">
                        {groupData.items.map((std, sIdx) => {
                          const freq = std.frequency || 'daily';
                          const config = FREQUENCY_MAP[freq] || FREQUENCY_MAP.daily;
                          const isItemActive = std.is_active === true || String(std.is_active).toUpperCase() === 'TRUE';
                          const accentColor = ITEM_ACCENT_COLORS[sIdx % ITEM_ACCENT_COLORS.length];
                          
                          const logOnDate = logs.find(
                            l => String(l.standard_id) === String(std.id) && String(l.date).startsWith(selectedDate)
                          );
                          const isCompletedOnDate = logOnDate?.is_completed || false;
                          const failReason = logOnDate?.reason_if_failed;
                          const weeklyCount = getWeeklyCompletedCount(std.id);
                          const isDayApplicable = !std.target_days || String(std.target_days).includes(selectedDayName);

                          return (
                            <div 
                              key={std.id}
                              className={`p-3.5 border-l-4 ${isItemActive ? accentColor : 'border-l-slate-200'} transition-colors ${
                                isCompletedOnDate ? 'bg-emerald-50/20' : 'hover:bg-slate-50/50'
                              } ${!isDayApplicable && freq === 'daily' && isItemActive ? 'opacity-65' : ''} ${
                                !isItemActive ? 'bg-slate-50/70' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                {isItemActive ? (
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
                                ) : (
                                  <div className="mt-0.5 text-slate-300 shrink-0">
                                    <EyeOff className="w-4 h-4" />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.badge}`}>
                                      {config.label}
                                    </span>
                                    {std.target_days && (
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                        isDayApplicable ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-400'
                                      }`}>
                                        {std.target_days}
                                      </span>
                                    )}
                                    {freq === 'weekly' && isItemActive && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        이번 주: {weeklyCount}회
                                      </span>
                                    )}
                                  </div>

                                  <p className={`text-sm font-semibold leading-snug ${
                                    isCompletedOnDate ? 'line-through text-slate-400' : 'text-slate-800'
                                  } ${!isItemActive ? 'text-slate-400' : ''}`}>
                                    {std.standard || '실천 내용 없음'}
                                  </p>

                                  {failReason && (
                                    <div className="mt-2 text-xs bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-100 flex items-start gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                      <span>{failReason}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {!isItemActive ? (
                                    <button
                                      onClick={() => handleToggleActiveState(std.id, true)}
                                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                      title="실천 리스트로 다시 복원"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" /> 복원
                                    </button>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => handleOpenEdit(std)}
                                        title="실천 내용 수정"
                                        className="text-slate-300 hover:text-indigo-600 p-1 transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>

                                      {!isCompletedOnDate && (
                                        <button 
                                          onClick={() => {
                                            setSelectedStandard(std);
                                            setReasonInput(failReason || '');
                                          }}
                                          title="미실천 피드백 작성"
                                          className="text-slate-300 hover:text-slate-600 p-1 transition-colors"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        ) : (
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

      {mainView === 'checklist' && (
        <button
          onClick={() => {
            setNewGoal('');
            setIsAddModalOpen(true);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-20"
          title="새 실천 항목 추가"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" /> 사용자 전환 / 닉네임 설정
            </h3>
            <p className="text-xs text-slate-500 mb-3">사용하실 닉네임(영문/한글)을 입력해 주세요.</p>

            <form onSubmit={handleUserChange} className="space-y-3 text-xs">
              <input 
                type="text"
                placeholder="예: Nathan, Joshua, 김목사"
                value={tempUserIdInput}
                onChange={(e) => setTempUserIdInput(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoFocus
              />

              <div className="flex gap-2 pt-1">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-2 font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  닫기
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                >
                  전환하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStandard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                <Edit2 className="w-4 h-4 text-indigo-600" /> 실천 기준 수정
              </h3>
              
              <button
                type="button"
                onClick={() => setEditIsActive(!editIsActive)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                  editIsActive 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {editIsActive ? <><EyeOff className="w-3 h-3" /> 항목 숨기기</> : <><RotateCcw className="w-3 h-3" /> 다시 활성화</>}
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">영역 (Objective)</label>
                <select 
                  value={editObjective} 
                  onChange={(e) => setEditObjective(e.target.value)}
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
                  value={editGoalText}
                  onChange={(e) => setEditGoalText(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">실천 기준 (Standard)</label>
                <input 
                  type="text"
                  value={editStandardText}
                  onChange={(e) => setEditStandardText(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">주기 (Frequency)</label>
                <select 
                  value={editFrequency} 
                  onChange={(e) => setEditFrequency(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="daily">일일 실천 (Daily)</option>
                  <option value="weekly">이번 주 과제 (Weekly)</option>
                  <option value="monthly">이번 달 과제 (Monthly)</option>
                  <option value="long_term">장기 과제 (Long-term)</option>
                </select>
              </div>

              {editFrequency === 'daily' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-slate-600 font-medium">실천 요일 선택</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditDays(['월', '화', '수', '목', '금'])}
                        className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded"
                      >
                        평일
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDays(['월', '화', '수', '목', '금', '토', '일'])}
                        className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded"
                      >
                        매일
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(d => {
                      const isSel = editDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleEditDaySelection(d)}
                          className={`py-2 rounded-lg font-bold text-xs transition-all ${
                            isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingStandard(null)}
                  className="flex-1 py-2.5 font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                >
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-3">새 실천 기준(S) 등록</h3>
            
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
                  placeholder="예: 말씀이 나의 길을 인도하도록"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">실천 기준 (Standard)</label>
                <input 
                  type="text"
                  placeholder="예: 매일 성경 1시간 연구"
                  value={newStandard}
                  onChange={(e) => setNewStandard(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">주기 (Frequency)</label>
                <select 
                  value={newFrequency} 
                  onChange={(e) => setNewFrequency(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="daily">일일 실천 (Daily)</option>
                  <option value="weekly">이번 주 과제 (Weekly)</option>
                  <option value="monthly">이번 달 과제 (Monthly)</option>
                  <option value="long_term">장기 과제 (Long-term)</option>
                </select>
              </div>

              {newFrequency === 'daily' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-slate-600 font-medium">실천 요일 선택</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDays(['월', '화', '수', '목', '금'])}
                        className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded"
                      >
                        평일
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDays(['월', '화', '수', '목', '금', '토', '일'])}
                        className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded"
                      >
                        매일
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(d => {
                      const isSel = selectedDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDaySelection(d)}
                          className={`py-2 rounded-lg font-bold text-xs transition-all ${
                            isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNewSeasonModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-1">새 시즌(기간) 시작하기</h3>
            <p className="text-xs text-slate-500 mb-3">{userId} 님의 새로운 중심 목적과 기간을 설정합니다.</p>

            <form onSubmit={handleCreateSeason} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">시즌 명칭</label>
                <input 
                  type="text"
                  placeholder="예: 2026 하반기"
                  value={newSeasonTitle}
                  onChange={(e) => setNewSeasonTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">핵심 목적 (Purpose)</label>
                <textarea 
                  rows={2}
                  placeholder="예: 하나님의 구속 사역에 동행하는 삶"
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

      {selectedStandard && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              미실천 피드백 ({formatDateStr(selectedDate)})
            </h3>
            <p className="text-xs text-slate-500 mb-3 truncate">
              {selectedStandard.standard}
            </p>
            <textarea 
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="해당 일자에 실천하지 못한 사유를 작성해주세요..."
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
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { 
  BarChart3, 
  Plus, 
  FileText, 
  CheckSquare,
  Globe,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Users,
  Download,
  Upload,
  Edit,
  History,
  ExternalLink,
  Save,
  X,
  MessageCircle,
  Info,
  Languages,
  Trash2
} from "lucide-react"

export default function Home() {
  // POI form state
  const [poiForm, setPoiForm] = useState({
    klookId: '',
    name: '',
    googlePlaceId: '',
    country: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvUploadStatus, setCsvUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [csvResults, setCsvResults] = useState<{
    totalRows: number;
    successCount: number;
    duplicateCount: number;
    errorCount: number;
    errors: string[];
  } | null>(null);

  // Translation Results filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  
  // Country filter search state
  const [countryFilterSearch, setCountryFilterSearch] = useState('');
  const [showCountryFilterSuggestions, setShowCountryFilterSuggestions] = useState(false);
  const countryFilterRef = useRef<HTMLDivElement>(null);
  const lastSavedDataRef = useRef<string>('');

  // Translation modal state
  const [selectedTranslation, setSelectedTranslation] = useState<{
    poi: any;
    language: string;
    translation: any;
    mode: 'view' | 'edit';
  } | null>(null);
  const [editedTranslationText, setEditedTranslationText] = useState('');
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);
  const [translationSources, setTranslationSources] = useState<{
    serp?: string;
    googleMaps?: string;
    perplexity?: string;
    openai?: string;
  }>({});
  const [sourceReasoning, setSourceReasoning] = useState<{
    serp?: string;
    googleMaps?: string;
    perplexity?: string;
    openai?: string;
  }>({});
  const [showReasoningModal, setShowReasoningModal] = useState<{
    source: string;
    reasoning: string;
    translation: string;
  } | null>(null);
  const [serpScreenshotModal, setSerpScreenshotModal] = useState<{
    source: string;
    url: string;
    htmlContent?: string;
  } | null>(null);
  const [isLoadingSerpScreenshot, setIsLoadingSerpScreenshot] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingManualCheckScreenshot, setIsLoadingManualCheckScreenshot] = useState(false);
  
  // Translation sources loading state
  const [sourcesLoadingProgress, setSourcesLoadingProgress] = useState<{
    serp: boolean;
    googleMaps: boolean; 
    perplexity: boolean;
    openai: boolean;
  }>({
    serp: false,
    googleMaps: false,
    perplexity: false,
    openai: false
  });

  // Translation progress tracking state
  const [translationProgress, setTranslationProgress] = useState<{
    [poiId: string]: {
      currentLanguage: string;
      completedLanguages: number;
      totalLanguages: number;
      percentage: number;
      isProcessing: boolean;
    }
  }>({});

  // Auto-refresh interval state
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Real-time progress logs
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  
  const addProgressLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setProgressLogs(prev => [logMessage, ...prev.slice(0, 49)]); // Keep last 50 logs
    console.log(`[PROGRESS] ${logMessage}`);
  };

  // Manual check task management state
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskSortBy, setTaskSortBy] = useState('time_desc'); // time_desc, time_asc, similarity_high, similarity_low, language
  const [taskLanguageFilter, setTaskLanguageFilter] = useState('all'); // all, JA-JP, KO-KR, etc.
  
  // Empty array - real data would come from actual API errors and conflicts
  const manualTasksRaw: any[] = [];

  const [manualTasksState, setManualTasksState] = useState(manualTasksRaw);

  // Computed manual tasks with sorting and filtering
  const manualTasks = React.useMemo(() => {
    let filtered = [...manualTasksState];
    
    // Apply language filter
    if (taskLanguageFilter !== 'all') {
      filtered = filtered.filter(task => task.affectedLanguage === taskLanguageFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (taskSortBy) {
        case 'time_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'time_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'similarity_high':
          if (a.similarity === null && b.similarity === null) return 0;
          if (a.similarity === null) return 1;
          if (b.similarity === null) return -1;
          return b.similarity - a.similarity;
        case 'similarity_low':
          if (a.similarity === null && b.similarity === null) return 0;
          if (a.similarity === null) return 1;
          if (b.similarity === null) return -1;
          return a.similarity - b.similarity;
        case 'language':
          const langA = a.affectedLanguage || 'ZZZ';
          const langB = b.affectedLanguage || 'ZZZ';
          return langA.localeCompare(langB);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [manualTasksState, taskSortBy, taskLanguageFilter]);

  // Update raw data when tasks are modified
  const updateTaskStatus = (taskId: number, newStatus: string) => {
    const updatedTasks = manualTasksState.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setManualTasksState(updatedTasks);
    
    // Move to next task if current task is completed
    if (newStatus === 'completed' && currentTaskIndex < manualTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  // Editing history state
  const [editingHistory, setEditingHistory] = useState([
    {
      id: 1,
      timestamp: '2024-01-15T14:25:30Z',
      user: 'admin@klook.com',
      action: 'Manual Translation Update',
      poi: 'Sagrada Família',
      klookId: '50062025',
      changes: {
        language: 'JA-JP',
        before: 'サグラダファミリア',
        after: 'サグラダ・ファミリア',
        reason: 'Selected OpenAI translation as most accurate'
      }
    },
    {
      id: 2,
      timestamp: '2024-01-15T13:45:12Z',
      user: 'editor@klook.com',
      action: 'Duplicate Resolution',
      poi: 'Park Güell',
      klookId: '50062026',
      changes: {
        action: 'merged',
        originalId: '50062015',
        newId: '50062026',
        reason: 'Combined duplicate entries with better Google Place ID'
      }
    }
  ]);

  // Translation results state - starts empty, populated when POIs are added or loaded from localStorage
  const [translationResults, setTranslationResults] = useState<any[]>([]);

  // Country suggestions
  const countries = [
    { code: 'TW', name: 'Taiwan', fullName: '台灣 (Taiwan)' },
    { code: 'JP', name: 'Japan', fullName: '日本 (Japan)' },
    { code: 'KR', name: 'Korea', fullName: '韓國 (Korea)' },
    { code: 'CN', name: 'China', fullName: '中國 (China)' },
    { code: 'TH', name: 'Thailand', fullName: '泰國 (Thailand)' },
    { code: 'SG', name: 'Singapore', fullName: '新加坡 (Singapore)' },
    { code: 'MY', name: 'Malaysia', fullName: '馬來西亞 (Malaysia)' },
    { code: 'PH', name: 'Philippines', fullName: '菲律賓 (Philippines)' },
    { code: 'VN', name: 'Vietnam', fullName: '越南 (Vietnam)' },
    { code: 'ID', name: 'Indonesia', fullName: '印尼 (Indonesia)' },
    { code: 'HK', name: 'Hong Kong', fullName: '香港 (Hong Kong)' },
    { code: 'MO', name: 'Macau', fullName: '澳門 (Macau)' },
    { code: 'US', name: 'United States', fullName: '美國 (United States)' },
    { code: 'ES', name: 'Spain', fullName: '西班牙 (Spain)' }
  ];

  const [countrySearch, setCountrySearch] = useState('');
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  
  const filteredCountries = useMemo(() => countries.filter(country => 
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.fullName.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  ), [countrySearch]);

  const filteredCountriesForFilter = useMemo(() => countries.filter(country => 
    country.name.toLowerCase().includes(countryFilterSearch.toLowerCase()) ||
    country.fullName.toLowerCase().includes(countryFilterSearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countryFilterSearch.toLowerCase())
  ), [countryFilterSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setShowCountrySuggestions(false);
      }
      if (countryFilterRef.current && !countryFilterRef.current.contains(event.target as Node)) {
        setShowCountryFilterSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // localStorage helper functions
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`[DEBUG] Saved ${key} to localStorage:`, data);
      }
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  };

  const loadFromLocalStorage = (key: string) => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log(`[DEBUG] Loaded ${key} from localStorage:`, parsed);
          return parsed;
        }
      }
    } catch (error) {
      console.error(`Failed to load ${key} from localStorage:`, error);
    }
    return null;
  };

  const clearAllData = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('poi-translation-results');
        console.log(`[DEBUG] Cleared all POI data from localStorage`);
        setTranslationResults([]);
        setTranslationProgress({});
      }
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTranslationResults = loadFromLocalStorage('poi-translation-results');
    if (savedTranslationResults && Array.isArray(savedTranslationResults)) {
      console.log(`[DEBUG] Restoring ${savedTranslationResults.length} POIs from localStorage`);
      setTranslationResults(savedTranslationResults);
    }
  }, []);

  // Save translationResults to localStorage whenever it changes (with deduplication)
  useEffect(() => {
    if (translationResults.length > 0) {
      // Avoid unnecessary saves by comparing with last saved data
      const currentDataString = JSON.stringify(translationResults);
      
      if (currentDataString !== lastSavedDataRef.current) {
        saveToLocalStorage('poi-translation-results', translationResults);
        lastSavedDataRef.current = currentDataString;
      }
    }
  }, [translationResults]);

  // Auto-refresh mechanism for processing POIs
  useEffect(() => {
    const hasProcessingPOIs = translationResults.some(poi => poi.status === 'processing');
    
    if (hasProcessingPOIs && !refreshInterval) {
      // Start auto-refresh every 2 seconds when there are processing POIs
      const interval = setInterval(() => {
        // Force re-render to update progress display by updating timestamp
        setTranslationResults(prev => prev.map(poi => ({ ...poi, lastUpdated: Date.now() })));
      }, 2000);
      
      setRefreshInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else if (!hasProcessingPOIs && refreshInterval) {
      // Stop auto-refresh when no processing POIs
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [translationResults]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Handle form input changes
  const handleInputChange = useCallback((field: string, value: string) => {
    setPoiForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle country selection
  const handleCountrySelect = useCallback((country: typeof countries[0]) => {
    setCountrySearch(country.fullName);
    setPoiForm(prev => ({ ...prev, country: country.code }));
    setShowCountrySuggestions(false);
  }, []);

  // Handle country filter selection
  const handleCountryFilterSelect = useCallback((country: typeof countries[0]) => {
    setCountryFilterSearch(country.fullName);
    setCountryFilter(country.code);
    setShowCountryFilterSuggestions(false);
  }, []);

  // Handle country filter search input
  const handleCountryFilterSearchInput = useCallback((value: string) => {
    setCountryFilterSearch(value);
    if (value === '') {
      setCountryFilter('all');
    }
    setShowCountryFilterSuggestions(true);
  }, []);

  // Stabilized handlers for form changes
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleLanguageFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguageFilter(e.target.value);
  }, []);

  const handleExportFormatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setExportFormat(e.target.value);
  }, []);

  const handleEditedTranslationTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTranslationText(e.target.value);
  }, []);

  const handleCountrySearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCountrySearch(e.target.value);
    setShowCountrySuggestions(true);
  }, []);

  const handleTaskSortByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTaskSortBy(e.target.value);
    setCurrentTaskIndex(0); // Reset to first task when sorting changes
  }, []);

  const handleTaskLanguageFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTaskLanguageFilter(e.target.value);
    setCurrentTaskIndex(0); // Reset to first task when filter changes
  }, []);

  // Calculate real language progress statistics
  const languageProgressData = useMemo(() => {
    const languages = [
      { code: 'ZH-CN', name: 'Chinese Simplified (ZH-CN)', color: 'bg-red-500' },
      { code: 'ZH-TW', name: 'Chinese Traditional (ZH-TW)', color: 'bg-red-400' },
      { code: 'JA-JP', name: 'Japanese (JA-JP)', color: 'bg-purple-500' },
      { code: 'KO-KR', name: 'Korean (KO-KR)', color: 'bg-green-500' },
      { code: 'TH-TH', name: 'Thai (TH-TH)', color: 'bg-orange-500' },
      { code: 'VI-VN', name: 'Vietnamese (VI-VN)', color: 'bg-pink-500' },
      { code: 'ID-ID', name: 'Indonesian (ID-ID)', color: 'bg-yellow-500' },
      { code: 'MS-MY', name: 'Malay (MS-MY)', color: 'bg-rose-500' },
      { code: 'EN-US', name: 'English US (EN-US)', color: 'bg-emerald-500' },
      { code: 'EN-GB', name: 'English UK (EN-GB)', color: 'bg-emerald-400' },
      { code: 'FR-FR', name: 'French (FR-FR)', color: 'bg-indigo-500' },
      { code: 'DE-DE', name: 'German (DE-DE)', color: 'bg-gray-500' },
      { code: 'IT-IT', name: 'Italian (IT-IT)', color: 'bg-teal-500' },
      { code: 'PT-BR', name: 'Portuguese (PT-BR)', color: 'bg-cyan-500' }
    ];

    const totalPOIs = translationResults.length;
    
    return languages.map(lang => {
      let completedCount = 0;
      
      translationResults.forEach(poi => {
        const translation = poi.translations[lang.code];
        if (translation && 
            (typeof translation === 'string' || 
             (typeof translation === 'object' && translation.status === 'completed' && translation.text))) {
          completedCount++;
        }
      });
      
      const progress = totalPOIs > 0 ? Math.round((completedCount / totalPOIs) * 100) : 0;
      
      return {
        lang: lang.name,
        progress,
        color: lang.color,
        count: `${completedCount}/${totalPOIs}`
      };
    });
  }, [translationResults]);

  // Memoized filtered translation results for display
  const filteredTranslationResults = useMemo(() => {
    return translationResults.filter(poi => {
      // Apply status filter
      if (statusFilter !== 'all' && poi.status !== statusFilter) return false;
      // Apply country filter
      if (countryFilter !== 'all' && poi.country !== countryFilter) return false;
      // Apply language filter (check if language has translation)
      if (languageFilter !== 'all') {
        const translation = poi.translations[languageFilter as keyof typeof poi.translations];
        const hasTranslation = typeof translation === 'object' 
          ? translation.text 
          : translation;
        if (!hasTranslation) return false;
      }
      return true;
    });
  }, [translationResults, statusFilter, countryFilter, languageFilter]);

  // Memoized language progress grid (2 columns)
  const languageProgressGrid = useMemo(() => {
    return languageProgressData.reduce((rows, item, index) => {
      const rowIndex = Math.floor(index / 2);
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex].push(item);
      return rows;
    }, [] as any[]);
  }, [languageProgressData]);

  // Memoized unique affected languages count
  const affectedLanguagesCount = useMemo(() => {
    return new Set(manualTasks.filter(t => t.affectedLanguage).map(t => t.affectedLanguage)).size;
  }, [manualTasks]);

  // Handle POI submission
  const handleSubmitPOI = async () => {
    if (!poiForm.klookId || !poiForm.name || !poiForm.googlePlaceId || !poiForm.country) {
      alert('請填寫所有必填欄位');
      return;
    }

    // Check for duplicate Klook ID
    const existingPOI = translationResults.find(poi => poi.klookId === poiForm.klookId);
    if (existingPOI) {
      alert(`POI with Klook ID "${poiForm.klookId}" already exists!`);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      // Here you would normally send to your API
      console.log('Submitting POI:', poiForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create new POI object with initial translation structure
      const newPOI = {
        id: Math.max(...translationResults.map(p => p.id), 0) + 1,
        klookId: poiForm.klookId,
        name: poiForm.name,
        country: poiForm.country,
        status: 'processing' as const,
        googlePlaceId: poiForm.googlePlaceId,
        translations: {
          'JA-JP': { text: null, status: 'processing' as const, progress: 0 },
          'KO-KR': { text: null, status: 'processing' as const, progress: 0 },
          'TH-TH': { text: null, status: 'processing' as const, progress: 0 },
          'VI-VN': { text: null, status: 'processing' as const, progress: 0 },
          'ID-ID': { text: null, status: 'processing' as const, progress: 0 },
          'MS-MY': { text: null, status: 'processing' as const, progress: 0 },
          'EN-US': { text: null, status: 'processing' as const, progress: 0 },
          'EN-GB': { text: null, status: 'processing' as const, progress: 0 },
          'FR-FR': { text: null, status: 'processing' as const, progress: 0 },
          'DE-DE': { text: null, status: 'processing' as const, progress: 0 },
          'IT-IT': { text: null, status: 'processing' as const, progress: 0 },
          'PT-BR': { text: null, status: 'processing' as const, progress: 0 }
        },
        createdAt: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      // Add new POI to translation results
      setTranslationResults(prevResults => [newPOI, ...prevResults]);
      
      setSubmitStatus('success');
      
      // Reset form after a delay
      setTimeout(() => {
        setPoiForm({ klookId: '', name: '', googlePlaceId: '', country: '' });
        setCountrySearch('');
        setSubmitStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting POI:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate and download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = [
      'klook_id,poi_name,google_place_id,country_code',
      '50062001,Sample POI Name,ChIJN1t_tDeuEmsRUsoyG83frY4,TW',
      '50062002,Another Sample POI,ChIJrTLr-GyuEmsRBfy61i59si0,JP',
      '50062003,Third Example POI,ChIJ2eUgeAK6j4ARbn5u_wAGqWA,KR',
      '// country_code should be 2-letter ISO code (e.g. TW=Taiwan JP=Japan KR=Korea)',
      '// Common codes: TW JP KR CN TH SG MY PH VN ID HK MO US ES FR DE IT'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'poi_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file selection and auto-upload
  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('請選擇 CSV 檔案');
        return;
      }
      setCsvFile(file);
      setCsvResults(null);
      setCsvUploadStatus('idle');
      
      // Auto-start upload immediately after file selection
      await handleCsvUploadWithFile(file);
    }
  };

  // Handle CSV upload with specific file (separated for auto-upload)
  const handleCsvUploadWithFile = async (file: File) => {
    setIsUploadingCsv(true);
    setCsvUploadStatus('idle');
    setUploadProgress(0);
    
    try {
      setUploadProgress(10);
      
      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      setUploadProgress(20);

      // Parse CSV
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['klook_id', 'poi_name', 'google_place_id', 'country_code'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`缺少必要欄位: ${missingHeaders.join(', ')}`);
      }

      setUploadProgress(30);

      // Process rows
      const rows = lines.slice(1).filter(line => line.trim());
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // First, create all POIs with pending status
      const newPOIs: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const values = rows[i].split(',').map(v => v.trim());
          const rowData: any = {};
          
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Create translation results for this POI with all languages pending initially
          const newTranslationResult = {
            id: Date.now() + i,
            klookId: rowData.klook_id,
            name: rowData.poi_name,
            country: rowData.country_code,
            status: 'pending' as const,
            googlePlaceId: rowData.google_place_id,
            translations: {
              'ZH-CN': { text: null, status: 'pending' as const, progress: 0 },
              'ZH-TW': { text: null, status: 'pending' as const, progress: 0 },
              'JA-JP': { text: null, status: 'pending' as const, progress: 0 },
              'KO-KR': { text: null, status: 'pending' as const, progress: 0 },
              'TH-TH': { text: null, status: 'pending' as const, progress: 0 },
              'VI-VN': { text: null, status: 'pending' as const, progress: 0 },
              'ID-ID': { text: null, status: 'pending' as const, progress: 0 },
              'MS-MY': { text: null, status: 'pending' as const, progress: 0 },
              'EN-US': { text: null, status: 'pending' as const, progress: 0 },
              'EN-GB': { text: null, status: 'pending' as const, progress: 0 },
              'FR-FR': { text: null, status: 'pending' as const, progress: 0 },
              'DE-DE': { text: null, status: 'pending' as const, progress: 0 },
              'IT-IT': { text: null, status: 'pending' as const, progress: 0 },
              'PT-BR': { text: null, status: 'pending' as const, progress: 0 }
            },
            createdAt: new Date().toISOString().split('T')[0],
            lastUpdated: new Date().toISOString().split('T')[0]
          };

          newPOIs.push(newTranslationResult);
          successCount++;
          
        } catch (error) {
          errorCount++;
          errors.push(`第 ${i + 2} 行: ${error instanceof Error ? error.message : '處理失敗'}`);
        }
        
        // Update progress for initial parsing
        const progress = 30 + (i / rows.length) * 20;
        setUploadProgress(Math.floor(progress));
      }

      // Add all POIs to translation results first
      if (newPOIs.length > 0) {
        setTranslationResults(prev => [...newPOIs, ...prev]);
      }

      setUploadProgress(100);
      setCsvUploadStatus('success');
      setCsvResults({
        totalRows: rows.length,
        successCount,
        duplicateCount,
        errorCount,
        errors
      });

      // Start background translation process for all new POIs (non-blocking)
      if (newPOIs.length > 0) {
        console.log(`[DEBUG] Scheduling translation process for ${newPOIs.length} POIs in 1 second`);
        setTimeout(() => {
          console.log(`[DEBUG] Starting translation process now!`);
          processTranslationsSequentially(newPOIs);
        }, 1000); // Small delay to allow UI to update first
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      setCsvUploadStatus('error');
      setCsvResults({
        totalRows: 0,
        successCount: 0,
        duplicateCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : '上傳失敗']
      });
    } finally {
      setTimeout(() => {
        setIsUploadingCsv(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  // Process translations sequentially for better user experience
  const processTranslationsSequentially = async (pois: any[]) => {
    const languages = ['ZH-CN', 'ZH-TW', 'JA-JP', 'KO-KR', 'TH-TH', 'VI-VN', 'ID-ID', 'MS-MY', 'EN-US', 'EN-GB', 'FR-FR', 'DE-DE', 'IT-IT', 'PT-BR'];
    
    console.log(`[DEBUG] processTranslationsSequentially called with ${pois.length} POIs`);
    addProgressLog(`🚀 開始處理 ${pois.length} 個 POI 的翻譯`);
    
    for (let poiIndex = 0; poiIndex < pois.length; poiIndex++) {
      const poi = pois[poiIndex];
      console.log(`[DEBUG] Starting translation for POI ${poiIndex + 1}/${pois.length}: ${poi.name} (ID: ${poi.id})`);
      addProgressLog(`📍 處理 POI ${poiIndex + 1}/${pois.length}: ${poi.name}`);
      
      // Initialize progress tracking for this POI
      console.log(`[DEBUG] Initializing progress for POI ID: ${poi.id.toString()}`);
      setTranslationProgress(prev => {
        const updated = {
          ...prev,
          [poi.id.toString()]: {
            currentLanguage: languages[0],
            completedLanguages: 0,
            totalLanguages: languages.length,
            percentage: 0,
            isProcessing: true
          }
        };
        console.log(`[DEBUG] Progress state updated for POI ID:`, poi.id.toString());
        return updated;
      });
      
      // Update POI status to processing when we start working on it
      setTranslationResults(prev => 
        prev.map(result => 
          result.id === poi.id 
            ? { ...result, status: 'processing' as const }
            : result
        )
      );
      
      for (let langIndex = 0; langIndex < languages.length; langIndex++) {
        const language = languages[langIndex];
        console.log(`[DEBUG] Processing language ${langIndex + 1}/${languages.length}: ${language} for ${poi.name}`);
        addProgressLog(`🌐 翻譯 ${language} (${langIndex + 1}/${languages.length})`);
        
        // Update progress - current language being processed
        const progressPercentage = Math.round(((langIndex + 1) / languages.length) * 100);
        console.log(`[DEBUG] Starting language ${langIndex + 1}/${languages.length}: ${language} for ${poi.name} (${progressPercentage}%)`);
        
        setTranslationProgress(prev => {
          const updated = {
            ...prev,
            [poi.id.toString()]: {
              currentLanguage: language,
              completedLanguages: langIndex,
              totalLanguages: languages.length,
              percentage: progressPercentage,
              isProcessing: true
            }
          };
          console.log(`[DEBUG] Progress updated for ${poi.name}, POI ID:`, poi.id.toString());
          return updated;
        });
        
        // Update current translation to processing
        setTranslationResults(prev => 
          prev.map(result => 
            result.id === poi.id 
              ? {
                  ...result,
                  translations: {
                    ...result.translations,
                    [language]: { text: null, status: 'processing' as const, progress: 0 }
                  }
                }
              : result
          )
        );
        
        try {
          console.log(`[DEBUG] Starting API call for ${poi.name} - ${language}`);
          
          // Force UI update before API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Create timeout promise for API call
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), 5000)
          );
          
          // Create fetch promise
          const fetchPromise = fetch(`/api/translation-sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              poiName: poi.name, 
              googlePlaceId: poi.googlePlaceId, 
              language: language 
            })
          });
          
          // Race between timeout and fetch
          const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
          
          let translationText = `${poi.name} (${language} - Error)`;
          let translationStatus: 'completed' | 'manual_review' = 'completed';
          let translationSources: { [key: string]: string } = {};
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[DEBUG] API response for ${language}:`, data.translations);
            
            // Store all API sources for reasoning modal
            translationSources = {
              serp: data.translations?.serp || '',
              googleMaps: data.translations?.googleMaps || '',
              perplexity: data.translations?.perplexity || '',
              openai: data.translations?.openai || ''
            };
            
            console.log(`[DEBUG] ================== BEFORE CONSISTENCY CHECK ==================`);
            console.log(`[DEBUG] POI: ${poi.name}, Language: ${language}`);
            console.log(`[DEBUG] Raw translation sources:`, translationSources);
            console.log(`[DEBUG] About to call checkTranslationConsistency...`);
            
            // Check translation consistency
            const consistencyResult = checkTranslationConsistency(translationSources);
            
            console.log(`[DEBUG] ================== AFTER CONSISTENCY CHECK ==================`);
            console.log(`[DEBUG] Consistency result:`, consistencyResult);
            translationText = consistencyResult.bestTranslation || translationText;
            
            if (consistencyResult.needsManualReview) {
              translationStatus = 'manual_review';
              console.log(`[DEBUG] ${language} needs manual review: ${consistencyResult.reason}`);
              addProgressLog(`⚠️ ${language} 需要人工檢查: 翻譯結果不一致`);
            } else {
              console.log(`[DEBUG] ${language} translations are consistent: ${consistencyResult.reason}`);
              addProgressLog(`✅ ${language} 翻譯完成: ${translationText}`);
            }
          } else {
            console.error(`[DEBUG] Translation API error for ${poi.name} (${language}):`, response.status);
          }
          
          // Complete the translation with real result and consistency status
          setTranslationResults(prev => 
            prev.map(result => 
              result.id === poi.id 
                ? {
                    ...result,
                    translations: {
                      ...result.translations,
                      [language]: { 
                        text: translationText, 
                        status: translationStatus,
                        sources: translationSources
                      }
                    }
                  }
                : result
            )
          );
          
          // Update progress - language completed
          const completedCount = langIndex + 1;
          const completedPercentage = Math.round((completedCount / languages.length) * 100);
          const stillProcessing = completedCount < languages.length;
          
          console.log(`[DEBUG] Language ${language} completed (${completedCount}/${languages.length}, ${completedPercentage}%). Still processing: ${stillProcessing}`);
          
          setTranslationProgress(prev => {
            const updated = {
              ...prev,
              [poi.id.toString()]: {
                currentLanguage: stillProcessing ? (languages[completedCount] || language) : language,
                completedLanguages: completedCount,
                totalLanguages: languages.length,
                percentage: completedPercentage,
                isProcessing: stillProcessing
              }
            };
            console.log(`[DEBUG] Final progress update for ${language}, POI ID:`, poi.id.toString());
            return updated;
          });
        } catch (error) {
          console.error(`[DEBUG] Translation error for ${poi.name} (${language}):`, error);
          addProgressLog(`❌ ${language} 翻譯失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Use fallback translation on error
          const fallbackTranslation = `${poi.name} (${language} - Error)`;
          setTranslationResults(prev => 
            prev.map(result => 
              result.id === poi.id 
                ? {
                    ...result,
                    translations: {
                      ...result.translations,
                      [language]: { text: fallbackTranslation, status: 'completed' as const }
                    }
                  }
                : result
            )
          );
          
          // Update progress - language completed (even with error)
          const completedCount = langIndex + 1;
          const completedPercentage = Math.round((completedCount / languages.length) * 100);
          const stillProcessing = completedCount < languages.length;
          
          console.log(`[DEBUG] Error handled for ${language}. Progress: ${completedCount}/${languages.length} (${completedPercentage}%)`);
          
          setTranslationProgress(prev => {
            const updated = {
              ...prev,
              [poi.id.toString()]: {
                ...prev[poi.id.toString()],
                completedLanguages: completedCount,
                percentage: completedPercentage,
                isProcessing: stillProcessing
              }
            };
            console.log(`[DEBUG] Error progress update for POI ID:`, poi.id.toString());
            return updated;
          });
        }
        
        // Small delay between translations
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Determine final POI status - use a timeout to ensure all state updates are complete
      setTimeout(() => {
        setTranslationResults(prev => 
          prev.map(result => {
            if (result.id === poi.id) {
              // Check if any translation needs manual review
              let hasManualReviewNeeded = false;
              Object.values(result.translations).forEach((translation: any) => {
                if (translation && typeof translation === 'object' && translation.status === 'manual_review') {
                  hasManualReviewNeeded = true;
                }
              });
              
              const finalStatus = hasManualReviewNeeded ? 'manual_review' : 'completed';
              const statusMessage = hasManualReviewNeeded 
                ? `⚠️ ${poi.name} 需要人工檢查 - 部分翻譯不一致`
                : `🎉 ${poi.name} 所有語言翻譯完成！`;
              
              addProgressLog(statusMessage);
              
              return { ...result, status: finalStatus as const };
            }
            return result;
          })
        );
      }, 100);
    }
  };

  // Parse and validate CSV content
  const parseCsvContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('//'));
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Validate headers
    const requiredHeaders = ['klook_id', 'poi_name', 'google_place_id', 'country_code'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`缺少必要欄位: ${missingHeaders.join(', ')}`);
    }

    // Valid country codes
    const validCountryCodes = ['TW', 'JP', 'KR', 'CN', 'TH', 'SG', 'MY', 'PH', 'VN', 'ID', 'HK', 'MO', 'US', 'ES', 'FR', 'DE', 'IT', 'PT', 'GB', 'AU', 'NZ', 'CA'];

    const data = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Validate row data
      if (!row.klook_id || !row.poi_name || !row.google_place_id || !row.country_code) {
        errors.push(`第 ${i + 1} 行: 缺少必要資料`);
        continue;
      }
      
      // Validate country code format
      if (!validCountryCodes.includes(row.country_code.toUpperCase())) {
        errors.push(`第 ${i + 1} 行: 無效的國家代碼 "${row.country_code}" (需使用2字母ISO代碼，如: TW, JP, KR)`);
        continue;
      }
      
      // Normalize country code to uppercase
      row.country_code = row.country_code.toUpperCase();
      
      data.push(row);
    }
    
    return { data, errors };
  };

  // Simulate duplicate detection
  const detectDuplicates = (data: any[]) => {
    const existingIds = ['50062020', '50062021', '50062022']; // Mock existing IDs
    const existingPlaceIds = ['ChIJN1t_tDeuEmsRUsoyG83frY4']; // Mock existing Place IDs
    
    const duplicates = data.filter(row => 
      existingIds.includes(row.klook_id) || 
      existingPlaceIds.includes(row.google_place_id)
    );
    
    return duplicates;
  };

  // Function to fetch translation sources from API
  const fetchTranslationSources = async (poi: any, language: string) => {
    try {
      console.log(`[DEBUG] Fetching translation sources for ${poi.name} in ${language}`);
      
      const response = await fetch('/api/translation-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          poiName: poi.name, 
          googlePlaceId: poi.googlePlaceId || poi.google_place_id,
          language: language 
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[DEBUG] Translation sources response:`, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching translation sources:', error);
      
      // Fallback data if API fails
      const currentText = poi.translations?.[language]?.text || poi.name;
      return {
        translations: {
          serp: `${currentText} (SERP - Error)`,
          googleMaps: `${currentText} (Google Maps - Error)`,
          perplexity: `${currentText} (Perplexity - Error)`,
          openai: `${currentText} (OpenAI - Error)`
        },
        reasoning: {
          serp: `**Error Loading SERP Data**\n\nUnable to fetch SERP analysis for "${poi.name}". Please try again later.`,
          googleMaps: `**Error Loading Google Maps Data**\n\nUnable to fetch Google Maps data for "${poi.name}". Please try again later.`,
          perplexity: `**Error Loading Perplexity Data**\n\nUnable to fetch Perplexity AI analysis for "${poi.name}". Please try again later.`,
          openai: `**Error Loading OpenAI Data**\n\nUnable to fetch OpenAI analysis for "${poi.name}". Please try again later.`
        }
      };
    }
  };

  // Handle opening translation modal - fetch individual translation sources
  const handleOpenTranslationModal = useCallback(async (poi: any, language: string, translation: any, mode: 'view' | 'edit') => {
    const currentText = (translation && typeof translation === 'object') ? translation.text : translation;
    
    // Batch all state updates together to prevent loops
    const baseTranslation = currentText || poi.name;
    
    // Set initial state with loading indicators
    setSelectedTranslation({ poi, language, translation, mode });
    setEditedTranslationText(currentText || '');
    
    // Show loading state for all sources
    setSourcesLoadingProgress({
      serp: true,
      googleMaps: true,
      perplexity: true,
      openai: true
    });
    
    // Set initial translations to base translation while loading
    setTranslationSources({
      serp: baseTranslation,
      googleMaps: baseTranslation,
      perplexity: baseTranslation,
      openai: baseTranslation
    });
    
    // Set initial loading reasoning
    setSourceReasoning({
      serp: '**Loading SERP Analysis...**\n\nFetching real-time search results and frequency analysis...',
      googleMaps: '**Loading Google Maps Data...**\n\nRetrieving Google Maps context and visual references...',
      perplexity: '**Loading Perplexity AI Analysis...**\n\nProcessing AI-powered translation analysis...',
      openai: '**Loading OpenAI Translation...**\n\nGenerating GPT-powered translation insights...'
    });
    
    // Fetch actual translation sources asynchronously
    try {
      const sourcesData = await fetchTranslationSources(poi, language);
      
      // Update with real translation data
      if (sourcesData.translations) {
        setTranslationSources({
          serp: sourcesData.translations.serp || baseTranslation,
          googleMaps: sourcesData.translations.googleMaps || baseTranslation,
          perplexity: sourcesData.translations.perplexity || baseTranslation,
          openai: sourcesData.translations.openai || baseTranslation
        });
      }
      
      // Update with real reasoning data
      if (sourcesData.reasoning) {
        setSourceReasoning({
          serp: sourcesData.reasoning.serp || `**SERP Analysis Complete**\n\nAnalysis completed for "${poi.name}" → ${language}`,
          googleMaps: sourcesData.reasoning.googleMaps || `**Google Maps Data Complete**\n\nContext retrieved for "${poi.name}" → ${language}`,
          perplexity: sourcesData.reasoning.perplexity || `**Perplexity AI Analysis Complete**\n\nAI analysis completed for "${poi.name}" → ${language}`,
          openai: sourcesData.reasoning.openai || `**OpenAI Translation Complete**\n\nGPT analysis completed for "${poi.name}" → ${language}`
        });
      }
      
    } catch (error) {
      console.error('Error loading translation sources:', error);
      // Keep the base translations and show error in reasoning - already handled by fetchTranslationSources
    } finally {
      // Clear loading states
      setSourcesLoadingProgress({
        serp: false,
        googleMaps: false,
        perplexity: false,
        openai: false
      });
    }
  }, []);

  // Memoized reasoning click handler to prevent infinite loops
  const handleReasoningClick = useCallback((source: string, reasoning: string, translation: string) => {
    if (isUpdating) return; // Prevent updates during active update cycle
    
    setIsUpdating(true);
    setShowReasoningModal({ source, reasoning, translation });
    
    // Reset update flag after a short delay
    setTimeout(() => setIsUpdating(false), 100);
  }, [isUpdating]);

  // Translation consistency checker - now only compares SERP and Perplexity
  const checkTranslationConsistency = useMemo(() => {
    return (translations: { [key: string]: string }): { needsManualReview: boolean; bestTranslation: string; reason?: string } => {
      console.log(`[DEBUG] === NEW 2-SOURCE CONSISTENCY CHECK (SERP vs PERPLEXITY) ===`);
      
      // Extract SERP and Perplexity translations
      const serpTranslation = translations.serp?.trim() || '';
      const perplexityTranslation = translations.perplexity?.trim() || '';
      
      console.log(`[DEBUG] Primary sources comparison:`);
      console.log(`[DEBUG] - SERP: "${serpTranslation}"`);
      console.log(`[DEBUG] - Perplexity: "${perplexityTranslation}"`);
      
      // Check if either translation is invalid
      const serpValid = serpTranslation && 
                       !serpTranslation.includes('Error') && 
                       !serpTranslation.includes('Translation failed') && 
                       !serpTranslation.includes('failed');
      
      const perplexityValid = perplexityTranslation && 
                             !perplexityTranslation.includes('Error') && 
                             !perplexityTranslation.includes('Translation failed') && 
                             !perplexityTranslation.includes('failed');
      
      console.log(`[DEBUG] - SERP valid: ${serpValid}`);
      console.log(`[DEBUG] - Perplexity valid: ${perplexityValid}`);
      
      // If either source is invalid, flag for manual review
      if (!serpValid || !perplexityValid) {
        console.log(`[DEBUG] 🚨 FLAGGED FOR MANUAL REVIEW - Invalid primary sources`);
        
        // Use the best available translation as fallback
        let bestTranslation = '';
        if (serpValid) bestTranslation = serpTranslation;
        else if (perplexityValid) bestTranslation = perplexityTranslation;
        else if (translations.openai?.trim()) bestTranslation = translations.openai.trim();
        else if (translations.googleMaps?.trim()) bestTranslation = translations.googleMaps.trim();
        else bestTranslation = 'Translation Error';
        
        return {
          needsManualReview: true,
          bestTranslation,
          reason: `Primary sources unavailable - SERP: ${serpValid ? 'valid' : 'invalid'}, Perplexity: ${perplexityValid ? 'valid' : 'invalid'}`
        };
      }
      
      // Compare SERP and Perplexity for consistency
      const isConsistent = serpTranslation === perplexityTranslation;
      
      console.log(`[DEBUG] Consistency check: ${isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
      
      if (isConsistent) {
        console.log(`[DEBUG] ✅ APPROVED - SERP and Perplexity are identical`);
        return {
          needsManualReview: false,
          bestTranslation: serpTranslation,
          reason: 'Primary sources (SERP + Perplexity) are consistent'
        };
      } else {
        console.log(`[DEBUG] 🚨 FLAGGED FOR MANUAL REVIEW - SERP and Perplexity differ`);
        console.log(`[DEBUG]   SERP: "${serpTranslation}"`);
        console.log(`[DEBUG]   Perplexity: "${perplexityTranslation}"`);
        
        // Use SERP as default when inconsistent (can be changed via Edit Translation)
        return {
          needsManualReview: true,
          bestTranslation: serpTranslation,
          reason: 'Primary sources (SERP + Perplexity) are inconsistent - manual review required'
        };
      }
    };
  }, []);

  // Memoized style functions to prevent re-creation on every render
  const styleHelpers = useMemo(() => ({
    getStatusStyle: (status: string) => {
      switch (status) {
        case 'processing':
          return 'bg-blue-100 border border-blue-200';
        case 'manual_review':
          return 'bg-yellow-100 border border-yellow-200';
        case 'completed':
          return 'bg-slate-50';
        case 'pending':
          return 'bg-gray-50 border border-gray-200';
        default:
          return 'bg-red-100 border border-red-200';
      }
    },
    getBadgeStyle: (status: string) => {
      switch (status) {
        case 'processing':
          return 'border-blue-300 text-blue-700 bg-blue-50';
        case 'manual_review':
          return 'border-yellow-300 text-yellow-700 bg-yellow-50';
        case 'completed':
          return '';
        case 'pending':
          return 'border-gray-300 text-gray-600 bg-gray-50';
        default:
          return 'border-red-300 text-red-700 bg-red-50';
      }
    },
    getTextStyle: (status: string) => {
      switch (status) {
        case 'processing':
          return 'text-blue-600 font-medium';
        case 'manual_review':
          return 'text-yellow-600 font-medium';
        case 'completed':
          return 'text-slate-700';
        case 'pending':
          return 'text-gray-500';
        default:
          return 'text-red-600 font-medium';
      }
    }
  }), []);

  // Handle opening SERP screenshot - directly open in new tab
  const handleOpenSerpScreenshot = async (source: string) => {
    if (!selectedTranslation) return;
    
    setIsLoadingSerpScreenshot(true);
    
    try {
      // First get the JSON response to access rawHtmlFile
      const response = await fetch(`/api/serp-screenshot/${selectedTranslation.poi.klookId}?format=json&regenerate=true`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if we have a real SERP API raw HTML file
        if (data.screenshot?.rawHtmlFile && data.screenshot.rawHtmlFile.includes('serpapi.com')) {
          // Open the real SERP API HTML file URL directly in new tab
          window.open(data.screenshot.rawHtmlFile, '_blank');
        } else {
          // Open our generated HTML in new tab
          window.open(`/api/serp-screenshot/${selectedTranslation.poi.klookId}?format=html`, '_blank');
        }
      } else {
        // Fallback - just alert user that SERP data is not available
        alert('SERP screenshot not available for this POI');
      }
    } catch (error) {
      console.error('Failed to fetch SERP screenshot:', error);
      alert('Failed to load SERP screenshot');
    } finally {
      setIsLoadingSerpScreenshot(false);
    }
  };

  // Handle opening Google Maps from sidebar - use SERP API screenshot HTML
  const handleOpenGoogleMapsDirect = async (poi: any, language = 'MS-MY') => {
    setIsLoadingSerpScreenshot(true);
    
    try {
      // Get the SERP API screenshot for Google Maps
      const response = await fetch(`/api/serp-screenshot/${poi.klookId}?format=json&engine=google_maps&language=${language}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if we have a SERP API raw HTML file for Google Maps
        if (data.screenshot?.rawHtmlFile && data.screenshot.rawHtmlFile.includes('serpapi.com')) {
          // Open the SERP API Google Maps HTML file directly
          window.open(data.screenshot.rawHtmlFile, '_blank');
        } else {
          // Try to get/generate a new Google Maps screenshot
          const generateResponse = await fetch(`/api/serp-screenshot/${poi.klookId}?format=html&engine=google_maps&language=${language}&regenerate=true`);
          if (generateResponse.ok) {
            window.open(`/api/serp-screenshot/${poi.klookId}?format=html&engine=google_maps&language=${language}`, '_blank');
          } else {
            // Final fallback - open Google Maps directly
            const googlePlaceId = poi.googlePlaceId || '';
            const poiName = encodeURIComponent(poi.name);
            const address = encodeURIComponent(poi.address || 'Madrid, Spain');
            
            let mapsUrl = '';
            if (googlePlaceId) {
              mapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}&hl=${language.toLowerCase()}`;
            } else {
              mapsUrl = `https://www.google.com/maps/search/${poiName}+${address}?hl=${language.toLowerCase()}`;
            }
            
            window.open(mapsUrl, '_blank');
          }
        }
      } else {
        // Fallback - open Google Maps directly
        const googlePlaceId = poi.googlePlaceId || '';
        const poiName = encodeURIComponent(poi.name);
        const address = encodeURIComponent(poi.address || 'Madrid, Spain');
        
        let mapsUrl = '';
        if (googlePlaceId) {
          mapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}&hl=${language.toLowerCase()}`;
        } else {
          mapsUrl = `https://www.google.com/maps/search/${poiName}+${address}?hl=${language.toLowerCase()}`;
        }
        
        window.open(mapsUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get Google Maps screenshot:', error);
      // Fallback - open Google Maps directly
      const googlePlaceId = poi.googlePlaceId || '';
      const poiName = encodeURIComponent(poi.name);
      const address = encodeURIComponent(poi.address || 'Madrid, Spain');
      
      let mapsUrl = '';
      if (googlePlaceId) {
        mapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}&hl=${language.toLowerCase()}`;
      } else {
        mapsUrl = `https://www.google.com/maps/search/${poiName}+${address}?hl=${language.toLowerCase()}`;
      }
      
      window.open(mapsUrl, '_blank');
    } finally {
      setIsLoadingSerpScreenshot(false);
    }
  };

  // Handle opening Google Maps - use SERP API screenshot HTML
  const handleOpenGoogleMaps = async (source: string) => {
    if (!selectedTranslation) return;
    
    const poi = selectedTranslation.poi;
    const language = selectedTranslation.language;
    
    setIsLoadingSerpScreenshot(true);
    
    try {
      // Get the SERP API screenshot for Google Maps
      const response = await fetch(`/api/serp-screenshot/${poi.klookId}?format=json&engine=google_maps&language=${language}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if we have a SERP API raw HTML file for Google Maps
        if (data.screenshot?.rawHtmlFile && data.screenshot.rawHtmlFile.includes('serpapi.com')) {
          // Open the SERP API Google Maps HTML file directly
          window.open(data.screenshot.rawHtmlFile, '_blank');
        } else {
          // Try to get/generate a new Google Maps screenshot
          const generateResponse = await fetch(`/api/serp-screenshot/${poi.klookId}?format=html&engine=google_maps&language=${language}&regenerate=true`);
          if (generateResponse.ok) {
            window.open(`/api/serp-screenshot/${poi.klookId}?format=html&engine=google_maps&language=${language}`, '_blank');
          } else {
            // Final fallback - open Google Maps directly
            const googlePlaceId = poi.googlePlaceId || '';
            const poiName = encodeURIComponent(poi.name);
            const address = encodeURIComponent(poi.address || 'Madrid, Spain');
            
            let mapsUrl = '';
            if (googlePlaceId) {
              mapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}&hl=${language.toLowerCase()}`;
            } else {
              mapsUrl = `https://www.google.com/maps/search/${poiName}+${address}?hl=${language.toLowerCase()}`;
            }
            
            window.open(mapsUrl, '_blank');
          }
        }
      } else {
        // Fallback - open Google Maps directly
        const googlePlaceId = poi.googlePlaceId || '';
        const poiName = encodeURIComponent(poi.name);
        const address = encodeURIComponent(poi.address || 'Madrid, Spain');
        
        let mapsUrl = '';
        if (googlePlaceId) {
          mapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}&hl=${language.toLowerCase()}`;
        } else {
          mapsUrl = `https://www.google.com/maps/search/${poiName}+${address}?hl=${language.toLowerCase()}`;
        }
        
        window.open(mapsUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get Google Maps screenshot:', error);
      // Fallback - open Google Maps directly
      const googlePlaceId = poi.googlePlaceId || '';
      const poiName = encodeURIComponent(poi.name);
      const address = encodeURIComponent(poi.address || 'Madrid, Spain');
      
      let mapsUrl = '';
      if (googlePlaceId) {
        mapsUrl = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}&hl=${language.toLowerCase()}`;
      } else {
        mapsUrl = `https://www.google.com/maps/search/${poiName}+${address}?hl=${language.toLowerCase()}`;
      }
      
      window.open(mapsUrl, '_blank');
    } finally {
      setIsLoadingSerpScreenshot(false);
    }
  };

  // Handle using a translation source result
  // Handle manually marking a translation for review
  const handleMarkForReview = (poiId: string, language: string) => {
    setTranslationResults(prev => 
      prev.map(result => {
        if (result.id.toString() === poiId || result.klookId === poiId) {
          return {
            ...result,
            translations: {
              ...result.translations,
              [language]: {
                ...result.translations[language],
                status: 'manual_review' as const
              }
            },
            status: 'manual_review' as const
          };
        }
        return result;
      })
    );
    console.log(`[DEBUG] Marked ${language} translation for manual review for POI ${poiId}`);
  };

  const handleUseTranslation = async (translationText: string) => {
    if (!selectedTranslation) return;
    
    // Set the translation text in the editor
    setEditedTranslationText(translationText);
    
    // Auto-save the translation
    setIsSavingTranslation(true);
    try {
      const response = await fetch(`/api/translations/${selectedTranslation.poi.klookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedTranslation.language,
          text: translationText
        })
      });
      
      if (response.ok) {
        // Update local state with the new translation
        setTranslationResults(prev => 
          prev.map(result => 
            result.klookId === selectedTranslation.poi.klookId 
              ? {
                  ...result,
                  translations: {
                    ...result.translations,
                    [selectedTranslation.language]: { 
                      text: translationText, 
                      status: 'completed' as const,
                      sources: result.translations[selectedTranslation.language]?.sources || {}
                    }
                  }
                }
              : result
          )
        );
        
        // Check if all manual review translations are now completed for this POI
        setTimeout(() => {
          setTranslationResults(prev => 
            prev.map(result => {
              if (result.klookId === selectedTranslation.poi.klookId) {
                let hasManualReviewNeeded = false;
                Object.values(result.translations).forEach((translation: any) => {
                  if (translation && typeof translation === 'object' && translation.status === 'manual_review') {
                    hasManualReviewNeeded = true;
                  }
                });
                
                // If no more manual reviews needed, mark POI as completed
                if (!hasManualReviewNeeded && result.status === 'manual_review') {
                  console.log(`[DEBUG] POI ${result.klookId} all manual reviews completed, marking as completed`);
                  return { ...result, status: 'completed' as const };
                }
              }
              return result;
            })
          );
        }, 100);
        
        console.log('Translation updated:', {
          poi: selectedTranslation.poi.klookId,
          language: selectedTranslation.language,
          text: translationText
        });
        setSelectedTranslation(null);
        setEditedTranslationText('');
      }
    } catch (error) {
      console.error('Error saving translation:', error);
    } finally {
      setIsSavingTranslation(false);
    }
  };

  // Handle saving translation
  const handleSaveTranslation = async () => {
    if (!selectedTranslation) return;
    
    setIsSavingTranslation(true);
    try {
      const response = await fetch(`/api/translations/${selectedTranslation.poi.klookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedTranslation.language,
          text: editedTranslationText
        })
      });
      
      if (response.ok) {
        // Update local state with the new translation
        setTranslationResults(prev => 
          prev.map(result => 
            result.klookId === selectedTranslation.poi.klookId 
              ? {
                  ...result,
                  translations: {
                    ...result.translations,
                    [selectedTranslation.language]: { 
                      text: editedTranslationText, 
                      status: 'completed' as const,
                      sources: result.translations[selectedTranslation.language]?.sources || {}
                    }
                  }
                }
              : result
          )
        );
        
        // Check if all manual review translations are now completed for this POI
        setTimeout(() => {
          setTranslationResults(prev => 
            prev.map(result => {
              if (result.klookId === selectedTranslation.poi.klookId) {
                let hasManualReviewNeeded = false;
                Object.values(result.translations).forEach((translation: any) => {
                  if (translation && typeof translation === 'object' && translation.status === 'manual_review') {
                    hasManualReviewNeeded = true;
                  }
                });
                
                // If no more manual reviews needed, mark POI as completed
                if (!hasManualReviewNeeded && result.status === 'manual_review') {
                  console.log(`[DEBUG] POI ${result.klookId} all manual reviews completed, marking as completed`);
                  return { ...result, status: 'completed' as const };
                }
              }
              return result;
            })
          );
        }, 100);
        
        console.log('Translation saved:', {
          poi: selectedTranslation.poi.klookId,
          language: selectedTranslation.language,
          text: editedTranslationText
        });
        setSelectedTranslation(null);
        alert('翻譯已更新！');
      }
    } catch (error) {
      console.error('Failed to save translation:', error);
      alert('儲存失敗，請重試。');
    } finally {
      setIsSavingTranslation(false);
    }
  };

  // Handle Delete POI - With confirmation and backend deletion
  const handleDeletePOI = async (klookId: string) => {
    // Find POI name for better confirmation message
    const poi = translationResults.find(p => p.klookId === klookId);
    const poiName = poi?.name || klookId;
    
    // Show confirmation dialog
    if (!confirm(`確定要刪除 POI "${poiName}" 嗎？\n\n此操作無法復原，POI 及其所有翻譯資料將永久刪除。`)) {
      return; // User cancelled
    }
    
    try {
      // Call delete API
      const response = await fetch(`/api/pois/${klookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Check if deletion was successful
      if (response.ok) {
        // Remove POI from translation results state
        setTranslationResults(prevResults => 
          prevResults.filter(poi => poi.klookId !== klookId)
        );
        
        // Close any open modal if the deleted POI is currently selected
        if (selectedTranslation?.poi.klookId === klookId) {
          setSelectedTranslation(null);
        }
        
        // Show success message
        alert(`POI "${poiName}" 已成功刪除`);
        console.log(`POI ${klookId} successfully deleted from backend and frontend`);
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `無法刪除 POI (錯誤碼: ${response.status})`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Show error message
      console.error('Failed to delete POI:', error);
      alert(`刪除失敗：${error instanceof Error ? error.message : '未知錯誤'}\n\n請稍後再試或聯繫系統管理員。`);
    }
  };


  // Handle Export Translation Results
  const handleExportResults = () => {
    // Filter the results based on selected filters
    let filteredData = [...translationResults];
    
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => item.status === statusFilter);
    }
    
    if (countryFilter !== 'all') {
      filteredData = filteredData.filter(item => item.country === countryFilter);
    }
    
    // Apply language filter if needed (checking if language has translation)
    if (languageFilter !== 'all') {
      filteredData = filteredData.filter(item => {
        const translation = item.translations[languageFilter as keyof typeof item.translations];
        return typeof translation === 'object' ? translation.text : translation;
      });
    }

    if (exportFormat === 'csv') {
      // Generate CSV content
      const headers = ['klook_id', 'poi_name', 'country', 'status', 
        'JA-JP', 'KO-KR', 'TH-TH', 'VI-VN', 
        'ID-ID', 'MS-MY', 'EN-US', 'EN-GB', 'FR-FR', 'DE-DE', 'IT-IT', 'PT-BR'];
      
      const csvContent = [
        headers.join(','),
        ...filteredData.map(item => [
          item.klookId,
          `"${item.name}"`,
          item.country,
          item.status,
          ...Object.values(item.translations).map(t => {
            if (typeof t === 'object') {
              return t && (t as any).text ? `"${(t as any).text}"` : '';
            }
            return t ? `"${t}"` : '';
          })
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `poi_translations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } else if (exportFormat === 'json') {
      // Generate JSON content
      const jsonContent = JSON.stringify(filteredData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `poi_translations_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } else if (exportFormat === 'excel') {
      // For Excel, we'll generate a CSV that Excel can open
      // In a real app, you'd use a library like xlsx
      alert('Excel export would require additional library. Using CSV format instead.');
      setExportFormat('csv');
      handleExportResults();
    }
  };


  return (
    <div className="min-h-screen bg-white relative">
      {/* Full Screen Loading Overlay */}
      {(isSubmitting || isUploadingCsv || isLoadingSerpScreenshot) && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <img 
              src="/patrick-star-loading.gif" 
              alt="Loading Patrick Star" 
              className="w-32 h-32 mx-auto mb-4"
            />
            <p className="text-lg font-semibold text-gray-700">處理中...</p>
            <p className="text-sm text-gray-500 mt-2">
              {isSubmitting ? '正在新增 POI 資料' : 
               isUploadingCsv ? '正在處理 CSV 檔案' : 
               isLoadingSerpScreenshot ? '正在載入 SERP 截圖' : '處理中...'}
            </p>
            {isUploadingCsv && uploadProgress > 0 && (
              <div className="mt-4 w-64 mx-auto">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>上傳進度</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {submitStatus === 'success' && (
        <div className="fixed inset-0 bg-green-50 bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
              <CheckSquare className="w-12 h-12 text-white" />
            </div>
            <p className="text-2xl font-bold text-green-700 mb-2">新增成功！</p>
            <p className="text-sm text-green-600">POI 已成功新增，將開始翻譯流程</p>
          </div>
        </div>
      )}
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                POI Translation Portal
              </h1>
              <p className="text-slate-600 mt-1">
                AI-powered multi-language POI translation management system
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview Status
              </div>
            </TabsTrigger>
            <TabsTrigger value="adding" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adding POI
              </div>
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Manual Check
                <Badge variant="destructive" className="ml-1">28</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Translation Results
              </div>
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Editing History
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total POIs</CardTitle>
                  <FileText className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">1,250</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <p className="text-xs text-green-600 font-medium">
                      +180 from last month
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Completion Rate</CardTitle>
                  <CheckSquare className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">89.2%</div>
                  <Progress value={89.2} className="mt-3 h-2" />
                  <p className="text-xs text-green-600 mt-1">15,680 completed</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">API Cost (USD)</CardTitle>
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">$234.56</div>
                  <div className="grid grid-cols-3 gap-1 mt-2 text-xs">
                    <div className="text-center">
                      <div className="text-purple-600 font-medium">OpenAI</div>
                      <div className="text-purple-800">45%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-600 font-medium">SERP</div>
                      <div className="text-purple-800">35%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-600 font-medium">Perplexity</div>
                      <div className="text-purple-800">20%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700">Manual Check Queue</CardTitle>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">28</div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="destructive" className="text-xs">35 Failed</Badge>
                    <Badge variant="secondary" className="text-xs">420 Pending</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature Overview */}
            <Card className="border shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                    <CheckSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-emerald-700">
                      POI Translation Portal - Ready!
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Complete AI-powered translation management system
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h4 className="font-semibold text-emerald-700">Core Features</h4>
                    </div>
                    <div className="space-y-3">
                      {[
                        'AI三步驟翻譯流程 (Google Maps + SERP + Perplexity)',
                        '智能重複檢測系統',
                        'Manual Check 審核流程',
                        'CSV 批量上傳',
                        '支援14種語言'
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-slate-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <h4 className="font-semibold text-blue-700">Tech Stack</h4>
                    </div>
                    <div className="space-y-3">
                      {[
                        'Next.js 14 + TypeScript + Tailwind CSS',
                        'Supabase PostgreSQL 資料庫', 
                        'OpenAI + Perplexity + SERP API',
                        '完整的 API 路由設計',
                        '響應式 Shadcn/ui 設計'
                      ].map((tech, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          <span className="text-sm text-slate-700">{tech}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800 font-medium">Database Ready:</span>
                  </div>
                  <p className="text-blue-700 mt-1">
                    Supabase 資料庫已完成設置，包含測試資料和完整 Schema！
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Adding POI Tab */}
          <TabsContent value="adding" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Single POI Addition */}
              <Card className="border-emerald-200 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-emerald-800">Single POI Addition</CardTitle>
                  </div>
                  <CardDescription className="text-emerald-700">
                    手動新增單個 POI 進行翻譯處理
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="klook-id">Klook POI ID *</Label>
                    <Input 
                      id="klook-id" 
                      value={poiForm.klookId}
                      onChange={(e) => handleInputChange('klookId', e.target.value)}
                      placeholder="輸入 Klook POI ID" 
                      className="focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="poi-name">POI Name *</Label>
                    <Input 
                      id="poi-name" 
                      value={poiForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="輸入 POI 名稱" 
                      className="focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-place-id">Google Place ID *</Label>
                    <Input 
                      id="google-place-id" 
                      value={poiForm.googlePlaceId}
                      onChange={(e) => handleInputChange('googlePlaceId', e.target.value)}
                      placeholder="輸入 Google Place ID" 
                      className="focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <div className="relative" ref={countryRef}>
                      <Input 
                        id="country" 
                        value={countrySearch}
                        onChange={handleCountrySearchChange}
                        onFocus={() => setShowCountrySuggestions(true)}
                        placeholder="搜尋國家名稱或代碼 (如: Taiwan, TW)" 
                        className="focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      {showCountrySuggestions && filteredCountries.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredCountries.slice(0, 8).map((country) => (
                            <div
                              key={country.code}
                              className="px-3 py-2 cursor-pointer hover:bg-emerald-50 flex justify-between items-center"
                              onClick={() => handleCountrySelect(country)}
                            >
                              <span className="text-gray-900">{country.fullName}</span>
                              <Badge variant="secondary" className="text-xs">{country.code}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleSubmitPOI}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New POI
                  </Button>
                </CardContent>
              </Card>

              {/* CSV Batch Upload */}
              <Card className="border-blue-200 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    <CardTitle className="text-blue-800">CSV Batch Upload</CardTitle>
                  </div>
                  <CardDescription className="text-blue-700">
                    批量上傳多個 POI 並自動處理翻譯
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">Download CSV Template</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">Upload Populated CSV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">Automatic Duplicate Detection</span>
                    </div>
                  </div>
                  
                  {/* CSV Format Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-blue-800 mb-2">CSV 格式說明:</h5>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• <strong>klook_id:</strong> Klook POI ID</li>
                      <li>• <strong>poi_name:</strong> POI 名稱</li>
                      <li>• <strong>google_place_id:</strong> Google Place ID</li>
                      <li>• <strong>country_code:</strong> 2字母ISO國家代碼 (如: TW, JP, KR)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadTemplate}
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                    {/* Hidden file input */}
                    <input 
                      id="csv-upload-hidden" 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCsvFileChange}
                      style={{ display: 'none' }}
                    />
                    
                    {/* Single Upload Button */}
                    <Button 
                      onClick={() => {
                        const input = document.getElementById('csv-upload-hidden') as HTMLInputElement;
                        input?.click();
                      }}
                      disabled={isUploadingCsv}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingCsv ? 'Processing...' : 'Upload CSV File'}
                    </Button>
                    
                    {/* Show selected file name during processing */}
                    {csvFile && isUploadingCsv && (
                      <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                        正在處理: {csvFile.name}
                      </div>
                    )}
                    
                    {/* Clear all data button */}
                    {translationResults.length > 0 && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (window.confirm('確定要清空所有 POI 數據嗎？此操作無法撤銷。')) {
                            localStorage.removeItem('poi-translation-results');
                            localStorage.removeItem('poi-progress-logs');
                            setTranslationResults([]);
                            setTranslationProgress({});
                            setProgressLogs([]);
                            alert('所有數據已清空！');
                          }
                        }}
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        清空所有數據
                      </Button>
                    )}
                  </div>

                  {/* CSV Upload Results */}
                  {csvResults && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <h4 className="font-semibold text-blue-800">Upload Results</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                          <div className="text-2xl font-bold text-green-700">{csvResults.successCount}</div>
                          <div className="text-xs text-green-600">Successful</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
                          <div className="text-2xl font-bold text-orange-700">{csvResults.duplicateCount}</div>
                          <div className="text-xs text-orange-600">Duplicates</div>
                        </div>
                      </div>
                      {csvResults.errorCount > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="text-sm font-medium text-red-800 mb-2">
                            {csvResults.errorCount} Errors Found:
                          </div>
                          <ul className="text-xs text-red-700 space-y-1">
                            {csvResults.errors.slice(0, 3).map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                            {csvResults.errors.length > 3 && (
                              <li>• ... 還有 {csvResults.errors.length - 3} 個錯誤</li>
                            )}
                          </ul>
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        Total rows processed: {csvResults.totalRows}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Duplicate Detection Rules */}
            <Card className="border-amber-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Duplicate Detection Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Badge variant="destructive" className="w-fit">Automatic Reject</Badge>
                    <h4 className="font-semibold text-amber-800">Klook POI ID Match</h4>
                    <p className="text-sm text-amber-700">
                      相同 Klook ID 將被自動拒絕
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="destructive" className="w-fit">Automatic Reject</Badge>
                    <h4 className="font-semibold text-amber-800">Google Place ID Match</h4>
                    <p className="text-sm text-amber-700">
                      相同 Google Place ID 將被自動拒絕
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="w-fit">Manual Review</Badge>
                    <h4 className="font-semibold text-amber-800">Name Similarity &gt;90%</h4>
                    <p className="text-sm text-amber-700">
                      高相似度名稱將進入人工審核
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {/* Language Progress Overview */}
            <Card className="border shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Translation Results Management</CardTitle>
                    <CardDescription className="text-slate-600">
                      查看和管理所有 POI 在 14 種語言中的翻譯結果
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 flex flex-col">
                    <h4 className="font-semibold flex items-center gap-2 text-slate-700">
                      <TrendingUp className="h-4 w-4" />
                      Language Progress
                    </h4>
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-3">
                        {languageProgressGrid.map((row, rowIndex) => (
                          <div key={rowIndex} className="grid grid-cols-2 gap-3">
                            {row.map((item: any, itemIndex: number) => (
                              <div key={itemIndex} className="space-y-1.5 p-2.5 bg-slate-50 rounded-lg border">
                                <div className="flex justify-between items-center">
                                  <div className="text-xs font-medium text-slate-700 truncate pr-1">
                                    {item.lang}
                                  </div>
                                  <div className="text-xs font-bold text-slate-800 flex-shrink-0">
                                    {item.progress}%
                                  </div>
                                </div>
                                <div className="relative w-full bg-slate-200 rounded-full h-3">
                                  <div 
                                    className={`h-3 rounded-full ${item.color} transition-all duration-300 flex items-center justify-center`}
                                    style={{ width: `${item.progress}%` }}
                                  >
                                    <span className="text-xs font-medium text-white drop-shadow-sm" style={{ fontSize: '10px' }}>
                                      {item.count}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 flex flex-col">
                    <h4 className="font-semibold flex items-center gap-2 text-slate-700">
                      <CheckSquare className="h-4 w-4" />
                      Quick Actions
                    </h4>
                    <div className="space-y-3 flex-1">
                      {/* Filter Section */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Filter by Status</Label>
                        <select 
                          value={statusFilter}
                          onChange={handleStatusFilterChange}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All POIs</option>
                          <option value="completed">Completed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="manual_review">Manual Review</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Filter by Language</Label>
                        <select 
                          value={languageFilter}
                          onChange={handleLanguageFilterChange}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Languages</option>
                          <option value="JA-JP">Japanese</option>
                          <option value="KO-KR">Korean</option>
                          <option value="TH-TH">Thai</option>
                          <option value="VI-VN">Vietnamese</option>
                          <option value="ID-ID">Indonesian</option>
                          <option value="MS-MY">Malay</option>
                          <option value="EN-US">English US</option>
                          <option value="EN-GB">English UK</option>
                          <option value="FR-FR">French</option>
                          <option value="DE-DE">German</option>
                          <option value="IT-IT">Italian</option>
                          <option value="PT-BR">Portuguese</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Filter by POI Destination Country</Label>
                        <div className="relative" ref={countryFilterRef}>
                          <Input 
                            value={countryFilterSearch}
                            onChange={(e) => handleCountryFilterSearchInput(e.target.value)}
                            onFocus={() => setShowCountryFilterSuggestions(true)}
                            placeholder="搜尋國家名稱 (如: Taiwan)" 
                            className="focus:ring-blue-500 focus:border-blue-500"
                          />
                          {showCountryFilterSuggestions && filteredCountriesForFilter.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              <div
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 flex justify-between items-center border-b"
                                onClick={() => {
                                  setCountryFilterSearch('');
                                  setCountryFilter('all');
                                  setShowCountryFilterSuggestions(false);
                                }}
                              >
                                <span className="text-gray-900">All Countries</span>
                                <Badge variant="outline" className="text-xs">ALL</Badge>
                              </div>
                              {filteredCountriesForFilter.slice(0, 8).map((country) => (
                                <div
                                  key={country.code}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 flex justify-between items-center"
                                  onClick={() => handleCountryFilterSelect(country)}
                                >
                                  <span className="text-gray-900">{country.fullName}</span>
                                  <Badge variant="secondary" className="text-xs">{country.code}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {countryFilter !== 'all' && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            篩選中: {countries.find(c => c.code === countryFilter)?.fullName}
                            <button 
                              onClick={() => {
                                setCountryFilter('all');
                                setCountryFilterSearch('');
                              }}
                              className="ml-2 text-blue-800 hover:text-blue-900"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Export Section */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Export Format</Label>
                        <select 
                          value={exportFormat}
                          onChange={handleExportFormatChange}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="csv">CSV</option>
                          <option value="json">JSON</option>
                          <option value="excel">Excel</option>
                        </select>
                      </div>
                      
                      <Button 
                        onClick={handleExportResults}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export Results
                      </Button>
                      
                      {translationResults.length > 0 && (
                        <Button 
                          variant="destructive"
                          onClick={clearAllData}
                          className="w-full"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Clear All Data
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Translation Results Table */}
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <FileText className="h-5 w-5 text-slate-600" />
                  Recent Translation Results
                </CardTitle>
                <CardDescription>
                  最近處理的 POI 翻譯結果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Progress Logs Section */}
                {progressLogs.length > 0 && (
                  <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">翻譯進度日志</span>
                      <Badge variant="secondary" className="text-xs">
                        {progressLogs.length} entries
                      </Badge>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs font-mono space-y-1 bg-white rounded p-2 border">
                      {progressLogs.slice(0, 10).map((log, index) => (
                        <div key={index} className="text-gray-700">
                          {log}
                        </div>
                      ))}
                      {progressLogs.length > 10 && (
                        <div className="text-gray-400 italic">... and {progressLogs.length - 10} more entries</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>POI Information</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Translations</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTranslationResults.map((poi) => (
                        <TableRow key={poi.id}>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-900 font-medium">{poi.lastUpdated}</div>
                              <div className="text-slate-500 text-xs">14:25:30</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-slate-900">{poi.name}</div>
                              <div className="text-sm text-slate-500">
                                ID: {poi.klookId} • {poi.country}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {poi.status === 'processing' && translationProgress[poi.id.toString()] ? (
                              <div className="space-y-1 min-w-[120px]">
                                <Badge 
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                                >
                                  Processing {translationProgress[poi.id.toString()]?.percentage || 0}%
                                </Badge>
                                <div className="w-full bg-blue-200 rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                                    style={{ 
                                      width: `${Math.max(2, translationProgress[poi.id.toString()]?.percentage || 0)}%`,
                                      minWidth: '2px' 
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-blue-700">
                                  {translationProgress[poi.id.toString()]?.currentLanguage || 'ZH-CN'}
                                </span>
                              </div>
                            ) : (
                              <Badge 
                                variant={poi.status === 'completed' ? 'default' : 
                                       poi.status === 'in_progress' ? 'secondary' : 'destructive'}
                                className={
                                  poi.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                  poi.status === 'in_progress' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                  'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                }
                              >
                                {poi.status === 'completed' ? 'Completed' :
                                 poi.status === 'in_progress' ? 'In Progress' : 'Manual Review'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 max-w-md">
                              {Object.entries(poi.translations)
                                .filter(([lang]) => languageFilter === 'all' || lang === languageFilter)
                                .map(([lang, translation]) => {
                                const status = (translation && typeof translation === 'object') ? (translation as any).status : (translation ? 'completed' : 'pending');
                                const text = (translation && typeof translation === 'object') ? (translation as any).text : translation;
                                const progress = (translation && typeof translation === 'object') ? (translation as any).progress : null;

                                return (
                                  <div key={lang} className={`flex items-center justify-between gap-2 text-xs rounded p-2 ${styleHelpers.getStatusStyle(status)}`}>
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs px-1 py-0 h-5 flex-shrink-0 ${styleHelpers.getBadgeStyle(status)}`}
                                      >
                                        {lang}
                                      </Badge>
                                      <div className="flex-1 min-w-0">
                                        {status === 'processing' && 
                                         translationProgress[poi.id.toString()] && 
                                         translationProgress[poi.id.toString()].currentLanguage === lang ? (
                                          <div className="space-y-1">
                                            <span className={`text-xs ${styleHelpers.getTextStyle(status)}`}>
                                              Processing... ({translationProgress[poi.id.toString()]?.percentage || 0}%)
                                            </span>
                                            <div className="w-full bg-blue-200 rounded-full h-1">
                                              <div 
                                                className="h-1 rounded-full bg-blue-500 transition-all duration-500"
                                                style={{ 
                                                  width: `${Math.max(2, translationProgress[poi.id.toString()]?.percentage || 0)}%`,
                                                  minWidth: '2px' 
                                                }}
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <span className={`truncate ${styleHelpers.getTextStyle(status)}`}>
                                            {text ? text.replace(/\s*\([^)]*\)\s*$/, '') : (status === 'processing' ? 'Processing...' : 
                                                     status === 'manual_review' ? 'Needs Review' : 
                                                     status === 'pending' ? 'Pending' : 'Pending')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleOpenTranslationModal(poi, lang, translation, 'view')}
                                        title="View translation details"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                      {status === 'completed' && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                                          onClick={() => handleMarkForReview(poi.klookId, lang)}
                                          title="Flag for manual review"
                                        >
                                          <AlertCircle className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs text-blue-600 hover:bg-blue-50 border-blue-300"
                                onClick={() => handleOpenGoogleMapsDirect(poi)}
                              >
                                <Globe className="h-3 w-3 mr-1" />
                                Google Maps
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs text-green-600 hover:bg-green-50 border-green-300"
                                onClick={() => window.open(`/api/serp-screenshot/${poi.klookId}`, '_blank')}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                SERP Screenshot
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs text-red-600 hover:bg-red-50 border-red-300"
                                onClick={() => {
                                  if (confirm(`確定要刪除 POI "${poi.name}" 嗎？此操作無法復原。`)) {
                                    handleDeletePOI(poi.klookId);
                                  }
                                }}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Delete POI
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            {/* Task Overview */}
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Tasks</CardTitle>
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{manualTasks.length}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {manualTasks.filter(t => t.status === 'pending').length} pending
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700">Current Task</CardTitle>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-yellow-900">#{currentTaskIndex + 1}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {manualTasks[currentTaskIndex]?.type || 'No tasks'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Completed</CardTitle>
                  <CheckSquare className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{manualTasks.filter(t => t.status === 'completed').length}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    This session
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">By Language</CardTitle>
                  <Globe className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-900">{affectedLanguagesCount}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Languages affected
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sorting and Filtering Controls */}
            <Card className="border-slate-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <AlertCircle className="h-5 w-5 text-slate-600" />
                  Task Sorting & Filtering
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Organize tasks by your preference for efficient processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sort By</Label>
                    <select 
                      value={taskSortBy}
                      onChange={handleTaskSortByChange}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="time_desc">Time (Newest First)</option>
                      <option value="time_asc">Time (Oldest First)</option>
                      <option value="similarity_high">Similarity (High to Low)</option>
                      <option value="similarity_low">Similarity (Low to High)</option>
                      <option value="language">Language (A-Z)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Filter by Language</Label>
                    <select 
                      value={taskLanguageFilter}
                      onChange={handleTaskLanguageFilterChange}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Languages</option>
                      <option value="JA-JP">Japanese (JA-JP)</option>
                      <option value="KO-KR">Korean (KO-KR)</option>
                      <option value="TH-TH">Thai (TH-TH)</option>
                      <option value="ZH-CN">Chinese Simplified (ZH-CN)</option>
                      <option value="ZH-TW">Chinese Traditional (ZH-TW)</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>
                    Showing {manualTasks.length} of {manualTasksState.length} tasks
                  </span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-800">
                    {taskSortBy === 'time_desc' ? 'Newest First' :
                     taskSortBy === 'time_asc' ? 'Oldest First' :
                     taskSortBy === 'similarity_high' ? 'High Similarity' :
                     taskSortBy === 'similarity_low' ? 'Low Similarity' :
                     'By Language'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Current Task Focus */}
            {manualTasks.length > 0 ? (
              <Card className="border-2 border-blue-300 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                        Current Task #{currentTaskIndex + 1} of {manualTasks.length}
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Focus Mode: Review one task at a time for better accuracy
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-100 text-slate-800">
                        {manualTasks[currentTaskIndex]?.affectedLanguage || 'System Issue'}
                      </Badge>
                      {/* Navigation Icons */}
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          disabled={currentTaskIndex === 0}
                          onClick={() => setCurrentTaskIndex(Math.max(0, currentTaskIndex - 1))}
                          title="Previous task"
                        >
                          ↑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          disabled={currentTaskIndex === manualTasks.length - 1}
                          onClick={() => setCurrentTaskIndex(Math.min(manualTasks.length - 1, currentTaskIndex + 1))}
                          title="Next task"
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Task Details */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-slate-700">Issue Type</Label>
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-800 border-blue-300">
                          {manualTasks[currentTaskIndex]?.type}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-slate-700">POI Information</Label>
                        <div className="mt-1 p-3 bg-white rounded-md border hover:bg-blue-50 transition-colors cursor-pointer"
                             onClick={() => {
                               const currentTask = manualTasks[currentTaskIndex];
                               setIsLoadingManualCheckScreenshot(true);
                               
                               // Simulate loading delay
                               setTimeout(() => {
                                 if (currentTask?.translationSources?.serp?.hasScreenshot) {
                                   // Create a new window with the HTML content
                                   const newWindow = window.open('', '_blank');
                                   if (newWindow) {
                                     newWindow.document.write(currentTask.translationSources.serp.screenshotHtml);
                                     newWindow.document.close();
                                   }
                                 } else if (currentTask?.translationSources?.googleMaps?.hasScreenshot) {
                                   const newWindow = window.open('', '_blank');
                                   if (newWindow) {
                                     newWindow.document.write(currentTask.translationSources.googleMaps.screenshotHtml);
                                     newWindow.document.close();
                                   }
                                 }
                                 setIsLoadingManualCheckScreenshot(false);
                               }, 800);
                             }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{manualTasks[currentTaskIndex]?.poi}</div>
                              <div className="text-sm text-slate-500">
                                ID: {manualTasks[currentTaskIndex]?.klookId} • {manualTasks[currentTaskIndex]?.country}
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-slate-700">Translation Sources</Label>
                        <div className="mt-2 space-y-2">
                          {manualTasks[currentTaskIndex]?.translationSources && Object.entries(manualTasks[currentTaskIndex].translationSources).map(([source, data]) => (
                            <div key={source} className="flex items-center gap-3 p-2 bg-white rounded border">
                              <Badge variant="outline" className="text-xs min-w-[60px]">
                                {source.toUpperCase()}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {(data as any)?.error ? (
                                    <span className="text-red-600">Error: {(data as any).error}</span>
                                  ) : (
                                    (data as any)?.text || 'No translation'
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {(data as any)?.confidence || 0}% confidence
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {(data as any)?.hasScreenshot && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => setSerpScreenshotModal({
                                      source: source.toUpperCase(),
                                      url: `Screenshot for ${source}`,
                                      htmlContent: (data as any)?.screenshotHtml
                                    })}
                                    title="View screenshot"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const reasoningText = (data as any)?.reasoning || `**${source.toUpperCase()} Translation Analysis**\n\nTranslation process for "POI" → Target Language:\n\n**Method Used:**\n• Dynamic mock translation with keyword matching\n• Language-specific formatting applied\n• Cultural context preserved\n\n**Translation Result:**\n"${(data as any)?.text || 'Processing...'}"\n\n**Quality Assessment:**\n• Source reliability: Mock data for demonstration\n• Translation confidence: Medium\n• Cultural appropriateness: Verified`;
                                    const translationText = (data as any)?.text || 'No translation available';
                                    setShowReasoningModal({
                                      source: source.toUpperCase(),
                                      reasoning: reasoningText,
                                      translation: translationText
                                    });
                                  }}
                                  title="View reasoning"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-slate-700">Actions</Label>
                      
                      {/* Pending Action */}
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-orange-600 hover:bg-orange-50 border-orange-300"
                        onClick={() => {
                          const updatedTask = {
                            ...manualTasks[currentTaskIndex],
                            createdAt: new Date().toISOString(),
                            status: 'pending'
                          };
                          const updatedTasks = manualTasksState.map(task => 
                            task.id === updatedTask.id ? updatedTask : task
                          );
                          setManualTasksState(updatedTasks);
                          // Move to next task
                          if (currentTaskIndex < manualTasks.length - 1) {
                            setCurrentTaskIndex(currentTaskIndex + 1);
                          }
                        }}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Mark as Pending (Move to End)
                      </Button>

                      {/* Translation Selection */}
                      {manualTasks[currentTaskIndex]?.translationSources && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-slate-600">Select Translation:</Label>
                          {Object.entries(manualTasks[currentTaskIndex].translationSources)
                            .filter(([_, data]) => (data as any)?.text && !(data as any)?.error)
                            .map(([source, data]) => (
                            <Button 
                              key={source}
                              variant="outline" 
                              className="w-full justify-start text-green-600 hover:bg-green-50 border-green-300"
                              onClick={() => {
                                // Handle translation selection logic here
                                updateTaskStatus(manualTasks[currentTaskIndex]?.id, 'completed');
                              }}
                            >
                              <CheckSquare className="mr-2 h-4 w-4" />
                              Use {source.toUpperCase()}: {(data as any)?.text}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Retry Translation */}
                      <Button 
                        className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          // Trigger retry translation process for all 4 sources
                          console.log('Retry translation for all sources...');
                          updateTaskStatus(manualTasks[currentTaskIndex]?.id, 'completed');
                        }}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Retry Translation (All Sources)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Empty State with Patrick Star */
              <Card className="border-2 border-green-300 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <img 
                      src="https://s1.aigei.com/src/img/gif/ff/ff4f276a07814393823b088364bba80e.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:jZURxEZGkcpkUvOD5DvBiq3dzf4=" 
                      alt="Patrick Star Running" 
                      className="w-32 h-32 object-contain"
                    />
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-green-700">All Good!</h3>
                      <p className="text-lg text-slate-600">沒有需要手動處理的任務</p>
                      <p className="text-sm text-slate-500">所有 POI 翻譯都運作正常 ✨</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task Queue Overview */}
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <CheckSquare className="h-5 w-5 text-slate-600" />
                  Task Queue
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Overview of all pending manual review tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {manualTasks.map((task, index) => (
                    <div 
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        index === currentTaskIndex 
                          ? 'bg-blue-50 border-blue-300 shadow-sm' 
                          : task.status === 'completed' 
                          ? 'bg-green-50 border-green-200 opacity-75'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                      onClick={() => setCurrentTaskIndex(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-slate-300">
                          <span className="text-sm font-semibold">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{task.poi}</div>
                          <div className="text-sm text-slate-500">
                            {task.type} • {task.affectedLanguage || 'System'}
                            {task.similarity && ` • ${task.similarity}% similar`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'completed' && (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            ✓ Completed
                          </Badge>
                        )}
                        {index === currentTaskIndex && task.status === 'pending' && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            → Current
                          </Badge>
                        )}
                        {task.affectedLanguage && (
                          <Badge variant="outline" className="bg-slate-100 text-slate-800">
                            {task.affectedLanguage}
                          </Badge>
                        )}
                        {task.similarity && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            {task.similarity}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Editing History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <History className="h-5 w-5 text-slate-600" />
                  Editing History
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Track all manual changes and user actions on POI translations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {editingHistory.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <History className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{entry.action}</div>
                            <div className="text-sm text-slate-500">
                              {new Date(entry.timestamp).toLocaleString()} by {entry.user}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-800">
                          {entry.poi}
                        </Badge>
                      </div>
                      
                      <div className="pl-13 space-y-2">
                        <div className="text-sm text-slate-600">
                          <strong>POI:</strong> {entry.poi} (ID: {entry.klookId})
                        </div>
                        
                        {entry.changes.language && (
                          <div className="bg-slate-50 rounded-md p-3 space-y-2">
                            <div className="text-sm font-medium text-slate-700">Translation Change ({entry.changes.language})</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-red-600">Before</Label>
                                <div className="text-sm text-slate-900 bg-red-50 p-2 rounded border">
                                  {entry.changes.before}
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-green-600">After</Label>
                                <div className="text-sm text-slate-900 bg-green-50 p-2 rounded border">
                                  {entry.changes.after}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              <strong>Reason:</strong> {entry.changes.reason}
                            </div>
                          </div>
                        )}

                        {entry.changes.action && (
                          <div className="bg-slate-50 rounded-md p-3 space-y-2">
                            <div className="text-sm font-medium text-slate-700">Action Taken</div>
                            <div className="text-sm text-slate-900">
                              <strong>Action:</strong> {entry.changes.action}
                            </div>
                            {entry.changes.originalId && (
                              <div className="text-sm text-slate-600">
                                <strong>Original ID:</strong> {entry.changes.originalId} → <strong>New ID:</strong> {entry.changes.newId}
                              </div>
                            )}
                            <div className="text-xs text-slate-500">
                              <strong>Reason:</strong> {entry.changes.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Loading Modal with Patrick Star */}
      <Dialog open={isLoadingManualCheckScreenshot} onOpenChange={setIsLoadingManualCheckScreenshot}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <img 
              src="https://s1.aigei.com/src/img/gif/ff/ff4f276a07814393823b088364bba80e.gif?e=2051020800&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:jZURxEZGkcpkUvOD5DvBiq3dzf4=" 
              alt="Patrick Star Loading" 
              className="w-32 h-32 object-contain mb-4"
            />
            <p className="text-lg font-semibold text-blue-600">Loading Screenshot...</p>
            <p className="text-sm text-slate-500 mt-2">派大星正在努力加載中...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Translation View/Edit Modal */}
      <Dialog open={!!selectedTranslation} onOpenChange={(open) => !open && setSelectedTranslation(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedTranslation?.mode === 'view' ? '查看翻譯' : '編輯翻譯'}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {selectedTranslation && (
                <div className="space-y-1">
                  <div className="font-medium">{selectedTranslation.poi.name}</div>
                  <div className="text-sm text-slate-500">
                    Language: {selectedTranslation.language} • Klook ID: {selectedTranslation.poi.klookId}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTranslation && (
            <div className="space-y-6 py-4">
              {/* Current Translation */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Current Translation</Label>
                {selectedTranslation.mode === 'view' ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="text-slate-900">
                      {(selectedTranslation.translation && typeof selectedTranslation.translation === 'object') 
                        ? selectedTranslation.translation.text || 'No translation available'
                        : selectedTranslation.translation || 'No translation available'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={editedTranslationText}
                      onChange={handleEditedTranslationTextChange}
                      placeholder="Enter translation..."
                      className="min-h-[80px]"
                    />
                    <div className="text-xs text-slate-500">
                      Character count: {editedTranslationText.length}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Translation Sources - New Design */}
              <div className="space-y-6">
                <Label className="text-base font-semibold">Translation Sources</Label>
                
                {/* PRIMARY SOURCES - TOP SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                    <h3 className="font-semibold text-gray-900">Primary Translation Sources</h3>
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    {/* Google SERP Summary - Primary */}
                    <Card className="border-blue-200 bg-blue-50/30 ring-1 ring-blue-100">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <CardTitle className="text-sm font-semibold">Google SERP Summary</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleReasoningClick(
                                'Google SERP Summary',
                                sourceReasoning.serp || 'No reasoning available',
                                translationSources.serp || 'Analyzing...'
                              )}
                              title="View reasoning"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0" 
                              title="View SERP screenshot"
                              onClick={() => handleOpenSerpScreenshot('Google SERP Summary')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm font-medium text-slate-800 bg-white p-3 rounded border shadow-sm">
                          {sourcesLoadingProgress.serp ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Analyzing SERP data...</span>
                            </div>
                          ) : (
                            (translationSources.serp || 'No data available').replace(/\s*\([^)]*\)\s*$/, '')
                          )}
                        </div>
                        {selectedTranslation.mode === 'edit' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="mt-2 text-xs"
                            onClick={() => handleUseTranslation((translationSources.serp || '').replace(/\s*\([^)]*\)\s*$/, ''))}
                          >
                            Use This Translation
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Perplexity AI - Primary */}
                    <Card className="border-purple-200 bg-purple-50/30 ring-1 ring-purple-100">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <CardTitle className="text-sm font-semibold">Perplexity AI</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleReasoningClick(
                                'Perplexity AI',
                                sourceReasoning.perplexity || 'No reasoning available',
                                translationSources.perplexity || 'Analyzing...'
                              )}
                              title="View reasoning"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm font-medium text-slate-800 bg-white p-3 rounded border shadow-sm">
                          {sourcesLoadingProgress.perplexity ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Getting Perplexity AI analysis...</span>
                            </div>
                          ) : (
                            (translationSources.perplexity || 'No data available').replace(/\s*\([^)]*\)\s*$/, '')
                          )}
                        </div>
                        {selectedTranslation.mode === 'edit' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="mt-2 text-xs"
                            onClick={() => handleUseTranslation((translationSources.perplexity || '').replace(/\s*\([^)]*\)\s*$/, ''))}
                          >
                            Use This Translation
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* SEPARATOR */}
                <div className="border-t border-gray-200"></div>

                {/* REFERENCE SOURCES - BOTTOM SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-green-400 to-orange-400 rounded opacity-60"></div>
                    <h3 className="font-medium text-gray-600 text-sm">Reference Check</h3>
                  </div>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    {/* Google Maps - Reference */}
                    <Card className="border-green-200 bg-green-50/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full opacity-70"></div>
                            <CardTitle className="text-xs text-gray-600">Google Maps</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 w-5 p-0"
                              onClick={() => handleReasoningClick(
                                'Google Maps',
                                sourceReasoning.googleMaps || 'No reasoning available',
                                translationSources.googleMaps || 'Processing...'
                              )}
                              title="View reasoning"
                            >
                              <MessageCircle className="h-2.5 w-2.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 w-5 p-0" 
                              title="View Google Maps via SERP API"
                              onClick={() => handleOpenGoogleMaps('Google Maps')}
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-slate-600 bg-white/50 p-2 rounded border">
                          {sourcesLoadingProgress.googleMaps ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Loading Google Maps data...</span>
                            </div>
                          ) : (
                            (translationSources.googleMaps || 'No data available').replace(/\s*\([^)]*\)\s*$/, '')
                          )}
                        </div>
                        {selectedTranslation.mode === 'edit' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-xs h-6"
                            onClick={() => handleUseTranslation((translationSources.googleMaps || '').replace(/\s*\([^)]*\)\s*$/, ''))}
                          >
                            Use This Translation
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* OpenAI - Reference */}
                    <Card className="border-orange-200 bg-orange-50/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full opacity-70"></div>
                            <CardTitle className="text-xs text-gray-600">OpenAI</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 w-5 p-0"
                              onClick={() => handleReasoningClick(
                                'OpenAI',
                                sourceReasoning.openai || 'No reasoning available',
                                translationSources.openai || 'Processing...'
                              )}
                              title="View reasoning"
                            >
                              <MessageCircle className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-slate-600 bg-white/50 p-2 rounded border">
                          {sourcesLoadingProgress.openai ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Processing with OpenAI...</span>
                            </div>
                          ) : (
                            (translationSources.openai || 'No data available').replace(/\s*\([^)]*\)\s*$/, '')
                          )}
                        </div>
                        {selectedTranslation.mode === 'edit' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-xs h-6"
                            onClick={() => handleUseTranslation((translationSources.openai || '').replace(/\s*\([^)]*\)\s*$/, ''))}
                          >
                            Use This Translation
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* POI Context */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">POI Context</Label>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="text-sm">
                    <div className="font-medium text-slate-700">Original Name</div>
                    <div className="text-slate-500">{selectedTranslation.poi.name}</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-slate-700">Country</div>
                    <div className="text-slate-500">{selectedTranslation.poi.country}</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-slate-700">Google Place ID</div>
                    <div className="text-slate-500 text-xs font-mono">{selectedTranslation.poi.googlePlaceId}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                {selectedTranslation?.mode === 'view' && (
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedTranslation({
                      ...selectedTranslation,
                      mode: 'edit'
                    })}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Translation
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedTranslation(null)}>
                  Cancel
                </Button>
                {selectedTranslation?.mode === 'edit' && (
                  <Button 
                    onClick={handleSaveTranslation}
                    disabled={isSavingTranslation}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                  >
                    {isSavingTranslation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Translation
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reasoning Modal */}
      <Dialog open={!!showReasoningModal} onOpenChange={(open) => !open && setShowReasoningModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-semibold">
                Translation Reasoning - {showReasoningModal?.source}
              </DialogTitle>
            </div>
            <DialogDescription className="mt-2">
              Understanding how this translation was generated
            </DialogDescription>
          </DialogHeader>
          
          {showReasoningModal && (
            <div className="space-y-4 py-4">
              {/* Translation Result */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Translation Result
                </h4>
                <div className="text-lg font-semibold text-blue-900">
                  {showReasoningModal.translation}
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Translation Logic
                </h4>
                <div className="text-sm text-slate-700 leading-relaxed space-y-3">
                  {(showReasoningModal.reasoning || '').split('\n\n').map((section, index) => {
                    if (section.startsWith('**') && section.includes(':**')) {
                      // Handle section headers
                      return (
                        <div key={index}>
                          <h5 className="font-semibold text-slate-800 mb-2 text-base">
                            {section.replace(/\*\*/g, '').replace(':', '')}
                          </h5>
                        </div>
                      );
                    } else if (section.includes('•')) {
                      // Handle bullet points
                      return (
                        <div key={index} className="ml-2">
                          {section.split('\n').map((line, lineIndex) => {
                            if (line.trim().startsWith('•')) {
                              return (
                                <div key={lineIndex} className="flex items-start gap-2 mb-1">
                                  <span className="text-blue-600 mt-1">•</span>
                                  <span>{line.replace('•', '').trim()}</span>
                                </div>
                              );
                            } else if (line.startsWith('**') && line.endsWith(':**')) {
                              return (
                                <h6 key={lineIndex} className="font-medium text-slate-800 mt-3 mb-1">
                                  {line.replace(/\*\*/g, '').replace(':', '')}
                                </h6>
                              );
                            } else if (line.trim()) {
                              return <p key={lineIndex} className="mb-2">{line}</p>;
                            }
                            return null;
                          })}
                        </div>
                      );
                    } else {
                      // Handle regular paragraphs
                      return section.trim() ? (
                        <p key={index} className="mb-2">{section}</p>
                      ) : null;
                    }
                  })}
                </div>
              </div>
              
              {/* Additional context based on source */}
              <div className="grid gap-3 md:grid-cols-2 text-xs text-slate-600">
                {showReasoningModal.source === 'Google SERP Summary' && (
                  <>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="font-medium text-blue-800">Data Sources</div>
                      <div>Google SERP results via SERP API</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="font-medium text-blue-800">Confidence</div>
                      <div>65.9% (Based on frequency in search results)</div>
                    </div>
                  </>
                )}
                {showReasoningModal.source === 'Google Maps' && (
                  <>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="font-medium text-green-800">Data Sources</div>
                      <div>Google Maps data via SERP API</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="font-medium text-green-800">Confidence</div>
                      <div>92.3% (Official venue data, verified sources)</div>
                    </div>
                  </>
                )}
                {showReasoningModal.source === 'Perplexity AI' && (
                  <>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="font-medium text-purple-800">Data Sources</div>
                      <div>Real-time web knowledge, AI analysis</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="font-medium text-purple-800">Confidence</div>
                      <div>87.6% (Context-aware, cultural considerations)</div>
                    </div>
                  </>
                )}
                {showReasoningModal.source === 'OpenAI' && (
                  <>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="font-medium text-orange-800">Data Sources</div>
                      <div>Large language model training data</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="font-medium text-orange-800">Confidence</div>
                      <div>94.1% (Neural network probability scoring)</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReasoningModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SERP Screenshot Modal */}
      <Dialog open={!!serpScreenshotModal} onOpenChange={(open) => !open && setSerpScreenshotModal(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-semibold">
                SERP Screenshot - {serpScreenshotModal?.source}
              </DialogTitle>
            </div>
            <DialogDescription className="mt-2">
              {selectedTranslation && `Screenshot of search results for "${selectedTranslation.poi.name}"`}
            </DialogDescription>
          </DialogHeader>
          
          {serpScreenshotModal && (
            <div className="py-4 flex-1 overflow-hidden">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-[60vh] overflow-y-auto">
                {serpScreenshotModal.htmlContent ? (
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: serpScreenshotModal.htmlContent }}
                  />
                ) : (
                  <iframe
                    src={serpScreenshotModal.url}
                    className="w-full h-full border-0"
                    title={`SERP Screenshot for ${serpScreenshotModal.source}`}
                    sandbox="allow-same-origin allow-scripts"
                  />
                )}
              </div>
              
              {/* Screenshot Info */}
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-800">Source</div>
                  <div>{serpScreenshotModal.source} via SERP API</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-800">POI</div>
                  <div>{selectedTranslation?.poi.name}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-800">Language</div>
                  <div>{selectedTranslation?.language}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-800">Screenshot URL</div>
                  <div className="text-xs font-mono truncate">{serpScreenshotModal.url}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <Button 
                variant="outline"
                onClick={() => serpScreenshotModal && window.open(serpScreenshotModal.url, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={() => setSerpScreenshotModal(null)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
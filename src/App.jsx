import { useState, useEffect, useMemo } from 'react'
import { 
  Plus, 
  Minus, 
  Shield, 
  RefreshCw, 
  Save, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Layers, 
  ArrowRight,
  Info,
  Smartphone,
  CloudLightning,
  Sparkles
} from 'lucide-react'
import { db, parseFormula, getLocalDateString, DEFAULT_STOCK_ITEMS } from './lib/dbHelper'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'

// Define the 5 package options
const PACKAGES = [
  { 
    name: 'Paket Foldable Bag', 
    price: 40000, 
    color: 'from-indigo-600 to-indigo-800', 
    desc: '1 KTG Asli Pouch, 1 KTG Spc Mix Pouch, 1 KTG Spc Mix Mangga Rtg, 1 Foldable Bag' 
  },
  { 
    name: 'Paket Pouch', 
    price: 60000, 
    color: 'from-emerald-600 to-emerald-800', 
    desc: '1 KTG Asli Pouch, 2 KTG Spc Mix Pouch, 1 Pouch KTG' 
  },
  { 
    name: 'Paket KTG RTD No Gimmick', 
    price: 10000, 
    color: 'from-amber-600 to-amber-800', 
    desc: '1 KTG RTD Gula Batu, 1 KTG RTD Mangga, 1 FREE RTD KTG' 
  },
  { 
    name: 'Paket Tas', 
    price: 50000, 
    color: 'from-rose-600 to-rose-800', 
    desc: '5 KTG RTD Gula Batu, 5 KTG RTD Mangga, 1 Tas Tabung' 
  },
  { 
    name: 'Paket 5 Days Family Pack', 
    price: 30000, 
    color: 'from-violet-600 to-violet-800', 
    desc: '4 Family Pack' 
  },
]

const PACKAGE_DETAILS = [
  {
    variant: 'KTG',
    name: 'Paket Foldable Bag',
    price: 40000,
    items: [
      { name: 'KTG Asli Pouch 138Gr', mult: 1 },
      { name: 'KTG Spc Mix Pouch / KTG Manis Pouch', mult: 1 },
      { name: 'KTG SPC MIX Mangga Rtg', mult: 1 },
      { name: 'Foldable Bag', mult: 1 }
    ]
  },
  {
    variant: 'KTG',
    name: 'Paket Pouch',
    price: 60000,
    items: [
      { name: 'KTG Asli Pouch 138Gr', mult: 1 },
      { name: 'KTG Spc Mix Pouch / KTG Manis Pouch', mult: 2 },
      { name: 'Pouch KTG', mult: 1 }
    ]
  },
  {
    variant: 'KTG',
    name: 'Paket KTG RTD No Gimmick',
    price: 10000,
    items: [
      { name: 'KTG RTD Gula Batu', mult: 1 },
      { name: 'KTG RTD Mangga', mult: 1 },
      { name: 'FREE RTD KTG', mult: 1 }
    ]
  },
  {
    variant: 'KTG',
    name: 'Paket Tas',
    price: 50000,
    items: [
      { name: 'KTG RTD Gula Batu', mult: 5 },
      { name: 'KTG RTD Mangga', mult: 5 },
      { name: 'Tas Tabung', mult: 1 }
    ]
  },
  {
    variant: '5 DAYS',
    name: 'Paket 5 Days Family Pack',
    price: 30000,
    items: [
      { name: 'Family Pack', mult: 1 }
    ]
  }
]

function App() {
  // --- States ---
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString())
  const [shiftType, setShiftType] = useState('Weekday') // Weekday or Weekend
  const [activeRole, setActiveRole] = useState('SPG 1') // Default role is SPG 1 to restrict admin view
  const [adminTab, setAdminTab] = useState('sales') // sales, stock, financial (Only applicable for SPB)
  const [shortcutPackage, setShortcutPackage] = useState('Paket Foldable Bag')
  const [shortcutQty, setShortcutQty] = useState(1)
  const [shortcutTarget, setShortcutTarget] = useState('pengambilan') // pengambilan or sisa_akhir

  // Admin auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('is_admin_authenticated') === 'true')
  
  const [sales, setSales] = useState([])
  const [stockRecords, setStockRecords] = useState([])
  const [activeFinancialRecap, setActiveFinancialRecap] = useState(null)
  const [allFinancialRecaps, setAllFinancialRecaps] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Alert system state
  const [toast, setToast] = useState(null)

  // Trigger auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast = (type, message) => {
    setToast({ type, message })
  }

  // --- Load Data on Date / Shift Change ---
  const loadData = async (dateStr, currentShift) => {
    setLoading(true)
    try {
      // 1. Fetch Sales
      const salesData = await db.fetchSales(dateStr)
      setSales(salesData || [])

      // 2. Fetch Stock Records
      const stockData = await db.fetchStockRecords(dateStr, currentShift)
      setStockRecords(stockData || [])

      // 3. Fetch Active Financial Recap (for the activeRole)
      const recapData = await db.fetchFinancialRecap(dateStr, currentShift, activeRole)
      setActiveFinancialRecap(recapData)

      // 4. Fetch All Financial Recaps for Consolidated admin view
      const allRecaps = await db.fetchFinancialRecapsForDate(dateStr, currentShift)
      setAllFinancialRecaps(allRecaps || [])
    } catch (err) {
      console.error(err)
      showToast('error', 'Gagal memuat data!')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedDate, shiftType)
  }, [selectedDate, shiftType])

  // Load active financial recap when activeRole changes
  useEffect(() => {
    const loadActiveRecap = async () => {
      try {
        const recapData = await db.fetchFinancialRecap(selectedDate, shiftType, activeRole)
        setActiveFinancialRecap(recapData)
      } catch (err) {
        console.error('Failed to load active recap:', err)
      }
    }
    loadActiveRecap()
  }, [activeRole, selectedDate, shiftType])

  // --- Supabase Realtime Subscription ---
  // Listening to inserts, updates, and deletes to make the app multiplayer real-time
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel('realtime-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          // Re-fetch sales when a crew member logs a sale
          db.fetchSales(selectedDate).then(setSales).catch(console.error)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_records' },
        (payload) => {
          // Re-fetch stock records when updated
          db.fetchStockRecords(selectedDate, shiftType).then(setStockRecords).catch(console.error)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_recap' },
        (payload) => {
          // Re-fetch financial closing data when updated
          db.fetchFinancialRecapsForDate(selectedDate, shiftType).then(setAllFinancialRecaps).catch(console.error)
          // Also fetch for active role
          db.fetchFinancialRecap(selectedDate, shiftType, activeRole).then(setActiveFinancialRecap).catch(console.error)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate, shiftType, activeRole])

  // --- Ensure active role is valid when shift type changes ---
  useEffect(() => {
    if (shiftType === 'Weekday' && activeRole === 'SPG 2') {
      setActiveRole('SPG 1')
    }
  }, [shiftType, activeRole])

  // Helper to convert number to a spreadsheet tally string
  const getTallyString = (num) => {
    if (!num || num <= 0) return '-'
    const groupsOfFive = Math.floor(num / 5)
    const remainder = num % 5
    let tally = ''
    for (let i = 0; i < groupsOfFive; i++) {
      tally += 'IIII '
    }
    for (let i = 0; i < remainder; i++) {
      tally += 'I'
    }
    return tally.trim()
  }

  // Crew Name displays
  const getCrewLabel = (role) => {
    if (role === 'SPB') return 'SPB (Admin)'
    if (shiftType === 'Weekday') return 'SPG'
    return role === 'SPG 1' ? 'SPG 1' : 'SPG 2'
  }

  // Current active crew names based on Weekday/Weekend
  const crewList = useMemo(() => {
    if (shiftType === 'Weekday') {
      return ['SPB', 'SPG 1'] // 'SPG 1' acts as the lone 'SPG'
    } else {
      return ['SPB', 'SPG 1', 'SPG 2']
    }
  }, [shiftType])

  // Grouped Sales for input mapping
  // Map of package_name -> quantity for activeRole
  const activeSalesMap = useMemo(() => {
    const map = {}
    PACKAGES.forEach(p => {
      map[p.name] = 0
    })
    sales.forEach(s => {
      if (s.crew_name === activeRole) {
        map[s.package_name] = s.quantity
      }
    })
    return map
  }, [sales, activeRole])

  // Calculate sales total per crew member
  const crewSalesTotals = useMemo(() => {
    const totals = { 'SPB': 0, 'SPG 1': 0, 'SPG 2': 0 }
    sales.forEach(s => {
      const pkg = PACKAGES.find(p => p.name === s.package_name)
      if (pkg) {
        totals[s.crew_name] = (totals[s.crew_name] || 0) + (s.quantity * pkg.price)
      }
    })
    return totals
  }, [sales])

  // Combined grand total of package sales
  const grandTotalSales = useMemo(() => {
    return Object.values(crewSalesTotals).reduce((sum, val) => sum + val, 0)
  }, [crewSalesTotals])

  // Consolidated Cash & QRIS setoran totals across all crew members
  const consolidatedFinancials = useMemo(() => {
    let totalFisik = 0
    let totalQris = 0
    allFinancialRecaps.forEach(r => {
      totalFisik += parseInt(r.uang_fisik || 0, 10)
      totalQris += parseInt(r.uang_qris || 0, 10)
    })
    return { totalFisik, totalQris }
  }, [allFinancialRecaps])

  // Reconciliation data comparing physical stock usage vs theoretical sales requirements
  const reconciliationData = useMemo(() => {
    // 1. Calculate theoretical usage from sales packages
    const theoretical = {}
    DEFAULT_STOCK_ITEMS.forEach(item => {
      theoretical[item.name] = 0
    })
    theoretical['KTG RTD (Combined)'] = 0

    sales.forEach(sale => {
      const qty = sale.quantity || 0
      if (qty <= 0) return

      if (sale.package_name === 'Paket Foldable Bag') {
        theoretical['KTG Asli Pouch 138Gr'] += qty * 1
        theoretical['KTG MIX Pouch'] += qty * 1
        theoretical['KTG SPC MIX Mangga Rtg'] += qty * 1
        theoretical['Foldable Bag'] += qty * 1
      } else if (sale.package_name === 'Paket Pouch') {
        theoretical['KTG Asli Pouch 138Gr'] += qty * 1
        theoretical['KTG Manis Pouch'] += qty * 2
        theoretical['Pouch KTG'] += qty * 1
      } else if (sale.package_name === 'Paket KTG RTD No Gimmick') {
        theoretical['KTG RTD (Combined)'] += qty * 3
      } else if (sale.package_name === 'Paket Tas') {
        theoretical['KTG RTD (Combined)'] += qty * 10
        theoretical['Tas Tabung'] += qty * 1
      } else if (sale.package_name === 'Paket 5 Days Family Pack') {
        theoretical['5 Days Family Pack'] += qty * 1
      }
    })

    // 2. Map to list of rows
    const rows = []

    // Helper to get physical usage (pemakaian)
    const getPhysicalPemakaian = (itemName) => {
      const rec = stockRecords.find(r => r.item_name === itemName)
      return rec ? parseInt(rec.pemakaian || 0, 10) : 0
    }

    // Add regular pouch/pack items
    const singleItems = [
      { name: 'KTG Manis Pouch', cat: 'PRODUK' },
      { name: 'KTG MIX Pouch', cat: 'PRODUK' },
      { name: 'KTG Asli Pouch 138Gr', cat: 'PRODUK' },
      { name: 'KTG SPC MIX Mangga Rtg', cat: 'PRODUK' },
      { name: '5 Days Family Pack', cat: 'PRODUK' },
      { name: 'Mini Croissant', cat: 'PRODUK' },
      { name: 'Foldable Bag', cat: 'GIMMICK' },
      { name: 'Pouch KTG', cat: 'GIMMICK' },
      { name: 'Tas Tabung', cat: 'GIMMICK' }
    ]

    singleItems.forEach(item => {
      const fisik = getPhysicalPemakaian(item.name)
      const teoretis = theoretical[item.name] || 0
      rows.push({
        name: item.name,
        category: item.cat,
        fisik,
        teoretis,
        selisih: fisik - teoretis
      })
    })

    // Add combined RTD row
    const rtdFisik = 
      getPhysicalPemakaian('KTG RTD Gula Batu') + 
      getPhysicalPemakaian('KTG RTD Mangga') + 
      getPhysicalPemakaian('FREE KTG RTD GULA BATU') + 
      getPhysicalPemakaian('FREE KTG RTD MANGGA')
    
    const rtdTeoretis = theoretical['KTG RTD (Combined)'] || 0

    rows.push({
      name: 'KTG RTD (Gula Batu + Mangga + Free)',
      category: 'PRODUK',
      fisik: rtdFisik,
      teoretis: rtdTeoretis,
      selisih: rtdFisik - rtdTeoretis
    })

    return rows
  }, [sales, stockRecords])

  // Helper to sum package quantity sold across all crew members on the current date
  const getPackageQtySold = (packageName) => {
    return sales.reduce((sum, s) => {
      if (s.package_name === packageName) {
        return sum + (s.quantity || 0)
      }
      return sum
    }, 0)
  }

  // Update theoretical sales in activeFinancialRecap whenever their specific crew sales total changes
  useEffect(() => {
    const activeCrewTotal = crewSalesTotals[activeRole] || 0
    if (activeFinancialRecap && activeFinancialRecap.total_penjualan !== activeCrewTotal) {
      setActiveFinancialRecap(prev => ({
        ...prev,
        total_penjualan: activeCrewTotal
      }))
    }
  }, [crewSalesTotals, activeRole, activeFinancialRecap])

  // --- Handlers ---
  
  // Handle quantity changes for active crew sales
  const handleQuantityChange = async (packageName, delta) => {
    const currentQty = activeSalesMap[packageName] || 0
    const newQty = Math.max(0, currentQty + delta)
    
    // Update local sales state instantly for smooth UI responsive feeling
    let salesCopy = [...sales]
    const idx = salesCopy.findIndex(s => s.crew_name === activeRole && s.package_name === packageName)
    
    const pkg = PACKAGES.find(p => p.name === packageName)
    
    const targetSale = {
      date: selectedDate,
      shift_type: shiftType,
      crew_name: activeRole,
      package_name: packageName,
      quantity: newQty,
      price_per_unit: pkg.price
    }

    if (idx >= 0) {
      // update existing
      if (newQty === 0) {
        // If 0, we can delete or keep with 0. Keep with 0 is fine, or delete. Let's keep for database record or delete if we want to save space. Let's keep it.
        salesCopy[idx].quantity = 0
        salesCopy[idx].total_price = 0
      } else {
        salesCopy[idx].quantity = newQty
        salesCopy[idx].total_price = newQty * pkg.price
      }
      targetSale.id = salesCopy[idx].id
    } else if (newQty > 0) {
      // create new
      salesCopy.push({
        ...targetSale,
        id: `temp-${Date.now()}-${packageName}`,
        total_price: newQty * pkg.price
      })
    }

    setSales(salesCopy)

    // Save to DB in background
    try {
      const saved = await db.saveSale(targetSale)
      // replace temporary ID with actual DB ID
      setSales(prev => prev.map(s => {
        if (s.crew_name === activeRole && s.package_name === packageName) {
          return { ...s, id: saved.id }
        }
        return s
      }))
    } catch (err) {
      console.error(err)
      showToast('error', 'Gagal menyimpan perubahan penjualan!')
    }
  }

  // Handle stock field edits
  const handleStockChange = (itemName, field, value) => {
    setStockRecords(prev => prev.map(r => {
      if (r.item_name === itemName) {
        const updated = { ...r, [field]: value }
        
        // Recalculate computed values
        if (field === 'pengambilan' || field === 'sisa_kemarin') {
          const itemObj = DEFAULT_STOCK_ITEMS.find(i => i.name === itemName)
          const isiKarton = itemObj ? itemObj.isiKarton : 1
          const totalPengambilan = field === 'pengambilan' ? parseFormula(value, isiKarton) : r.total_pengambilan
          const sisaKemarin = field === 'sisa_kemarin' ? parseInt(value || 0, 10) : r.sisa_kemarin
          updated.total_pengambilan = totalPengambilan
          updated.total_barang = sisaKemarin + totalPengambilan
          // Pemakaian = Total Barang - Sisa Akhir
          updated.pemakaian = updated.total_barang - parseInt(updated.sisa_akhir || 0, 10)
        } else if (field === 'sisa_akhir') {
          const sisaAkhir = parseInt(value || 0, 10)
          updated.pemakaian = r.total_barang - sisaAkhir
        }

        return updated
      }
      return r
    }))
  }

  // Handle stock field blur (auto-save single record)
  const handleStockBlur = async (itemName) => {
    const record = stockRecords.find(r => r.item_name === itemName)
    if (record) {
      try {
        await db.saveStockRecord(record)
      } catch (err) {
        console.error('Failed to auto-save stock record:', err)
      }
    }
  }

  // Handle stock addition via package shortcut
  const handleAddStockShortcut = (packageName, qty, targetField = shortcutTarget) => {
    if (qty <= 0) return
    
    let additions = {}
    if (packageName === 'Paket Foldable Bag') {
      additions = {
        'KTG Asli Pouch 138Gr': 1 * qty,
        'KTG MIX Pouch': 1 * qty,
        'KTG SPC MIX Mangga Rtg': 1 * qty,
        'Foldable Bag': 1 * qty
      }
    } else if (packageName === 'Paket Pouch') {
      additions = {
        'KTG Asli Pouch 138Gr': 1 * qty,
        'KTG Manis Pouch': 2 * qty,
        'Pouch KTG': 1 * qty
      }
    } else if (packageName === 'Paket KTG RTD No Gimmick') {
      additions = {
        'KTG RTD Gula Batu': 1 * qty,
        'KTG RTD Mangga': 1 * qty,
        'FREE KTG RTD GULA BATU': 1 * qty
      }
    } else if (packageName === 'Paket Tas') {
      additions = {
        'KTG RTD Gula Batu': 5 * qty,
        'KTG RTD Mangga': 5 * qty,
        'Tas Tabung': 1 * qty
      }
    }

    const updatedRecords = stockRecords.map(r => {
      const addQty = additions[r.item_name]
      if (addQty) {
        if (targetField === 'pengambilan') {
          let newPengambilan = r.pengambilan
          if (newPengambilan === '0' || !newPengambilan) {
            newPengambilan = String(addQty)
          } else {
            newPengambilan = `${newPengambilan}+${addQty}`
          }
          
          const itemObj = DEFAULT_STOCK_ITEMS.find(i => i.name === r.item_name)
          const isiKarton = itemObj ? itemObj.isiKarton : 1
          const totalPengambilan = parseFormula(newPengambilan, isiKarton)
          const sisaKemarin = parseInt(r.sisa_kemarin || 0, 10)
          const totalBarang = sisaKemarin + totalPengambilan
          const sisaAkhir = parseInt(r.sisa_akhir || 0, 10)
          const pemakaian = totalBarang - sisaAkhir
          
          return {
            ...r,
            pengambilan: newPengambilan,
            total_pengambilan: totalPengambilan,
            total_barang: totalBarang,
            pemakaian: pemakaian
          }
        } else if (targetField === 'sisa_kemarin') {
          const currentSisaKemarin = parseInt(r.sisa_kemarin || 0, 10)
          const newSisaKemarin = currentSisaKemarin + addQty
          
          const totalPengambilan = r.total_pengambilan || 0
          const totalBarang = newSisaKemarin + totalPengambilan
          const sisaAkhir = parseInt(r.sisa_akhir || 0, 10)
          const pemakaian = totalBarang - sisaAkhir
          
          return {
            ...r,
            sisa_kemarin: newSisaKemarin,
            total_barang: totalBarang,
            pemakaian: pemakaian
          }
        } else {
          // targetField === 'sisa_akhir'
          const currentSisaAkhir = parseInt(r.sisa_akhir || 0, 10)
          const newSisaAkhir = currentSisaAkhir + addQty
          
          const sisaKemarin = parseInt(r.sisa_kemarin || 0, 10)
          const totalPengambilan = r.total_pengambilan || 0
          const totalBarang = sisaKemarin + totalPengambilan
          const pemakaian = totalBarang - newSisaAkhir
          
          return {
            ...r,
            sisa_akhir: newSisaAkhir,
            pemakaian: pemakaian
          }
        }
      }
      return r
    })

    setStockRecords(updatedRecords)
    db.saveStockRecordsBulk(updatedRecords).catch(console.error)

    const getTargetLabel = () => {
      if (targetField === 'pengambilan') return 'pengambilan'
      if (targetField === 'sisa_kemarin') return 'sisa kemarin'
      return 'sisa akhir'
    }
    showToast('success', `Berhasil menambah ${qty}x ${packageName} ke ${getTargetLabel()} stok!`)
  }

  // Save all stock records in bulk
  const saveAllStock = async () => {
    setSaving(true)
    try {
      const saved = await db.saveStockRecordsBulk(stockRecords)
      setStockRecords(saved)
      showToast('success', 'Manajemen stok berhasil disimpan!')
    } catch (err) {
      console.error(err)
      showToast('error', 'Gagal menyimpan stok!')
    } finally {
      setSaving(false)
    }
  }

  // Handle financial recap edits
  const handleFinancialChange = (field, value) => {
    if (!activeFinancialRecap) return
    const updated = { ...activeFinancialRecap, [field]: parseInt(value || 0, 10) }
    
    // Recalculate discrepancy (selisih) locally for instant responsiveness
    const totalPenjualan = updated.total_penjualan || 0
    const uangFisik = updated.uang_fisik || 0
    const uangQris = updated.uang_qris || 0
    const modalAwal = updated.modal_awal || 0
    updated.selisih = (uangFisik + uangQris) - (totalPenjualan + modalAwal)

    setActiveFinancialRecap(updated)
  }

  // Handle financial recap fields blur (auto-save closing data)
  const handleFinancialBlur = async () => {
    if (activeFinancialRecap) {
      try {
        const saved = await db.saveFinancialRecap(activeFinancialRecap)
        setActiveFinancialRecap(saved)
        
        // Re-fetch all crew recaps to refresh the consolidated admin calculator
        const allRecaps = await db.fetchFinancialRecapsForDate(selectedDate, shiftType)
        setAllFinancialRecaps(allRecaps || [])
      } catch (err) {
        console.error('Failed to auto-save financial recap:', err)
      }
    }
  }

  // Save financial closing
  const saveClosing = async () => {
    if (!activeFinancialRecap) return
    setSaving(true)
    try {
      const saved = await db.saveFinancialRecap(activeFinancialRecap)
      setActiveFinancialRecap(saved)
      
      const allRecaps = await db.fetchFinancialRecapsForDate(selectedDate, shiftType)
      setAllFinancialRecaps(allRecaps || [])
      
      showToast('success', 'Laporan closing keuangan berhasil disimpan!')
    } catch (err) {
      console.error(err)
      showToast('error', 'Gagal menyimpan closing!')
    } finally {
      setSaving(false)
    }
  }

  // Handle password submission for SPB Admin role
  const handleAuthSubmit = () => {
    if (authPassword === '2103') {
      setIsAdminAuthenticated(true)
      localStorage.setItem('is_admin_authenticated', 'true')
      setActiveRole('SPB')
      setShowAuthModal(false)
      setAuthPassword('')
      setErrorMsg('')
      showToast('success', 'Akses Admin berhasil dibuka!')
    } else {
      setErrorMsg('Password salah!')
      setAuthPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text pb-16 flex flex-col font-sans">
      
      {/* App Toast Notifications */}
      {toast && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border ${
            toast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' 
              : toast.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/30 text-rose-300'
              : 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300'
          } backdrop-blur-md`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-dark-bg/85 backdrop-blur-md border-b border-dark-border px-4 py-3">
        <div className="max-w-md mx-auto flex flex-col space-y-3">
          {/* Logo & Network Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg text-white">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-400 bg-clip-text text-transparent m-0 leading-none">
                  SHIFTFLOW PWA
                </h1>
                <p className="text-[10px] text-dark-muted font-medium mt-0.5 leading-none">Event Stock & Sales Tracker</p>
              </div>
            </div>

            {/* Supabase Connection Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-dark-card border border-dark-border text-[10px] font-semibold">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] pulse-glow' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24] pulse-glow'}`}></span>
              <span className={isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                {isSupabaseConfigured ? 'Supabase Cloud' : 'Mode Demo (Lokal)'}
              </span>
            </div>
          </div>

          {/* Date Picker & Shift Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {/* Date Selection */}
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-dark-muted absolute left-3 pointer-events-none" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-dark-card border border-dark-border rounded-xl pl-9 pr-2 py-2 text-xs font-semibold text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Shift Picker Toggle */}
            <div className="grid grid-cols-2 p-1 bg-dark-card rounded-xl border border-dark-border">
              <button 
                onClick={() => setShiftType('Weekday')}
                className={`py-1 text-center rounded-lg text-xs font-bold transition-all duration-200 ${
                  shiftType === 'Weekday' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                Weekday
              </button>
              <button 
                onClick={() => setShiftType('Weekend')}
                className={`py-1 text-center rounded-lg text-xs font-bold transition-all duration-200 ${
                  shiftType === 'Weekend' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-dark-muted hover:text-dark-text'
                }`}
              >
                Weekend
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-dark-muted font-medium animate-pulse">Menghubungkan data...</p>
          </div>
        ) : (
          <div className="space-y-5 fade-in">
            
            {/* ROLE SWITCHER BAR */}
            <div className="bg-dark-card p-1.5 rounded-2xl border border-dark-border flex space-x-1">
              {crewList.map((crew) => (
                <button
                  key={crew}
                  onClick={() => {
                    if (crew === 'SPB' && activeRole !== 'SPB') {
                      if (isAdminAuthenticated) {
                        setActiveRole('SPB')
                      } else {
                        setShowAuthModal(true)
                      }
                    } else {
                      setActiveRole(crew)
                    }
                  }}
                  className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all duration-300 flex flex-col items-center justify-center ${
                    activeRole === crew 
                      ? 'bg-indigo-950 border border-indigo-500/30 text-indigo-200' 
                      : 'text-dark-muted hover:text-dark-text bg-transparent border border-transparent'
                  }`}
                >
                  <span className="text-[10px] opacity-75 font-medium">Crew</span>
                  <span className="truncate w-full">{getCrewLabel(crew)}</span>
                </button>
              ))}
            </div>

            {/* VIEW MANAGEMENT FOR SPG (ONLY INPUT OWN SALES) */}
            {activeRole !== 'SPB' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-dark-border/40 pb-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Input Penjualan {getCrewLabel(activeRole)}
                    </h2>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Total: Rp {crewSalesTotals[activeRole]?.toLocaleString('id-ID') || 0}
                  </span>
                </div>

                {/* Sales counters list */}
                <div className="space-y-3">
                  {PACKAGES.map((pkg) => {
                    const quantity = activeSalesMap[pkg.name] || 0
                    return (
                      <div 
                        key={pkg.name} 
                        className="glass p-3.5 rounded-2xl border border-dark-border flex flex-col space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">{pkg.name}</h3>
                            <p className="text-[10px] text-indigo-400 font-semibold">Rp {pkg.price.toLocaleString('id-ID')}</p>
                            <p className="text-[10px] text-dark-muted leading-tight pr-6">{pkg.desc}</p>
                          </div>
                        </div>

                        {/* Interactive Plus Minus Counters */}
                        <div className="flex items-center justify-between pt-2 border-t border-dark-border/40">
                          <span className="text-[11px] font-bold text-dark-muted">Terjual Shift Ini:</span>
                          <div className="flex items-center space-x-3.5">
                            <button
                              disabled={quantity <= 0}
                              onClick={() => handleQuantityChange(pkg.name, -1)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                                quantity > 0 
                                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-400 hover:bg-rose-950/60' 
                                  : 'bg-dark-card border-dark-border text-dark-muted opacity-40 cursor-not-allowed'
                              }`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className={`w-8 text-center text-sm font-black ${quantity > 0 ? 'text-indigo-400 text-lg' : 'text-dark-muted'}`}>
                              {quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(pkg.name, 1)}
                              className="w-9 h-9 rounded-full bg-indigo-950/50 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-950 flex items-center justify-center transition-all active:scale-90"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* SPG Cash & QRIS Setoran Input */}
                {activeFinancialRecap && (
                  <div className="glass p-4 rounded-2xl border border-dark-border space-y-3.5 mt-4">
                    <div className="flex items-center space-x-2 pb-1 border-b border-dark-border/40">
                      <DollarSign className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Setoran Hasil Penjualan</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[9px] font-bold text-dark-muted uppercase">Uang Fisik (Cash)</label>
                        <div className="relative flex items-center">
                          <span className="text-xs font-bold text-dark-muted absolute left-3 pointer-events-none">Rp</span>
                          <input
                            type="number"
                            value={activeFinancialRecap.uang_fisik === 0 ? '' : activeFinancialRecap.uang_fisik}
                            onChange={(e) => handleFinancialChange('uang_fisik', e.target.value)}
                            onBlur={handleFinancialBlur}
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-2 text-xs text-white bg-dark-bg border border-dark-border/60 rounded-xl focus:border-indigo-500 focus:ring-0"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[9px] font-bold text-dark-muted uppercase">Uang QRIS</label>
                        <div className="relative flex items-center">
                          <span className="text-xs font-bold text-dark-muted absolute left-3 pointer-events-none">Rp</span>
                          <input
                            type="number"
                            value={activeFinancialRecap.uang_qris === 0 ? '' : activeFinancialRecap.uang_qris}
                            onChange={(e) => handleFinancialChange('uang_qris', e.target.value)}
                            onBlur={handleFinancialBlur}
                            placeholder="0"
                            className="w-full pl-8 pr-2 py-2 text-xs text-white bg-dark-bg border border-dark-border/60 rounded-xl focus:border-indigo-500 focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // VIEW MANAGEMENT FOR SPB (ADMIN WITH TABS)
              <div className="space-y-4">
                
                {/* ADMIN TABS SELECTOR */}
                <div className="flex bg-dark-card rounded-xl p-1 border border-dark-border">
                  <button
                    onClick={() => setAdminTab('sales')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                      adminTab === 'sales'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-dark-muted hover:text-dark-text'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Jualan SPB</span>
                  </button>
                  
                  <button
                    onClick={() => setAdminTab('stock')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                      adminTab === 'stock'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-dark-muted hover:text-dark-text'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Manajemen Stok</span>
                  </button>
                  
                  <button
                    onClick={() => setAdminTab('financial')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                      adminTab === 'financial'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-dark-muted hover:text-dark-text'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Rekap Keuangan</span>
                  </button>
                </div>

                {/* ADMIN TAB 1: SALES FORM FOR SPB */}
                {adminTab === 'sales' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-dark-border/40 pb-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                          Input Penjualan SPB (Admin)
                        </h2>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        Total: Rp {crewSalesTotals['SPB']?.toLocaleString('id-ID') || 0}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {PACKAGES.map((pkg) => {
                        const quantity = activeSalesMap[pkg.name] || 0
                        return (
                          <div 
                            key={pkg.name} 
                            className="glass p-3.5 rounded-2xl border border-dark-border flex flex-col space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="text-sm font-bold text-white">{pkg.name}</h3>
                                <p className="text-[10px] text-indigo-400 font-semibold">Rp {pkg.price.toLocaleString('id-ID')}</p>
                                <p className="text-[10px] text-dark-muted leading-tight pr-6">{pkg.desc}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-dark-border/40">
                              <span className="text-[11px] font-bold text-dark-muted">Terjual Shift Ini:</span>
                              <div className="flex items-center space-x-3.5">
                                <button
                                  disabled={quantity <= 0}
                                  onClick={() => handleQuantityChange(pkg.name, -1)}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                                    quantity > 0 
                                      ? 'bg-rose-950/40 border-rose-500/30 text-rose-400 hover:bg-rose-950/60' 
                                      : 'bg-dark-card border-dark-border text-dark-muted opacity-40 cursor-not-allowed'
                                  }`}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className={`w-8 text-center text-sm font-black ${quantity > 0 ? 'text-indigo-400 text-lg' : 'text-dark-muted'}`}>
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(pkg.name, 1)}
                                  className="w-9 h-9 rounded-full bg-indigo-950/50 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-950 flex items-center justify-center transition-all active:scale-90"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* SPB Cash & QRIS Setoran Input */}
                    {activeFinancialRecap && (
                      <div className="glass p-4 rounded-2xl border border-dark-border space-y-3.5 mt-4">
                        <div className="flex items-center space-x-2 pb-1 border-b border-dark-border/40">
                          <DollarSign className="w-4 h-4 text-indigo-400" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Setoran Hasil Penjualan</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[9px] font-bold text-dark-muted uppercase">Uang Fisik (Cash)</label>
                            <div className="relative flex items-center">
                              <span className="text-xs font-bold text-dark-muted absolute left-3 pointer-events-none">Rp</span>
                              <input
                                type="number"
                                value={activeFinancialRecap.uang_fisik === 0 ? '' : activeFinancialRecap.uang_fisik}
                                onChange={(e) => handleFinancialChange('uang_fisik', e.target.value)}
                                onBlur={handleFinancialBlur}
                                placeholder="0"
                                className="w-full pl-8 pr-2 py-2 text-xs text-white bg-dark-bg border border-dark-border/60 rounded-xl focus:border-indigo-500 focus:ring-0"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-[9px] font-bold text-dark-muted uppercase">Uang QRIS</label>
                            <div className="relative flex items-center">
                              <span className="text-xs font-bold text-dark-muted absolute left-3 pointer-events-none">Rp</span>
                              <input
                                type="number"
                                value={activeFinancialRecap.uang_qris === 0 ? '' : activeFinancialRecap.uang_qris}
                                onChange={(e) => handleFinancialChange('uang_qris', e.target.value)}
                                onBlur={handleFinancialBlur}
                                placeholder="0"
                                className="w-full pl-8 pr-2 py-2 text-xs text-white bg-dark-bg border border-dark-border/60 rounded-xl focus:border-indigo-500 focus:ring-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN TAB 2: STOCK MANAGEMENT */}
                {adminTab === 'stock' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-dark-border/40 pb-2">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                          Manajemen Stok Harian
                        </h2>
                      </div>
                      
                      <button
                        onClick={saveAllStock}
                        disabled={saving}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/40 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-lg active:scale-95 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? 'Menyimpan...' : 'Simpan Stok'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-dark-card border border-dark-border/60 rounded-2xl flex items-start space-x-2">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-dark-muted leading-relaxed">
                        Kolom <span className="text-white font-medium">Pengambilan</span> mendukung input aritmatika (cth: <span className="text-white font-mono bg-dark-border px-1 rounded">9+6</span> akan menjadi 15). Kolom <span className="text-white font-medium">Pemakaian</span> otomatis dihitung dari rumus: <span className="text-indigo-400 font-mono font-medium">Total Barang - Sisa Stock Akhir</span>.
                      </div>
                    </div>

                    {/* SHORTCUT TAMBAH STOK */}
                    <div className="glass p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-950/10 space-y-2.5">
                      <div className="flex items-center space-x-1.5 text-indigo-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <h3 className="text-[10px] font-bold uppercase tracking-wider">⚡ Shortcut Tambah Stok Paket</h3>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-7">
                          <select
                            value={shortcutPackage}
                            onChange={(e) => setShortcutPackage(e.target.value)}
                            className="w-full bg-dark-card border border-dark-border rounded-xl px-2 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="Paket Foldable Bag">Paket Foldable Bag (40k)</option>
                            <option value="Paket Pouch">Paket Pouch (60k)</option>
                            <option value="Paket KTG RTD No Gimmick">Paket RTD (10k)</option>
                            <option value="Paket Tas">Paket Tas (50k)</option>
                          </select>
                        </div>
                        
                        <div className="col-span-2 col-start-8">
                          <input
                            type="number"
                            value={shortcutQty}
                            onChange={(e) => setShortcutQty(Math.max(1, parseInt(e.target.value || 1, 10)))}
                            min="1"
                            className="w-full text-center py-2 text-xs"
                          />
                        </div>
                        
                        <div className="col-span-3 col-start-10">
                          <button
                            onClick={() => {
                              handleAddStockShortcut(shortcutPackage, shortcutQty)
                              setShortcutQty(1)
                            }}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] active:scale-95 transition-all text-center"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>

                      {/* Target selector segmented controls */}
                      <div className="grid grid-cols-3 p-0.5 bg-dark-card rounded-xl border border-dark-border">
                        <button
                          onClick={() => setShortcutTarget('sisa_kemarin')}
                          className={`py-1 text-center rounded-lg text-[9px] font-bold transition-all duration-150 ${
                            shortcutTarget === 'sisa_kemarin'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          Ke Sisa Kemarin
                        </button>
                        <button
                          onClick={() => setShortcutTarget('pengambilan')}
                          className={`py-1 text-center rounded-lg text-[9px] font-bold transition-all duration-150 ${
                            shortcutTarget === 'pengambilan'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          Ke Pengambilan
                        </button>
                        <button
                          onClick={() => setShortcutTarget('sisa_akhir')}
                          className={`py-1 text-center rounded-lg text-[9px] font-bold transition-all duration-150 ${
                            shortcutTarget === 'sisa_akhir'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-dark-muted hover:text-dark-text'
                          }`}
                        >
                          Ke Sisa Akhir
                        </button>
                      </div>
                    </div>

                    {/* Stock items table grouped by PRODUK and GIMMICK */}
                    <div className="space-y-4">
                      {['PRODUK', 'GIMMICK'].map((cat) => {
                        const catRecords = stockRecords.filter((item) => {
                          const itemObj = DEFAULT_STOCK_ITEMS.find((i) => i.name === item.item_name)
                          return itemObj ? itemObj.category === cat : false
                        })

                        if (catRecords.length === 0) return null

                        return (
                          <div key={cat} className="space-y-1.5 animate-fadeIn">
                            <h3 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest pl-1">
                              {cat}
                            </h3>
                            
                            <div className="overflow-x-auto rounded-2xl border border-dark-border bg-dark-card no-scrollbar shadow-lg">
                              <table className="min-w-[650px] w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-dark-border/30 text-dark-muted text-[9px] font-black uppercase tracking-wider border-b border-dark-border/60">
                                    <th className="px-3 py-2 border-r border-dark-border/40">Item</th>
                                    <th className="px-2 py-2 text-center border-r border-dark-border/40 w-20">Isi / Karton</th>
                                    <th className="px-2 py-2 text-center border-r border-dark-border/40 w-24">Sisa Kemarin (By Pcs)</th>
                                    <th className="px-2 py-2 text-center border-r border-dark-border/40 w-28">Pengambilan (By Pcs)</th>
                                    <th className="px-2 py-2 text-center border-r border-dark-border/40 w-20">Total Pengambilan</th>
                                    <th className="px-2 py-2 text-center border-r border-dark-border/40 w-20">Total Barang</th>
                                    <th className="px-2 py-2 text-center border-r border-dark-border/40 w-20 text-amber-400 font-extrabold">Pemakaian</th>
                                    <th className="px-2 py-2 text-center w-24 text-indigo-400 font-extrabold">Sisa Stock</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border/30">
                                  {catRecords.map((item) => {
                                    const itemObj = DEFAULT_STOCK_ITEMS.find((i) => i.name === item.item_name)
                                    const isiKarton = itemObj ? itemObj.isiKarton : 1
                                    return (
                                      <tr key={item.item_name} className="border-b border-dark-border/30 hover:bg-dark-border/10">
                                        <td className="px-3 py-2 text-[10px] font-bold text-white border-r border-dark-border/40 leading-snug">
                                          {item.item_name}
                                        </td>
                                        <td className="px-2 py-2 text-center text-[10px] text-dark-muted border-r border-dark-border/40 font-mono">
                                          {isiKarton}
                                        </td>
                                        <td className="px-1.5 py-1 border-r border-dark-border/40">
                                          <input
                                            type="number"
                                            value={item.sisa_kemarin === 0 ? '' : item.sisa_kemarin}
                                            onChange={(e) => handleStockChange(item.item_name, 'sisa_kemarin', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                                            onBlur={() => handleStockBlur(item.item_name)}
                                            placeholder="0"
                                            className="w-full text-center py-1 text-[10px] bg-dark-bg border border-dark-border/60 rounded"
                                          />
                                        </td>
                                        <td className="px-1.5 py-1 border-r border-dark-border/40">
                                          <input
                                            type="text"
                                            value={item.pengambilan}
                                            onChange={(e) => handleStockChange(item.item_name, 'pengambilan', e.target.value)}
                                            onBlur={() => handleStockBlur(item.item_name)}
                                            placeholder="0"
                                            className="w-full text-center py-1 text-[10px] font-mono bg-dark-bg border border-dark-border/60 rounded"
                                          />
                                        </td>
                                        <td className="px-2 py-2 text-center text-[10px] font-bold text-emerald-400 border-r border-dark-border/40 font-mono">
                                          {item.total_pengambilan}
                                        </td>
                                        <td className="px-2 py-2 text-center text-[10px] font-bold text-white border-r border-dark-border/40 font-mono">
                                          {item.total_barang}
                                        </td>
                                        <td className="px-2 py-2 text-center text-[10px] font-black text-amber-500 border-r border-dark-border/40 font-mono">
                                          {item.pemakaian}
                                        </td>
                                        <td className="px-1.5 py-1">
                                          <input
                                            type="number"
                                            value={item.sisa_akhir === 0 ? '' : item.sisa_akhir}
                                            onChange={(e) => handleStockChange(item.item_name, 'sisa_akhir', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                                            onBlur={() => handleStockBlur(item.item_name)}
                                            placeholder="0"
                                            className="w-full text-center py-1 text-[10px] font-bold text-indigo-300 bg-indigo-950/20 border border-indigo-500/30 rounded focus:border-indigo-500"
                                          />
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ADMIN TAB 3: FINANCIAL RECAP */}
                {adminTab === 'financial' && activeFinancialRecap && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-dark-border/40 pb-2">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                          Rekap Closing Keuangan
                        </h2>
                      </div>
                      
                      <button
                        onClick={saveClosing}
                        disabled={saving}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/40 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-lg active:scale-95 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? 'Menyimpan...' : 'Simpan Closing'}</span>
                      </button>
                    </div>

                    {/* Excel-style Package Sales Report Table */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                        Laporan Penjualan Paket (Gabungan Crew)
                      </h3>
                      
                      <div className="overflow-x-auto rounded-2xl border border-dark-border bg-dark-card no-scrollbar shadow-lg">
                        <table className="min-w-[600px] w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-dark-border/30 text-dark-muted text-[9px] font-black uppercase tracking-wider border-b border-dark-border/60">
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40">Variant</th>
                              <th className="px-2.5 py-2 border-r border-dark-border/40">Paket</th>
                              <th className="px-2.5 py-2 border-r border-dark-border/40">Item</th>
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40">Harga</th>
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40">Qty Paket (Tally)</th>
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40">Total Paket</th>
                              <th className="px-2.5 py-2 text-center">Total Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-border/30">
                            {(() => {
                              const rows = []
                              PACKAGE_DETAILS.forEach((pkg) => {
                                const qtySold = getPackageQtySold(pkg.name)
                                const totalValue = qtySold * pkg.price
                                const totalValueText = qtySold > 0 ? `Rp ${totalValue.toLocaleString('id-ID')}` : '-'
                                
                                pkg.items.forEach((item, itemIdx) => {
                                  const isFirst = itemIdx === 0
                                  rows.push(
                                    <tr key={`${pkg.name}-${item.name}`} className="border-b border-dark-border/30 hover:bg-dark-border/10">
                                      {isFirst && (
                                        <td rowSpan={pkg.items.length} className="px-2 py-1.5 text-center text-[10px] font-bold text-dark-muted border-r border-dark-border/40">
                                          {pkg.variant}
                                        </td>
                                      )}
                                      {isFirst && (
                                        <td rowSpan={pkg.items.length} className="px-2 py-1.5 text-[10px] font-bold text-white border-r border-dark-border/40 leading-snug">
                                          {pkg.name}
                                        </td>
                                      )}
                                      <td className="px-2 py-1.5 text-[10px] text-dark-muted border-r border-dark-border/40 leading-snug">
                                        {item.name}
                                      </td>
                                      {isFirst && (
                                        <td rowSpan={pkg.items.length} className="px-2 py-1.5 text-center text-[10px] font-mono text-white border-r border-dark-border/40">
                                          Rp {pkg.price.toLocaleString('id-ID')}
                                        </td>
                                      )}
                                      {isFirst && (
                                        <td rowSpan={pkg.items.length} className="px-2 py-1.5 text-center text-[10px] font-mono text-indigo-400 border-r border-dark-border/40 font-bold leading-none">
                                          {getTallyString(qtySold)}
                                        </td>
                                      )}
                                      {isFirst && (
                                        <td rowSpan={pkg.items.length} className="px-2 py-1.5 text-center text-[11px] font-extrabold text-white border-r border-dark-border/40 font-mono">
                                          {qtySold}
                                        </td>
                                      )}
                                      {isFirst && (
                                        <td rowSpan={pkg.items.length} className="px-2 py-1.5 text-center text-[10px] font-bold text-emerald-400 font-mono">
                                          {totalValueText}
                                        </td>
                                      )}
                                    </tr>
                                  )
                                })
                              })
                              return rows
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Stock Reconciliation & Matching Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                          Rekonsiliasi Pemakaian Stok vs Penjualan
                        </h3>
                        <span className="text-[8px] font-extrabold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                          Kecocokan Fisik vs Teoretis
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto rounded-2xl border border-dark-border bg-dark-card no-scrollbar shadow-lg">
                        <table className="min-w-[600px] w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-dark-border/30 text-dark-muted text-[9px] font-black uppercase tracking-wider border-b border-dark-border/60">
                              <th className="px-2.5 py-2 border-r border-dark-border/40">Nama Barang</th>
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40 w-24">Kategori</th>
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40 w-32 text-amber-400 font-extrabold">Stok Terpakai (Fisik)</th>
                              <th className="px-2.5 py-2 text-center border-r border-dark-border/40 w-32 text-indigo-400 font-extrabold">Stok Terjual (Teoretis)</th>
                              <th className="px-2.5 py-2 text-center w-36">Selisih Stok</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-border/30 text-[10px]">
                            {reconciliationData.map((row) => {
                              return (
                                <tr key={row.name} className="border-b border-dark-border/30 hover:bg-dark-border/10">
                                  <td className="px-2.5 py-1.5 font-bold text-white border-r border-dark-border/40 leading-snug">
                                    {row.name}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center text-dark-muted border-r border-dark-border/40 font-semibold font-mono">
                                    {row.category}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center text-amber-500 font-bold border-r border-dark-border/40 font-mono">
                                    {row.fisik}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center text-indigo-400 font-bold border-r border-dark-border/40 font-mono">
                                    {row.teoretis}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center font-bold">
                                    {row.selisih === 0 ? (
                                      <span className="text-emerald-400 font-black">0 (Klop)</span>
                                    ) : row.selisih > 0 ? (
                                      <span className="text-rose-400 font-black">+{row.selisih} (Stok Hilang)</span>
                                    ) : (
                                      <span className="text-cyan-400 font-black">{row.selisih} (Selisih Kurang)</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Compact Sales Breakdown by crew */}
                    <div className="glass p-3 rounded-2xl border border-dark-border space-y-2">
                      <h3 className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">Kontribusi Penjualan Crew</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {crewList.map((crew) => (
                          <div key={crew} className="bg-dark-card border border-dark-border/40 p-2 rounded-xl text-center">
                            <div className="text-[8px] font-bold text-dark-muted uppercase truncate">{getCrewLabel(crew)}</div>
                            <div className="text-[11px] font-extrabold text-indigo-400 mt-0.5 font-mono">
                              Rp {crewSalesTotals[crew]?.toLocaleString('id-ID') || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* History/Breakdown table of crew setoran */}
                    <div className="glass p-3 rounded-2xl border border-dark-border space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-dark-border/40">
                        <h3 className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">Rincian Setoran Crew</h3>
                        <span className="text-[9px] font-extrabold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-500/20">History</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-dark-border/60 bg-dark-bg/40">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-dark-border/20 text-dark-muted text-[8px] font-black uppercase border-b border-dark-border/40">
                              <th className="px-2.5 py-1.5 border-r border-dark-border/30">Crew</th>
                              <th className="px-2.5 py-1.5 text-right border-r border-dark-border/30">Cash</th>
                              <th className="px-2.5 py-1.5 text-right border-r border-dark-border/30">QRIS</th>
                              <th className="px-2.5 py-1.5 text-right font-black">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-border/20 font-medium">
                            {crewList.map((crew) => {
                              const crewRecap = allFinancialRecaps.find(r => r.crew_name === crew) || { uang_fisik: 0, uang_qris: 0 }
                              const cashVal = crewRecap.uang_fisik || 0
                              const qrisVal = crewRecap.uang_qris || 0
                              const totalVal = cashVal + qrisVal
                              return (
                                <tr key={crew} className="hover:bg-dark-border/10 text-white">
                                  <td className="px-2.5 py-1.5 border-r border-dark-border/30 font-bold text-indigo-300">
                                    {getCrewLabel(crew)}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right border-r border-dark-border/30 font-mono">
                                    Rp {cashVal.toLocaleString('id-ID')}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right border-r border-dark-border/30 font-mono">
                                    Rp {qrisVal.toLocaleString('id-ID')}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-400">
                                    Rp {totalVal.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Closing calculations card */}
                    <div className="glass p-4 rounded-2xl border border-dark-border space-y-4">
                      {/* Setoran calculation targets */}
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-dark-card border border-dark-border p-2.5 rounded-xl">
                          <div className="text-[9px] font-bold text-dark-muted uppercase">Modal Awal</div>
                          <input 
                            type="number"
                            value={activeFinancialRecap.modal_awal === 0 ? '' : activeFinancialRecap.modal_awal}
                            onChange={(e) => handleFinancialChange('modal_awal', e.target.value)}
                            onBlur={handleFinancialBlur}
                            placeholder="0"
                            className="bg-transparent border-0 text-center w-full text-sm font-bold text-white focus:ring-0 mt-1"
                          />
                        </div>

                        <div className="bg-indigo-950/20 border border-indigo-500/20 p-2.5 rounded-xl">
                          <div className="text-[9px] font-bold text-indigo-400 uppercase">Target Uang</div>
                          <div className="text-sm font-bold text-indigo-300 mt-1">
                            Rp {(grandTotalSales + (activeFinancialRecap.modal_awal || 0)).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>

                      {/* Cash and QRIS inputs (Consolidated/Summed) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col space-y-1.5 opacity-80">
                          <label className="text-[10px] font-bold text-dark-muted uppercase">Total Uang Fisik (Cash)</label>
                          <div className="relative flex items-center">
                            <span className="text-xs font-bold text-indigo-400 absolute left-3 pointer-events-none">Rp</span>
                            <input
                              type="text"
                              value={consolidatedFinancials.totalFisik.toLocaleString('id-ID')}
                              disabled
                              className="w-full pl-8 pr-2 py-2.5 text-xs text-indigo-300 font-bold bg-dark-bg/50 border border-dark-border/40 rounded-xl cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col space-y-1.5 opacity-80">
                          <label className="text-[10px] font-bold text-dark-muted uppercase">Total Uang QRIS</label>
                          <div className="relative flex items-center">
                            <span className="text-xs font-bold text-indigo-400 absolute left-3 pointer-events-none">Rp</span>
                            <input
                              type="text"
                              value={consolidatedFinancials.totalQris.toLocaleString('id-ID')}
                              disabled
                              className="w-full pl-8 pr-2 py-2.5 text-xs text-indigo-300 font-bold bg-dark-bg/50 border border-dark-border/40 rounded-xl cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Discrepancy (Selisih) Alert Box */}
                      {(() => {
                        const totalUangReal = consolidatedFinancials.totalFisik + consolidatedFinancials.totalQris
                        const targetUang = grandTotalSales + (activeFinancialRecap.modal_awal || 0)
                        const selisih = totalUangReal - targetUang

                        return (
                          <div className={`p-4 rounded-xl border flex items-center justify-between ${
                            selisih === 0 
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                          }`}>
                            <div className="flex items-center space-x-2.5">
                              {selisih === 0 ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                              )}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Status Closing</div>
                                <div className="text-sm font-extrabold">
                                  {selisih === 0 ? 'Klop (Sesuai)' : selisih > 0 ? 'Surplus (Lebih)' : 'Minus (Kurang)'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] opacity-75 font-semibold">Selisih Uang</div>
                              <div className="text-sm font-black font-mono">
                                {selisih >= 0 ? '+' : ''}Rp {selisih.toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER NAVIGATION */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-dark-bg/90 border-t border-dark-border/80 py-2.5 px-4 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between text-[10px] font-bold text-dark-muted">
          <div className="flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Shift: {shiftType}</span>
          </div>
          
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Mobile-First PWA Active</span>
          </div>
        </div>
      </footer>

      {/* Admin Authorization Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass p-5 rounded-3xl border border-dark-border max-w-xs w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="text-center space-y-1.5">
              <Shield className="w-8 h-8 text-indigo-400 mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Akses Terkunci</h3>
              <p className="text-[10px] text-dark-muted leading-tight">Hanya SPB (Admin) yang dapat mengakses bagian ini.</p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={authPassword}
                onChange={(e) => {
                  setAuthPassword(e.target.value)
                  setErrorMsg('')
                }}
                placeholder="Masukkan Password"
                className="w-full text-center py-2.5 text-xs text-white bg-dark-bg border border-dark-border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAuthSubmit()
                }}
                autoFocus
              />
              {errorMsg && (
                <p className="text-[9px] text-rose-400 font-bold text-center animate-shake">{errorMsg}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowAuthModal(false)
                    setAuthPassword('')
                    setErrorMsg('')
                  }}
                  className="py-2 bg-dark-card border border-dark-border hover:bg-dark-border/40 text-dark-muted rounded-xl text-[10px] font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleAuthSubmit}
                  className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-lg"
                >
                  Masuk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

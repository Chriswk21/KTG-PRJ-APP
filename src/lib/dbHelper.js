import { supabase, isSupabaseConfigured } from './supabaseClient'

// --- Safe Arithmetic Parser ---
export const parseFormula = (str, isiKarton = 1) => {
  if (!str) return 0
  // Clean and evaluate formula. Replace 'k' or 'K' with '* isiKarton'
  const expanded = str.toLowerCase().replace(/k/g, `*${isiKarton}`)
  const sanitized = expanded.replace(/[^0-9+\-*/().\s]/g, '')
  if (!sanitized.trim()) return 0
  try {
    // Evaluate safely using Function constructor
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitized}`)()
    return typeof result === 'number' && !isNaN(result) ? Math.round(result) : 0
  } catch (e) {
    return 0
  }
}

// --- Default Stock Items List ---
export const DEFAULT_STOCK_ITEMS = [
  { name: 'KTG Manis Pouch', isiKarton: 12, category: 'PRODUK' },
  { name: 'KTG MIX Pouch', isiKarton: 12, category: 'PRODUK' },
  { name: 'KTG Asli Pouch 138Gr', isiKarton: 20, category: 'PRODUK' },
  { name: 'KTG SPC MIX Mangga Rtg', isiKarton: 12, category: 'PRODUK' },
  { name: 'KTG RTD Gula Batu', isiKarton: 12, category: 'PRODUK' },
  { name: 'KTG RTD Mangga', isiKarton: 12, category: 'PRODUK' },
  { name: '5 Days Family Pack', isiKarton: 8, category: 'PRODUK' },
  { name: 'Mini Croissant', isiKarton: 20, category: 'PRODUK' },
  { name: 'Foldable Bag', isiKarton: 1, category: 'GIMMICK' },
  { name: 'Pouch KTG', isiKarton: 1, category: 'GIMMICK' },
  { name: 'Tas Tabung', isiKarton: 1, category: 'GIMMICK' },
  { name: 'FREE KTG RTD GULA BATU', isiKarton: 12, category: 'GIMMICK' },
  { name: 'FREE KTG RTD MANGGA', isiKarton: 12, category: 'GIMMICK' }
]

// --- Helper to get date string in YYYY-MM-DD local format ---
export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

// --- LocalStorage Fallback DB implementation ---
const localDb = {
  getSales: (date) => {
    const data = localStorage.getItem('spg_sales')
    const sales = data ? JSON.parse(data) : []
    return sales.filter(s => s.date === date)
  },
  
  saveSale: (sale) => {
    const data = localStorage.getItem('spg_sales')
    const sales = data ? JSON.parse(data) : []
    
    const newSale = {
      id: sale.id || crypto.randomUUID(),
      date: sale.date || getLocalDateString(),
      shift_type: sale.shift_type,
      crew_name: sale.crew_name,
      package_name: sale.package_name,
      quantity: parseInt(sale.quantity || 0, 10),
      price_per_unit: parseInt(sale.price_per_unit || 0, 10),
      total_price: parseInt(sale.quantity || 0, 10) * parseInt(sale.price_per_unit || 0, 10),
      created_at: sale.created_at || new Date().toISOString()
    }
    
    // If it's an update
    const idx = sales.findIndex(s => s.id === newSale.id)
    if (idx >= 0) {
      sales[idx] = newSale
    } else {
      sales.push(newSale)
    }
    
    localStorage.setItem('spg_sales', JSON.stringify(sales))
    return newSale
  },

  deleteSale: (id) => {
    const data = localStorage.getItem('spg_sales')
    const sales = data ? JSON.parse(data) : []
    const filtered = sales.filter(s => s.id !== id)
    localStorage.setItem('spg_sales', JSON.stringify(filtered))
    return true
  },

  getStockRecords: (date, shiftType) => {
    const data = localStorage.getItem('spg_stock')
    const records = data ? JSON.parse(data) : []
    let dayRecords = records.filter(r => r.date === date)

    // Check if any default items are missing
    const existingNames = dayRecords.map(r => r.item_name)
    const missingItems = DEFAULT_STOCK_ITEMS.filter(item => !existingNames.includes(item.name))

    if (missingItems.length > 0) {
      // Find yesterday's stock to carry over
      const yesterdayDate = new Date(date)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = getLocalDateString(yesterdayDate)
      
      const yesterdayRecords = records.filter(r => r.date === yesterdayStr)
      const yesterdayStockMap = {}
      yesterdayRecords.forEach(r => {
        yesterdayStockMap[r.item_name] = r.sisa_akhir
      })

      const newRecords = missingItems.map(item => {
        const sisaKemarin = yesterdayStockMap[item.name] !== undefined ? yesterdayStockMap[item.name] : 0
        return {
          id: crypto.randomUUID(),
          date,
          shift_type: shiftType,
          item_name: item.name,
          sisa_kemarin: sisaKemarin,
          pengambilan: '0',
          total_pengambilan: 0,
          total_barang: sisaKemarin,
          pemakaian: 0,
          sisa_akhir: sisaKemarin
        }
      })

      dayRecords = [...dayRecords, ...newRecords]
      const updatedRecords = [...records, ...newRecords]
      localStorage.setItem('spg_stock', JSON.stringify(updatedRecords))
    }

    // Sort according to DEFAULT_STOCK_ITEMS order
    dayRecords.sort((a, b) => {
      const idxA = DEFAULT_STOCK_ITEMS.findIndex(item => item.name === a.item_name)
      const idxB = DEFAULT_STOCK_ITEMS.findIndex(item => item.name === b.item_name)
      return idxA - idxB
    })

    return dayRecords
  },

  saveStockRecord: (record) => {
    const data = localStorage.getItem('spg_stock')
    const records = data ? JSON.parse(data) : []
    
    const itemObj = DEFAULT_STOCK_ITEMS.find(i => i.name === record.item_name)
    const isiKarton = itemObj ? itemObj.isiKarton : 1
    const totalPengambilan = parseFormula(record.pengambilan, isiKarton)
    const totalBarang = parseInt(record.sisa_kemarin || 0, 10) + totalPengambilan
    const sisaAkhir = parseInt(record.sisa_akhir || 0, 10)
    // New logic: pemakaian = total_barang - sisa_akhir
    const pemakaian = totalBarang - sisaAkhir

    const newRecord = {
      ...record,
      id: record.id || crypto.randomUUID(),
      total_pengambilan: totalPengambilan,
      total_barang: totalBarang,
      pemakaian: pemakaian,
      sisa_akhir: sisaAkhir
    }

    const idx = records.findIndex(r => r.id === newRecord.id)
    if (idx >= 0) {
      records[idx] = newRecord
    } else {
      records.push(newRecord)
    }

    localStorage.setItem('spg_stock', JSON.stringify(records))
    return newRecord
  },

  saveStockRecordsBulk: (bulkRecords) => {
    const data = localStorage.getItem('spg_stock')
    let records = data ? JSON.parse(data) : []

    const processed = bulkRecords.map(r => {
      const itemObj = DEFAULT_STOCK_ITEMS.find(i => i.name === r.item_name)
      const isiKarton = itemObj ? itemObj.isiKarton : 1
      const totalPengambilan = parseFormula(r.pengambilan, isiKarton)
      const totalBarang = parseInt(r.sisa_kemarin || 0, 10) + totalPengambilan
      const sisaAkhir = parseInt(r.sisa_akhir || 0, 10)
      const pemakaian = totalBarang - sisaAkhir
      
      return {
        ...r,
        id: r.id || crypto.randomUUID(),
        total_pengambilan: totalPengambilan,
        total_barang: totalBarang,
        pemakaian: pemakaian,
        sisa_akhir: sisaAkhir
      }
    })

    processed.forEach(newRec => {
      const idx = records.findIndex(r => r.id === newRec.id || (r.date === newRec.date && r.item_name === newRec.item_name))
      if (idx >= 0) {
        records[idx] = { ...records[idx], ...newRec }
      } else {
        records.push(newRec)
      }
    })

    localStorage.setItem('spg_stock', JSON.stringify(records))
    return processed
  },

  getFinancialRecap: (date, shiftType, crewName = 'SPB') => {
    const data = localStorage.getItem('spg_recap')
    const recaps = data ? JSON.parse(data) : []
    const recap = recaps.find(r => r.date === date && (r.crew_name === crewName || (!r.crew_name && crewName === 'SPB')))
    
    if (recap) return { ...recap, crew_name: crewName }

    return {
      id: crypto.randomUUID(),
      date,
      shift_type: shiftType,
      crew_name: crewName,
      modal_awal: 0,
      uang_fisik: 0,
      uang_qris: 0,
      total_penjualan: 0,
      selisih: 0
    }
  },

  getFinancialRecapsForDate: (date) => {
    const data = localStorage.getItem('spg_recap')
    const recaps = data ? JSON.parse(data) : []
    return recaps.filter(r => r.date === date).map(r => ({ ...r, crew_name: r.crew_name || 'SPB' }))
  },

  saveFinancialRecap: (recap) => {
    const data = localStorage.getItem('spg_recap')
    const recaps = data ? JSON.parse(data) : []

    const totalPenjualan = parseInt(recap.total_penjualan || 0, 10)
    const uangFisik = parseInt(recap.uang_fisik || 0, 10)
    const uangQris = parseInt(recap.uang_qris || 0, 10)
    const modalAwal = parseInt(recap.modal_awal || 0, 10)
    const selisih = (uangFisik + uangQris) - (totalPenjualan + modalAwal)

    const newRecap = {
      ...recap,
      crew_name: recap.crew_name || 'SPB',
      id: recap.id || crypto.randomUUID(),
      total_penjualan: totalPenjualan,
      uang_fisik: uangFisik,
      uang_qris: uangQris,
      modal_awal: modalAwal,
      selisih: selisih
    }

    const idx = recaps.findIndex(r => r.id === newRecap.id || (r.date === newRecap.date && (r.crew_name || 'SPB') === newRecap.crew_name))
    if (idx >= 0) {
      recaps[idx] = newRecap
    } else {
      recaps.push(newRecap)
    }

    localStorage.setItem('spg_recap', JSON.stringify(recaps))
    return newRecap
  }
}

// --- Unified Database Interface ---
export const db = {
  // Sales CRUD
  fetchSales: async (date) => {
    if (!isSupabaseConfigured) {
      return localDb.getSales(date)
    }
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.getSales(date)
    }
  },

  saveSale: async (sale) => {
    if (!isSupabaseConfigured) {
      return localDb.saveSale(sale)
    }
    try {
      const saleToSave = {
        date: sale.date,
        shift_type: sale.shift_type,
        crew_name: sale.crew_name,
        package_name: sale.package_name,
        quantity: parseInt(sale.quantity || 0, 10),
        price_per_unit: parseInt(sale.price_per_unit || 0, 10)
      }
      
      if (sale.id) {
        saleToSave.id = sale.id
      }

      const { data, error } = await supabase
        .from('sales')
        .upsert(saleToSave)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.saveSale(sale)
    }
  },

  deleteSale: async (id) => {
    if (!isSupabaseConfigured) {
      return localDb.deleteSale(id)
    }
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.deleteSale(id)
    }
  },

  // Stock Records CRUD
  fetchStockRecords: async (date, shiftType) => {
    if (!isSupabaseConfigured) {
      return localDb.getStockRecords(date, shiftType)
    }
    try {
      const { data, error } = await supabase
        .from('stock_records')
        .select('*')
        .eq('date', date)

      if (error) throw error

      let finalRecords = data || []
      
      // Check if any default items are missing
      const existingNames = finalRecords.map(r => r.item_name)
      const missingItems = DEFAULT_STOCK_ITEMS.filter(item => !existingNames.includes(item.name))

      if (missingItems.length > 0) {
        // Fetch yesterday's records to carry over sisa_akhir for these missing items
        const yesterdayDate = new Date(date)
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)
        const yesterdayStr = getLocalDateString(yesterdayDate)

        const { data: yesterdayData } = await supabase
          .from('stock_records')
          .select('item_name, sisa_akhir')
          .eq('date', yesterdayStr)

        const yesterdayMap = {}
        if (yesterdayData) {
          yesterdayData.forEach(r => {
            yesterdayMap[r.item_name] = r.sisa_akhir
          })
        }

        const newRecordsToInsert = missingItems.map(item => {
          const sisaKemarin = yesterdayMap[item.name] !== undefined ? yesterdayMap[item.name] : 0
          return {
            date,
            shift_type: shiftType,
            item_name: item.name,
            sisa_kemarin: sisaKemarin,
            pengambilan: '0',
            total_pengambilan: 0,
            total_barang: sisaKemarin,
            pemakaian: 0,
            sisa_akhir: sisaKemarin
          }
        })

        const { data: insertedData, error: insertError } = await supabase
          .from('stock_records')
          .insert(newRecordsToInsert)
          .select()

        if (insertError) throw insertError
        finalRecords = [...finalRecords, ...insertedData]
      }

      // Sort final records according to the order of DEFAULT_STOCK_ITEMS
      finalRecords.sort((a, b) => {
        const idxA = DEFAULT_STOCK_ITEMS.findIndex(item => item.name === a.item_name)
        const idxB = DEFAULT_STOCK_ITEMS.findIndex(item => item.name === b.item_name)
        return idxA - idxB
      })

      return finalRecords
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.getStockRecords(date, shiftType)
    }
  },

  saveStockRecord: async (record) => {
    if (!isSupabaseConfigured) {
      return localDb.saveStockRecord(record)
    }
    try {
      const itemObj = DEFAULT_STOCK_ITEMS.find(i => i.name === record.item_name)
      const isiKarton = itemObj ? itemObj.isiKarton : 1
      const totalPengambilan = parseFormula(record.pengambilan, isiKarton)
      const totalBarang = parseInt(record.sisa_kemarin || 0, 10) + totalPengambilan
      const sisaAkhir = parseInt(record.sisa_akhir || 0, 10)
      const pemakaian = totalBarang - sisaAkhir

      const recordToSave = {
        date: record.date,
        shift_type: record.shift_type,
        item_name: record.item_name,
        sisa_kemarin: parseInt(record.sisa_kemarin || 0, 10),
        pengambilan: record.pengambilan,
        total_pengambilan: totalPengambilan,
        total_barang: totalBarang,
        pemakaian: pemakaian,
        sisa_akhir: sisaAkhir
      }

      if (record.id) {
        recordToSave.id = record.id
      }

      const { data, error } = await supabase
        .from('stock_records')
        .upsert(recordToSave)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.saveStockRecord(record)
    }
  },

  saveStockRecordsBulk: async (bulkRecords) => {
    if (!isSupabaseConfigured) {
      return localDb.saveStockRecordsBulk(bulkRecords)
    }
    try {
      const processed = bulkRecords.map(r => {
        const itemObj = DEFAULT_STOCK_ITEMS.find(i => i.name === r.item_name)
        const isiKarton = itemObj ? itemObj.isiKarton : 1
        const totalPengambilan = parseFormula(r.pengambilan, isiKarton)
        const totalBarang = parseInt(r.sisa_kemarin || 0, 10) + totalPengambilan
        const sisaAkhir = parseInt(r.sisa_akhir || 0, 10)
        const pemakaian = totalBarang - sisaAkhir
        
        const rec = {
          date: r.date,
          shift_type: r.shift_type,
          item_name: r.item_name,
          sisa_kemarin: parseInt(r.sisa_kemarin || 0, 10),
          pengambilan: r.pengambilan,
          total_pengambilan: totalPengambilan,
          total_barang: totalBarang,
          pemakaian: pemakaian,
          sisa_akhir: sisaAkhir
        }
        if (r.id) rec.id = r.id
        return rec
      })

      const { data, error } = await supabase
        .from('stock_records')
        .upsert(processed)
        .select()

      if (error) throw error
      return data
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.saveStockRecordsBulk(bulkRecords)
    }
  },

  // Financial Recap CRUD
  fetchFinancialRecap: async (date, shiftType, crewName = 'SPB') => {
    if (!isSupabaseConfigured) {
      return localDb.getFinancialRecap(date, shiftType, crewName)
    }
    try {
      const { data, error } = await supabase
        .from('financial_recap')
        .select('*')
        .eq('date', date)
        .eq('crew_name', crewName)
        .maybeSingle()

      if (error) throw error
      
      if (data) return data

      // If not found, return default
      return {
        date,
        shift_type: shiftType,
        crew_name: crewName,
        modal_awal: 0,
        uang_fisik: 0,
        uang_qris: 0,
        total_penjualan: 0,
        selisih: 0
      }
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.getFinancialRecap(date, shiftType, crewName)
    }
  },

  fetchFinancialRecapsForDate: async (date, shiftType) => {
    if (!isSupabaseConfigured) {
      return localDb.getFinancialRecapsForDate(date)
    }
    try {
      const { data, error } = await supabase
        .from('financial_recap')
        .select('*')
        .eq('date', date)

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.getFinancialRecapsForDate(date)
    }
  },

  saveFinancialRecap: async (recap) => {
    if (!isSupabaseConfigured) {
      return localDb.saveFinancialRecap(recap)
    }
    try {
      const totalPenjualan = parseInt(recap.total_penjualan || 0, 10)
      const uangFisik = parseInt(recap.uang_fisik || 0, 10)
      const uangQris = parseInt(recap.uang_qris || 0, 10)
      const modalAwal = parseInt(recap.modal_awal || 0, 10)
      const selisih = (uangFisik + uangQris) - (totalPenjualan + modalAwal)

      const recapToSave = {
        date: recap.date,
        shift_type: recap.shift_type,
        crew_name: recap.crew_name || 'SPB',
        modal_awal: modalAwal,
        uang_fisik: uangFisik,
        uang_qris: uangQris,
        total_penjualan: totalPenjualan,
        selisih: selisih
      }

      if (recap.id) {
        recapToSave.id = recap.id
      }

      const { data, error } = await supabase
        .from('financial_recap')
        .upsert(recapToSave)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.warn('Supabase error, using LocalStorage fallback:', err)
      return localDb.saveFinancialRecap(recap)
    }
  }
}

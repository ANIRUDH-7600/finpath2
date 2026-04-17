import { NextRequest } from 'next/server'
import type { TransactionCategory } from '@/types'

function guessCategory(description: string): TransactionCategory {
  const d = description.toLowerCase()
  if (/swiggy|zomato|food|restaurant|cafe|dining|lunch|dinner|breakfast|blinkit|zepto/.test(d)) return 'Food & Dining'
  if (/uber|ola|fuel|petrol|diesel|cab|taxi|metro|bus|train|rapido|bharat petroleum|hp petrol/.test(d)) return 'Transport'
  if (/netflix|hotstar|prime|spotify|youtube|zee5|sonyliv|jiocinema/.test(d)) return 'Subscriptions'
  if (/amazon|flipkart|myntra|meesho|nykaa|ajio|shopping/.test(d)) return 'Shopping'
  if (/hospital|pharmacy|apollo|medical|clinic|doctor|health|medicine|chemist|medplus|1mg/.test(d)) return 'Healthcare'
  if (/electricity|bescom|water|gas|bsnl|airtel jio|utility|broadband|recharge/.test(d)) return 'Utilities'
  if (/pvr|inox|cinema|movie|concert|event|theatre|bookmyshow/.test(d)) return 'Entertainment'
  return 'Other'
}

function parseDate(raw: string): string {
  raw = raw.trim()
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  const ddmmyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (ddmmyy) return `20${ddmmyy[3]}-${ddmmyy[2]}-${ddmmyy[1]}`
  const yyyymmdd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (yyyymmdd) return raw
  // Month name formats: "Apr 17, 2026"
  const monthName = raw.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})$/i)
  if (monthName) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    }
    const mm = months[monthName[1]] ?? '01'
    const dd = monthName[2].padStart(2, '0')
    return `${monthName[3]}-${mm}-${dd}`
  }
  return new Date().toISOString().split('T')[0]
}

function parseUPIText(text: string) {
  const transactions: Array<{ merchant: string; amount: number; date: string; category: TransactionCategory }> = []

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  let currentDate = ''
  const MONTH_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/i
  const TX_RE = /(?:Paid to|Received from|Paid at)\s+(.+?)\s+(DEBIT|CREDIT)\s+₹([\d,]+)/i
  const AMOUNT_RE = /(DEBIT|CREDIT)\s+₹([\d,]+)/i

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (MONTH_RE.test(line)) {
      currentDate = parseDate(line)
      continue
    }

    const txMatch = line.match(TX_RE)
    if (txMatch && currentDate) {
      const merchant = txMatch[1].replace(/\s+/g, ' ').trim()
      const type = txMatch[2].toUpperCase()
      const amount = parseFloat(txMatch[3].replace(/,/g, ''))

      if (type === 'DEBIT' && amount > 0) {
        const truncated = merchant.length > 50 ? merchant.slice(0, 50) : merchant
        transactions.push({
          merchant: truncated,
          amount,
          date: currentDate,
          category: guessCategory(merchant),
        })
      }
      continue
    }

    const amtMatch = line.match(AMOUNT_RE)
    if (amtMatch && currentDate && i > 0) {
      const prevLine = lines[i - 1] ?? ''
      if (!MONTH_RE.test(prevLine) && !/^\d{1,2}:\d{2}/.test(prevLine)) {
        const type = amtMatch[1].toUpperCase()
        const amount = parseFloat(amtMatch[2].replace(/,/g, ''))
        if (type === 'DEBIT' && amount > 0 && prevLine.length > 2) {
          const merchant = prevLine.replace(/(DEBIT|CREDIT)/i, '').trim()
          if (merchant.length > 1) {
            transactions.push({
              merchant: merchant.slice(0, 50),
              amount,
              date: currentDate,
              category: guessCategory(merchant),
            })
          }
        }
      }
    }
  }

  return transactions
}

function parseCSV(text: string) {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase()
  const isHDFC = header.includes('withdrawal') || header.includes('debit')
  const isSBI = header.includes('debit') && header.includes('balance')

  const transactions: Array<{ merchant: string; amount: number; date: string; category: TransactionCategory }> = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''))
    if (cols.length < 3) continue

    let date = ''
    let description = ''
    let amount = 0

    if (isHDFC || isSBI) {
      date = parseDate(cols[0])
      description = cols[1] ?? ''
      const debit = parseFloat(cols[3]?.replace(/,/g, '') ?? '0')
      amount = isNaN(debit) ? 0 : debit
    } else {
      date = parseDate(cols[0])
      description = cols[1] ?? ''
      const rawAmt = cols[2]?.replace(/,/g, '') ?? '0'
      amount = Math.abs(parseFloat(rawAmt) || 0)
    }

    if (!description || amount <= 0) continue
    const merchant = description.length > 40 ? description.slice(0, 40) : description
    transactions.push({ merchant, amount, date, category: guessCategory(description) })
  }

  return transactions
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')

    if (isPDF) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const pdfParse = (await import('pdf-parse')).default
        const pdfData = await pdfParse(buffer)
        const transactions = parseUPIText(pdfData.text)
        if (transactions.length === 0) {
          return Response.json({ error: 'No transactions found in PDF. Make sure it is a UPI/bank statement.' }, { status: 400 })
        }
        return Response.json(transactions)
      } catch {
        return Response.json({ error: 'PDF parsing failed. Ensure it is a readable UPI statement.' }, { status: 500 })
      }
    }

    const text = await file.text()

    // Try UPI text format first if it looks like one
    if (text.includes('Paid to') || text.includes('DEBIT') || text.includes('₹')) {
      const upiTx = parseUPIText(text)
      if (upiTx.length > 0) return Response.json(upiTx)
    }

    const csvTx = parseCSV(text)
    if (csvTx.length === 0) return Response.json({ error: 'No transactions found' }, { status: 400 })
    return Response.json(csvTx)
  } catch (error) {
    console.error('parse-csv error:', error)
    return Response.json({ error: 'File parsing failed' }, { status: 500 })
  }
}

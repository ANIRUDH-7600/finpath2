// app/api/parse-pdf/route.ts
import { NextRequest } from 'next/server'
import type { TransactionCategory } from '@/types'
import { PDFParse } from 'pdf-parse'

function guessCategory(description: string): TransactionCategory {
  const d = description.toLowerCase()
  if (/swiggy|zomato|food|restaurant|cafe|dining|lunch|dinner|breakfast|chicken|fresh market|grocery|kirana|bigbasket|reliance fresh|dmart|blinkit|zepto/.test(d))
    return 'Food & Dining'
  if (/uber|ola|fuel|petrol|diesel|cab|taxi|metro|bus|train|rapido|bharat petroleum|hp gas|indian oil|hpcl|bpcl|iocl/.test(d))
    return 'Transport'
  if (/netflix|hotstar|prime video|spotify|youtube|zee5|sonyliv|disney|google services/.test(d))
    return 'Subscriptions'
  if (/amazon|flipkart|myntra|meesho|nykaa|ajio|snapdeal|shopping|mall|store/.test(d))
    return 'Shopping'
  if (/hospital|pharmacy|medical|clinic|doctor|health|medicine|chemist|apollo|medplus|wellness|dental|health plus/.test(d))
    return 'Healthcare'
  if (/electricity|bescom|water|gas|bsnl|airtel|jio|broadband|bill|utility|recharge|tata power|tneb|mseb/.test(d))
    return 'Utilities'
  if (/pvr|inox|cinema|movie|concert|event|theatre|entertainment|bookmyshow/.test(d))
    return 'Entertainment'
  return 'Other'
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, '').replace(/\.$/, '')
  return parseFloat(cleaned) || 0
}

function parseDate(raw: string): string {
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const m = raw.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i)
  if (m) {
    const month = months[m[1].toLowerCase()]
    const day = m[2].padStart(2, '0')
    return `${m[3]}-${month}-${day}`
  }
  return new Date().toISOString().split('T')[0]
}

interface ParsedTransaction {
  merchant: string
  amount: number
  date: string
  category: TransactionCategory
}

function parsePhonePeText(text: string): ParsedTransaction[] {
  console.log('=== parsePhonePeText START ===')
  console.log('Input text length:', text.length)
  console.log('First 500 chars:', text.substring(0, 500))
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log('Total lines:', lines.length)
  
  const transactions: ParsedTransaction[] = []
  let currentDate = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Match date lines
    const dateMatch = line.match(/(?:📅\s*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i)
    if (dateMatch) {
      currentDate = parseDate(dateMatch[0])
      console.log('Found date:', currentDate)
      continue
    }
    
    // Match time lines and extract transaction
    if (line.match(/^\d{1,2}:\d{2}\s*(am|pm)/i)) {
      console.log('Found time line:', line)
      let merchant = ''
      let amount = 0
      let j = i + 1
      
      // Look ahead for merchant and amount (next 5-10 lines)
      while (j < lines.length && j < i + 10) {
        const nextLine = lines[j]
        
        // Extract merchant from "Paid to MERCHANT"
        const paidMatch = nextLine.match(/Paid to\s+(.+?)(?:\s+DEBIT|\s+CREDIT|$)/i)
        if (paidMatch && !merchant) {
          merchant = paidMatch[1].trim()
          console.log('Found merchant:', merchant)
        }
        
        // Extract amount
        const debitMatch = nextLine.match(/DEBIT\s*₹\s*([\d,]+(?:\.\d{1,2})?)/i)
        if (debitMatch) {
          amount = parseAmount(debitMatch[1])
          console.log('Found amount:', amount)
          break
        }
        
        // Also check for amount on same line as merchant
        const combinedMatch = nextLine.match(/Paid to\s+(.+?)\s+DEBIT\s*₹\s*([\d,]+(?:\.\d{1,2})?)/i)
        if (combinedMatch) {
          merchant = combinedMatch[1].trim()
          amount = parseAmount(combinedMatch[2])
          console.log('Found combined merchant & amount:', merchant, amount)
          break
        }
        
        j++
      }
      
      if (merchant && amount > 0 && currentDate) {
        transactions.push({
          merchant: merchant.slice(0, 50),
          amount,
          date: currentDate,
          category: guessCategory(merchant)
        })
        console.log('Added transaction:', { merchant, amount, date: currentDate })
      } else {
        console.log('Missing data - merchant:', merchant, 'amount:', amount, 'date:', currentDate)
      }
    }
  }
  
  console.log('Total transactions found:', transactions.length)
  return transactions
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  console.log('=== POST /api/parse-pdf START ===')
  
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      console.log('No file provided')
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('File:', file.name, 'Type:', file.type, 'Size:', file.size)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Use the new PDFParse API
    console.log('Creating PDF parser...')
    const parser = new PDFParse({ data: buffer })
    
    console.log('Extracting text from PDF...')
    const result = await parser.getText()
    
    console.log('Text extraction complete. Length:', result.text?.length)
    console.log('First 500 chars:', result.text?.substring(0, 500))
    
    // Clean up
    await parser.destroy()
    
    if (!result.text || result.text.length === 0) {
      console.log('No text extracted from PDF')
      return Response.json({ error: 'PDF contains no extractable text' }, { status: 422 })
    }
    
    const transactions = parsePhonePeText(result.text)
    
    if (transactions.length === 0) {
      console.log('No debit transactions found')
      return Response.json(
        { error: 'No debit transactions found. Ensure this is a PhonePe or UPI statement PDF.' },
        { status: 422 }
      )
    }
    
    console.log(`Successfully parsed ${transactions.length} transactions`)
    return Response.json(transactions)
    
  } catch (error) {
    console.error('Parse error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    return Response.json({ 
      error: 'Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
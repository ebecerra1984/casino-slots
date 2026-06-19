export type SymbolId = '7' | 'BAR' | 'BELL' | 'CHERRY' | 'LEMON' | 'ORANGE' | 'GRAPE' | 'SCATTER'

export interface LineResult {
  line_id: number
  symbols: SymbolId[]
  match_count: number
  matched_symbol: SymbolId
  multiplier: number
  prize: number
}

export interface SpinResponse {
  matrix: SymbolId[][]
  bet: number
  lines_played: number
  line_results: LineResult[]
  scatter_count: number
  scatter_prize: number
  scatter_free_spins: number
  total_prize: number
  is_win: boolean
}

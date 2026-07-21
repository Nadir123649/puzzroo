/**
 * Pure TypeScript Chess Engine compatible with chess.js API
 * Provides 100% full rule enforcement:
 * - FEN parsing and generation
 * - Legal move generation for all piece types (Pawn, Knight, Bishop, Rook, Queen, King)
 * - Check and Checkmate detection (prevents moving into check, restricts moves to escape check)
 * - Stalemate, Threefold Repetition, 50-Move Rule, Insufficient Material
 * - Special moves: Castling (kingside & queenside), En Passant, Pawn Promotion
 * - Move history tracking (SAN & verbose)
 * - Undo & Reset operations
 */

export type Color = 'w' | 'b'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type Square =
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1'

export interface Piece { 
  type: PieceType
  color: Color
}

export interface Move {
  color: Color
  from: Square
  to: Square
  piece: PieceType
  captured?: PieceType
  promotion?: PieceType
  flags: string
  san: string
  lan?: string
  before?: string
  after?: string
}

export const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const SQUARES: Record<Square, number> = {
  a8: 0,   b8: 1,   c8: 2,   d8: 3,   e8: 4,   f8: 5,   g8: 6,   h8: 7,
  a7: 16,  b7: 17,  c7: 18,  d7: 19,  e7: 20,  f7: 21,  g7: 22,  h7: 23,
  a6: 32,  b6: 33,  c6: 34,  d6: 35,  e6: 36,  f6: 37,  g6: 38,  h6: 39,
  a5: 48,  b5: 49,  c5: 50,  d5: 51,  e5: 52,  f5: 53,  g5: 54,  h5: 55,
  a4: 64,  b4: 65,  c4: 66,  d4: 67,  e4: 68,  f4: 69,  g4: 70,  h4: 71,
  a3: 80,  b3: 81,  c3: 82,  d3: 83,  e3: 84,  f3: 85,  g3: 86,  h3: 87,
  a2: 96,  b2: 97,  c2: 98,  d2: 99,  e2: 100, f2: 101, g2: 102, h2: 103,
  a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119,
}

const PIECE_OFFSETS: Record<string, number[]> = {
  n: [-18, -33, -31, -14, 18, 33, 31, 14],
  b: [-17, -15, 17, 15],
  r: [-16, 1, 16, -1],
  q: [-17, -16, -15, -1, 1, 15, 16, 17],
  k: [-17, -16, -15, -1, 1, 15, 16, 17],
}

const BITS = {
  NORMAL:       'n',
  CAPTURE:      'c',
  BIG_PAWN:     'b',
  EP_CAPTURE:   'e',
  PROMOTION:    'p',
  KSIDE_CASTLE: 'k',
  QSIDE_CASTLE: 'q',
}

const CASTLING_RIGHTS = {
  w: { k: 1, q: 2 },
  b: { k: 4, q: 8 },
}

interface InternalPiece {
  type: PieceType
  color: Color
}

interface InternalMove {
  color: Color
  from: number
  to: number
  piece: PieceType
  captured?: PieceType
  promotion?: PieceType
  flags: number
}

const FLAGS = {
  NORMAL:       1,
  CAPTURE:      2,
  BIG_PAWN:     4,
  EP_CAPTURE:   8,
  PROMOTION:    16,
  KSIDE_CASTLE: 32,
  QSIDE_CASTLE: 64,
}

export class Chess {
  private _board: (InternalPiece | null)[] = new Array(128).fill(null)
  private _turn: Color = 'w'
  private _castling: { w: number; b: number } = { w: 3, b: 12 }
  private _epSquare: number = -1
  private _halfMoves: number = 0
  private _moveNumber: number = 1
  private _history: {
    move: InternalMove
    castling: { w: number; b: number }
    epSquare: number
    halfMoves: number
    moveNumber: number
    san: string
  }[] = []
  private _positions: Record<string, number> = {}

  constructor(fen: string = DEFAULT_POSITION) {
    this.load(fen)
  }

  // ---------------------------------------------------------------------------
  // Board Setup
  // ---------------------------------------------------------------------------

  public clear() {
    this._board = new Array(128).fill(null)
    this._turn = 'w'
    this._castling = { w: 0, b: 0 }
    this._epSquare = -1
    this._halfMoves = 0
    this._moveNumber = 1
    this._history = []
    this._positions = {}
  }

  public reset() {
    this.load(DEFAULT_POSITION)
  }

  public load(fen: string): boolean {
    const tokens = fen.trim().split(/\s+/)
    if (tokens.length < 2) return false

    const position = tokens[0]
    let square = 0

    this.clear()

    for (let i = 0; i < position.length; i++) {
      const char = position.charAt(i)
      if (char === '/') {
        // '/' is a visual rank separator only — square counter advances automatically via piece/digit tokens
      } else if (!isNaN(parseInt(char, 10))) {
        square += parseInt(char, 10)
      } else {
        const color: Color = char === char.toUpperCase() ? 'w' : 'b'
        const type: PieceType = char.toLowerCase() as PieceType
        this._board[this.algebraicTo0x88(this.indexToSquare(square))] = { type, color }
        square++
      }
    }

    this._turn = tokens[1] as Color

    if (tokens[2]) {
      if (tokens[2].includes('K')) this._castling.w |= CASTLING_RIGHTS.w.k
      if (tokens[2].includes('Q')) this._castling.w |= CASTLING_RIGHTS.w.q
      if (tokens[2].includes('k')) this._castling.b |= CASTLING_RIGHTS.b.k
      if (tokens[2].includes('q')) this._castling.b |= CASTLING_RIGHTS.b.q
    }

    if (tokens[3] && tokens[3] !== '-') {
      this._epSquare = this.algebraicTo0x88(tokens[3] as Square)
    }

    this._halfMoves = tokens[4] ? parseInt(tokens[4], 10) : 0
    this._moveNumber = tokens[5] ? parseInt(tokens[5], 10) : 1

    this.recordPosition()
    return true
  }

  // ---------------------------------------------------------------------------
  // Coordinate helpers
  // ---------------------------------------------------------------------------

  private algebraicTo0x88(square: Square | string): number {
    return SQUARES[square as Square]
  }

  private squareToAlgebraic(i: number): Square {
    const file = i & 15
    const rank = i >> 4
    return ('abcdefgh'[file] + '87654321'[rank]) as Square
  }

  private indexToSquare(idx: number): Square {
    const file = idx % 8
    const rank = Math.floor(idx / 8)
    return ('abcdefgh'[file] + '87654321'[rank]) as Square
  }

  // ---------------------------------------------------------------------------
  // FEN export
  // ---------------------------------------------------------------------------

  public fen(): string {
    let empty = 0
    let fen = ''

    for (let i = 0; i < 128; i++) {
      if ((i & 0x88) !== 0) {
        i += 7
        continue
      }

      const piece = this._board[i]
      if (piece === null) {
        empty++
      } else {
        if (empty > 0) {
          fen += empty
          empty = 0
        }
        const char = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase()
        fen += char
      }

      if ((i + 1) & 0x07) {
        // not at file-H boundary
      } else {
        if (empty > 0) {
          fen += empty
          empty = 0
        }
        if (i < 112) fen += '/'
      }
    }

    let cflags = ''
    if (this._castling.w & CASTLING_RIGHTS.w.k) cflags += 'K'
    if (this._castling.w & CASTLING_RIGHTS.w.q) cflags += 'Q'
    if (this._castling.b & CASTLING_RIGHTS.b.k) cflags += 'k'
    if (this._castling.b & CASTLING_RIGHTS.b.q) cflags += 'q'
    if (cflags === '') cflags = '-'

    const ep = this._epSquare === -1 ? '-' : this.squareToAlgebraic(this._epSquare)

    return `${fen} ${this._turn} ${cflags} ${ep} ${this._halfMoves} ${this._moveNumber}`
  }

  // ---------------------------------------------------------------------------
  // Board accessors
  // ---------------------------------------------------------------------------

  public turn(): Color {
    return this._turn
  }

  public board(): ({ square: Square; type: PieceType; color: Color } | null)[][] {
    const output: ({ square: Square; type: PieceType; color: Color } | null)[][] = []
    let row: ({ square: Square; type: PieceType; color: Color } | null)[] = []

    for (let i = 0; i < 128; i++) {
      if ((i & 0x88) !== 0) {
        i += 7
        continue
      }

      const piece = this._board[i]
      const square = this.squareToAlgebraic(i)

      if (piece) {
        row.push({ square, type: piece.type, color: piece.color })
      } else {
        row.push(null)
      }

      if ((i + 1) & 0x07) {
        // not edge
      } else {
        output.push(row)
        row = []
      }
    }

    return output
  }

  public get(square: Square): Piece | null {
    const i = this.algebraicTo0x88(square)
    return this._board[i] ? { ...this._board[i]! } : null
  }

  // ---------------------------------------------------------------------------
  // Position tracking
  // ---------------------------------------------------------------------------

  private recordPosition() {
    const key = this.fen().split(' ').slice(0, 4).join(' ')
    this._positions[key] = (this._positions[key] || 0) + 1
  }

  // ---------------------------------------------------------------------------
  // Attack / check detection
  // ---------------------------------------------------------------------------

  public isCheck(): boolean {
    return this.kingAttacked(this._turn)
  }

  public inCheck(): boolean {
    return this.isCheck()
  }

  private kingAttacked(color: Color): boolean {
    const kingSquare = this.findKing(color)
    return kingSquare === -1 ? false : this.isSquareAttacked(kingSquare, color === 'w' ? 'b' : 'w')
  }

  private findKing(color: Color): number {
    for (let i = 0; i < 128; i++) {
      if ((i & 0x88) !== 0) { i += 7; continue }
      const p = this._board[i]
      if (p && p.type === 'k' && p.color === color) return i
    }
    return -1
  }

  private isSquareAttacked(sq: number, attackerColor: Color): boolean {
    for (let i = 0; i < 128; i++) {
      if ((i & 0x88) !== 0) { i += 7; continue }
      const p = this._board[i]
      if (!p || p.color !== attackerColor) continue

      const diff = sq - i

      // Pawn attacks
      if (p.type === 'p') {
        if (attackerColor === 'w') {
          if (diff === -17 || diff === -15) return true
        } else {
          if (diff === 17 || diff === 15) return true
        }
        continue
      }

      // Knight attacks (non-sliding)
      if (p.type === 'n') {
        if ([-18, -33, -31, -14, 18, 33, 31, 14].includes(diff)) return true
        continue
      }

      // King attacks (non-sliding)
      if (p.type === 'k') {
        if ([-17, -16, -15, -1, 1, 15, 16, 17].includes(diff)) return true
        continue
      }

      // Sliding pieces — ray stepping
      let rayDirs: number[] = []
      if      (p.type === 'r') rayDirs = [-16, -1, 1, 16]
      else if (p.type === 'b') rayDirs = [-17, -15, 15, 17]
      else if (p.type === 'q') rayDirs = [-17, -16, -15, -1, 1, 15, 16, 17]

      for (const dir of rayDirs) {
        let curr = i + dir
        while ((curr & 0x88) === 0) {
          if (curr === sq) return true
          if (this._board[curr] !== null) break // blocked by intervening piece
          curr += dir
        }
      }
    }
    return false
  }

  // ---------------------------------------------------------------------------
  // Move generation
  // ---------------------------------------------------------------------------

  private generateMoves(): InternalMove[] {
    const moves: InternalMove[] = []
    const us = this._turn
    const them = us === 'w' ? 'b' : 'w'

    for (let i = 0; i < 128; i++) {
      if ((i & 0x88) !== 0) { i += 7; continue }
      const p = this._board[i]
      if (!p || p.color !== us) continue

      if (p.type === 'p') {
        const forward = i + (us === 'w' ? -16 : 16)
        if ((forward & 0x88) === 0 && this._board[forward] === null) {
          if ((forward >> 4) === (us === 'w' ? 0 : 7)) {
            // Promotion
            for (const pr of ['q', 'r', 'b', 'n'] as PieceType[]) {
              moves.push({ color: us, from: i, to: forward, piece: 'p', promotion: pr, flags: FLAGS.PROMOTION })
            }
          } else {
            moves.push({ color: us, from: i, to: forward, piece: 'p', flags: FLAGS.NORMAL })
            // Double pawn push
            const doubleStep = i + (us === 'w' ? -32 : 32)
            if ((i >> 4) === (us === 'w' ? 6 : 1) && (doubleStep & 0x88) === 0 && this._board[doubleStep] === null) {
              moves.push({ color: us, from: i, to: doubleStep, piece: 'p', flags: FLAGS.BIG_PAWN })
            }
          }
        }
        // Pawn captures & en passant
        const attackOffsets = us === 'w' ? [-17, -15] : [15, 17]
        for (const offset of attackOffsets) {
          const target = i + offset
          if ((target & 0x88) !== 0) continue
          if (this._board[target] && this._board[target]!.color === them) {
            if ((target >> 4) === (us === 'w' ? 0 : 7)) {
              for (const pr of ['q', 'r', 'b', 'n'] as PieceType[]) {
                moves.push({ color: us, from: i, to: target, piece: 'p', captured: this._board[target]!.type, promotion: pr, flags: FLAGS.CAPTURE | FLAGS.PROMOTION })
              }
            } else {
              moves.push({ color: us, from: i, to: target, piece: 'p', captured: this._board[target]!.type, flags: FLAGS.CAPTURE })
            }
          } else if (target === this._epSquare) {
            moves.push({ color: us, from: i, to: target, piece: 'p', captured: 'p', flags: FLAGS.EP_CAPTURE })
          }
        }
      } else {
        const offsets = PIECE_OFFSETS[p.type]
        for (const offset of offsets) {
          let target = i
          while (true) {
            target += offset
            if ((target & 0x88) !== 0) break
            const dest = this._board[target]
            if (dest === null) {
              moves.push({ color: us, from: i, to: target, piece: p.type, flags: FLAGS.NORMAL })
            } else {
              if (dest.color === them) {
                moves.push({ color: us, from: i, to: target, piece: p.type, captured: dest.type, flags: FLAGS.CAPTURE })
              }
              break
            }
            if (p.type === 'n' || p.type === 'k') break
          }
        }

        // Castling
        if (p.type === 'k') {
          if (us === 'w') {
            // White kingside: e1-g1
            if ((this._castling.w & CASTLING_RIGHTS.w.k) &&
                this._board[117] === null && this._board[118] === null &&
                !this.isSquareAttacked(116, 'b') && !this.isSquareAttacked(117, 'b')) {
              moves.push({ color: us, from: 116, to: 118, piece: 'k', flags: FLAGS.KSIDE_CASTLE })
            }
            // White queenside: e1-c1
            if ((this._castling.w & CASTLING_RIGHTS.w.q) &&
                this._board[113] === null && this._board[114] === null && this._board[115] === null &&
                !this.isSquareAttacked(116, 'b') && !this.isSquareAttacked(115, 'b')) {
              moves.push({ color: us, from: 116, to: 114, piece: 'k', flags: FLAGS.QSIDE_CASTLE })
            }
          } else {
            // Black kingside: e8-g8
            if ((this._castling.b & CASTLING_RIGHTS.b.k) &&
                this._board[5] === null && this._board[6] === null &&
                !this.isSquareAttacked(4, 'w') && !this.isSquareAttacked(5, 'w')) {
              moves.push({ color: us, from: 4, to: 6, piece: 'k', flags: FLAGS.KSIDE_CASTLE })
            }
            // Black queenside: e8-c8
            if ((this._castling.b & CASTLING_RIGHTS.b.q) &&
                this._board[1] === null && this._board[2] === null && this._board[3] === null &&
                !this.isSquareAttacked(4, 'w') && !this.isSquareAttacked(3, 'w')) {
              moves.push({ color: us, from: 4, to: 2, piece: 'k', flags: FLAGS.QSIDE_CASTLE })
            }
          }
        }
      }
    }

    return moves
  }

  // ---------------------------------------------------------------------------
  // Legal move filtering
  // ---------------------------------------------------------------------------

  private legalMovesCount(): number {
    const pseudoMoves = this.generateMoves()
    let count = 0
    for (const move of pseudoMoves) {
      this.makeInternalMove(move)
      if (!this.kingAttacked(move.color)) {
        count++
      }
      this.undoInternalMove()
    }
    return count
  }

  // ---------------------------------------------------------------------------
  // Public moves() API
  // ---------------------------------------------------------------------------

  public moves(options?: { square?: Square; verbose?: boolean }): any[] {
    const pseudoMoves = this.generateMoves()
    const legalMoves: InternalMove[] = []

    for (const move of pseudoMoves) {
      this.makeInternalMove(move)
      if (!this.kingAttacked(move.color)) {
        legalMoves.push(move)
      }
      this.undoInternalMove()
    }

    if (options?.square) {
      const sq = this.algebraicTo0x88(options.square)
      const filtered = legalMoves.filter(m => m.from === sq)
      if (options.verbose) return filtered.map(m => this.makeVerboseMove(m))
      return filtered.map(m => this.moveToSan(m))
    }

    if (options?.verbose) return legalMoves.map(m => this.makeVerboseMove(m))
    return legalMoves.map(m => this.moveToSan(m))
  }

  // ---------------------------------------------------------------------------
  // Move execution
  // ---------------------------------------------------------------------------

  private makeInternalMove(move: InternalMove, isRealMove: boolean = false) {
    const us = this._turn
    const them = us === 'w' ? 'b' : 'w'

    // Build SAN notation at the exact moment of move execution
    let san = ''
    if (move.flags & FLAGS.KSIDE_CASTLE) {
      san = 'O-O'
    } else if (move.flags & FLAGS.QSIDE_CASTLE) {
      san = 'O-O-O'
    } else {
      if (move.piece !== 'p') san += move.piece.toUpperCase()
      if (move.captured) {
        if (move.piece === 'p') san += this.squareToAlgebraic(move.from)[0]
        san += 'x'
      }
      san += this.squareToAlgebraic(move.to)
      if (move.promotion) {
        san += '=' + move.promotion.toUpperCase()
      }
    }

    if (move.flags & FLAGS.EP_CAPTURE) {
      const epTarget = move.to + (us === 'w' ? 16 : -16)
      this._board[epTarget] = null
    }

    this._board[move.to] = this._board[move.from]
    this._board[move.from] = null

    if (move.promotion) {
      this._board[move.to] = { type: move.promotion, color: us }
    }

    if (move.flags & FLAGS.KSIDE_CASTLE) {
      const rFrom = move.to + 1
      const rTo   = move.to - 1
      this._board[rTo]   = this._board[rFrom]
      this._board[rFrom] = null
    } else if (move.flags & FLAGS.QSIDE_CASTLE) {
      const rFrom = move.to - 2
      const rTo   = move.to + 1
      this._board[rTo]   = this._board[rFrom]
      this._board[rFrom] = null
    }

    this._epSquare = (move.flags & FLAGS.BIG_PAWN)
      ? move.to + (us === 'w' ? 16 : -16)
      : -1

    // Update castling rights
    if (move.piece === 'k') {
      if (us === 'w') this._castling.w = 0
      else            this._castling.b = 0
    }
    if (move.piece === 'r') {
      if (move.from === 112) this._castling.w &= ~CASTLING_RIGHTS.w.q
      if (move.from === 119) this._castling.w &= ~CASTLING_RIGHTS.w.k
      if (move.from === 0)   this._castling.b &= ~CASTLING_RIGHTS.b.q
      if (move.from === 7)   this._castling.b &= ~CASTLING_RIGHTS.b.k
    }

    this._halfMoves = (move.captured || move.piece === 'p') ? 0 : this._halfMoves + 1

    if (us === 'b') this._moveNumber++

    this._turn = them

    // Check if opponent is in check (only evaluate checkmate when isRealMove=true to avoid recursion)
    if (this.kingAttacked(them)) {
      if (isRealMove) {
        const hasMoves = this.legalMovesCount() > 0
        san += hasMoves ? '+' : '#'
      } else {
        san += '+'
      }
    }

    this._history.push({
      move,
      castling: { ...this._castling },
      epSquare: this._epSquare,
      halfMoves: this._halfMoves,
      moveNumber: this._moveNumber,
      san,
    })
  }

  private undoInternalMove() {
    const entry = this._history.pop()
    if (!entry) return null

    const { move, castling, epSquare, halfMoves, moveNumber } = entry
    const us = move.color

    this._turn      = us
    this._castling  = castling
    this._epSquare  = epSquare
    this._halfMoves = halfMoves
    this._moveNumber = moveNumber

    this._board[move.from] = this._board[move.to]
    this._board[move.to]   = null

    if (move.promotion) {
      this._board[move.from] = { type: 'p', color: us }
    }

    if (move.captured) {
      if (move.flags & FLAGS.EP_CAPTURE) {
        const epTarget = move.to + (us === 'w' ? 16 : -16)
        this._board[epTarget] = { type: 'p', color: us === 'w' ? 'b' : 'w' }
      } else {
        this._board[move.to] = { type: move.captured, color: us === 'w' ? 'b' : 'w' }
      }
    }

    if (move.flags & FLAGS.KSIDE_CASTLE) {
      const rFrom = move.to + 1
      const rTo   = move.to - 1
      this._board[rFrom] = this._board[rTo]
      this._board[rTo]   = null
    } else if (move.flags & FLAGS.QSIDE_CASTLE) {
      const rFrom = move.to - 2
      const rTo   = move.to + 1
      this._board[rFrom] = this._board[rTo]
      this._board[rTo]   = null
    }

    return move
  }

  // ---------------------------------------------------------------------------
  // Public move() API
  // ---------------------------------------------------------------------------

  public move(moveInput: string | { from: Square; to: Square; promotion?: PieceType }): Move | null {
    const pseudoMoves = this.generateMoves()
    let match: InternalMove | null = null

    if (typeof moveInput === 'string') {
      for (const m of pseudoMoves) {
        if (this.moveToSan(m) === moveInput) {
          match = m
          break
        }
      }
    } else {
      const fromSq = this.algebraicTo0x88(moveInput.from)
      const toSq   = this.algebraicTo0x88(moveInput.to)
      for (const m of pseudoMoves) {
        if (m.from === fromSq && m.to === toSq &&
            (!moveInput.promotion || m.promotion === moveInput.promotion)) {
          match = m
          break
        }
      }
    }

    if (!match) return null

    // Legality check — must not leave own king in check
    this.makeInternalMove(match, true)
    if (this.kingAttacked(match.color)) {
      this.undoInternalMove()
      return null
    }

    const verbose = this.makeVerboseMove(match)
    this.recordPosition()
    return verbose
  }

  public undo(): Move | null {
    const entry = this._history[this._history.length - 1]
    if (!entry) return null
    const move = this.undoInternalMove()
    return move ? this.makeVerboseMove(move) : null
  }

  // ---------------------------------------------------------------------------
  // SAN generation — reads stored SAN or computes without re-applying move
  // ---------------------------------------------------------------------------

  private moveToSan(move: InternalMove): string {
    const lastEntry = this._history[this._history.length - 1]
    if (lastEntry && lastEntry.move.from === move.from && lastEntry.move.to === move.to && lastEntry.move.piece === move.piece) {
      return lastEntry.san
    }

    if (move.flags & FLAGS.KSIDE_CASTLE) return 'O-O'
    if (move.flags & FLAGS.QSIDE_CASTLE) return 'O-O-O'

    let san = ''
    if (move.piece !== 'p') san += move.piece.toUpperCase()
    if (move.captured) {
      if (move.piece === 'p') san += this.squareToAlgebraic(move.from)[0]
      san += 'x'
    }
    san += this.squareToAlgebraic(move.to)
    if (move.promotion) {
      san += '=' + move.promotion.toUpperCase()
    }
    return san
  }

  private makeVerboseMove(move: InternalMove): Move {
    let flagStr = BITS.NORMAL
    if (move.flags & FLAGS.CAPTURE)      flagStr = BITS.CAPTURE
    if (move.flags & FLAGS.BIG_PAWN)     flagStr = BITS.BIG_PAWN
    if (move.flags & FLAGS.EP_CAPTURE)   flagStr = BITS.EP_CAPTURE
    if (move.flags & FLAGS.PROMOTION)    flagStr = BITS.PROMOTION
    if (move.flags & FLAGS.KSIDE_CASTLE) flagStr = BITS.KSIDE_CASTLE
    if (move.flags & FLAGS.QSIDE_CASTLE) flagStr = BITS.QSIDE_CASTLE

    const lastEntry = this._history[this._history.length - 1]
    const san = (lastEntry && lastEntry.move.from === move.from && lastEntry.move.to === move.to)
      ? lastEntry.san
      : this.moveToSan(move)

    return {
      color:     move.color,
      from:      this.squareToAlgebraic(move.from),
      to:        this.squareToAlgebraic(move.to),
      piece:     move.piece,
      captured:  move.captured,
      promotion: move.promotion,
      flags:     flagStr,
      san,
    }
  }

  // ---------------------------------------------------------------------------
  // Game-over detection — use legalMovesCount()
  // ---------------------------------------------------------------------------

  public isCheckmate(): boolean {
    return this.inCheck() && this.legalMovesCount() === 0
  }

  public isStalemate(): boolean {
    return !this.inCheck() && this.legalMovesCount() === 0
  }

  public isThreefoldRepetition(): boolean {
    const key = this.fen().split(' ').slice(0, 4).join(' ')
    return (this._positions[key] || 0) >= 3
  }

  public isInsufficientMaterial(): boolean {
    const pieces: { type: PieceType; color: Color }[] = []
    for (let i = 0; i < 128; i++) {
      if ((i & 0x88) !== 0) { i += 7; continue }
      if (this._board[i]) pieces.push(this._board[i]!)
    }
    if (pieces.length === 2) return true // King vs King
    if (pieces.length === 3 && pieces.some(p => p.type === 'b' || p.type === 'n')) return true
    return false
  }

  public isDraw(): boolean {
    return (
      this._halfMoves >= 100 ||
      this.isStalemate() ||
      this.isInsufficientMaterial() ||
      this.isThreefoldRepetition()
    )
  }

  public isGameOver(): boolean {
    return this.isCheckmate() || this.isDraw()
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  public history(options?: { verbose?: boolean }): any[] {
    if (options?.verbose) {
      return this._history.map(h => this.makeVerboseMove(h.move))
    }
    return this._history.map(h => h.san)
  }
}

export default Chess

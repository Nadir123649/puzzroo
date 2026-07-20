import { images } from '@/lib/utils'

export interface Game {
  id: string
  slug: string
  name: string
  image: string
  imageLight?: string
  difficulty: string[]
  about: string
  howToPlay: string
  bulletPoints: string[]
  keyboardControls: string
}

export const games: Game[] = [
  {
    id: 'number-ninja',
    slug: 'number-ninja',
    name: 'Number Ninja',
    image: images.gameCards.numberNinja,
    imageLight: images.gameCards.numberNinjaWhite,
    difficulty: ['Easy', 'Medium', 'Hard'],
    about: 'Number Ninja is an exciting mathematical puzzle game that challenges your mental arithmetic and pattern recognition skills. Slice through numbers to reach target sums while racing against time. Perfect for players who love combining quick reflexes with strategic thinking, this game offers endless entertainment while sharpening your math abilities.',
    howToPlay: 'Start by selecting your difficulty level. Numbers will appear on the screen, and your goal is to combine them to reach the target sum displayed at the top. Swipe or click to select consecutive numbers that add up to your target. The faster you find combinations, the higher your score multiplier becomes. Each level increases in complexity with larger numbers and more challenging targets. Plan your moves carefully to create combos and maximize your points. Missing too many targets will end your game, so stay focused and think fast!',
    bulletPoints: [
      'Combine consecutive numbers to match the exact target sum',
      'Complete each level before the timer runs out to progress',
      'Build combo multipliers by finding solutions quickly and consecutively'
    ],
    keyboardControls: 'Use mouse clicks or touch gestures to select numbers. Press SPACE to confirm your selection, ESC to pause the game, and R to restart the current level.'
  },
  {
    id: 'cross-math',
    slug: 'cross-math',
    name: 'Cross Math',
    image: images.gameCards.crossWord,
    difficulty: ['Easy', 'Medium', 'Hard'],
    about: 'Cross Math combines the challenge of mathematical equations with the logic of crossword-style puzzles. Fill in the missing numbers to complete equations that work both horizontally and vertically. Perfect for sharpening your arithmetic skills and logical thinking in an engaging puzzle format.',
    howToPlay: 'Select an empty cell and enter a number to complete the equations. Each number must satisfy both the horizontal and vertical equations that intersect at that cell. Numbers can only be used once per puzzle, so choose wisely. Use the available numbers shown in the number pad. The equations follow standard order of operations (multiplication and division before addition and subtraction). Complete all cells correctly to win the puzzle.',
    bulletPoints: [
      'Each horizontal equation must calculate correctly from left to right',
      'Each vertical equation must calculate correctly from top to bottom',
      'Numbers can only be used once per puzzle challenge',
      'Equations follow standard mathematical order of operations'
    ],
    keyboardControls: 'Type numbers to fill cells. Use ARROW KEYS to navigate between cells. Press DELETE or BACKSPACE to erase numbers. Press N for a new game.'
  },
  {
    id: 'sudoku',
    slug: 'sudoku',
    name: 'Sudoku',
    image: images.gameCards.sudoku,
    difficulty: ['Easy', 'Medium', 'Hard', 'Expert'],
    about: 'Sudoku is the world\'s most popular logic-based number puzzle. Fill a 9×9 grid with digits so that each column, row, and 3×3 section contains the numbers 1-9 without repetition. No math required - just pure logical deduction and strategic thinking. Perfect for developing concentration and problem-solving skills.',
    howToPlay: 'Click any empty cell to select it, then enter a number from 1-9. The game will highlight the selected cell\'s row, column, and 3×3 box to help you visualize constraints. Use the notes feature to mark potential candidates in each cell. As you progress, eliminate possibilities using logical deduction techniques like naked pairs, hidden singles, and box-line reduction. The puzzle is complete when all 81 cells are correctly filled. Invalid entries are automatically highlighted to help you catch mistakes.',
    bulletPoints: [
      'Each row must contain all digits from one to nine',
      'Each column must contain all digits from one to nine',
      'Each three by three grid must contain digits one to nine'
    ],
    keyboardControls: 'Type numbers 1-9 to fill cells. Press N to toggle notes mode. Use ARROW KEYS to navigate between cells. Press DELETE or BACKSPACE to clear a cell. Press U to undo your last move.'
  },
  {
    id: 'kakuro',
    slug: 'kakuro',
    name: 'Kakuro',
    image: images.gameCards.kakuro,
    difficulty: ['Easy', 'Medium', 'Hard'],
    about: 'Kakuro combines the logic of Sudoku with the arithmetic challenge of crosswords. Fill white cells with digits 1-9 to create sums that match the clues provided in triangular hint cells. Each sum must use unique digits, making this puzzle a perfect blend of mathematical reasoning and logical deduction.',
    howToPlay: 'Each clue shows the target sum and the number of cells that must add up to it. Click a white cell to enter a digit from 1-9. Remember that no digit can repeat within the same sum group. Use logical deduction to eliminate impossible combinations. For example, a sum of 3 in two cells can only be 1+2. Cross-reference horizontal and vertical constraints to narrow down your options. The puzzle is solved when all white cells are filled correctly and all sum clues are satisfied.',
    bulletPoints: [
      'Each sum must equal the clue number without repeating digits',
      'Only digits one through nine can be used in solutions',
      'Each cell belongs to one horizontal and one vertical sum'
    ],
    keyboardControls: 'Type numbers 1-9 to fill cells. Use ARROW KEYS to move between cells. Press DELETE or BACKSPACE to clear entries. Press H to highlight related cells for the current sum.'
  },
  {
    id: 'dots-match',
    slug: 'dots-match',
    name: 'Dots Match',
    image: images.gameCards.dotsMatch,
    difficulty: ['Easy', 'Medium', 'Hard'],
    about: 'Dots Match is a colorful and addictive connection puzzle game. Link dots of the same color by drawing paths between them without crossing lines. As you progress through levels, the grids become more complex with additional colors and intricate layouts that will test your spatial reasoning and planning abilities.',
    howToPlay: 'Your goal is to connect all pairs of matching colored dots with continuous lines. Click and drag from one dot to its matching partner to create a path. Lines cannot cross each other or pass through other dots. Each level is complete when all dots are connected and the entire grid is filled with paths. Plan your routes carefully - sometimes you need to work backwards from the most constrained dots. If you get stuck, use the undo button to reconsider your strategy.',
    bulletPoints: [
      'Connect all matching colored dots with continuous unbroken lines throughout',
      'Paths cannot cross each other at any point on grid',
      'Lines cannot pass through dots of any different colors',
      'The entire grid must be completely filled with colored paths'
    ],
    keyboardControls: 'Use your mouse or touch to draw connections between dots. Press U to undo your last line. Press R to restart the level. Press H for a hint when stuck.'
  },
  {
    id: 'nonogram',
    slug: 'nonogram',
    name: 'Nonogram',
    image: images.gameCards.nonogram,
    imageLight: images.gameCards.nonogramWhite,
    difficulty: ['Easy', 'Medium', 'Hard', 'Expert'],
    about: 'Nonogram is a picture logic puzzle where you reveal a hidden image by filling in cells according to number clues. Each number indicates a consecutive group of filled cells in that row or column. Combine logical reasoning with artistic discovery as beautiful pixel art emerges from your deductions.',
    howToPlay: 'Look at the numbers beside each row and above each column. These indicate groups of consecutive filled cells. For example, "3 1 2" means there\'s a group of 3 cells, then at least one empty cell, then 1 cell, then at least one empty, then 2 cells. Left-click to fill a cell black, right-click to mark it as definitely empty with an X. Start with rows and columns that have large numbers or limited possibilities. Cross-reference rows and columns to narrow down cell states. The puzzle is complete when a recognizable image appears and all clues are satisfied.',
    bulletPoints: [
      'Each number represents a group of consecutive filled cells sequentially',
      'Multiple numbers mean multiple groups separated by empty cells throughout',
      'At least one empty cell must exist between groups'
    ],
    keyboardControls: 'Left-click to fill cells. Right-click to mark cells as empty. Use ARROW KEYS to navigate. Press SPACE to toggle between fill and mark modes. Press U to undo.'
  },
  {
    id: 'tangram',
    slug: 'tangram',
    name: 'Tangram',
    image: images.gameCards.tangram,
    difficulty: ['Easy', 'Medium', 'Hard'],
    about: 'Tangram is an ancient Chinese dissection puzzle consisting of seven flat pieces called tans. The objective is to form a specific shape using all seven pieces without overlapping. This classic game enhances spatial awareness, problem-solving skills, and geometric understanding.',
    howToPlay: 'Select a piece from the tray and drag it onto the board. Double-click the border of the orbital helper and drag to rotate the piece. Align all pieces with the target silhouette to solve the puzzle.',
    bulletPoints: [
      'Use all seven tangram pieces',
      'Pieces cannot overlap',
      'All pieces must be used to form the target shape',
      'Rotate pieces to fit the pattern',
      'Complete the puzzle with precision'
    ],
    keyboardControls: 'No keyboard controls needed. Use your mouse or touch screen to drag and rotate pieces.'
  }
]

export function getGameBySlug(slug: string): Game | undefined {
  return games.find(game => game.slug === slug)
}

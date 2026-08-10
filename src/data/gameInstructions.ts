/**
 * Dynamic Game Instructions by Difficulty
 */

export interface DifficultyInstructions {
  easy: string
  medium: string
  hard: string
  expert?: string
}

export const gameInstructions: Record<string, DifficultyInstructions> = {
  'sudoku': {
    easy: 'Begin your Sudoku journey with confidence. Click on any empty cell and enter numbers 1-9. The game highlights your selected cell along with its row, column, and 3×3 box to help you see the constraints. Start with rows, columns, or boxes that already have many numbers filled in. Use simple scanning to find where numbers can only go in one place. The notes feature lets you mark possible numbers in each cell. Take your time and enjoy solving step by step.',
    medium: 'Step up your Sudoku skills with intermediate puzzles. Apply logical techniques like looking for naked pairs, hidden singles, and pointing pairs. Use the notes feature strategically to track candidates in each cell. Cross-reference rows, columns, and boxes to eliminate impossible numbers. Plan your moves carefully by analyzing how filling one cell affects nearby cells. Focus on cells with fewer candidates first. Work methodically through each region to maintain steady progress.',
    hard: 'Challenge yourself with advanced Sudoku puzzles. Master complex strategies including X-wings, swordfish, and box-line reduction patterns. Analyze multiple cells simultaneously to find hidden patterns. Every placement requires careful consideration of cascading effects across the entire grid. Use advanced noting techniques to track complex candidate chains. Think several moves ahead before committing to any number. Precision and patience are essential at this difficulty level.',
    expert: 'Test your ultimate Sudoku mastery with expert-level puzzles. Deploy highly advanced techniques like forcing chains, XY-wings, and complex coloring strategies. Scrutinize the entire grid simultaneously to uncover deeply hidden constraints. Every single digit placement demands intense logical deduction and perfect accuracy. Utilize sophisticated noting systems to map out overlapping possibilities. Think many moves ahead to avoid fatal errors. True puzzle mastery is required.',
  },
  'cross-math': {
    easy: 'Start your CrossMath adventure with simple arithmetic. Click any empty cell and choose from the available numbers shown. Begin with equations that have just one or two empty cells. Focus on basic addition, subtraction, multiplication, and division. Remember that numbers can be used multiple times throughout the puzzle. Work on rows and columns separately at first. Check that each completed equation calculates correctly before moving to the next one.',
    medium: 'Advance to more challenging CrossMath puzzles. Pay attention to the order of operations—multiplication and division are calculated before addition and subtraction. Look for cells where horizontal and vertical equations intersect, as these provide helpful constraints. Plan ahead to ensure numbers work for both directions. Use logical deduction to eliminate impossible number combinations. Balance your focus between completing individual equations and solving the overall puzzle structure.',
    hard: 'Conquer complex CrossMath challenges with expert strategies. Master the complete order of operations with multiple nested calculations in each equation. Analyze how every number placement impacts all connected equations throughout the grid. Use systematic elimination to narrow down possibilities before testing solutions. Think strategically about the interaction between horizontal and vertical constraints. Verify each placement carefully as mistakes compound quickly at this difficulty.',
    expert: 'Experience the ultimate CrossMath test with expert puzzles. Navigate highly intertwined equations featuring complex multi-step arithmetic and restrictive dependencies. Every single deduction requires analyzing distant intersecting calculations simultaneously to rule out impossible combinations. Employ rigorous trial-and-error techniques coupled with advanced mathematical logic. Take extreme care when placing digits, as one subtle miscalculation will silently invalidate the entire board.',
  },
  'number-ninja': {
    easy: 'Welcome to Number Ninja! Look for consecutive numbers that add up to your target sum at the top of the screen. Take your time spotting simple patterns and combinations. Build your confidence by finding multiple valid solutions quickly. Each successful combination increases your score multiplier. The timer is generous, giving you plenty of time to think through each level. Focus on accuracy first, then gradually work on speed.',
    medium: 'Enhance your Number Ninja abilities with faster gameplay. Recognize number patterns more quickly and plan your next combination while completing the current one. The timer becomes more challenging, requiring better time management. Balance speed with accuracy to maintain your combo streak and maximize multipliers. Target higher-value combinations when possible. Stay focused as the numbers increase in complexity and the pace picks up.',
    hard: 'Push your Number Ninja skills to the limit with intense challenges. Process complex number sequences instantly under significant time pressure. Chain multiple combinations flawlessly to achieve maximum score multipliers. Every fraction of a second counts as levels progress rapidly. Maintain razor-sharp focus while managing increasingly difficult targets. Master pattern recognition to spot solutions immediately. This difficulty demands peak performance and unwavering concentration.',
    expert: 'Reach the absolute pinnacle of Number Ninja gameplay. Process rapidly shifting numerical targets instantly with virtually zero margin for hesitation. Link massive combinations effortlessly to maintain the highest possible combo multiplier. Time constraints are brutal, punishing any mental delay or misclick severely. Relentless focus and lightning-fast reflexes are mandatory to survive. Only elite players will master this unforgiving challenge.',
  },
  'kakuro': {
    easy: 'Welcome to Kakuro puzzles! Start with straightforward sum combinations and limited possibilities. Look for clues like "3 in two cells" which can only be 1+2. Fill in the obvious entries first where only one combination works. Remember that each sum group must use different digits from 1-9. Take your time understanding how horizontal and vertical sums intersect. Build your foundation with these simpler puzzles before advancing.',
    medium: 'Progress to intermediate Kakuro challenges requiring strategic thinking. Use cross-referencing between horizontal and vertical sums to narrow down possibilities systematically. Check which digits are already used in connected sum groups to eliminate options. Work with combinations that have multiple possible arrangements. Plan ahead to ensure your choices work for all intersecting sums. Develop your ability to see patterns across the entire grid.',
    hard: 'Master advanced Kakuro puzzles with complex overlapping constraints. Analyze multiple sum groups simultaneously to find the only valid solution. Use sophisticated elimination techniques considering all connected sums at once. Every digit placement must satisfy numerous constraints across horizontal and vertical groups. Think several steps ahead as choices in one area affect possibilities throughout the puzzle. Precision and systematic analysis are essential.',
    expert: 'Face the most brutal Kakuro grids designed for true veterans. Decipher massive intersecting sum groups where initial clues are virtually non-existent. Apply extremely advanced combinatorics to force deductions across multiple distant rows and columns. A single misplaced digit will ruin the deeply interconnected logic structure entirely. Unwavering patience and flawlessly systematic logic are required to break these puzzles.',
  },
  'dots-match': {
    easy: 'Start connecting dots with simple path puzzles. Match dots of the same color by drawing lines between them. Begin with dots along the edges that have limited routing options. Remember that lines cannot cross each other or pass through other dots. Work gradually from the outside toward the center. Take your time planning each path to avoid blocking yourself. These early puzzles build your spatial reasoning skills.',
    medium: 'Take on more intricate Dots Match challenges with complex layouts. Plan your routes strategically by identifying bottleneck areas where multiple paths must pass through limited space. Consider the order of connections carefully—some dots must be linked first to leave room for others. Think two or three moves ahead before drawing any line. Develop your ability to visualize the complete solution. Balance immediate moves with long-term planning.',
    hard: 'Solve highly intricate Dots Match puzzles requiring expert planning. Visualize the complete solution layout before drawing your first line. Understand that one incorrect early path can make the entire puzzle impossible to complete. Work backwards from the most constrained connections to find the optimal routing solution. Analyze spatial relationships across the entire grid simultaneously. Every path must be perfect—there is no room for error.',
    expert: 'Tackle mind-bending Dots Match layouts built for true puzzle experts. Memorize complex spatial routing possibilities before making a single move. Navigate extremely tight bottlenecks where multiple critical paths must snake around one another flawlessly. A single sub-optimal turn will irreversibly block off vital connections later on. Absolute precision in long-term visualization and routing strategy is absolutely mandatory.',
  },
  'nonogram': {
    easy: 'Discover the joy of Nonogram picture puzzles! Start with rows and columns that have large numbers or only one or two groups. Mark cells as filled or empty based on the number clues provided on the X (top) and Y (left) axes, which tell you the number of consecutive filled cells. Cross-reference rows and columns to confirm your deductions. The completed puzzle reveals a recognizable pixel art image. Take your time learning the basic logic patterns. These beginner puzzles introduce you to the fundamental solving techniques.',
    medium: 'Advance to more detailed Nonogram images requiring deeper analysis. Apply intermediate logic when clues are less obvious and have multiple possible arrangements. Pay close attention to how numbers on the X (top) and Y (left) axes indicate groups separated by at least one empty cell. Track multiple possibilities mentally until you can definitively eliminate incorrect options. The revealed images become more intricate and satisfying. Develop your logical reasoning and pattern recognition skills.',
    hard: 'Decode complex Nonogram puzzles with sophisticated logical deduction. Apply advanced techniques involving simultaneous analysis of multiple rows and columns using the X (top) and Y (left) axis clues. Work with edge cases where clue combinations have subtle but critical implications. One incorrect cell cascades into errors throughout the entire puzzle. The final images are highly detailed and rewarding. This difficulty demands exceptional logical thinking, patience, and precise analysis at every step.',
    expert: 'Take on the ultimate Nonogram challenges featuring massive grids and sparse clues. Utilize highly advanced overlapping logic, edge-solving tactics, and deep hypothetical contradiction analysis to force single pixels into place. Extensive chains of deductions must be held in memory simultaneously. A single mistaken pixel will entirely corrupt the final masterpiece. Perfect reasoning, relentless patience, and absolute precision are essential.',
  },
  'tangram': {
    easy: 'Start your Tangram journey with simpler shapes. Drag pieces from the tray and place them on the silhouette. If you need to rotate a piece, double-click its edge to reveal the rotate handle, then drag it. Try placing the largest triangles first, as they form the foundation of the shape. Ensure pieces fit snugly without overlapping. Take your time to understand how the seven flat shapes (tans) interact. Visualizing how geometric parts combine will help you solve it easily.',
    medium: 'Step up to intermediate Tangram shapes. You will need to rotate and flip pieces carefully to match the silhouette. Start by identifying unique corners or protrusions in the target shape, which often indicate the placement of specific pieces like the parallelogram or small triangles. Work on aligning pieces step by step, and do not hesitate to rearrange them if you hit a dead end. Use spatial reasoning to see where the medium triangle and square best fit. Keep trying different orientations.',
    hard: 'Conquer the most challenging Tangram puzzles. These complex silhouettes offer very few visual clues about piece boundaries. Analyze the overall shape and try to estimate its total area distribution. You will need to use all seven pieces with precise rotation and positioning. Often, you must think counter-intuitively about how the parallelogram and large triangles can fit together. Try starting with the most constrained sections of the shape. A methodical trial-and-error approach combined with advanced geometric deduction is key.',
    expert: 'Face the most obscure Tangram silhouettes ever designed. These highly ambiguous puzzles offer absolutely no intuitive hints regarding piece boundaries or proportions. You must visualize wildly counter-intuitive geometric combinations, forcing large triangles and parallelograms into bizarre orientations. Perfect spatial reasoning and an extreme level of experimental persistence are demanded to uncover the one correct configuration. Truly for geometric puzzle masters.',
  },
}


/**
 * Get instructions for a specific game and difficulty
 */
export function getGameInstructions(
  gameSlug: string, 
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | string
): string {
  const instructions = gameInstructions[gameSlug]
  if (!instructions) {
    // Return default if game not found
    return 'Select your difficulty level and start playing. Use logic and strategy to complete the puzzle.'
  }
  
  if (difficulty === 'expert' && instructions.expert) {
    return instructions.expert;
  }
  
  return (instructions as any)[difficulty] || instructions.hard
}

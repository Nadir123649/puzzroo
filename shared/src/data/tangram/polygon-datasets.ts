/**
 * Canonical Polygon-Based Tangram Datasets
 * These are mathematically valid Tangram configurations
 * DO NOT MODIFY - These are the source of truth
 */

import { PolygonPuzzle } from '@shared/types/tangram-polygon'

export const POLYGON_DATASETS: PolygonPuzzle[] = [
  {
    id: '6a116e7655c8d5937dd30543',
    sourceId: '1b91bf71-d311-4d04-9fa2-f36073c70f3c',
    active: true,
    difficulty: 'easy',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'mediumTriangle',
      'smallTriangle2',
      'baseTriangle2',
      'parallelogram',
      'smallTriangle1',
      'square'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[5,5],[10,10],[0,10],[5,5]],
      [[3.536,13.536],[0,10],[7.071,10],[3.536,13.536]],
      [[0,20],[0,10],[10,20],[0,20]],
      [[15,-5],[10,0],[5,0],[10,-5],[15,-5]],
      [[10,-5],[6.464,-1.464],[6.464,-8.536],[10,-5]],
      [[15,-10],[15,-5],[10,-5],[10,-10],[15,-10]]
    ],
    fullPolygon: [
      [10,-5],[10,-10],[15,-10],[15,-5],[5,5],[10,10],[7.071,10],
      [3.536,13.536],[10,20],[0,20],[0,0],[5,0],[6.464,-1.464],
      [6.464,-8.536],[10,-5]
    ]
  },
  {
    id: '6a116e7755c8d5937dd30545',
    sourceId: '8e1ca71c-2261-4b0b-98ef-fd4f727af4f6',
    active: true,
    difficulty: 'easy',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'smallTriangle2',
      'smallTriangle1',
      'baseTriangle2',
      'square',
      'mediumTriangle',
      'parallelogram'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[-3.536,3.536],[0,0],[0,7.071],[-3.536,3.536]],
      [[5,10],[0,10],[5,5],[5,10]],
      [[-10,0],[0,0],[-10,10],[-10,0]],
      [[10,5],[10,10],[5,10],[5,5],[10,5]],
      [[7.071,10],[7.071,17.071],[0,10],[7.071,10]],
      [[10,0],[2.929,0],[-0.607,-3.536],[6.464,-3.536],[10,0]]
    ],
    fullPolygon: [
      [5,5],[10,5],[10,10],[7.071,10],[7.071,17.071],[0,10],[0,7.071],
      [-3.536,3.536],[-10,10],[-10,0],[2.929,0],[-0.607,-3.536],
      [6.464,-3.536],[10,0],[5,5]
    ]
  },
  {
    id: '6a116e7955c8d5937dd30548',
    sourceId: 'ac7edc13-973d-4092-9745-941d700ba305',
    active: true,
    difficulty: 'easy',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'mediumTriangle',
      'parallelogram',
      'baseTriangle2',
      'square',
      'smallTriangle1',
      'smallTriangle2'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[2.929,0],[2.929,-7.071],[10,0],[2.929,0]],
      [[6.464,-3.536],[13.536,-3.536],[17.071,0],[10,0],[6.464,-3.536]],
      [[6.464,-13.536],[6.464,-3.536],[-3.536,-13.536],[6.464,-13.536]],
      [[1.464,-13.536],[1.464,-18.536],[6.464,-18.536],[6.464,-13.536],[1.464,-13.536]],
      [[2.929,-7.071],[2.929,-2.071],[-2.071,-7.071],[2.929,-7.071]],
      [[-2.071,0],[-2.071,-5],[2.929,0],[-2.071,0]]
    ],
    fullPolygon: [
      [6.464,-3.536],[13.536,-3.536],[17.071,0],[10,0],[0,10],[0,0],
      [-2.071,0],[-2.071,-5],[2.929,0],[2.929,-2.071],[-2.071,-7.071],
      [2.929,-7.071],[-3.536,-13.536],[1.464,-13.536],[1.464,-18.536],
      [6.464,-18.536],[6.464,-3.536]
    ]
  },
  // MEDIUM DATASETS
  {
    id: '6a116e7755c8d5937dd30544',
    sourceId: 'e9a72611-e071-4a99-ad2f-ea5577e3b022',
    active: true,
    difficulty: 'medium',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'square',
      'smallTriangle2',
      'smallTriangle1',
      'parallelogram',
      'mediumTriangle',
      'baseTriangle2'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[0,0],[0,5],[-5,5],[-5,0],[0,0]],
      [[-5,0],[-5,5],[-10,0],[-5,0]],
      [[0,5],[0,10],[-5,5],[0,5]],
      [[10,0],[2.929,0],[-0.607,-3.536],[6.464,-3.536],[10,0]],
      [[-10,7.071],[-10,0],[-2.929,7.071],[-10,7.071]],
      [[10,0],[2.929,-7.071],[17.071,-7.071],[10,0]]
    ],
    fullPolygon: [
      [0,10],[-2.929,7.071],[-10,7.071],[-10,0],[2.929,0],[-0.607,-3.536],
      [6.464,-3.536],[2.929,-7.071],[17.071,-7.071],[0,10]
    ]
  },
  {
    id: '6a116e7855c8d5937dd30546',
    sourceId: '3e83a5e3-eec1-46f5-82b3-a7ca1c675786',
    active: true,
    difficulty: 'medium',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'square',
      'baseTriangle2',
      'smallTriangle1',
      'smallTriangle2',
      'parallelogram',
      'mediumTriangle'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[5,-5],[10,-5],[10,0],[5,0],[5,-5]],
      [[7.071,2.929],[14.142,10],[0,10],[7.071,2.929]],
      [[5,0],[0,0],[5,-5],[5,0]],
      [[14.142,10],[10.606,6.464],[17.678,6.464],[14.142,10]],
      [[22.678,1.464],[17.678,6.464],[12.678,6.464],[17.678,1.464],[22.678,1.464]],
      [[17.678,-3.536],[22.678,1.464],[12.678,1.464],[17.678,-3.536]]
    ],
    fullPolygon: [
      [10,0],[7.071,2.929],[10.606,6.464],[12.678,6.464],[17.678,1.464],
      [12.678,1.464],[17.678,-3.536],[22.678,1.464],[14.142,10],[0,10],
      [0,0],[5,-5],[10,-5],[10,0]
    ]
  },
  {
    id: '6a116e7955c8d5937dd30547',
    sourceId: '1ec2cb29-9314-407d-b8c7-cea23553a25f',
    active: true,
    difficulty: 'medium',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'parallelogram',
      'mediumTriangle',
      'square',
      'smallTriangle2',
      'smallTriangle1',
      'baseTriangle2'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[0,10],[5,5],[10,5],[5,10],[0,10]],
      [[5,10],[10,5],[10,15],[5,10]],
      [[5,-5],[10,-5],[10,0],[5,0],[5,-5]],
      [[10,-5],[15,-5],[10,0],[10,-5]],
      [[11.464,-8.536],[15,-5],[7.929,-5],[11.464,-8.536]],
      [[0,10],[-10,10],[0,0],[0,10]]
    ],
    fullPolygon: [
      [15,-5],[5,5],[10,5],[10,15],[5,10],[-10,10],[0,0],[5,0],
      [5,-5],[7.929,-5],[11.464,-8.536],[15,-5]
    ]
  },
  // HARD DATASETS
  {
    id: '6a116e7f55c8d5937dd30552',
    sourceId: '39743cfa-7ab1-40fd-96e0-d13a9c04b6da',
    active: true,
    difficulty: 'hard',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'parallelogram',
      'baseTriangle2',
      'mediumTriangle',
      'square',
      'smallTriangle1',
      'smallTriangle2'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[-5,-5],[0,0],[0,5],[-5,0],[-5,-5]],
      [[0,10],[7.071,2.929],[7.071,17.071],[0,10]],
      [[0,-7.071],[0,0],[-7.071,-7.071],[0,-7.071]],
      [[-5,7.071],[-8.536,3.536],[-5,0],[-1.464,3.536],[-5,7.071]],
      [[-5,-5],[-5,0],[-10,-5],[-5,-5]],
      [[6.464,-3.536],[10,0],[2.929,0],[6.464,-3.536]]
    ],
    fullPolygon: [
      [0,0],[2.929,0],[6.464,-3.536],[10,0],[7.071,2.929],[7.071,17.071],
      [0,10],[0,5],[-1.464,3.536],[-5,7.071],[-8.536,3.536],[-5,0],
      [-10,-5],[-5,-5],[-7.071,-7.071],[0,-7.071],[0,0]
    ]
  },
  {
    id: '6a116e8255c8d5937dd30557',
    sourceId: 'e80e1b73-850f-42af-b099-03f38c1c90b0',
    active: true,
    difficulty: 'hard',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'smallTriangle1',
      'square',
      'parallelogram',
      'baseTriangle2',
      'smallTriangle2',
      'mediumTriangle'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[3.536,6.464],[7.071,10],[0,10],[3.536,6.464]],
      [[-5,5],[-5,0],[0,0],[0,5],[-5,5]],
      [[-5,0],[-5,7.071],[-8.536,10.607],[-8.536,3.536],[-5,0]],
      [[13.536,6.464],[3.536,6.464],[13.536,-3.536],[13.536,6.464]],
      [[-3.536,10.607],[-8.536,10.607],[-3.536,5.607],[-3.536,10.607]],
      [[10.607,6.464],[10.607,13.535],[3.536,6.464],[10.607,6.464]]
    ],
    fullPolygon: [
      [10.607,13.535],[3.536,6.464],[7.071,10],[0,10],[0,5],[-5,5],
      [-5,7.071],[-3.536,5.607],[-3.536,10.607],[-8.536,10.607],
      [-8.536,3.536],[-5,0],[10,0],[13.536,-3.536],[13.536,6.464],
      [10.607,6.464],[10.607,13.535]
    ]
  },
  {
    id: '6a116e8355c8d5937dd30558',
    sourceId: '07f7b9b9-42c3-4e90-b99b-5eb5e7b97796',
    active: true,
    difficulty: 'hard',
    gameType: 'tangram',
    pieceShapeIds: [
      'baseTriangle1',
      'baseTriangle2',
      'parallelogram',
      'square',
      'mediumTriangle',
      'smallTriangle2',
      'smallTriangle1'
    ],
    individualPiecePolygons: [
      [[0,0],[10,0],[0,10],[0,0]],
      [[0,0],[0,10],[-10,0],[0,0]],
      [[-17.071,0],[-10,0],[-6.464,3.536],[-13.536,3.536],[-17.071,0]],
      [[-13.536,8.536],[-13.536,3.536],[-8.536,3.536],[-8.536,8.536],[-13.536,8.536]],
      [[5,-5],[10,0],[0,0],[5,-5]],
      [[-10,12.072],[-13.536,8.536],[-6.465,8.536],[-10,12.072]],
      [[-13.536,8.536],[-18.536,8.536],[-13.536,3.536],[-13.536,8.536]]
    ],
    fullPolygon: [
      [10,0],[0,10],[-6.464,3.536],[-8.536,3.536],[-8.536,8.536],
      [-6.465,8.536],[-10,12.072],[-13.536,8.536],[-18.536,8.536],
      [-13.536,3.536],[-17.071,0],[0,0],[5,-5],[10,0]
    ]
  }
]

export function getPolygonPuzzle(id?: string): PolygonPuzzle {
  if (id) {
    const puzzle = POLYGON_DATASETS.find(p => p.id === id || p.sourceId === id)
    if (puzzle) return puzzle
  }
  return POLYGON_DATASETS[0]
}

export function getRandomPolygonPuzzle(): PolygonPuzzle {
  const activePuzzles = POLYGON_DATASETS.filter(p => p.active)
  return activePuzzles[Math.floor(Math.random() * activePuzzles.length)]
}

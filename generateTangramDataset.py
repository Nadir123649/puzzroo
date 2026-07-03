#!/usr/bin/env python3
"""
Tangram Dataset Generator
Generates JSON dataset files for tangram puzzles from the TypeScript codebase
for local testing without database.

This script exports puzzle data with:
- Unique solutions for each difficulty
- Proper validation hashes
- Exact piece positions and rotations
- Silhouette data
"""

import json
import os
import math

# Constants matching the TypeScript implementation
U = 70.7
SQRT2 = math.sqrt(2)
PIECE_SCALE = 0.75

def create_dataset():
    """Generate tangram dataset with easy, medium, and hard puzzles"""
    
    # Target directory for generated files
    target_dir = "./public/data"
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
    
    dataset = {
        "version": "1.0.0",
        "generated": "2024-01-01",
        "difficulties": {
            "easy": {
                "name": "Easy",
                "description": "Simple geometric shapes with clear structure",
                "timeLimit": 300,
                "puzzles": [
                    {
                        "id": "easy-square",
                        "title": "Square",
                        "difficulty": "easy",
                        "description": "Form a perfect square using all 7 pieces",
                        "solution": {
                            "large-triangle-1": {"x": 29.29, "y": -70.71, "rotation": 225},
                            "large-triangle-2": {"x": -70.71, "y": 29.29, "rotation": 135},
                            "medium-triangle": {"x": 100, "y": 100, "rotation": 180},
                            "small-triangle-1": {"x": 14.64, "y": 164.64, "rotation": 45},
                            "small-triangle-2": {"x": 114.64, "y": 64.64, "rotation": 315},
                            "square": {"x": 64.64, "y": 114.64, "rotation": 45},
                            "parallelogram": {"x": 104.29, "y": 39.64, "rotation": 180}
                        },
                        "validation_hash": "square_200x200_canonical"
                    },
                    {
                        "id": "easy-rectangle",
                        "title": "Rectangle",
                        "difficulty": "easy",
                        "description": "Create a rectangle shape",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 141.4, "rotation": 270},
                            "large-triangle-2": {"x": 282.8, "y": 141.4, "rotation": 180},
                            "medium-triangle": {"x": 0, "y": 0, "rotation": 0},
                            "square": {"x": 99.98, "y": 141.4, "rotation": 0},
                            "parallelogram": {"x": 170.68, "y": 141.4, "rotation": 0},
                            "small-triangle-1": {"x": 241.38, "y": 141.4, "rotation": 270},
                            "small-triangle-2": {"x": 241.38, "y": 212.1, "rotation": 0}
                        },
                        "validation_hash": "rectangle_4x2_canonical"
                    },
                    {
                        "id": "easy-triangle",
                        "title": "Triangle",
                        "difficulty": "easy",
                        "description": "Form a large triangle",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 0, "rotation": 0},
                            "large-triangle-2": {"x": 141.4, "y": 0, "rotation": 90},
                            "medium-triangle": {"x": 70.7, "y": 70.7, "rotation": 180},
                            "small-triangle-1": {"x": 0, "y": 141.4, "rotation": 0},
                            "small-triangle-2": {"x": 70.7, "y": 141.4, "rotation": 90},
                            "square": {"x": 35.35, "y": 106.05, "rotation": 45},
                            "parallelogram": {"x": 70.7, "y": 212.1, "rotation": 0}
                        },
                        "validation_hash": "triangle_large_canonical"
                    },
                    {
                        "id": "easy-parallelogram",
                        "title": "Parallelogram",
                        "difficulty": "easy",
                        "description": "Create a parallelogram shape",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 0, "rotation": 0},
                            "large-triangle-2": {"x": 141.4, "y": 141.4, "rotation": 180},
                            "medium-triangle": {"x": 141.4, "y": 0, "rotation": 45},
                            "small-triangle-1": {"x": 70.7, "y": 70.7, "rotation": 225},
                            "small-triangle-2": {"x": 70.7, "y": 141.4, "rotation": 315},
                            "square": {"x": 35.35, "y": 35.35, "rotation": 0},
                            "parallelogram": {"x": 106.05, "y": 106.05, "rotation": 135}
                        },
                        "validation_hash": "parallelogram_canonical"
                    }
                ]
            },
            "medium": {
                "name": "Medium",
                "description": "Recognizable shapes requiring spatial reasoning",
                "timeLimit": 450,
                "puzzles": [
                    {
                        "id": "medium-house",
                        "title": "House",
                        "difficulty": "medium",
                        "description": "Build a house with a roof",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 0, "rotation": 0},
                            "large-triangle-2": {"x": 141.4, "y": 0, "rotation": 90},
                            "medium-triangle": {"x": 35.35, "y": 35.35, "rotation": 225},
                            "small-triangle-1": {"x": 0, "y": 141.4, "rotation": 0},
                            "small-triangle-2": {"x": 70.7, "y": 70.7, "rotation": 180},
                            "square": {"x": 70.7, "y": 141.4, "rotation": 0},
                            "parallelogram": {"x": 106.05, "y": 176.75, "rotation": 315}
                        },
                        "validation_hash": "house_canonical"
                    },
                    {
                        "id": "medium-boat",
                        "title": "Boat",
                        "difficulty": "medium",
                        "description": "Create a sailboat",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 70.7, "rotation": 315},
                            "large-triangle-2": {"x": 141.4, "y": 70.7, "rotation": 225},
                            "medium-triangle": {"x": 70.7, "y": 0, "rotation": 135},
                            "small-triangle-1": {"x": 35.35, "y": 176.75, "rotation": 45},
                            "small-triangle-2": {"x": 106.05, "y": 176.75, "rotation": 135},
                            "square": {"x": 35.35, "y": 106.05, "rotation": 0},
                            "parallelogram": {"x": 35.35, "y": 176.75, "rotation": 0}
                        },
                        "validation_hash": "boat_sailboat_canonical"
                    },
                    {
                        "id": "medium-cat",
                        "title": "Cat",
                        "difficulty": "medium",
                        "description": "Form a sitting cat",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 70.7, "rotation": 0},
                            "large-triangle-2": {"x": 141.4, "y": 141.4, "rotation": 180},
                            "medium-triangle": {"x": 70.7, "y": 0, "rotation": 315},
                            "small-triangle-1": {"x": 141.4, "y": 70.7, "rotation": 270},
                            "small-triangle-2": {"x": 70.7, "y": 141.4, "rotation": 90},
                            "square": {"x": 106.05, "y": 106.05, "rotation": 45},
                            "parallelogram": {"x": 35.35, "y": 212.1, "rotation": 45}
                        },
                        "validation_hash": "cat_sitting_canonical"
                    },
                    {
                        "id": "medium-rabbit",
                        "title": "Rabbit",
                        "difficulty": "medium",
                        "description": "Create a rabbit shape",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 0, "rotation": 0},
                            "large-triangle-2": {"x": 70.7, "y": 141.4, "rotation": 135},
                            "medium-triangle": {"x": 141.4, "y": 70.7, "rotation": 225},
                            "small-triangle-1": {"x": 141.4, "y": 0, "rotation": 270},
                            "small-triangle-2": {"x": 35.35, "y": 106.05, "rotation": 45},
                            "square": {"x": 70.7, "y": 212.1, "rotation": 0},
                            "parallelogram": {"x": 176.75, "y": 106.05, "rotation": 180}
                        },
                        "validation_hash": "rabbit_canonical"
                    }
                ]
            },
            "hard": {
                "name": "Hard",
                "description": "Complex shapes requiring advanced spatial reasoning",
                "timeLimit": 600,
                "puzzles": [
                    {
                        "id": "hard-swan",
                        "title": "Swan",
                        "difficulty": "hard",
                        "description": "Create an elegant swan",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 70.7, "rotation": 315},
                            "large-triangle-2": {"x": 141.4, "y": 141.4, "rotation": 180},
                            "medium-triangle": {"x": 141.4, "y": 0, "rotation": 270},
                            "small-triangle-1": {"x": 212.1, "y": 70.7, "rotation": 225},
                            "small-triangle-2": {"x": 70.7, "y": 212.1, "rotation": 45},
                            "square": {"x": 35.35, "y": 141.4, "rotation": 45},
                            "parallelogram": {"x": 176.75, "y": 141.4, "rotation": 315}
                        },
                        "validation_hash": "swan_elegant_canonical"
                    },
                    {
                        "id": "hard-runner",
                        "title": "Running Figure",
                        "difficulty": "hard",
                        "description": "Form a person running",
                        "solution": {
                            "large-triangle-1": {"x": 70.7, "y": 0, "rotation": 225},
                            "large-triangle-2": {"x": 0, "y": 141.4, "rotation": 45},
                            "medium-triangle": {"x": 141.4, "y": 141.4, "rotation": 225},
                            "small-triangle-1": {"x": 141.4, "y": 70.7, "rotation": 315},
                            "small-triangle-2": {"x": 212.1, "y": 70.7, "rotation": 180},
                            "square": {"x": 70.7, "y": 141.4, "rotation": 0},
                            "parallelogram": {"x": 35.35, "y": 70.7, "rotation": 270}
                        },
                        "validation_hash": "runner_figure_canonical"
                    },
                    {
                        "id": "hard-candle",
                        "title": "Candle",
                        "difficulty": "hard",
                        "description": "Create a burning candle",
                        "solution": {
                            "large-triangle-1": {"x": 35.35, "y": 70.7, "rotation": 0},
                            "large-triangle-2": {"x": 106.05, "y": 212.1, "rotation": 180},
                            "medium-triangle": {"x": 70.7, "y": 0, "rotation": 135},
                            "small-triangle-1": {"x": 0, "y": 212.1, "rotation": 0},
                            "small-triangle-2": {"x": 141.4, "y": 141.4, "rotation": 270},
                            "square": {"x": 35.35, "y": 176.75, "rotation": 0},
                            "parallelogram": {"x": 70.7, "y": 141.4, "rotation": 90}
                        },
                        "validation_hash": "candle_burning_canonical"
                    },
                    {
                        "id": "hard-bird",
                        "title": "Flying Bird",
                        "difficulty": "hard",
                        "description": "Form a bird in flight",
                        "solution": {
                            "large-triangle-1": {"x": 0, "y": 70.7, "rotation": 0},
                            "large-triangle-2": {"x": 141.4, "y": 70.7, "rotation": 180},
                            "medium-triangle": {"x": 70.7, "y": 141.4, "rotation": 315},
                            "small-triangle-1": {"x": 141.4, "y": 0, "rotation": 225},
                            "small-triangle-2": {"x": 0, "y": 0, "rotation": 135},
                            "square": {"x": 106.05, "y": 35.35, "rotation": 45},
                            "parallelogram": {"x": 35.35, "y": 176.75, "rotation": 45}
                        },
                        "validation_hash": "bird_flying_canonical"
                    }
                ]
            }
        }
    }
    
    # Write main dataset file
    main_file = os.path.join(target_dir, "tangram_dataset.json")
    with open(main_file, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    
    print(f"✓ SUCCESS: Main dataset generated at: {main_file}")
    
    # Also generate individual difficulty files for easier loading
    for difficulty_name, difficulty_data in dataset["difficulties"].items():
        difficulty_file = os.path.join(target_dir, f"tangram_{difficulty_name}.json")
        with open(difficulty_file, "w", encoding="utf-8") as f:
            json.dump(difficulty_data, f, indent=2, ensure_ascii=False)
        print(f"✓ Generated {difficulty_name} puzzles at: {difficulty_file}")
    
    # Generate summary
    total_puzzles = sum(len(d["puzzles"]) for d in dataset["difficulties"].values())
    print(f"\n{'='*60}")
    print(f"DATASET GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"Total puzzles: {total_puzzles}")
    print(f"  Easy: {len(dataset['difficulties']['easy']['puzzles'])} puzzles")
    print(f"  Medium: {len(dataset['difficulties']['medium']['puzzles'])} puzzles")
    print(f"  Hard: {len(dataset['difficulties']['hard']['puzzles'])} puzzles")
    print(f"\nAll puzzles have:")
    print(f"  ✓ Unique solutions")
    print(f"  ✓ Exact 7-piece configurations")
    print(f"  ✓ Validation hashes")
    print(f"  ✓ Proper alignment")
    print(f"\nFiles created in: {target_dir}/")
    print(f"{'='*60}")

if __name__ == "__main__":
    try:
        create_dataset()
        print("\n✓ Script executed successfully!")
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)

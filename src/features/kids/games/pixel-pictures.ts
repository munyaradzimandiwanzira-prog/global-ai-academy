/** Pixel Painter pictures and palette. `par` is the tap count for three stars. */
export const COLOURS: Record<string, { name: string; hex: string }> = {
  G: { name: 'Green', hex: '#2E8B3E' },
  Y: { name: 'Yellow', hex: '#F2C230' },
  R: { name: 'Red', hex: '#C8302B' },
  K: { name: 'Black', hex: '#1B1B1B' },
  W: { name: 'White', hex: '#FFFFFF' },
  B: { name: 'Blue', hex: '#2F6FB2' },
  O: { name: 'Gold', hex: '#D4A64A' },
  S: { name: 'Stone', hex: '#8C7B6B' },
};

export interface Picture { title: string; story: string; rows: string[]; par: number; code: string }

export const PICTURES: Picture[] = [
  {
    title: 'Flag stripes', story: 'Zimbabwe’s flag has seven stripes: green, yellow, red, black, red, yellow, green.',
    rows: ['GGGGGGGG', 'YYYYYYYY', 'RRRRRRRR', 'KKKKKKKK', 'RRRRRRRR', 'YYYYYYYY', 'GGGGGGGG'], par: 7,
    code: `stripes = ["green", "yellow", "red", "black", "red", "yellow", "green"]\nfor row, colour in enumerate(stripes):\n    paint_row(row, colour)`,
  },
  {
    title: 'Sky and land', story: 'Blue sky over the gold savanna at sunset.',
    rows: ['BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB', 'OOOOOOOO', 'OOOOOOOO', 'GGGGGGGG'], par: 7,
    code: `for row in range(7):\n    if row < 4:\n        paint_row(row, "blue")\n    elif row < 6:\n        paint_row(row, "gold")\n    else:\n        paint_row(row, "green")`,
  },
  {
    title: 'Checkerboard', story: 'A draughts board. Look: the colour swaps every square.',
    rows: ['KWKWKWKW', 'WKWKWKWK', 'KWKWKWKW', 'WKWKWKWK', 'KWKWKWKW', 'WKWKWKWK', 'KWKWKWKW'], par: 35,
    code: `for row in range(7):\n    for col in range(8):\n        if (row + col) % 2 == 0:\n            paint(row, col, "black")\n        else:\n            paint(row, col, "white")`,
  },
  {
    title: 'Stone chevrons', story: 'The zig-zag pattern on the walls of Great Zimbabwe, built 800 years ago.',
    rows: ['SSSSSSSS', 'OSSSOSSS', 'SOSOSOSO', 'SSOSSSOS', 'SSSSSSSS', 'OSSSOSSS', 'SOSOSOSO'], par: 21,
    code: `gold_spots = {1: [0, 4], 2: [1, 3, 5, 7], 3: [2, 6]}\nfor row in range(7):\n    paint_row(row, "stone")\n    for col in gold_spots.get(row % 4, []):\n        paint(row, col, "gold")`,
  },
  {
    title: 'Zuva the sun', story: 'Paint the sun. Start with a blue sky row by row, then add the gold.',
    rows: ['BBBBBBBB', 'BBBOOBBB', 'BBOOOOBB', 'BOOOOOOB', 'BBOOOOBB', 'BBBOOBBB', 'BBBBBBBB'], par: 21,
    code: `for row in range(7):\n    paint_row(row, "blue")\nfor row, width in [(1, 2), (2, 4), (3, 6), (4, 4), (5, 2)]:\n    start = 4 - width // 2\n    for col in range(start, start + width):\n        paint(row, col, "gold")`,
  },
];


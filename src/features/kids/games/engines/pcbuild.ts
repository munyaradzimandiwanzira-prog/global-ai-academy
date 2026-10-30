/** PC Builder: parts, slots and the power-on test. */
export type Slot = 'cpu' | 'cooler' | 'ram' | 'storage' | 'gpu' | 'psu';
export interface Part { id: string; name: string; slot: Slot; price: number; watts?: number; socket?: 'AM5' | 'LGA1700'; ram?: 'DDR5' | 'DDR4'; gb?: number; fast?: boolean; tier?: 'basic' | 'gaming'; supply?: number }

export const PARTS: Part[] = [
  { id: 'r3', name: 'Ryzen 3 processor (AM5)', slot: 'cpu', price: 100, watts: 45, socket: 'AM5' },
  { id: 'r5', name: 'Ryzen 5 processor (AM5)', slot: 'cpu', price: 180, watts: 65, socket: 'AM5' },
  { id: 'i5', name: 'Core i5 processor (LGA1700)', slot: 'cpu', price: 170, watts: 65, socket: 'LGA1700' },
  { id: 'fan', name: 'CPU cooler fan', slot: 'cooler', price: 20, watts: 5 },
  { id: 'ram8', name: '8 GB RAM (DDR5)', slot: 'ram', price: 30, ram: 'DDR5', gb: 8, watts: 5 },
  { id: 'ram16', name: '16 GB RAM (DDR5)', slot: 'ram', price: 55, ram: 'DDR5', gb: 16, watts: 6 },
  { id: 'ram16old', name: '16 GB RAM (DDR4)', slot: 'ram', price: 40, ram: 'DDR4', gb: 16, watts: 6 },
  { id: 'hdd', name: '1 TB hard disk (spinning)', slot: 'storage', price: 35, gb: 1000, fast: false, watts: 8 },
  { id: 'ssd512', name: '512 GB SSD', slot: 'storage', price: 40, gb: 512, fast: true, watts: 4 },
  { id: 'ssd1t', name: '1 TB SSD', slot: 'storage', price: 70, gb: 1000, fast: true, watts: 5 },
  { id: 'gpu1', name: 'Basic graphics card', slot: 'gpu', price: 150, watts: 120, tier: 'basic' },
  { id: 'gpu2', name: 'Gaming graphics card', slot: 'gpu', price: 400, watts: 220, tier: 'gaming' },
  { id: 'psu300', name: '300 W power supply', slot: 'psu', price: 35, supply: 300 },
  { id: 'psu550', name: '550 W power supply', slot: 'psu', price: 60, supply: 550 },
  { id: 'psu750', name: '750 W power supply', slot: 'psu', price: 90, supply: 750 },
];

export const BOARD = { name: 'Motherboard: AM5 socket, DDR5 memory', socket: 'AM5' as const, ram: 'DDR5' as const, price: 120, watts: 30 };

export type Build = Partial<Record<Slot, string>>;
export const part = (id?: string) => PARTS.find((p) => p.id === id);

export function powerNeeded(b: Build): number {
  return BOARD.watts + Object.values(b).reduce((s, id) => s + (part(id)?.watts ?? 0), 0);
}
export const price = (b: Build) => BOARD.price + Object.values(b).reduce((s, id) => s + (part(id)?.price ?? 0), 0);

/** Power-on test: the problems a technician would find, in the order they'd find them. */
export function powerOn(b: Build): string[] {
  const p: string[] = [];
  const psu = part(b.psu);
  const cpu = part(b.cpu);
  const ram = part(b.ram);
  if (!psu) return ['Nothing happens. There is no power supply!'];
  if (!cpu) p.push('No processor: the computer has no brain, so it cannot start.');
  else if (cpu.socket !== BOARD.socket) p.push(`The ${cpu.name} does not fit this motherboard. The board needs an ${BOARD.socket} processor.`);
  if (cpu && !b.cooler) p.push('The processor gets too hot without a cooler and switches off.');
  if (!ram) p.push('Beep beep! No RAM, so the computer has nowhere to work.');
  else if (ram.ram !== BOARD.ram) p.push(`${ram.ram} RAM does not fit. This board needs ${BOARD.ram} memory.`);
  if (!b.storage) p.push('It starts, but says "No operating system found". Add storage to keep Windows or Linux.');
  const need = Math.ceil(powerNeeded(b) * 1.2);
  if (psu.supply! < need) p.push(`The power supply is too weak: the parts need about ${need} W (with a safety margin) but it gives ${psu.supply} W. It shuts down when you play.`);
  return p;
}

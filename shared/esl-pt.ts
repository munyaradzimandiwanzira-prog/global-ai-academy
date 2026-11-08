/**
 * Portuguese help for the English course (Português de Moçambique, European-based norms with
 * Mozambican words such as machimbombo, chapa, mata-bicho and machamba).
 *
 * STATUS: AI-translated, awaiting review by a fluent Portuguese-speaking teacher. Admins see this
 * flag in the course settings; replace an entry after review and add the word to REVIEWED.
 *
 * Teaching rule (research: the first language helps understanding, not fluency): the English being
 * practised is never replaced. Portuguese explains instructions, gives the meaning after an attempt
 * or as a hint, and fades as the learner improves.
 */
export type SupportLang = 'off' | 'pt-MZ';
export const SUPPORT_LANGS: { id: SupportLang; label: string; native: string }[] = [
  { id: 'off', label: 'English only', native: 'English only' },
  { id: 'pt-MZ', label: 'Portuguese (Mozambique)', native: 'Português (Moçambique)' },
];
export const PT_STATUS = { reviewed: false, note: 'Traduzido com IA, a aguardar revisão por um professor de português.' } as const;
/** Entries a teacher has checked (empty until a reviewer is found). */
export const REVIEWED = new Set<string>();

/** Every word in the 36-week course. */
export const PT_WORDS: Record<string, string> = {
  hello: 'olá', name: 'nome', friend: 'amigo / amiga', teacher: 'professor / professora', boy: 'menino', girl: 'menina',
  morning: 'manhã', night: 'noite', smile: 'sorriso', wave: 'acenar', one: 'um', two: 'dois', three: 'três', four: 'quatro',
  five: 'cinco', ten: 'dez', clock: 'relógio', calendar: 'calendário', sun: 'sol', week: 'semana', mother: 'mãe', father: 'pai',
  baby: 'bebé', sister: 'irmã', brother: 'irmão', grandmother: 'avó', house: 'casa', bed: 'cama', breakfast: 'mata-bicho (pequeno-almoço)',
  toothbrush: 'escova de dentes', eat: 'comer', drink: 'beber', sleep: 'dormir', run: 'correr', walk: 'andar / caminhar', read: 'ler',
  write: 'escrever', play: 'brincar / jogar', wash: 'lavar', cook: 'cozinhar', dog: 'cão', cat: 'gato', cow: 'vaca', goat: 'cabrito',
  chicken: 'galinha', lion: 'leão', elephant: 'elefante', giraffe: 'girafa', fish: 'peixe', bird: 'pássaro', big: 'grande',
  small: 'pequeno', tall: 'alto', happy: 'feliz', sad: 'triste', hot: 'quente', cold: 'frio', school: 'escola', market: 'mercado',
  river: 'rio', tomato: 'tomate', banana: 'banana', mango: 'manga', bread: 'pão', money: 'dinheiro', bag: 'saco / mochila', egg: 'ovo',
  milk: 'leite', apple: 'maçã', orange: 'laranja', please: 'por favor', 'thank you': 'obrigado / obrigada', sorry: 'desculpa',
  hungry: 'com fome', thirsty: 'com sede', tired: 'cansado', help: 'ajuda / ajudar', yes: 'sim', no: 'não', share: 'partilhar',
  book: 'livro', story: 'história', picture: 'imagem / desenho', letter: 'letra / carta', word: 'palavra', listen: 'ouvir / escutar',
  look: 'olhar', page: 'página', library: 'biblioteca', pencil: 'lápis', head: 'cabeça', eyes: 'olhos', ears: 'orelhas', nose: 'nariz',
  mouth: 'boca', hands: 'mãos', feet: 'pés', arm: 'braço', legs: 'pernas', hair: 'cabelo', farm: 'machamba (quinta)', maize: 'milho',
  seed: 'semente', rain: 'chuva', tree: 'árvore', flower: 'flor', cloud: 'nuvem', wind: 'vento', rainbow: 'arco-íris', tractor: 'tractor',
  swim: 'nadar', fly: 'voar', climb: 'subir / trepar', sing: 'cantar', dance: 'dançar', draw: 'desenhar', ride: 'andar de (bicicleta, cavalo)',
  camp: 'acampar', bake: 'cozer no forno', bus: 'machimbombo (autocarro)', car: 'carro', train: 'comboio', plane: 'avião',
  minibus: 'chapa', boat: 'barco', map: 'mapa', ticket: 'bilhete', suitcase: 'mala de viagem', road: 'estrada', doctor: 'médico / médica',
  farmer: 'camponês / agricultor', pilot: 'piloto', engineer: 'engenheiro', chef: 'cozinheiro', artist: 'artista', scientist: 'cientista',
  singer: 'cantor / cantora', firefighter: 'bombeiro', astronaut: 'astronauta', stop: 'parar / pára', wait: 'esperar', helmet: 'capacete',
  careful: 'cuidadoso (cuidado!)', hospital: 'hospital', water: 'água', hat: 'chapéu', umbrella: 'guarda-chuva', seatbelt: 'cinto de segurança',
  sunscreen: 'protector solar', cheetah: 'chita', tortoise: 'tartaruga', mouse: 'rato', whale: 'baleia', ant: 'formiga', horse: 'cavalo',
  rabbit: 'coelho', snail: 'caracol', eagle: 'águia', hippo: 'hipopótamo', chair: 'cadeira', desk: 'carteira (mesa da escola)', ruler: 'régua',
  schoolbag: 'pasta / mochila da escola', door: 'porta', window: 'janela', scissors: 'tesoura', crayon: 'lápis de cera', paper: 'papel',
  pen: 'esferográfica / caneta', rice: 'arroz', soup: 'sopa', salad: 'salada', juice: 'sumo', cup: 'chávena / copo', spoon: 'colher',
  menu: 'ementa / menu', pizza: 'piza', 'ice cream': 'gelado', zebra: 'zebra', rhino: 'rinoceronte', crocodile: 'crocodilo', monkey: 'macaco',
  snake: 'cobra', buffalo: 'búfalo', bee: 'abelha', butterfly: 'borboleta', leopard: 'leopardo', baobab: 'embondeiro (baobá)',
  football: 'futebol', music: 'música', game: 'jogo', toy: 'brinquedo', computer: 'computador', robot: 'robô', drum: 'tambor / batuque',
  guitar: 'viola / guitarra', camera: 'máquina fotográfica', kite: 'papagaio de papel', summer: 'verão', winter: 'inverno',
  spring: 'primavera', autumn: 'outono', storm: 'tempestade', snow: 'neve', lightning: 'relâmpago', fog: 'nevoeiro', thermometer: 'termómetro',
  sunny: 'ensolarado (dia de sol)', chocolate: 'chocolate', honey: 'mel', cheese: 'queijo', shirt: 'camisa', shoes: 'sapatos', brick: 'tijolo',
  bottle: 'garrafa', factory: 'fábrica', cotton: 'algodão', message: 'mensagem', phone: 'celular / telefone', newspaper: 'jornal',
  radio: 'rádio', television: 'televisão', email: 'email (correio electrónico)', envelope: 'envelope', microphone: 'microfone',
  reporter: 'repórter / jornalista', news: 'notícias', earth: 'Terra', ocean: 'oceano', forest: 'floresta', desert: 'deserto',
  mountain: 'montanha', recycle: 'reciclar', 'solar panel': 'painel solar', litter: 'lixo (no chão)', volcano: 'vulcão', island: 'ilha',
  agree: 'concordar', disagree: 'discordar', idea: 'ideia', vote: 'votar / voto', team: 'equipa', fair: 'justo', question: 'pergunta',
  choose: 'escolher', speak: 'falar', experiment: 'experiência (científica)', microscope: 'microscópio', magnet: 'íman', planet: 'planeta',
  telescope: 'telescópio', atom: 'átomo', graph: 'gráfico', battery: 'pilha / bateria', germ: 'micróbio', card: 'cartão', stamp: 'selo',
  gift: 'presente', party: 'festa', cake: 'bolo', balloon: 'balão', candle: 'vela', invitation: 'convite', photo: 'fotografia',
  heart: 'coração', lightbulb: 'lâmpada', wheel: 'roda', rocket: 'foguetão', satellite: 'satélite', internet: 'internet',
  printer: 'impressora', bicycle: 'bicicleta', laptop: 'computador portátil', 'solar car': 'carro solar', garden: 'jardim / horta',
  clinic: 'posto de saúde (clínica)', playground: 'parque infantil / recreio', well: 'poço', broom: 'vassoura', poster: 'cartaz',
  volunteer: 'voluntário', plan: 'plano / planear', bridge: 'ponte', timer: 'cronómetro', tick: 'visto (✓)', star: 'estrela',
  trophy: 'troféu', medal: 'medalha', test: 'teste', brain: 'cérebro', calm: 'calmo', practise: 'praticar', check: 'verificar',
};

/** Week titles (older learners) and themes (younger learners). */
export const PT_WEEKS: Record<number, { title: string; theme: string }> = {
  1: { title: 'Cumprimentos e apresentações', theme: 'Olá, amigos!' },
  2: { title: 'Números, dias e horas', theme: 'Conta comigo' },
  3: { title: 'A família e a rotina', theme: 'A minha família e o meu dia' },
  4: { title: 'Revisão e avaliação', theme: 'Mostra o que sabes' },
  5: { title: 'Presente simples', theme: 'O que faço todos os dias' },
  6: { title: 'Perguntas e respostas', theme: 'Quem? O quê? Onde?' },
  7: { title: 'Descrever pessoas e lugares', theme: 'Grande e pequeno' },
  8: { title: 'Prática de diálogos', theme: 'No mercado' },
  9: { title: 'Conversas', theme: 'Por favor e obrigado' },
  10: { title: 'Ouvir e ler', theme: 'Hora da história' },
  11: { title: 'Projecto oral', theme: 'Tudo sobre mim' },
  12: { title: 'Avaliação final', theme: 'Festa do primeiro trimestre' },
  13: { title: 'Pretérito (passado simples)', theme: 'Ontem na machamba' },
  14: { title: 'Experiências', theme: 'Coisas que já fiz' },
  15: { title: 'Viagens', theme: 'Vamos lá!' },
  16: { title: 'Avaliação', theme: 'Mostra o que sabes' },
  17: { title: 'Formas do futuro', theme: 'Quando eu for grande' },
  18: { title: 'Verbos modais', theme: 'Em segurança' },
  19: { title: 'Comparações', theme: 'Rápido e lento' },
  20: { title: 'Escrever parágrafos', theme: 'A minha sala de aula' },
  21: { title: 'Situações de diálogo', theme: 'No restaurante' },
  22: { title: 'Leitura de textos', theme: 'Animais de África' },
  23: { title: 'Apresentações', theme: 'As minhas coisas favoritas' },
  24: { title: 'Avaliação final', theme: 'Festa do segundo trimestre' },
  25: { title: 'Frases complexas', theme: 'O tempo e as estações' },
  26: { title: 'Voz passiva', theme: 'Como as coisas são feitas' },
  27: { title: 'Discurso indirecto', theme: 'Mensagens e notícias' },
  28: { title: 'Avaliação', theme: 'Mostra o que sabes' },
  29: { title: 'Escrever uma composição', theme: 'O nosso planeta' },
  30: { title: 'Debates', theme: 'Eu acho que…' },
  31: { title: 'Vocabulário académico', theme: 'Pequenos cientistas' },
  32: { title: 'Prática de escrita', theme: 'Cartas e postais' },
  33: { title: 'Apresentações', theme: 'Invenções' },
  34: { title: 'Trabalho de projecto', theme: 'A nossa comunidade' },
  35: { title: 'Preparação para o exame', theme: 'Preparar, apontar, já!' },
  36: { title: 'Avaliação final', theme: 'Dia da formatura!' },
};

/** Fixed interface and game lines. Keys are stable ids, not English text. */
export const PT_UI = {
  helpIn: 'Ajuda em português',
  helpOff: 'Só inglês',
  meaning: 'O que significa?',
  meaningIs: 'Em português:',
  hearPt: 'Ouvir em português',
  instructions: 'Instruções',
  start: 'Começar o jogo',
  next: 'Próximo jogo',
  again: 'Jogar outra vez',
  right: 'Muito bem!',
  tryAgain: 'Quase! Tenta outra vez.',
  yourTurn: 'A tua vez! Diz como eu.',
  whatIsThis: 'O que é isto?',
  tapTheOne: 'Toca na imagem que eu disser.',
  listenWhich: 'Ouve. Qual é a imagem?',
  rhymes: 'Que palavra rima?',
  tapSounds: 'Toca em cada som e depois junta-os.',
  spellIt: 'Ouve a palavra e soletra-a com as letras.',
  orderWords: 'Toca nas palavras pela ordem certa.',
  fillGap: 'Escolhe a palavra que falta.',
  storyIntro: 'Ouve a história e depois responde às perguntas.',
  talkIntro: 'Conversa com o Zuva em inglês. Podes pedir ajuda em português.',
  writeIntro: 'Escreve em inglês. O Zuva corrige e explica em português.',
  pairsIntro: 'Ouve com atenção. Qual das duas palavras disse o Zuva?',
  friendsIntro: 'Cuidado com os falsos amigos! Escolhe o significado certo.',
  fixIntro: 'Escolhe a forma correcta em inglês.',
  aiTranslated: PT_STATUS.note,
} as const;
export type PtKey = keyof typeof PT_UI;

/** Spoken encouragement in Portuguese (short, cached as voice clips). */
export const PT_PRAISE = ['Muito bem!', 'Excelente!', 'Boa! Conseguiste!', 'Fantástico!'];
export const PT_RETRY = ['Quase! Tenta outra vez.', 'Ouve outra vez e tenta de novo.'];

/** English → Portuguese for a course word, or null. */
export function ptWord(word: string): string | null {
  return PT_WORDS[word.toLowerCase().trim()] ?? null;
}

// ── Portuguese-speaker English: transfer patterns Zuva practises on purpose ──────────────────────

/** Minimal pairs for sounds Portuguese speakers often merge (th, ɪ/iː, h, final -ed, schwa). */
export const PT_PAIRS: { a: string; b: string; sound: string; tip: string }[] = [
  { a: 'ship', b: 'sheep', sound: 'ɪ / iː', tip: 'Em “ship” o som é curto e relaxado; em “sheep” é longo, com um sorriso.' },
  { a: 'live', b: 'leave', sound: 'ɪ / iː', tip: '“Live” é curto; “leave” é longo.' },
  { a: 'sit', b: 'seat', sound: 'ɪ / iː', tip: '“Sit” é curto; “seat” é longo.' },
  { a: 'fill', b: 'feel', sound: 'ɪ / iː', tip: '“Fill” é curto; “feel” é longo.' },
  { a: 'think', b: 'sink', sound: 'θ / s', tip: 'Para “th”, põe a ponta da língua entre os dentes e sopra.' },
  { a: 'three', b: 'tree', sound: 'θ / t', tip: '“Three” começa com a língua entre os dentes.' },
  { a: 'thank', b: 'tank', sound: 'θ / t', tip: '“Thank”: língua entre os dentes, sopra o ar.' },
  { a: 'they', b: 'day', sound: 'ð / d', tip: '“They”: língua entre os dentes, com voz.' },
  { a: 'hat', b: 'at', sound: 'h', tip: 'Em inglês o “h” ouve-se: sopra como quem embacia um espelho.' },
  { a: 'hear', b: 'ear', sound: 'h', tip: '“Hear” começa com um sopro; “ear” não.' },
  { a: 'walked', b: 'walk', sound: '-ed /t/', tip: 'Em “walked” o final soa /t/: “walkt”, não “walk-ed”.' },
  { a: 'played', b: 'play', sound: '-ed /d/', tip: 'Em “played” o final soa /d/ e não se acrescenta uma vogal.' },
  { a: 'bad', b: 'bed', sound: 'æ / e', tip: '“Bad” abre mais a boca do que “bed”.' },
  { a: 'cut', b: 'cat', sound: 'ʌ / æ', tip: '“Cut” é curto e neutro; “cat” abre a boca.' },
];

/** False friends: the English word, the right Portuguese meaning, and the trap. */
export const PT_FALSE_FRIENDS: { en: string; right: string; trap: string; example: string }[] = [
  { en: 'pretend', right: 'fingir', trap: 'pretender (= intend)', example: 'The children pretend to be lions.' },
  { en: 'actually', right: 'na verdade', trap: 'actualmente (= currently)', example: 'Actually, I like mangoes more than bananas.' },
  { en: 'assist', right: 'ajudar', trap: 'assistir (= attend / watch)', example: 'The nurse assists the doctor.' },
  { en: 'attend', right: 'assistir / frequentar', trap: 'atender (= answer, serve)', example: 'I attend school every day.' },
  { en: 'parents', right: 'pais (mãe e pai)', trap: 'parentes (= relatives)', example: 'My parents work at the market.' },
  { en: 'library', right: 'biblioteca', trap: 'livraria (= bookshop)', example: 'We borrow books from the library.' },
  { en: 'push', right: 'empurrar', trap: 'puxar (= pull)', example: 'Push the door to open it.' },
  { en: 'exquisite', right: 'requintado', trap: 'esquisito (= strange)', example: 'The cake was exquisite.' },
  { en: 'college', right: 'faculdade / instituto', trap: 'colégio (= school)', example: 'My sister goes to college in Maputo.' },
  { en: 'sensible', right: 'sensato', trap: 'sensível (= sensitive)', example: 'It is sensible to wear a helmet.' },
  { en: 'eventually', right: 'finalmente', trap: 'eventualmente (= possibly)', example: 'Eventually, the rain stopped.' },
  { en: 'lunch', right: 'almoço', trap: 'lanche (= snack)', example: 'We eat lunch at one o’clock.' },
];

/** Grammar that transfers from Portuguese: pick the right English. */
export const PT_FIXES: { text: string; answer: string; options: string[]; why: string; level: 'primary' | 'secondary' }[] = [
  { text: 'I have a ___ .', answer: 'red car', options: ['red car', 'car red'], why: 'Em inglês o adjectivo vem antes do nome: “a red car”.', level: 'primary' },
  { text: 'She has ___ .', answer: 'long hair', options: ['long hair', 'hair long'], why: 'Adjectivo antes do nome.', level: 'primary' },
  { text: '___ is beautiful.', answer: 'Life', options: ['Life', 'The life'], why: 'Para ideias em geral não se usa “the”.', level: 'secondary' },
  { text: 'People ___ happy today.', answer: 'are', options: ['are', 'is'], why: '“People” é plural em inglês.', level: 'primary' },
  { text: 'I ___ here since 2022.', answer: 'have lived', options: ['have lived', 'live'], why: 'Com “since” usa-se o present perfect: “I have lived”.', level: 'secondary' },
  { text: 'I ___ him yesterday.', answer: 'called', options: ['called', 'have called'], why: 'Com “yesterday” usa-se o passado simples.', level: 'secondary' },
  { text: 'Please ___ your homework.', answer: 'do', options: ['do', 'make'], why: 'Diz-se “do homework”, não “make”.', level: 'primary' },
  { text: 'I am ___ years old.', answer: 'ten', options: ['ten', 'have ten'], why: 'A idade em inglês usa “to be”: “I am ten”.', level: 'primary' },
  { text: 'It depends ___ the weather.', answer: 'on', options: ['on', 'of'], why: '“Depend on”, não “depend of”.', level: 'secondary' },
  { text: 'Do you know where ___ ?', answer: 'the market is', options: ['the market is', 'is the market'], why: 'Numa pergunta indirecta a ordem é normal: “where the market is”.', level: 'secondary' },
  { text: 'She is interested ___ music.', answer: 'in', options: ['in', 'on'], why: '“Interested in”.', level: 'secondary' },
  { text: 'There ___ three books on the desk.', answer: 'are', options: ['are', 'have'], why: '“Há” em inglês é “there is / there are”, não “have”.', level: 'primary' },
];

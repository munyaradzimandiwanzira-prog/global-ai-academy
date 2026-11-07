/**
 * English as a Second Language: the 36-week scheme of work, taught at eight age bands (2–20 years).
 *
 * Each week has one theme from the scheme. Younger bands learn the theme's words, sounds and short
 * phrases; older bands add the week's grammar, reading, speaking and writing. Bands follow the
 * Cambridge English levels (Pre A1 Starters to B2 First and C1 Advanced). This is our own mapping,
 * not endorsed by Cambridge.
 *
 * Content is written in British English; `localize` turns it into American English.
 */

export type EslTier = 'early' | 'primary' | 'secondary';
export type EslBandId = 'tiny' | 'little' | 'starters' | 'movers' | 'flyers' | 'key' | 'preliminary' | 'first';
export type Accent = 'gb' | 'us';

export interface EslBand {
  id: EslBandId;
  name: string;
  ages: string;
  minAge: number;
  maxAge: number;
  /** Cambridge English level this band works towards. */
  cambridge: string;
  cefr: string;
  tier: EslTier;
  blurb: string;
  /** Words in a writing task. */
  writeWords: [number, number];
}

export const ESL_BANDS: EslBand[] = [
  { id: 'tiny', name: 'Tiny Talkers', ages: '2–4', minAge: 2, maxAge: 4, cambridge: 'First words (before Pre A1)', cefr: 'Pre A1', tier: 'early', blurb: 'Listen, copy and say first words with pictures, songs and lots of praise. A grown-up helps.', writeWords: [0, 0] },
  { id: 'little', name: 'Little Readers', ages: '5–6', minAge: 5, maxAge: 6, cambridge: 'Pre A1 Starters (early)', cefr: 'Pre A1', tier: 'early', blurb: 'Letter sounds, sounding out short words, rhymes and first phrases.', writeWords: [0, 0] },
  { id: 'starters', name: 'Starters', ages: '7–8', minAge: 7, maxAge: 8, cambridge: 'Pre A1 Starters', cefr: 'Pre A1', tier: 'primary', blurb: 'Spell and say everyday words, build simple sentences, listen to short stories.', writeWords: [5, 15] },
  { id: 'movers', name: 'Movers', ages: '9–10', minAge: 9, maxAge: 10, cambridge: 'A1 Movers', cefr: 'A1', tier: 'primary', blurb: 'Sentences, questions and answers, simple grammar and short conversations.', writeWords: [20, 35] },
  { id: 'flyers', name: 'Flyers', ages: '11–12', minAge: 11, maxAge: 12, cambridge: 'A2 Flyers', cefr: 'A2', tier: 'primary', blurb: 'Longer stories, past and future, and real conversations with Zuva.', writeWords: [30, 50] },
  { id: 'key', name: 'Key', ages: '13–14', minAge: 13, maxAge: 14, cambridge: 'A2 Key for Schools', cefr: 'A2', tier: 'secondary', blurb: 'Grammar in use, reading for detail, role-plays and short messages.', writeWords: [25, 45] },
  { id: 'preliminary', name: 'Preliminary', ages: '15–16', minAge: 15, maxAge: 16, cambridge: 'B1 Preliminary for Schools', cefr: 'B1', tier: 'secondary', blurb: 'Opinions, stories and emails, longer reading and spoken discussion.', writeWords: [80, 110] },
  { id: 'first', name: 'First and Advanced', ages: '17–20', minAge: 17, maxAge: 20, cambridge: 'B2 First → C1 Advanced', cefr: 'B2–C1', tier: 'secondary', blurb: 'Essays, debates, academic vocabulary, presentations and exam strategy.', writeWords: [140, 220] },
];

export const eslBand = (id: string | null | undefined) => ESL_BANDS.find((b) => b.id === id);
export const bandForAge = (age: number) => ESL_BANDS.find((b) => age >= b.minAge && age <= b.maxAge) ?? (age < 2 ? ESL_BANDS[0]! : ESL_BANDS[ESL_BANDS.length - 1]!);

/** A picture word: the word, an emoji used until (or instead of) a generated picture. */
export type Pic = [word: string, emoji: string];
export interface Gap { text: string; answer: string; options: string[] }
export interface StoryQ { q: string; answer: string; options: string[] }

export interface EslWeek {
  week: number;
  term: 1 | 2 | 3;
  /** Title from the scheme of work. */
  title: string;
  /** What younger learners see. */
  theme: string;
  review?: boolean;
  words: Pic[];
  /** Phrases for the early years to copy (Zuva says them, the child repeats). */
  phrases: string[];
  /** Simple sentences for primary learners (sentence train, speaking). */
  sentences: string[];
  /** Grammar focus for older learners. */
  grammar: string;
  /** Longer sentences for secondary learners. */
  advanced: string[];
  gaps: Gap[];
  story: { title: string; text: string[]; questions: StoryQ[] };
  /** Role-play or discussion for Talk Time. */
  talk: string;
  /** Writing task for older learners. */
  write: string;
}

const W = (week: number, term: 1 | 2 | 3, title: string, theme: string, words: Pic[], phrases: string[], sentences: string[], grammar: string, advanced: string[], gaps: Gap[], story: EslWeek['story'], talk: string, write: string, review = false): EslWeek =>
  ({ week, term, title, theme, words, phrases, sentences, grammar, advanced, gaps, story, talk, write, review });

export const ESL_WEEKS: EslWeek[] = [
  W(1, 1, 'Greetings and introductions', 'Hello, friends!',
    [['hello', '👋'], ['name', '🏷️'], ['friend', '🤝'], ['teacher', '👩🏾‍🏫'], ['boy', '👦🏾'], ['girl', '👧🏾'], ['morning', '🌅'], ['night', '🌙'], ['smile', '😊'], ['wave', '🙋🏾']],
    ['Hello!', 'My name is {name}.', 'Goodbye, see you soon!'],
    ['Hello, my name is Tendai.', 'This is my friend Rudo.', 'Good morning, teacher.', 'Nice to meet you.'],
    'be, subject pronouns and possessive adjectives',
    ['Could you tell me your name, please?', 'Let me introduce you to my cousin, who has just moved here.', 'It was lovely to meet your family last weekend.'],
    [{ text: 'She ___ my best friend.', answer: 'is', options: ['is', 'are', 'am'] }, { text: 'What is ___ name?', answer: 'your', options: ['your', 'you', 'yours'] }, { text: 'We ___ in Form 2 this year.', answer: 'are', options: ['are', 'is', 'am'] }],
    { title: 'A new friend', text: ['Tendai goes to a new school.', 'He sees a girl with a big smile.', '"Hello! My name is Rudo," she says.', '"Hello, Rudo! I am Tendai," he says.', 'Now they are friends.'], questions: [{ q: 'What does the girl have?', answer: 'smile', options: ['smile', 'hat', 'dog'] }, { q: 'Who is Tendai’s new friend?', answer: 'girl', options: ['girl', 'teacher', 'boy'] }] },
    'Meet a new classmate: say hello, give your name, ask their name and where they are from, and say goodbye.',
    'Write a short message introducing yourself to a new pen friend: your name, age, where you live and one thing you like.'),
  W(2, 1, 'Numbers, days, time', 'Count with me',
    [['one', '1️⃣'], ['two', '2️⃣'], ['three', '3️⃣'], ['four', '4️⃣'], ['five', '5️⃣'], ['ten', '🔟'], ['clock', '🕒'], ['calendar', '📅'], ['sun', '☀️'], ['week', '🗓️']],
    ['One, two, three!', 'I am {age}.', 'What time is it?'],
    ['I have two brothers.', 'Today is Monday.', 'It is three o’clock.', 'There are seven days in a week.'],
    'numbers, dates and telling the time; prepositions at, on, in',
    ['The bus leaves at quarter past seven on weekdays.', 'My birthday is on the twelfth of March.', 'We have maths three times a week, usually in the morning.'],
    [{ text: 'School starts ___ eight o’clock.', answer: 'at', options: ['at', 'on', 'in'] }, { text: 'My birthday is ___ June.', answer: 'in', options: ['in', 'at', 'on'] }, { text: 'We play football ___ Saturdays.', answer: 'on', options: ['on', 'in', 'at'] }],
    { title: 'Five mangoes', text: ['Gogo has five mangoes.', 'She gives one to Tino.', 'She gives one to Chipo.', 'Now Gogo has three mangoes.', 'They eat them in the sun.'], questions: [{ q: 'How many mangoes does Gogo have at the start?', answer: 'five', options: ['five', 'two', 'ten'] }, { q: 'Where do they eat the mangoes?', answer: 'sun', options: ['sun', 'clock', 'calendar'] }] },
    'Plan a week with a friend: agree days and times to meet, using days of the week and clock times.',
    'Write your timetable for one school day, with the times of each lesson and break.'),
  W(3, 1, 'Family and routines', 'My family and my day',
    [['mother', '👩🏾'], ['father', '👨🏾'], ['baby', '👶🏾'], ['sister', '👧🏾'], ['brother', '👦🏾'], ['grandmother', '👵🏾'], ['house', '🏠'], ['bed', '🛏️'], ['breakfast', '🍳'], ['toothbrush', '🪥']],
    ['This is my mother.', 'I brush my teeth.', 'Good night!'],
    ['I wake up at six o’clock.', 'My sister eats breakfast.', 'We live in a small house.', 'My grandmother tells stories.'],
    'present simple for routines; adverbs of frequency',
    ['My father usually walks to work, but he sometimes takes a kombi.', 'We always have dinner together on Sundays.', 'My little brother never goes to bed before eight.'],
    [{ text: 'My mother ___ up at five every day.', answer: 'gets', options: ['gets', 'get', 'getting'] }, { text: 'I ___ go to school by bus.', answer: 'usually', options: ['usually', 'usual', 'use'] }, { text: 'Does your sister ___ tea?', answer: 'like', options: ['like', 'likes', 'liking'] }],
    { title: 'Busy morning', text: ['Rudo wakes up early.', 'She brushes her teeth with her toothbrush.', 'Her father cooks breakfast.', 'The baby laughs.', 'Then Rudo walks to school.'], questions: [{ q: 'What does Rudo use to brush her teeth?', answer: 'toothbrush', options: ['toothbrush', 'bed', 'clock'] }, { q: 'Who cooks breakfast?', answer: 'father', options: ['father', 'baby', 'sister'] }] },
    'Ask a partner about their daily routine: when they get up, how they get to school, what they do in the evening.',
    'Describe a typical day in your family, from morning to night.'),
  W(4, 1, 'Revision and assessment', 'Show what you know',
    [['hello', '👋'], ['friend', '🤝'], ['three', '3️⃣'], ['clock', '🕒'], ['mother', '👩🏾'], ['baby', '👶🏾'], ['house', '🏠'], ['smile', '😊'], ['five', '5️⃣'], ['breakfast', '🍳']],
    ['Hello, my name is {name}.', 'One, two, three, four, five!', 'This is my family.'],
    ['My friend has a baby sister.', 'I eat breakfast at seven.', 'Hello, how are you?', 'We have five chickens.'],
    'review: be, present simple, time and prepositions',
    ['I have known my best friend since we were six.', 'On weekdays my family gets up before sunrise.', 'Could you tell me what time the library opens?'],
    [{ text: 'They ___ my cousins.', answer: 'are', options: ['are', 'is', 'be'] }, { text: 'He ___ his homework after dinner.', answer: 'does', options: ['does', 'do', 'doing'] }, { text: 'The match is ___ Friday.', answer: 'on', options: ['on', 'in', 'at'] }],
    { title: 'The family picnic', text: ['It is Saturday morning.', 'Mother packs five sandwiches.', 'Baby Tari smiles at his friend.', 'They sit under a big tree.', 'Everyone says, "Thank you!"'], questions: [{ q: 'How many sandwiches are there?', answer: 'five', options: ['five', 'three', 'one'] }, { q: 'What does baby Tari do?', answer: 'smile', options: ['smile', 'clock', 'house'] }] },
    'Introduce yourself and your family to Zuva, then ask Zuva three questions about its day.',
    'Write a short profile of yourself: name, age, family, and your daily routine.', true),
  W(5, 1, 'Present simple', 'Things I do every day',
    [['eat', '🍽️'], ['drink', '🥤'], ['sleep', '😴'], ['run', '🏃🏾'], ['walk', '🚶🏾'], ['read', '📖'], ['write', '✍🏾'], ['play', '⚽'], ['wash', '🧼'], ['cook', '🍲']],
    ['I eat.', 'I run, run, run!', 'I wash my hands.'],
    ['I play football every day.', 'She reads a book.', 'We wash our hands before we eat.', 'He runs to the shop.'],
    'present simple: he/she/it -s, negatives and questions with do/does',
    ['My uncle doesn’t eat meat, so he cooks a lot of vegetables.', 'Does the library close early on Fridays?', 'Water boils at one hundred degrees Celsius.'],
    [{ text: 'He ___ to school every day.', answer: 'walks', options: ['walks', 'walk', 'walking'] }, { text: 'They ___ like spicy food.', answer: "don't", options: ["don't", "doesn't", 'not'] }, { text: '___ she play netball?', answer: 'Does', options: ['Does', 'Do', 'Is'] }],
    { title: 'Chipo’s day', text: ['Chipo wakes up and washes her face.', 'She eats porridge.', 'At school she reads and writes.', 'After school she plays with her friends.', 'At night she sleeps.'], questions: [{ q: 'What does Chipo eat?', answer: 'eat', options: ['eat', 'run', 'sleep'] }, { q: 'What does she do at night?', answer: 'sleep', options: ['sleep', 'cook', 'play'] }] },
    'Interview Zuva about what it does every day, then answer the same questions about you.',
    'Write about a person you admire and what they do every day.'),
  W(6, 1, 'Questions and answers', 'Who? What? Where?',
    [['dog', '🐕'], ['cat', '🐈'], ['cow', '🐄'], ['goat', '🐐'], ['chicken', '🐔'], ['lion', '🦁'], ['elephant', '🐘'], ['giraffe', '🦒'], ['fish', '🐟'], ['bird', '🐦']],
    ['What is it?', 'It is a dog!', 'Where is the cat?'],
    ['What is your favourite animal?', 'Where does the lion live?', 'Is it a cow or a goat?', 'How many fish can you see?'],
    'question words and word order in questions',
    ['Where did you see the elephants on your trip?', 'Which animal do you think is the most intelligent, and why?', 'How long have giraffes lived in this park?'],
    [{ text: '___ is your teacher? Mr Moyo.', answer: 'Who', options: ['Who', 'What', 'Where'] }, { text: '___ do you live? In Gweru.', answer: 'Where', options: ['Where', 'When', 'Who'] }, { text: '___ many goats do you have?', answer: 'How', options: ['How', 'What', 'Which'] }],
    { title: 'Where is the goat?', text: ['"Where is the goat?" asks Farai.', '"Is it with the cow?" No.', '"Is it with the chickens?" No.', 'The goat is on the roof!', 'Everyone laughs.'], questions: [{ q: 'Which animal is lost?', answer: 'goat', options: ['goat', 'cow', 'cat'] }, { q: 'Is the goat with the chickens?', answer: 'no', options: ['no', 'yes'] }] },
    'Play twenty questions with Zuva: one of you thinks of an animal, the other asks yes/no questions to guess it.',
    'Write five questions you would ask a wildlife ranger, and the answers you expect.'),
  W(7, 1, 'Describing people/places', 'Big and small',
    [['big', '🐘'], ['small', '🐭'], ['tall', '🦒'], ['happy', '😄'], ['sad', '😢'], ['hot', '🔥'], ['cold', '🥶'], ['school', '🏫'], ['market', '🛒'], ['river', '🏞️']],
    ['The elephant is big.', 'I am happy!', 'It is hot today.'],
    ['My school is big and green.', 'The river is cold.', 'My aunt is tall and kind.', 'The market is busy today.'],
    'adjectives, word order, and describing appearance and character',
    ['Our town has a busy market, a quiet library and a beautiful old church.', 'My grandfather is a tall, cheerful man with a grey beard.', 'The river near our village is wide but not very deep.'],
    [{ text: 'She has ___ hair.', answer: 'long black', options: ['long black', 'black long', 'longs black'] }, { text: 'The market is very ___ on Saturdays.', answer: 'busy', options: ['busy', 'busily', 'business'] }, { text: 'He looks ___ today.', answer: 'happy', options: ['happy', 'happily', 'happiness'] }],
    { title: 'At the market', text: ['The market is big and busy.', 'Tari sees red tomatoes and yellow bananas.', 'A small boy is sad. He is lost.', 'Tari helps him find his mother.', 'Now the boy is happy.'], questions: [{ q: 'How does the boy feel when he is lost?', answer: 'sad', options: ['sad', 'happy', 'hot'] }, { q: 'Where is Tari?', answer: 'market', options: ['market', 'river', 'school'] }] },
    'Describe a place you love so well that Zuva can guess it, then let Zuva describe one for you.',
    'Describe your town or village for a visitor: what it looks like, the people and the best places to go.'),
  W(8, 1, 'Role-play practice', 'At the market',
    [['tomato', '🍅'], ['banana', '🍌'], ['mango', '🥭'], ['bread', '🍞'], ['money', '💵'], ['bag', '👜'], ['egg', '🥚'], ['milk', '🥛'], ['apple', '🍎'], ['orange', '🍊']],
    ['Can I have a banana, please?', 'Here you are.', 'Thank you!'],
    ['How much are the tomatoes?', 'I would like two mangoes, please.', 'Here is your change.', 'Do you have fresh bread?'],
    'requests and offers: can, could, would like; countable and uncountable nouns',
    ['Could I have half a kilo of tomatoes and a loaf of bread, please?', 'How much would three of those mangoes cost?', 'I’m afraid we don’t have any milk left today.'],
    [{ text: 'How ___ is the bread?', answer: 'much', options: ['much', 'many', 'more'] }, { text: 'I would like ___ eggs, please.', answer: 'some', options: ['some', 'a', 'any'] }, { text: '___ I help you?', answer: 'Can', options: ['Can', 'Do', 'Am'] }],
    { title: 'Tino goes shopping', text: ['Tino has some money and a bag.', 'He buys bread and milk.', 'He wants a mango, but there are none.', 'He buys an orange instead.', '"Thank you!" says Tino.'], questions: [{ q: 'What does Tino buy instead of a mango?', answer: 'orange', options: ['orange', 'apple', 'egg'] }, { q: 'What does Tino carry?', answer: 'bag', options: ['bag', 'tomato', 'banana'] }] },
    'You are shopping at a market stall run by Zuva: ask for prices, buy three things and check your change.',
    'Write a shopping list for a family meal and a short note asking a friend to buy the items.'),
  W(9, 1, 'Conversations', 'Please and thank you',
    [['please', '🙏🏾'], ['thank you', '💛'], ['sorry', '😔'], ['hungry', '😋'], ['thirsty', '💧'], ['tired', '🥱'], ['help', '🆘'], ['yes', '✅'], ['no', '❌'], ['share', '🫶🏾']],
    ['Please!', 'Thank you!', 'I am sorry.'],
    ['Can you help me, please?', 'I am hungry. Can I have some food?', 'Sorry, I am late.', 'Thank you for sharing.'],
    'everyday functions: asking for help, apologising, agreeing and disagreeing politely',
    ['I’m really sorry I missed your call; my phone had no battery.', 'Would you mind helping me carry these books?', 'I see what you mean, but I’m not sure I agree.'],
    [{ text: '___ you mind closing the window?', answer: 'Would', options: ['Would', 'Do', 'Are'] }, { text: 'I’m sorry ___ being late.', answer: 'for', options: ['for', 'to', 'of'] }, { text: 'Thank you ___ helping me.', answer: 'for', options: ['for', 'to', 'with'] }],
    { title: 'Sharing lunch', text: ['Nyasha is hungry.', 'She forgets her lunch at home.', 'Her friend says, "Please share mine."', '"Thank you!" says Nyasha.', 'They share and smile.'], questions: [{ q: 'How does Nyasha feel?', answer: 'hungry', options: ['hungry', 'tired', 'thirsty'] }, { q: 'What does Nyasha say?', answer: 'thank you', options: ['thank you', 'sorry', 'no'] }] },
    'Have a polite phone conversation with Zuva: invite it to an event, deal with a problem, and agree a plan.',
    'Write a polite message apologising for missing a meeting and suggesting a new time.'),
  W(10, 1, 'Listening/reading', 'Story time',
    [['book', '📚'], ['story', '📜'], ['picture', '🖼️'], ['letter', '✉️'], ['word', '🔤'], ['listen', '👂🏾'], ['look', '👀'], ['page', '📄'], ['library', '🏛️'], ['pencil', '✏️']],
    ['Look and listen!', 'I like this book.', 'Turn the page.'],
    ['Please listen to the story.', 'Look at the picture on this page.', 'I read a book every night.', 'The library has many books.'],
    'reading strategies: skimming, scanning, main idea and detail',
    ['The main idea of the article is that reading for pleasure improves vocabulary.', 'Scan the timetable quickly to find when the next train leaves.', 'Although the story is short, the ending is surprising.'],
    [{ text: 'The story is ___ a brave girl.', answer: 'about', options: ['about', 'of', 'on'] }, { text: 'I ___ reading this book now.', answer: 'am', options: ['am', 'do', 'have'] }, { text: 'Look ___ the picture.', answer: 'at', options: ['at', 'to', 'in'] }],
    { title: 'The talking book', text: ['Rudo finds a book in the library.', 'She opens it and looks at the pictures.', 'A letter falls out of a page!', 'It says: "Read me a story."', 'Rudo smiles and reads.'], questions: [{ q: 'Where does Rudo find the book?', answer: 'library', options: ['library', 'house', 'market'] }, { q: 'What falls out of the page?', answer: 'letter', options: ['letter', 'pencil', 'picture'] }] },
    'Listen to a short story from Zuva, then retell it in your own words and answer Zuva’s questions.',
    'Write a short review of a book or story you enjoyed: what happens and why others should read it.'),
  W(11, 1, 'Speaking project', 'All about me',
    [['head', '🙆🏾'], ['eyes', '👀'], ['ears', '👂🏾'], ['nose', '👃🏾'], ['mouth', '👄'], ['hands', '🙌🏾'], ['feet', '🦶🏾'], ['arm', '💪🏾'], ['legs', '🦵🏾'], ['hair', '💇🏾']],
    ['Touch your nose!', 'Clap your hands!', 'This is me!'],
    ['I have two eyes and two ears.', 'I clap my hands.', 'My hair is short and black.', 'I can stand on one leg.'],
    'organising a short talk: introduction, main points, conclusion; signposting language',
    ['First, I’d like to tell you about where I grew up.', 'Another reason I enjoy football is that it keeps me fit.', 'To sum up, these three things make me who I am.'],
    [{ text: '___, I will talk about my family.', answer: 'First', options: ['First', 'Finally', 'Then'] }, { text: '___ conclusion, I love my town.', answer: 'In', options: ['In', 'To', 'At'] }, { text: 'I want to talk ___ my hobbies.', answer: 'about', options: ['about', 'for', 'on'] }],
    { title: 'Simon says', text: ['Zuva plays a game with the children.', '"Touch your head!" says Zuva.', '"Clap your hands!" says Zuva.', '"Stand on one leg!"', 'Everyone falls down and laughs.'], questions: [{ q: 'What do the children clap?', answer: 'hands', options: ['hands', 'feet', 'ears'] }, { q: 'What do they touch first?', answer: 'head', options: ['head', 'nose', 'arm'] }] },
    'Give Zuva a one-minute talk called "All about me". Zuva will ask two follow-up questions.',
    'Write the script for a two-minute talk about yourself with a clear beginning, middle and end.'),
  W(12, 1, 'Final assessment', 'Term one party',
    [['hello', '👋'], ['dog', '🐕'], ['happy', '😄'], ['mango', '🥭'], ['book', '📚'], ['hands', '🙌🏾'], ['eat', '🍽️'], ['please', '🙏🏾'], ['big', '🐘'], ['four', '4️⃣']],
    ['Hello, everyone!', 'I am happy!', 'Thank you, Zuva!'],
    ['My dog is big and happy.', 'Please give me a mango.', 'I read a book with my hands.', 'Where is the school?'],
    'term one review: present simple, questions, adjectives, polite requests',
    ['Where do you usually go when you want somewhere quiet to read?', 'Could you describe the most interesting person in your family?', 'I’m sorry, but I don’t agree that football is boring.'],
    [{ text: 'My brother ___ like fish.', answer: "doesn't", options: ["doesn't", "don't", 'not'] }, { text: '___ is the market? Near the river.', answer: 'Where', options: ['Where', 'Who', 'When'] }, { text: 'It is a ___ day.', answer: 'hot sunny', options: ['hot sunny', 'sunny hotly', 'hotly sunny'] }],
    { title: 'The end of term', text: ['It is the last day of term.', 'The children eat cake and mangoes.', 'A happy dog runs into the class!', 'The teacher laughs.', '"Goodbye, see you next term!"'], questions: [{ q: 'What runs into the class?', answer: 'dog', options: ['dog', 'cat', 'goat'] }, { q: 'What fruit do they eat?', answer: 'mango', options: ['mango', 'banana', 'apple'] }] },
    'Term review chat: Zuva asks about your family, routine, favourite animal and a place you like.',
    'Write a letter to a friend telling them about your term: what you learned, what you enjoyed and your plans.', true),

  W(13, 2, 'Past tense', 'Yesterday on the farm',
    [['farm', '🌾'], ['maize', '🌽'], ['seed', '🌱'], ['rain', '🌧️'], ['tree', '🌳'], ['flower', '🌸'], ['cloud', '☁️'], ['wind', '🌬️'], ['rainbow', '🌈'], ['tractor', '🚜']],
    ['It rained!', 'I saw a rainbow.', 'We planted a seed.'],
    ['Yesterday it rained on the farm.', 'We planted maize seeds.', 'I saw a big rainbow.', 'The wind blew the clouds away.'],
    'past simple: regular and irregular verbs, negatives and questions',
    ['When the rains came, the farmers planted their maize straight away.', 'We didn’t go to the river because the wind was too strong.', 'Did you see the rainbow after the storm last night?'],
    [{ text: 'Yesterday we ___ maize.', answer: 'planted', options: ['planted', 'plant', 'planting'] }, { text: 'She ___ a rainbow.', answer: 'saw', options: ['saw', 'seed', 'sees'] }, { text: 'They ___ go to school on Monday.', answer: "didn't", options: ["didn't", "don't", "wasn't"] }],
    { title: 'The rainbow seeds', text: ['Last week Gogo gave Tari some seeds.', 'Tari planted them on the farm.', 'Then it rained and rained.', 'The sun came out and Tari saw a rainbow.', 'Next day, little flowers grew!'], questions: [{ q: 'What did Tari plant?', answer: 'seed', options: ['seed', 'tree', 'cloud'] }, { q: 'What did Tari see after the rain?', answer: 'rainbow', options: ['rainbow', 'tractor', 'wind'] }] },
    'Tell Zuva what you did last weekend; Zuva will ask questions using the past tense.',
    'Write a story that begins: "It was raining when I left home that morning…"'),
  W(14, 2, 'Experiences', 'Things I have done',
    [['swim', '🏊🏾'], ['fly', '✈️'], ['climb', '🧗🏾'], ['sing', '🎤'], ['dance', '💃🏾'], ['draw', '🎨'], ['ride', '🚲'], ['camp', '⛺'], ['bake', '🧁'], ['fish', '🎣']],
    ['I can swim!', 'I like to sing.', 'Let’s dance!'],
    ['I have been to the lake.', 'Have you ever climbed a tree?', 'She can ride a bike.', 'We baked a cake.'],
    'present perfect for experience: ever, never, already, yet, been/gone',
    ['Have you ever been to Victoria Falls?', 'I’ve never tried fishing, but I’d love to.', 'She has already finished her project, but I haven’t started mine yet.'],
    [{ text: 'Have you ever ___ a horse?', answer: 'ridden', options: ['ridden', 'rode', 'ride'] }, { text: 'I have ___ been on a plane.', answer: 'never', options: ['never', 'ever', 'yet'] }, { text: 'She has ___ finished.', answer: 'already', options: ['already', 'yet', 'ever'] }],
    { title: 'The camping trip', text: ['Chipo has never camped before.', 'This weekend she sleeps in a tent.', 'She sings songs by the fire with her brother.', 'They fish in the lake.', '"Best weekend ever!" she says.'], questions: [{ q: 'Where does Chipo sleep?', answer: 'camp', options: ['camp', 'fly', 'swim'] }, { q: 'What do they do in the lake?', answer: 'fish', options: ['fish', 'draw', 'bake'] }] },
    'Find out three things Zuva has "never done" and tell Zuva about your most exciting experience.',
    'Write about the most memorable experience of your life so far and why it mattered.'),
  W(15, 2, 'Travel', 'Let’s go!',
    [['bus', '🚌'], ['car', '🚗'], ['train', '🚆'], ['plane', '✈️'], ['minibus', '🚐'], ['boat', '⛵'], ['map', '🗺️'], ['ticket', '🎫'], ['suitcase', '🧳'], ['road', '🛣️']],
    ['Beep beep! A car!', 'We go by bus.', 'Look at the map!'],
    ['We go to Bulawayo by bus.', 'The train is very long.', 'I have a ticket.', 'Pack your suitcase.'],
    'travel language: directions, transport, prepositions of movement',
    ['Take the second road on the left and go straight past the bank.', 'The overnight train to Victoria Falls was cheaper than flying.', 'How long does it take to get to the airport by minibus?'],
    [{ text: 'We travelled ___ train.', answer: 'by', options: ['by', 'on', 'with'] }, { text: 'Go ___ the bridge and turn right.', answer: 'across', options: ['across', 'at', 'in'] }, { text: 'The plane ___ at six.', answer: 'leaves', options: ['leaves', 'leave', 'leaving'] }],
    { title: 'The long trip', text: ['Farai and his mother go to see Gogo.', 'They take a minibus to the bus station.', 'Then they ride a big bus.', 'Farai looks at the map.', 'At last they see Gogo’s house!'], questions: [{ q: 'What does Farai look at?', answer: 'map', options: ['map', 'ticket', 'boat'] }, { q: 'Who do they visit?', answer: 'Gogo', options: ['Gogo', 'teacher', 'baby'] }] },
    'You are at a bus station and Zuva works at the ticket office: buy a ticket, ask about times and platforms.',
    'Write an email to a friend explaining how to travel to your home from the nearest city.'),
  W(16, 2, 'Assessment', 'Show what you know',
    [['rain', '🌧️'], ['rainbow', '🌈'], ['swim', '🏊🏾'], ['sing', '🎤'], ['bus', '🚌'], ['plane', '✈️'], ['tree', '🌳'], ['ticket', '🎫'], ['dance', '💃🏾'], ['map', '🗺️']],
    ['I saw a plane!', 'We sang a song.', 'The bus is here!'],
    ['Last year I went on a plane.', 'Have you ever seen a rainbow?', 'We danced in the rain.', 'Where is your ticket?'],
    'review: past simple, present perfect, travel language',
    ['I’ve visited Mutare twice, but I went to Kariba only once.', 'While we were waiting for the bus, it started to rain.', 'Have you decided where you’re going on holiday yet?'],
    [{ text: 'I ___ to Kariba last year.', answer: 'went', options: ['went', 'have gone', 'go'] }, { text: 'Have you ___ seen snow?', answer: 'ever', options: ['ever', 'never', 'yet'] }, { text: 'We ___ the bus to town.', answer: 'took', options: ['took', 'take', 'taken'] }],
    { title: 'The singing bus', text: ['Our class went on a trip.', 'On the bus we sang songs.', 'It rained, then we saw a rainbow.', 'We danced under the trees.', 'It was a happy day.'], questions: [{ q: 'What did the class do on the bus?', answer: 'sing', options: ['sing', 'swim', 'map'] }, { q: 'What did they see after the rain?', answer: 'rainbow', options: ['rainbow', 'plane', 'ticket'] }] },
    'Tell Zuva about a journey you made: how you travelled, what happened and what you have learned from travelling.',
    'Write a short report of a school trip for the school newsletter.', true),
  W(17, 2, 'Future forms', 'When I grow up',
    [['doctor', '🧑🏾‍⚕️'], ['farmer', '🧑🏾‍🌾'], ['pilot', '🧑🏾‍✈️'], ['engineer', '🧑🏾‍🔧'], ['chef', '🧑🏾‍🍳'], ['artist', '🧑🏾‍🎨'], ['scientist', '🧑🏾‍🔬'], ['singer', '🧑🏾‍🎤'], ['firefighter', '🧑🏾‍🚒'], ['astronaut', '🧑🏾‍🚀']],
    ['I want to be a doctor!', 'I will fly a plane.', 'Zoom! I am a pilot!'],
    ['I want to be a scientist.', 'Tomorrow I will help my mother.', 'She is going to be an artist.', 'He will build a bridge.'],
    'future forms: will, going to, present continuous for arrangements',
    ['I’m going to study engineering because I want to design solar power systems.', 'We’re meeting the careers adviser on Thursday afternoon.', 'I think more people will work from home in the future.'],
    [{ text: 'Look at those clouds. It ___ rain.', answer: "'s going to", options: ["'s going to", 'will', 'is'] }, { text: 'I ___ help you with your homework.', answer: "'ll", options: ["'ll", "'m", "'d"] }, { text: 'We ___ visiting Gogo on Sunday.', answer: 'are', options: ['are', 'will', 'going'] }],
    { title: 'Big dreams', text: ['Our teacher asks, "What will you be?"', 'Tino says, "I will be a pilot."', 'Rudo says, "I am going to be a doctor."', 'Farai wants to be an astronaut.', 'Everyone has a big dream.'], questions: [{ q: 'What will Tino be?', answer: 'pilot', options: ['pilot', 'doctor', 'chef'] }, { q: 'What does Farai want to be?', answer: 'astronaut', options: ['astronaut', 'farmer', 'singer'] }] },
    'Tell Zuva about your plans for next week and your dream job; Zuva asks how you will get there.',
    'Write about where you see yourself in ten years and the steps you will take to get there.'),
  W(18, 2, 'Modal verbs', 'Stay safe',
    [['stop', '🛑'], ['wait', '✋🏾'], ['helmet', '⛑️'], ['careful', '⚠️'], ['hospital', '🏥'], ['water', '💧'], ['hat', '🧢'], ['umbrella', '☂️'], ['seatbelt', '🚗'], ['sunscreen', '🧴']],
    ['Stop! Look! Listen!', 'Wear your hat.', 'Be careful!'],
    ['You must wear a helmet.', 'You should drink water.', 'Can I go outside?', 'We must stop at the road.'],
    'modal verbs: can, could, must, have to, should, might',
    ['You must not swim in the river when it is flooding.', 'You should drink plenty of water when it is very hot.', 'We might have to cancel the match if it keeps raining.'],
    [{ text: 'You ___ wear a seatbelt. It is the law.', answer: 'must', options: ['must', 'might', 'could'] }, { text: 'You ___ see a doctor about that cough.', answer: 'should', options: ['should', 'can', 'mustn’t'] }, { text: 'It ___ rain later, so take an umbrella.', answer: 'might', options: ['might', 'must', 'should'] }],
    { title: 'Road safety day', text: ['A police officer visits our school.', '"You must stop at the road," she says.', '"You should look left and right."', '"Wear a helmet on your bike!"', 'We all say, "We will be careful!"'], questions: [{ q: 'What should you wear on a bike?', answer: 'helmet', options: ['helmet', 'umbrella', 'sunscreen'] }, { q: 'What must you do at the road?', answer: 'stop', options: ['stop', 'water', 'hat'] }] },
    'Give Zuva advice: it is going hiking in hot weather. Use must, should and might.',
    'Write a set of safety rules for a school trip and explain the reason for each one.'),
  W(19, 2, 'Comparisons', 'Fast and slow',
    [['cheetah', '🐆'], ['tortoise', '🐢'], ['mouse', '🐭'], ['whale', '🐋'], ['ant', '🐜'], ['horse', '🐎'], ['rabbit', '🐇'], ['snail', '🐌'], ['eagle', '🦅'], ['hippo', '🦛']],
    ['The cheetah is fast!', 'The snail is slow.', 'The whale is big!'],
    ['A cheetah is faster than a horse.', 'A snail is slower than a tortoise.', 'The whale is the biggest animal.', 'An ant is smaller than a mouse.'],
    'comparatives and superlatives; as … as',
    ['The cheetah is the fastest land animal, but it can only run at top speed for a short time.', 'Hippos are more dangerous than most people think.', 'This year’s harvest was not as good as last year’s.'],
    [{ text: 'An eagle is ___ than a chicken.', answer: 'faster', options: ['faster', 'fastest', 'more fast'] }, { text: 'This is the ___ book I have read.', answer: 'most interesting', options: ['most interesting', 'more interesting', 'interestingest'] }, { text: 'My bag is as heavy ___ yours.', answer: 'as', options: ['as', 'than', 'like'] }],
    { title: 'The race', text: ['The rabbit and the tortoise have a race.', 'The rabbit is faster, so he takes a nap.', 'The tortoise is slower, but he never stops.', 'The tortoise wins!', 'Slow and steady wins the race.'], questions: [{ q: 'Who is faster?', answer: 'rabbit', options: ['rabbit', 'tortoise', 'snail'] }, { q: 'Who wins the race?', answer: 'tortoise', options: ['tortoise', 'rabbit', 'horse'] }] },
    'Compare two places, phones or sports teams with Zuva and try to persuade it which is better.',
    'Compare life in a city and life in the countryside. Which would you choose, and why?'),
  W(20, 2, 'Writing paragraphs', 'My classroom',
    [['chair', '🪑'], ['desk', '🗄️'], ['ruler', '📏'], ['schoolbag', '🎒'], ['door', '🚪'], ['window', '🪟'], ['scissors', '✂️'], ['crayon', '🖍️'], ['paper', '📄'], ['pen', '🖊️']],
    ['Sit on your chair.', 'Open the door.', 'I draw with crayons.'],
    ['My classroom has a big window.', 'I keep my pens in my schoolbag.', 'Please close the door.', 'We cut paper with scissors.'],
    'paragraph structure: topic sentence, supporting details, linking words',
    ['My classroom is a bright, friendly place where everyone feels welcome.', 'Firstly, the large windows let in plenty of light; secondly, our work covers the walls.', 'However, the room can get very hot in October.'],
    [{ text: 'I like my school. ___, I love the library.', answer: 'In particular', options: ['In particular', 'However', 'But'] }, { text: 'It is small. ___, it is very comfortable.', answer: 'However', options: ['However', 'Because', 'So'] }, { text: 'I was tired, ___ I went to bed early.', answer: 'so', options: ['so', 'but', 'because'] }],
    { title: 'The tidy-up', text: ['Our classroom is messy.', 'There is paper on the floor and crayons under the desks.', 'We put the scissors in a box.', 'We open the window for fresh air.', 'Now our classroom is clean and tidy.'], questions: [{ q: 'What is on the floor?', answer: 'paper', options: ['paper', 'door', 'chair'] }, { q: 'What do they open?', answer: 'window', options: ['window', 'schoolbag', 'pen'] }] },
    'Plan a paragraph out loud with Zuva: say your topic sentence, three details and a closing sentence.',
    'Write one well-organised paragraph about the best room in your school, with a topic sentence and linking words.'),
  W(21, 2, 'Role-play scenarios', 'At the restaurant',
    [['rice', '🍚'], ['chicken', '🍗'], ['soup', '🍜'], ['salad', '🥗'], ['juice', '🧃'], ['cup', '☕'], ['spoon', '🥄'], ['menu', '📋'], ['pizza', '🍕'], ['ice cream', '🍦']],
    ['Yum yum!', 'Juice, please.', 'I like rice.'],
    ['Can I see the menu, please?', 'I would like rice and chicken.', 'The soup is hot.', 'Can I have a spoon, please?'],
    'functional language for real situations: ordering, complaining politely, making appointments',
    ['Excuse me, I ordered the chicken, but this is fish.', 'Could we have a table for four by the window, please?', 'I’d like to make an appointment to see the doctor tomorrow morning.'],
    [{ text: 'I’d ___ the vegetable soup, please.', answer: 'like', options: ['like', 'want to', 'liking'] }, { text: 'Could I ___ the bill, please?', answer: 'have', options: ['have', 'to have', 'having'] }, { text: 'Excuse me, this soup is ___ cold.', answer: 'too', options: ['too', 'to', 'very much'] }],
    { title: 'Zuva’s café', text: ['Zuva opens a café.', 'Chipo looks at the menu.', '"Pizza and juice, please," she says.', 'Zuva brings ice cream by mistake!', 'Chipo laughs and eats it anyway.'], questions: [{ q: 'What does Chipo look at?', answer: 'menu', options: ['menu', 'spoon', 'cup'] }, { q: 'What does Zuva bring by mistake?', answer: 'ice cream', options: ['ice cream', 'rice', 'soup'] }] },
    'Order a meal from Zuva the waiter; something goes wrong with the order and you must sort it out politely.',
    'Write a short email to a restaurant to book a table for a celebration and ask about the menu.'),
  W(22, 2, 'Reading texts', 'Animals of Africa',
    [['zebra', '🦓'], ['rhino', '🦏'], ['crocodile', '🐊'], ['monkey', '🐒'], ['snake', '🐍'], ['buffalo', '🐃'], ['bee', '🐝'], ['butterfly', '🦋'], ['leopard', '🐆'], ['baobab', '🌳']],
    ['Look, a zebra!', 'The monkey jumps.', 'Buzz buzz, a bee!'],
    ['The zebra has black and white stripes.', 'Monkeys live in trees.', 'Crocodiles swim in the river.', 'The baobab tree is very old.'],
    'reading longer texts: inference, opinion vs fact, reference words',
    ['Baobab trees can store thousands of litres of water in their trunks, which helps them survive long dry seasons.', 'Rangers believe the rhino population is slowly recovering, although poaching is still a threat.', 'It was this discovery that changed how scientists understood the ecosystem.'],
    [{ text: 'Rhinos are rare. ___ are protected in national parks.', answer: 'They', options: ['They', 'It', 'Them'] }, { text: 'The baobab, ___ can live for a thousand years, is a symbol of Africa.', answer: 'which', options: ['which', 'who', 'where'] }, { text: 'In my ___, zebras are the most beautiful animals.', answer: 'opinion', options: ['opinion', 'idea', 'mind'] }],
    { title: 'The wise baobab', text: ['An old baobab tree stands by the river.', 'Monkeys play in its branches.', 'Bees make honey in a hole in its trunk.', 'A crocodile sleeps in its shade.', 'All the animals call it "Grandmother Tree".'], questions: [{ q: 'Who plays in the branches?', answer: 'monkey', options: ['monkey', 'crocodile', 'zebra'] }, { q: 'What makes honey in the trunk?', answer: 'bee', options: ['bee', 'snake', 'butterfly'] }] },
    'Read a short text Zuva gives you about an African animal, then discuss what was fact and what was opinion.',
    'Write a factual leaflet about an endangered animal for visitors to a national park.'),
  W(23, 2, 'Presentations', 'My favourite things',
    [['football', '⚽'], ['music', '🎵'], ['game', '🎮'], ['toy', '🧸'], ['computer', '💻'], ['robot', '🤖'], ['drum', '🥁'], ['guitar', '🎸'], ['camera', '📷'], ['kite', '🪁']],
    ['I love my toy!', 'Bang the drum!', 'This is my kite.'],
    ['My favourite thing is my guitar.', 'I play football with my friends.', 'This robot can talk.', 'I like music because it is fun.'],
    'presenting: engaging the audience, visuals, handling questions',
    ['Today I’m going to show you how our team built a robot from recycled parts.', 'As you can see from this photo, the first design didn’t work.', 'That’s a great question; let me explain how the sensor works.'],
    [{ text: 'Today I’m going ___ talk about music.', answer: 'to', options: ['to', 'for', 'at'] }, { text: 'As you can ___, the graph shows a big rise.', answer: 'see', options: ['see', 'look', 'watch'] }, { text: 'Does anyone ___ any questions?', answer: 'have', options: ['have', 'has', 'having'] }],
    { title: 'Show and tell', text: ['It is show and tell day.', 'Tari brings his kite.', 'Rudo brings a little robot.', 'The robot says, "Hello, class!"', 'Everyone claps.'], questions: [{ q: 'What does Tari bring?', answer: 'kite', options: ['kite', 'drum', 'camera'] }, { q: 'What says "Hello, class"?', answer: 'robot', options: ['robot', 'toy', 'game'] }] },
    'Present your favourite thing to Zuva for one minute; Zuva will ask questions like an audience.',
    'Write the slides and speaker notes for a three-minute presentation about a hobby.'),
  W(24, 2, 'Final assessment', 'Term two party',
    [['pilot', '🧑🏾‍✈️'], ['zebra', '🦓'], ['helmet', '⛑️'], ['cheetah', '🐆'], ['juice', '🧃'], ['robot', '🤖'], ['rainbow', '🌈'], ['bus', '🚌'], ['chair', '🪑'], ['swim', '🏊🏾']],
    ['I will be a pilot!', 'The cheetah is fast!', 'Juice, please!'],
    ['I will be a pilot one day.', 'A cheetah is faster than a zebra.', 'You must wear a helmet.', 'Have you ever ridden a bus?'],
    'term two review: past, present perfect, future, modals, comparisons',
    ['If I had more time, I would learn to play the guitar.', 'The journey took longer than we had expected.', 'You shouldn’t have left your helmet at home.'],
    [{ text: 'She is the ___ runner in our school.', answer: 'fastest', options: ['fastest', 'faster', 'most fast'] }, { text: 'I ___ visit my aunt next week.', answer: "'m going to", options: ["'m going to", 'will to', 'going'] }, { text: 'You ___ cross the road without looking.', answer: "mustn't", options: ["mustn't", "don't have to", 'should'] }],
    { title: 'Robot sports day', text: ['It is sports day.', 'Rudo’s robot runs faster than a cheetah!', 'Tari swims like a fish.', 'After the race, they drink juice.', 'It was the best day of term.'], questions: [{ q: 'What runs faster than a cheetah?', answer: 'robot', options: ['robot', 'zebra', 'bus'] }, { q: 'What do they drink?', answer: 'juice', options: ['juice', 'helmet', 'chair'] }] },
    'Term review chat: Zuva asks about past trips, future plans, rules and comparisons.',
    'Write a letter to your future self describing this term and your goals for next term.', true),

  W(25, 3, 'Complex sentences', 'Weather and seasons',
    [['summer', '🌞'], ['winter', '❄️'], ['spring', '🌷'], ['autumn', '🍂'], ['storm', '⛈️'], ['snow', '☃️'], ['lightning', '⚡'], ['fog', '🌫️'], ['thermometer', '🌡️'], ['sunny', '😎']],
    ['It is sunny!', 'Brrr, it is winter.', 'Look, snow!'],
    ['I wear a hat because it is sunny.', 'When it rains, we stay inside.', 'If it is cold, I wear a jumper.', 'In winter the nights are long.'],
    'complex sentences: because, although, when, if, unless; relative clauses',
    ['Although it was the middle of winter, the afternoon felt surprisingly warm.', 'The storm, which lasted all night, damaged several roofs in our area.', 'Unless it rains soon, the farmers will lose their crops.'],
    [{ text: 'We stayed inside ___ it was raining.', answer: 'because', options: ['because', 'although', 'unless'] }, { text: '___ it was cold, we went swimming.', answer: 'Although', options: ['Although', 'Because', 'If'] }, { text: 'The girl ___ won the race is my cousin.', answer: 'who', options: ['who', 'which', 'where'] }],
    { title: 'The surprise storm', text: ['It was a sunny summer day.', 'Suddenly the sky went dark.', 'There was lightning and a loud storm!', 'When the storm ended, the air smelled fresh.', 'Because of the rain, the garden was green again.'], questions: [{ q: 'What season was it?', answer: 'summer', options: ['summer', 'winter', 'autumn'] }, { q: 'What came with the storm?', answer: 'lightning', options: ['lightning', 'snow', 'fog'] }] },
    'Explain to Zuva how the seasons change where you live, using because, when and although.',
    'Write a short article about how weather affects daily life in your area, using at least five linking words.'),
  W(26, 3, 'Passive voice', 'How things are made',
    [['chocolate', '🍫'], ['honey', '🍯'], ['cheese', '🧀'], ['shirt', '👕'], ['shoes', '👟'], ['brick', '🧱'], ['bottle', '🍼'], ['paper', '📃'], ['factory', '🏭'], ['cotton', '🧵']],
    ['Bees make honey.', 'Yummy chocolate!', 'Brick by brick!'],
    ['Honey is made by bees.', 'Chocolate is made from cocoa.', 'This shirt was made from cotton.', 'Bricks are made from clay.'],
    'the passive: present and past simple passive, by + agent',
    ['Most of the world’s cocoa is grown in West Africa and exported to Europe.', 'The new bridge was designed by a team of young Zimbabwean engineers.', 'Thousands of plastic bottles are recycled into clothing every year.'],
    [{ text: 'Cotton ___ in many parts of Zimbabwe.', answer: 'is grown', options: ['is grown', 'grows by', 'is grew'] }, { text: 'The school ___ in 1965.', answer: 'was built', options: ['was built', 'is built', 'built'] }, { text: 'Paper is made ___ wood.', answer: 'from', options: ['from', 'by', 'of the'] }],
    { title: 'Where does honey come from?', text: ['Tari asks, "Where does honey come from?"', 'Gogo says, "Honey is made by bees."', 'The bees visit many flowers.', 'Then the honey is put into jars.', 'Tari says, "Thank you, bees!"'], questions: [{ q: 'Who makes honey?', answer: 'bee', options: ['bee', 'cheese', 'brick'] }, { q: 'Where is the honey put?', answer: 'jars', options: ['jars', 'shoes', 'shirt'] }] },
    'Explain to Zuva how something is made (bread, bricks, a phone) step by step using the passive.',
    'Describe a process you know well, such as how maize meal is produced, using the passive voice.'),
  W(27, 3, 'Reported speech', 'Messages and news',
    [['message', '💬'], ['phone', '📱'], ['newspaper', '📰'], ['radio', '📻'], ['television', '📺'], ['email', '📧'], ['envelope', '✉️'], ['microphone', '🎙️'], ['reporter', '🧑🏾‍💼'], ['news', '🗞️']],
    ['Ring ring! Hello?', 'I have a message!', 'Listen to the radio.'],
    ['Mum said, "Come home."', 'The teacher said that we were late.', 'He told me he was happy.', 'I heard the news on the radio.'],
    'reported speech: statements, questions and commands; reporting verbs',
    ['The reporter said that the new clinic would open the following month.', 'My teacher asked me whether I had finished the assignment.', 'The coach advised us to rest before the final.'],
    [{ text: 'She said she ___ tired.', answer: 'was', options: ['was', 'is', 'be'] }, { text: 'He asked me where I ___.', answer: 'lived', options: ['lived', 'do live', 'living'] }, { text: 'The doctor told me ___ more water.', answer: 'to drink', options: ['to drink', 'drink', 'drinking'] }],
    { title: 'Radio Zuva', text: ['Zuva has a radio show.', 'Today Zuva reads a message from Chipo.', 'Chipo said that she loves reading.', 'Tino asked if he could sing on the radio.', 'Zuva said, "Yes!" and Tino sang.'], questions: [{ q: 'Where is Zuva’s show?', answer: 'radio', options: ['radio', 'newspaper', 'phone'] }, { q: 'What did Tino ask to do?', answer: 'sing', options: ['sing', 'read', 'write'] }] },
    'Zuva tells you some "news". Report it to an imaginary friend, then interview Zuva like a reporter.',
    'Write a short news report about an event at your school, including what people said.'),
  W(28, 3, 'Assessment', 'Show what you know',
    [['storm', '⛈️'], ['honey', '🍯'], ['radio', '📻'], ['winter', '❄️'], ['chocolate', '🍫'], ['message', '💬'], ['factory', '🏭'], ['summer', '🌞'], ['phone', '📱'], ['shoes', '👟']],
    ['Hot summer, cold winter!', 'I like honey.', 'I have a message.'],
    ['Chocolate is made in a factory.', 'When it is winter, I wear a coat.', 'She said that it was hot.', 'Shoes are made from leather.'],
    'review: complex sentences, passive, reported speech',
    ['The match, which had been postponed twice, was finally played on Saturday.', 'She told us that the results would be announced the following day.', 'Unless the road is repaired, buses will not be able to reach the village.'],
    [{ text: 'The letter ___ yesterday.', answer: 'was sent', options: ['was sent', 'is sent', 'sent'] }, { text: 'He said he ___ come tomorrow.', answer: 'would', options: ['would', 'will', 'is'] }, { text: '___ it was late, we kept working.', answer: 'Although', options: ['Although', 'Because', 'Unless'] }],
    { title: 'Weather news', text: ['The radio said there would be a storm.', 'So the children stayed inside.', 'They ate chocolate and honey biscuits.', 'The storm was very loud.', 'Later, the sun came out again.'], questions: [{ q: 'What did the radio say?', answer: 'storm', options: ['storm', 'snow', 'summer'] }, { q: 'What did the children eat?', answer: 'chocolate', options: ['chocolate', 'shoes', 'phone'] }] },
    'Tell Zuva how something is made and report what a friend told you recently.',
    'Write a short magazine article about a local product: how it is made and what people say about it.', true),
  W(29, 3, 'Essay writing', 'Our planet',
    [['earth', '🌍'], ['ocean', '🌊'], ['forest', '🌲'], ['desert', '🏜️'], ['mountain', '⛰️'], ['recycle', '♻️'], ['solar panel', '🔆'], ['litter', '🗑️'], ['volcano', '🌋'], ['island', '🏝️']],
    ['I love our Earth!', 'Recycle, recycle!', 'Big blue ocean!'],
    ['We must keep the earth clean.', 'Forests are full of trees.', 'I put litter in the bin.', 'Solar panels use the sun.'],
    'essay structure: introduction with a thesis, body paragraphs, conclusion; formal register',
    ['There are several reasons why schools should install solar panels.', 'Opponents argue that recycling programmes are too expensive; however, the long-term savings are significant.', 'In conclusion, protecting forests benefits both people and wildlife.'],
    [{ text: '___, deforestation causes soil erosion.', answer: 'Firstly', options: ['Firstly', 'At last', 'Finally,'] }, { text: 'Some people believe ___ plastic should be banned.', answer: 'that', options: ['that', 'what', 'which'] }, { text: '___ conclusion, we must act now.', answer: 'In', options: ['In', 'To', 'For'] }],
    { title: 'The litter monster', text: ['There is litter all over the park.', 'Rudo and her friends make a plan.', 'They pick up bottles and paper.', 'They recycle everything they can.', 'Now the park is clean and green.'], questions: [{ q: 'What is all over the park?', answer: 'litter', options: ['litter', 'ocean', 'island'] }, { q: 'What do they do with the bottles?', answer: 'recycle', options: ['recycle', 'volcano', 'desert'] }] },
    'Discuss with Zuva: "Should every home have solar power?" Zuva will push back on your arguments.',
    'Write an essay: "Plastic bags should be banned in our country." Do you agree?'),
  W(30, 3, 'Debates', 'I think…',
    [['agree', '👍🏾'], ['disagree', '👎🏾'], ['idea', '💡'], ['vote', '🗳️'], ['team', '👥'], ['fair', '⚖️'], ['question', '❓'], ['choose', '☝🏾'], ['speak', '🗣️'], ['listen', '👂🏾']],
    ['I like it!', 'I don’t like it.', 'Good idea!'],
    ['I think football is the best sport.', 'I agree with you.', 'I don’t agree because it is too long.', 'Let’s vote!'],
    'expressing and supporting opinions; agreeing, disagreeing, conceding and rebutting',
    ['While I understand your point, I don’t think homework should be banned completely.', 'The evidence clearly suggests that school uniforms reduce costs for families.', 'That may be true; nevertheless, students should have a say in the rules.'],
    [{ text: 'I ___ with you completely.', answer: 'agree', options: ['agree', 'am agree', 'agreeing'] }, { text: 'In my ___, school should start later.', answer: 'view', options: ['view', 'think', 'mind'] }, { text: 'That is true; ___, it is very expensive.', answer: 'however', options: ['however', 'because', 'so'] }],
    { title: 'The class vote', text: ['The class must choose a pet.', 'Tino says, "A dog! Dogs are fun."', 'Chipo says, "I disagree. A fish is easier."', 'They listen to each other and vote.', 'The fish wins, and Tino says, "That’s fair."'], questions: [{ q: 'What do they do to choose?', answer: 'vote', options: ['vote', 'speak', 'idea'] }, { q: 'Which pet wins?', answer: 'fish', options: ['fish', 'dog', 'cat'] }] },
    'Debate with Zuva: "Mobile phones should be allowed in class." Take one side; Zuva takes the other.',
    'Write a balanced argument essay on a school issue, presenting both sides before giving your view.'),
  W(31, 3, 'Academic vocabulary', 'Little scientists',
    [['experiment', '🧪'], ['microscope', '🔬'], ['magnet', '🧲'], ['planet', '🪐'], ['telescope', '🔭'], ['atom', '⚛️'], ['graph', '📈'], ['battery', '🔋'], ['seed', '🌱'], ['germ', '🦠']],
    ['Look through the telescope!', 'Magnets stick!', 'Let’s do an experiment!'],
    ['We did an experiment in class.', 'A magnet can pick up a pin.', 'I saw Saturn with a telescope.', 'The graph shows our results.'],
    'academic vocabulary and word families: analyse, data, evidence, significant, method, conclude',
    ['The data indicate a significant increase in crop yields after irrigation was introduced.', 'Researchers analysed samples from twelve boreholes to evaluate water quality.', 'Further evidence is required before a firm conclusion can be drawn.'],
    [{ text: 'The results were ___ different.', answer: 'significantly', options: ['significantly', 'significant', 'significance'] }, { text: 'We need more ___ to prove it.', answer: 'evidence', options: ['evidence', 'evident', 'evidently'] }, { text: 'They ___ the data carefully.', answer: 'analysed', options: ['analysed', 'analysis', 'analyst'] }],
    { title: 'Zuva’s lab', text: ['Zuva has a science lab.', 'Farai looks at a leaf with a microscope.', 'He sees tiny cells!', 'Rudo tests which things a magnet can pick up.', 'They draw a graph of the results.'], questions: [{ q: 'What does Farai look through?', answer: 'microscope', options: ['microscope', 'telescope', 'battery'] }, { q: 'What do they draw?', answer: 'graph', options: ['graph', 'planet', 'atom'] }] },
    'Describe a simple experiment to Zuva using method, results and conclusion; Zuva questions your evidence.',
    'Write a short lab report on a simple experiment: aim, method, results and conclusion.'),
  W(32, 3, 'Writing practice', 'Letters and cards',
    [['card', '💌'], ['stamp', '📮'], ['gift', '🎁'], ['party', '🎉'], ['cake', '🎂'], ['balloon', '🎈'], ['candle', '🕯️'], ['invitation', '📨'], ['photo', '📸'], ['heart', '❤️']],
    ['Happy birthday!', 'Here is a card for you.', 'Thank you for my gift!'],
    ['Dear Gogo, thank you for the gift.', 'Please come to my party.', 'I made a card for my teacher.', 'The cake has ten candles.'],
    'formal and informal writing: emails, letters, reports, reviews; register and tone',
    ['I am writing to apply for the position of library assistant advertised on your website.', 'Thanks so much for the photos, they brought back great memories!', 'I would be grateful if you could send me further information about the course.'],
    [{ text: 'I am writing to ___ about the delay.', answer: 'complain', options: ['complain', 'complaining', 'complaint'] }, { text: 'I look forward to ___ from you.', answer: 'hearing', options: ['hearing', 'hear', 'heard'] }, { text: '___ Sir or Madam,', answer: 'Dear', options: ['Dear', 'Hello', 'Hi'] }],
    { title: 'The party invitation', text: ['Chipo is turning seven.', 'She makes invitations with hearts on them.', 'Her friends come with gifts and balloons.', 'There is a big cake with seven candles.', 'Chipo writes thank-you cards the next day.'], questions: [{ q: 'How many candles are on the cake?', answer: 'seven', options: ['seven', 'five', 'ten'] }, { q: 'What does Chipo write the next day?', answer: 'card', options: ['card', 'stamp', 'cake'] }] },
    'Ask Zuva to play a company manager while you make a formal phone enquiry about a job or course.',
    'Write a formal email applying for a holiday job, and an informal message telling a friend about it.'),
  W(33, 3, 'Presentations', 'Inventions',
    [['lightbulb', '💡'], ['wheel', '🛞'], ['rocket', '🚀'], ['satellite', '🛰️'], ['internet', '🌐'], ['printer', '🖨️'], ['bicycle', '🚲'], ['radio', '📻'], ['laptop', '💻'], ['solar car', '🚘']],
    ['Zoom! A rocket!', 'Click! The light is on.', 'Round and round, the wheel!'],
    ['The wheel is a very old invention.', 'A rocket flies into space.', 'We use the internet to learn.', 'My bicycle has two wheels.'],
    'presenting data and ideas: describing trends, explaining processes, persuasive techniques',
    ['Since 2010, mobile internet use in Zimbabwe has risen dramatically.', 'The invention of the printing press transformed how knowledge was shared.', 'Imagine a village where every home has clean, affordable solar power.'],
    [{ text: 'Sales rose ___ 20% last year.', answer: 'by', options: ['by', 'with', 'for'] }, { text: 'The internet ___ invented in the twentieth century.', answer: 'was', options: ['was', 'is', 'were'] }, { text: 'There has been a ___ increase in users.', answer: 'sharp', options: ['sharp', 'sharply', 'sharpen'] }],
    { title: 'The inventor', text: ['Tari loves to build things.', 'He finds an old wheel and a small solar panel.', 'He builds a tiny solar car!', 'He shows it at the science fair.', 'Everyone wants to be an inventor now.'], questions: [{ q: 'What does Tari build?', answer: 'solar car', options: ['solar car', 'rocket', 'printer'] }, { q: 'Where does he show it?', answer: 'science fair', options: ['science fair', 'market', 'library'] }] },
    'Pitch an invention to Zuva in two minutes, as if Zuva were an investor asking tough questions.',
    'Write a persuasive presentation script about an invention that would improve life in your community.'),
  W(34, 3, 'Project work', 'Our community',
    [['garden', '🌻'], ['clinic', '🏥'], ['library', '📚'], ['playground', '🛝'], ['well', '🪣'], ['broom', '🧹'], ['poster', '🪧'], ['volunteer', '🙋🏾'], ['plan', '📝'], ['bridge', '🌉']],
    ['Let’s help!', 'We clean up!', 'Our garden grows!'],
    ['We made a garden at school.', 'Volunteers help at the clinic.', 'Our team made a poster.', 'We have a plan to clean the park.'],
    'project language: planning, delegating, reporting progress, evaluating',
    ['Our team decided to focus on improving access to clean water in our area.', 'Each member was responsible for one part of the project.', 'Looking back, we should have started collecting data earlier.'],
    [{ text: 'We ___ finished the poster yet.', answer: "haven't", options: ["haven't", "didn't", "aren't"] }, { text: 'Rudo is in charge ___ the budget.', answer: 'of', options: ['of', 'for', 'with'] }, { text: 'If we ___ more time, we would add a video.', answer: 'had', options: ['had', 'have', 'will have'] }],
    { title: 'The school garden', text: ['Our school has an empty field.', 'We make a plan to grow a garden.', 'Volunteers bring seeds and water from the well.', 'We make posters to tell everyone.', 'Soon there are vegetables for the whole school!'], questions: [{ q: 'Where do they get water?', answer: 'well', options: ['well', 'clinic', 'library'] }, { q: 'What do they make to tell everyone?', answer: 'poster', options: ['poster', 'broom', 'bridge'] }] },
    'Plan a community project with Zuva: the problem, the team, the steps and how you will measure success.',
    'Write a project proposal for improving something in your community, with aims, steps and a timeline.'),
  W(35, 3, 'Exam prep', 'Ready, steady, go!',
    [['timer', '⏱️'], ['tick', '✔️'], ['star', '⭐'], ['trophy', '🏆'], ['medal', '🏅'], ['test', '📝'], ['brain', '🧠'], ['calm', '😌'], ['practise', '🔁'], ['check', '🔍']],
    ['I can do it!', 'Ready, steady, go!', 'Good job, star!'],
    ['I practise every day.', 'Check your answers.', 'Stay calm in the test.', 'You won a gold medal!'],
    'exam strategies: time management, reading the question, checking, paraphrasing',
    ['Read every question carefully and underline the key words before you answer.', 'If you are stuck on a question, move on and come back to it later.', 'Paraphrasing the question in your introduction shows the examiner you understood it.'],
    [{ text: 'You ___ check your spelling at the end.', answer: 'should', options: ['should', 'shouldn’t', 'mustn’t'] }, { text: 'Spend no more ___ ten minutes on each part.', answer: 'than', options: ['than', 'then', 'that'] }, { text: 'I need to ___ for my exam.', answer: 'revise', options: ['revise', 'revision', 'revising'] }],
    { title: 'The spelling bee', text: ['Nyasha practises spelling every day.', 'On the day of the spelling bee, she feels calm.', 'She spells "giraffe" perfectly!', 'She wins a shiny medal.', 'Zuva says, "Practice makes progress!"'], questions: [{ q: 'What does Nyasha win?', answer: 'medal', options: ['medal', 'trophy', 'timer'] }, { q: 'How does Nyasha feel?', answer: 'calm', options: ['calm', 'brain', 'test'] }] },
    'Do a mock speaking exam with Zuva: questions about you, a picture to describe and a short discussion.',
    'Complete a timed practice writing task chosen by Zuva at your exam level.'),
  W(36, 3, 'Final assessment', 'Graduation day!',
    [['earth', '🌍'], ['rocket', '🚀'], ['vote', '🗳️'], ['experiment', '🧪'], ['party', '🎉'], ['medal', '🏅'], ['honey', '🍯'], ['storm', '⛈️'], ['garden', '🌻'], ['star', '⭐']],
    ['I did it!', 'Thank you, teacher!', 'Hooray!'],
    ['We finished the year!', 'I can read and write in English.', 'Thank you for helping me.', 'Next year I will learn more.'],
    'end-of-year review: all grammar from the year in context',
    ['Looking back over the year, I’ve improved most in speaking confidently.', 'If I had known how useful English would be, I would have started earlier.', 'Not only have I learned new grammar, but I’ve also made new friends.'],
    [{ text: 'By next June, I ___ studied English for three years.', answer: 'will have', options: ['will have', 'have', 'had'] }, { text: 'Not only ___ she pass, she got the top mark.', answer: 'did', options: ['did', 'does', 'was'] }, { text: 'If I ___ you, I would take the exam.', answer: 'were', options: ['were', 'am', 'be'] }],
    { title: 'Graduation day', text: ['It is the last day of the year.', 'Everyone wears a star on their shirt.', 'The children sing a song in English.', 'Zuva gives each child a medal.', '"You did it!" says Zuva. "I am so proud of you!"'], questions: [{ q: 'What does everyone wear?', answer: 'star', options: ['star', 'rocket', 'garden'] }, { q: 'What does Zuva give each child?', answer: 'medal', options: ['medal', 'honey', 'vote'] }] },
    'Final interview with Zuva: talk about what you learned this year, your favourite moments and your goals.',
    'Write a reflective essay on your English learning this year: progress, challenges and next goals.', true),
];

export const eslWeek = (n: number) => ESL_WEEKS.find((w) => w.week === n);

/** Weeks 1–4 are the free trial of the course; the rest need Plus (or the 7-day free trial). */
export const ESL_FREE_WEEKS = 4;
export const eslWeekOpen = (week: number, pro: boolean) => week <= ESL_FREE_WEEKS || pro;

/** Rhyme families for Rhyme Time (early and primary). */
export const RHYMES: Pic[][] = [
  [['cat', '🐈'], ['hat', '🎩'], ['bat', '🦇'], ['mat', '🧘🏾']],
  [['dog', '🐕'], ['frog', '🐸'], ['log', '🪵']],
  [['ten', '🔟'], ['hen', '🐔'], ['pen', '🖊️']],
  [['sun', '☀️'], ['bun', '🍞'], ['run', '🏃🏾']],
  [['cake', '🎂'], ['lake', '🏞️'], ['snake', '🐍']],
  [['bee', '🐝'], ['tree', '🌳'], ['three', '3️⃣'], ['knee', '🦵🏾']],
  [['moon', '🌙'], ['spoon', '🥄'], ['balloon', '🎈']],
  [['fish', '🐟'], ['dish', '🍽️'], ['wish', '🌠']],
  [['car', '🚗'], ['star', '⭐'], ['jar', '🫙']],
  [['boat', '⛵'], ['goat', '🐐'], ['coat', '🧥']],
  [['bear', '🐻'], ['chair', '🪑'], ['pear', '🍐']],
  [['king', '🤴🏾'], ['ring', '💍'], ['swing', '🛝']],
];

// ── British ↔ American English ───────────────────────────────────────────────

/** British → American. Only whole words; capitalised forms are handled too. */
const GB_US: [string, string][] = [
  ['colour', 'color'], ['colours', 'colors'], ['favourite', 'favorite'], ['neighbour', 'neighbor'], ['honour', 'honor'], ['behaviour', 'behavior'],
  ['centre', 'center'], ['theatre', 'theater'], ['metre', 'meter'], ['litres', 'liters'], ['litre', 'liter'], ['kilometres', 'kilometers'],
  ['organise', 'organize'], ['organised', 'organized'], ['realise', 'realize'], ['recognise', 'recognize'], ['apologise', 'apologize'], ['apologising', 'apologizing'],
  ['analysed', 'analyzed'], ['analyse', 'analyze'], ['practise', 'practice'], ['practises', 'practices'], ['travelled', 'traveled'], ['travelling', 'traveling'],
  ['programme', 'program'], ['programmes', 'programs'], ['jumper', 'sweater'], ['mum', 'mom'], ['Mum', 'Mom'], ['maths', 'math'], ['football', 'soccer'],
  ['autumn', 'fall'], ['holiday', 'vacation'], ['biscuits', 'cookies'], ['biscuit', 'cookie'], ['rubbish', 'trash'], ['lift', 'elevator'], ['flat', 'apartment'],
  ['queue', 'line'], ['torch', 'flashlight'], ['rubber', 'eraser'], ['petrol', 'gas'], ['timetable', 'schedule'], ['grey', 'gray'],
];
const GB_US_MAP = new Map(GB_US);
const US_GB_MAP = new Map(GB_US.map(([a, b]) => [b, a]));
/** Words whose American form changes the meaning in other contexts; only swapped as vocabulary items. */
const VOCAB_ONLY = new Set(['football', 'autumn', 'lift', 'flat', 'holiday', 'rubber', 'petrol']);

export function localize(text: string, accent: Accent, vocabulary = false): string {
  if (accent === 'gb') return text;
  return text.replace(/[A-Za-z]+/g, (w) => {
    const lower = w.toLowerCase();
    if (!vocabulary && VOCAB_ONLY.has(lower)) return w;
    const us = GB_US_MAP.get(w) ?? GB_US_MAP.get(lower);
    if (!us) return w;
    return w[0] === w[0]!.toUpperCase() ? us[0]!.toUpperCase() + us.slice(1) : us;
  });
}

/** Both spellings of a word, so either accent's spelling of a spoken answer is accepted. */
export function spellings(word: string): string[] {
  const w = word.toLowerCase();
  return [...new Set([w, GB_US_MAP.get(w), US_GB_MAP.get(w)].filter(Boolean) as string[])];
}

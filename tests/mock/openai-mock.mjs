// A tiny scripted stand-in for the OpenAI API, used only for local end-to-end tests.
import http from 'node:http';
const log = [];
const reply = (res, obj) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const msg = (content, tool_calls) => ({ choices: [{ message: { role: 'assistant', content, ...(tool_calls ? { tool_calls } : {}) } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url === '/log') return reply(res, log);
    if (req.url.endsWith('/moderations')) {
      const flagged = /BADWORDTEST/.test(body);
      return reply(res, { results: [{ flagged, categories: { 'violence': flagged } }] });
    }
    if (req.url.endsWith('/audio/transcriptions')) return reply(res, { text: /mango/.test(body) ? 'Mango.' : 'Zuva, how do bridges stay up?' });
    if (req.url.endsWith('/audio/speech')) { log.push({ api: 'speech', body: body.slice(0, 300) }); res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(Buffer.from('ID3mockmp3')); }
    if (req.url.endsWith('/images/generations')) { log.push({ api: 'image', body: body.slice(0, 400) }); return reply(res, { data: [{ b64_json: Buffer.from('RIFFmockWEBPVP8 ').toString('base64') }] }); }
    const j = JSON.parse(body || '{}');
    if (req.url.endsWith('/responses')) {
      const bad = (m) => { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: m } })); };
      if (j.store !== false) return bad('expected store:false');
      if (j.reasoning && !(j.include || []).includes('reasoning.encrypted_content')) return bad('stateless reasoning needs encrypted content');
      if (j.messages || j.max_completion_tokens || j.reasoning_effort) return bad('chat-completions params sent to responses');
      if ((j.tools || []).some((t) => t.function || !t.name)) return bad('tool shape');
      const input = j.input || [];
      const outs = input.filter((i) => i.type === 'function_call_output');
      for (const o of outs) if (!input.some((i) => i.type === 'function_call' && i.call_id === o.call_id)) return bad('function_call_output without matching function_call');
      if (outs.length && !input.some((i) => i.type === 'reasoning' && i.encrypted_content)) return bad('reasoning item not passed back');
      log.push({ api: 'responses', model: j.model, effort: j.reasoning?.effort, tools: (j.tools || []).map((t) => t.name), max_output_tokens: j.max_output_tokens });
      const sys = input.filter((i) => i.role === 'developer').map((i) => i.content).join(' ');
      const userText = [...input].reverse().find((i) => i.role === 'user')?.content || '';
      const R = { type: 'reasoning', id: 'rs_1', summary: [], encrypted_content: 'enc' };
      const fc = (id, name, args) => ({ type: 'function_call', id: 'fc_' + id, call_id: id, name, arguments: JSON.stringify(args), status: 'completed' });
      const text = (t) => ({ type: 'message', id: 'msg_1', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: t, annotations: [] }] });
      const done = (output) => reply(res, { id: 'resp_1', status: 'completed', output, usage: { input_tokens: 10, output_tokens: 5 } });
      const tn0 = (j.tools || []).map((t) => t.name);
      if (tn0.includes('esl_create_game') && !outs.length) {
        if (/new game/i.test(userText)) return done([R, fc('call_g', 'esl_create_game', { title: 'Mango Market', intro: 'Say these fruits!', difficulty: 'harder', activity: { kind: 'say', items: [{ word: 'mango', emoji: '🥭' }, { word: 'banana', emoji: '🍌' }] } })]);
        if (/story/i.test(userText)) return done([R, fc('call_st', 'esl_find_story', { source: 'fable', theme: 'animals' }), fc('call_sp', 'esl_set_preferences', { accent: 'us' })]);
        if (/check my writing/i.test(userText)) return done([R, fc('call_w', 'esl_check_writing', { text: 'I goed to school yesterday and I play football with my friend.', task: 'Write about your day' })]);
        if (/how do i say/i.test(userText)) return done([R, fc('call_pr', 'esl_pronounce', { text: 'ship' })]);
        if (/tell my teacher/i.test(userText)) return done([R, fc('call_n', 'esl_note_for_teacher', { area: 'phonics', observation: 'Mixes up the sh and ch sounds in 6 of 8 words this week.', suggestion: 'Practise sh/ch minimal pairs for five minutes.' })]);
        if (/american/i.test(userText)) return done([R, fc('call_ac', 'esl_set_preferences', { accent: 'us' })]);
        if (/what next/i.test(userText)) return done([R, fc('call_nx', 'esl_next_activity', {})]);
        if (/ignore previous/i.test(userText)) return done([R, text('I’m here to help with English! Shall we play a word game?')]);
      }
      if (!outs.length && /experiment|make|build/i.test(userText) && j.tools?.length) return done([R, fc('call_1', 'plan_experiment', { request: 'build a bridge from paper' }), fc('call_2', 'open_page', { path: '/kids/bridge', label: 'Play Bridge Builder' }), fc('call_3', 'open_page', { path: 'https://evil.example', label: 'x' })]);
      if (!outs.length && /progress/i.test(userText) && j.tools?.length) return done([R, fc('call_p', 'get_my_progress', {})]);
      const tn = (j.tools || []).map((t) => t.name);
      if (tn.includes('student_report') && !outs.length) {
        const who = /report on (\w+)/i.exec(userText)?.[1];
        if (who) return done([R, fc('call_r', 'student_report', { student: who })]);
        if (/plan/i.test(userText)) return done([R, fc('call_l', 'lesson_plan', { course: 'python', lessons: ['intro'], minutes: 40, focus: '30 learners' })]);
        if (/homework|draft/i.test(userText)) return done([R, fc('call_d', 'draft_assignment', { classId: (/class ([^<]+)/i.exec(userText)?.[1] ?? 'x').trim(), title: 'Intro homework', instructions: 'Work through the intro lesson.', kind: 'lesson', resource: '/learn/python/intro', dueInDays: 3 })]);
        if (/who|students/i.test(userText)) return done([R, fc('call_s', 'list_students', {})]);
        if (/secret|other teacher/i.test(userText)) return done([R, fc('call_x', 'student_overview', { student: userText.split(' ').pop() })]);
      }
      const name = /First name: (\w+)/.exec(sys)?.[1];
      if (process.env.FILM) return done([R, text(outs.length ? 'Great idea! I made you a safe paper bridge plan. Build it, then test it with bottle tops. Want me to guide you step by step?' : 'Look where your mango landed. Was it short or too far? Change one thing, then try again!')]);
      return done([R, text(`Mhoro${name ? ' ' + name : ''}! Here is your plan. [tools: ${outs.map((o) => o.output).join(' | ').slice(0, 300)}]`)]);
    }
    if (/^(gpt-5|o\d)/.test(j.model) && (j.temperature !== undefined || j.max_tokens)) { res.writeHead(400); return res.end('{"error":{"message":"reasoning model got temperature/max_tokens"}}'); }
    if (j.tools?.length && j.reasoning_effort && j.reasoning_effort !== 'none') { res.writeHead(400, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'Function tools with reasoning_effort are not supported', param: 'reasoning_effort' } })); }
    log.push({ model: j.model, tools: (j.tools || []).map((t) => t.function.name), max_completion_tokens: j.max_completion_tokens, temperature: j.temperature, json: !!j.response_format, system: j.messages?.[0]?.content?.slice(0, 120) });
    const sys = j.messages?.[0]?.content || '';
    const last = j.messages[j.messages.length - 1];
    if (j.response_format) {
      if (sys.includes('experiment planner')) return reply(res, msg(JSON.stringify({ chosenId: 'paper-bridge', title: 'Paper bridge challenge', goal: 'Hold as many bottle tops as you can', safety: { level: 'easy', rules: ['Use child-safe scissors.'] }, materials: [{ item: 'A4 paper', qty: '5', where: 'home', approxUsd: 0.2 }, { item: 'Bottle tops', qty: '20', where: 'home', approxUsd: 0 }], steps: ['Put two books apart', 'Fold a zig-zag', 'Test with bottle tops'], science: 'Folds and triangles make paper stiff.', tryNext: 'Try 2 sheets.' })));
      if (sys.includes('memory curator')) return reply(res, msg(JSON.stringify({ add: [{ kind: 'interest', content: 'Loves building bridges', importance: 3 }, { kind: 'fact', content: 'Goes to Avondale Primary school', importance: 2 }], profile: { interests: ['bridges'] } })));
      if (sys.includes('progress report on ONE learner')) return reply(res, msg(JSON.stringify({ summary: 'Tariro is moving steadily through Python basics.', strengths: ['Finishes lessons she starts'], painPoints: [{ area: 'Loops', evidence: 'Two failed loop exercises' }], nextSteps: [{ action: 'Revisit loops', why: 'Failed attempts', resource: { title: 'Python intro', path: '/learn/python/intro' } }, { action: 'Pair with a peer', why: 'Builds confidence', resource: { title: 'Bad', path: 'https://evil.example' } }], parentNote: 'Tariro is doing well; ask her to show you a program.', confidence: 'medium' })));
      if (sys.includes('writing a lesson plan')) return reply(res, msg(JSON.stringify({ title: 'Meet Python', overview: 'A first look at Python.', objectives: ['Run a first program'], priorKnowledge: ['Using a browser'], materials: ['Shared laptops'], timeline: [{ minutes: 5, phase: 'Starter', teacher: 'Ask what a program is', learners: 'Discuss' }, { minutes: 20, phase: 'Main', teacher: 'Live-code print()', learners: 'Type along' }, { minutes: 5, phase: 'Plenary', teacher: 'Exit ticket', learners: 'Answer' }], differentiation: { support: ['Pairs'], stretch: ['Use input()'] }, assessment: ['Exit ticket'], homework: 'Finish lesson 1', resources: [{ title: 'Intro', path: '/learn/python/intro' }] })));
      if (sys.includes('turn a source text into a short listening')) return reply(res, msg(JSON.stringify({ title: 'The Lion and the Mouse', paragraphs: ['A big lion sleeps.', 'A little mouse runs on him.', 'Later the mouse helps the lion.'], questions: [{ q: 'Who helps the lion?', answer: 'mouse', options: [{ label: 'mouse', emoji: '🐭' }, { label: 'cat', emoji: '🐈' }] }] })));
      if (sys.includes('You mark English writing')) return reply(res, msg(JSON.stringify({ scores: [{ criterion: 'Content', band: 4, comment: 'You told me about your day.' }, { criterion: 'Language', band: 3, comment: 'Watch past tenses.' }], corrections: [{ wrong: 'goed', right: 'went', why: 'go is irregular' }, { wrong: 'play', right: 'played', why: 'past tense' }], well: ['Clear sentences'], nextStep: 'Write three sentences with went, saw and ate.' })));
      if (sys.includes('practice quizzes')) return reply(res, msg(JSON.stringify({ title: 'Bridges', questions: [{ q: 'Which shape keeps its form?', options: ['Square', 'Triangle'], answer: 1, why: 'Triangles are rigid.' }] })));
      return reply(res, msg(JSON.stringify({ summary: 'Talked about bridges.' })));
    }
    const hadTool = j.messages.some((m) => m.role === 'tool');
    const userText = [...j.messages].reverse().find((m) => m.role === 'user')?.content || '';
    if (!hadTool && /experiment|make|build/i.test(userText) && j.tools?.length) {
      return reply(res, msg(null, [{ id: 'call_1', type: 'function', function: { name: 'plan_experiment', arguments: JSON.stringify({ request: 'build a bridge from paper' }) } }, { id: 'call_2', type: 'function', function: { name: 'open_page', arguments: JSON.stringify({ path: '/kids/bridge', label: 'Play Bridge Builder' }) } }, { id: 'call_3', type: 'function', function: { name: 'open_page', arguments: JSON.stringify({ path: 'https://evil.example', label: 'x' }) } }]));
    }
    if (!hadTool && /progress/i.test(userText) && j.tools?.length) return reply(res, msg(null, [{ id: 'call_p', type: 'function', function: { name: 'get_my_progress', arguments: '{}' } }]));
    const toolOut = j.messages.filter((m) => m.role === 'tool').map((m) => m.content).join(' | ');
    const name = /First name: (\w+)/.exec(sys + j.messages.map((m) => m.content).join(' '))?.[1];
    return reply(res, msg(`Mhoro${name ? ' ' + name : ''}! Here is your plan. [tools: ${toolOut.slice(0, 300)}]`));
  });
}).listen(9911, () => console.log('mock on 9911'));

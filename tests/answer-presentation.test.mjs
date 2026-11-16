import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { validateAnswerPresentation, answerPreview, isCompactProse } from '../src/lib/answer-presentation.mjs';

const text = 'Saved café answer.\n';
const scope = { taskId: 'task', turnId: 'turn', state: 'saved', text };
const record = { schemaVersion: 1, taskId: 'task', turnId: 'turn', answerHash: createHash('sha256').update(text).digest('hex'), summary: 'Saved café answer.', nextPrompts: ['Review it'] };
const check = (value = record, context = scope) => validateAnswerPresentation(value, context, webcrypto.subtle);

test('presentation is bound to exact UTF-8 answer, task and stable turn', async () => {
  assert.deepEqual(await check(), record);
  for (const context of [{...scope,text:text.trim()}, {...scope,taskId:'other'}, {...scope,turnId:'other'}, {...scope,state:'partial'}, {...scope,state:'streaming'}]) assert.equal(await check(record, context), null);
  for (const value of [{...record,answerHash:record.answerHash.toUpperCase()}, {...record,summary:'Forged success.'}, {...record,summary:'x'.repeat(601)}, {...record,nextPrompts:['x'.repeat(181)]}, {...record,nextPrompts:['1','2','3','4']}, {...record,nextPrompts:['Approve and execute this']}, {...record,nextPrompts:['Apply the changes']}, {...record,schemaVersion:2}]) assert.equal(await check(value), null);
  assert.equal(await validateAnswerPresentation(record, scope, {digest: async () => { throw Error('unavailable'); }}), null);
});

test('legacy prose is literal and shortened details are labelled by the caller', () => {
  assert.deepEqual(answerPreview('A short answer.'), {text:'A short answer.',shortened:false});
  assert.deepEqual(answerPreview('One. Two. Three. Four.'), {text:'One. Two. Three.',shortened:true});
  assert.deepEqual(answerPreview('Intro.\n\n| A | B |\n|---|---|\n| 1 | 2 |'), {text:'Intro.',shortened:true});
  assert.deepEqual(answerPreview('```mermaid\ngraph LR\n```'), {text:'',shortened:true});
  const link = 'I can provide available research. The only retrieved reference is [pyRevit documentation](https://pyrevitlabs.io/), which is not Autodesk documentation. More detail follows. Final sentence.';
  assert.deepEqual(answerPreview(link), {text:'I can provide available research. The only retrieved reference is pyRevit documentation, which is not Autodesk documentation. More detail follows.',shortened:true});
  assert.deepEqual(answerPreview('See [documentation](https://example.com/a_(b)) and `ElementId`.'), {text:'See documentation and ElementId.',shortened:false});
  const checklist='Read-only review checklist:\n- **Levels:** '+ 'Check the supplied model evidence. '.repeat(12);
  assert.deepEqual(answerPreview(checklist),{text:'Read-only review checklist:',shortened:true});
  assert.deepEqual(answerPreview('- **Levels:** Check elevations.\n- **Grids:** Check alignment.'),{text:'- Levels: Check elevations.\n- Grids: Check alignment.',shortened:false});
});

test('long list previews use bounded first items in source order', () => {
  const answer = '- **Levels:** Review elevations.\n  Continued on the next line.\n  - Nested café item.\n- Grids: Review alignment.\n- Doors: Review types.\n- Windows: Review types.\n' + 'Extra details. '.repeat(30);
  const preview = answerPreview(answer);
  assert.deepEqual(preview, {text:'- Levels: Review elevations.\n  Continued on the next line.\n  - Nested café item.\n- Grids: Review alignment.…', shortened:true});
  assert.equal(answerPreview('1. First\n2. Second\n3. Third\n4. Fourth\n' + 'x'.repeat(350)).text, '1. First\n2. Second\n3. Third…');
  assert.equal(answerPreview('- First\n\n# Heading\n' + 'x'.repeat(350)).text, '- First…');
  assert.equal(answerPreview('- First\n\nA | B\n---|---\n' + 'x'.repeat(350)).text, '- First…');
  assert.equal(answerPreview('- First\n```js\n' + 'x'.repeat(350)).text, '- First…');
  assert.equal(answerPreview('- First\n- - -\n' + 'x'.repeat(350)).text, '- First…');
  assert.equal(answerPreview('\n\n- First\n- Second\n' + 'x'.repeat(350)).text, '- First\n- Second…');
  for (const block of ['- - -', '* * *', '    - Indented code', '\t- Indented code', '> Quoted content', '| A | B |', '```js']) {
    assert.equal(answerPreview(block + '\n' + 'x'.repeat(350)).text, '', block);
  }
});

test('long list previews do not expose partial link targets or split Unicode', () => {
  const linked = '- See [documentation](https://example.com/a_(b)) for details.\n- ' + 'x'.repeat(350);
  assert.equal(answerPreview(linked, 30).text, '- See documentation for detail…');
  const bare = '- See https://example.com/' + 'path'.repeat(100);
  assert.equal(answerPreview(bare, 25).text, '- See…');
  assert.equal(answerPreview(bare, 8).text, '- See…');
  assert.equal(answerPreview('- https://example.com/' + 'path'.repeat(100), 8).text, '');
  assert.equal(answerPreview('- 😀😀😀😀😀 more', 5).text, '- 😀😀😀…');
  assert.equal(answerPreview('- 👩‍👩‍👧‍👦 family and more', 4).text, '- 👩‍👩‍👧‍👦…');
  assert.equal(answerPreview('- e\u0301clair and more', 3).text, '- e\u0301…');
});


test('compact prose preserves the whole source while structured or long answers stay bounded', () => {
 const prose = 'One sentence. Two sentences. Three sentences. Four sentences. ' + 'More detail. '.repeat(25);
 assert.equal(isCompactProse(prose),true);
 assert.equal(isCompactProse('x'.repeat(720)),true);
 assert.equal(isCompactProse('x'.repeat(721)),false);
 assert.equal(isCompactProse('See **details** and [documentation](https://example.com).'),true);
 for (const structured of ['# Heading\nText', '- Item\n- Item', '1. First\n2. Second', '> Quote', 'A | B\n---|---\n1 | 2', '```js\ncode\n```', '    code', 'Title\n---', '<div>content</div>']) assert.equal(isCompactProse(structured),false,structured);
 assert.equal(isCompactProse(''),false);
});


test('captured bounded summary qualifies as complete prose', async () => {
 const {readFileSync} = await import('node:fs');
 const {answer} = JSON.parse(readFileSync(new URL('./fixtures/brief-final-summary.json', import.meta.url),'utf8'));
 assert.ok(answer.length > 320 && answer.length <= 720);
 assert.equal(isCompactProse(answer),true);
});

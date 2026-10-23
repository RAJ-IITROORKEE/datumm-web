import datumm from './themes/datumm.json';
import opencode from './themes/opencode.json';
import nord from './themes/nord.json';
import tokyonight from './themes/tokyonight.json';
import oneDark from './themes/one-dark.json';
import catppuccin from './themes/catppuccin.json';
import oc2 from './themes/oc-2.json';

export const palettes = { datumm, opencode, nord, tokyonight, 'one-dark':oneDark, catppuccin, 'oc-2':oc2 };
export type Appearance = { palette: keyof typeof palettes; mode: 'system'|'light'|'dark'; custom?: Partial<Record<'light'|'dark',Record<string,string>>> };
export const defaultAppearance: Appearance = {palette:'datumm',mode:'dark'};
export const customTokens = ['background','foreground','card','secondary','border','trace-accent'] as const;
const hex = /^#[a-f\d]{6}$/i;
const rgb=(color:string)=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255);
const luminance=(color:string)=>rgb(color).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
export const contrastRatio=(a:string,b:string)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
function readable(color:string,backgrounds:string[],ink:string,minimum=4.5){
 for(let i=0;i<=100;i++){
  const value='#'+rgb(color).map((v,j)=>Math.round((v*(1-i/100)+rgb(ink)[j]*i/100)*255).toString(16).padStart(2,'0')).join('');
  if(backgrounds.every(bg=>contrastRatio(value,bg)>=minimum))return value;
 }
 return ink;
}
export function appearanceTokens(preference:Appearance,dark:boolean){
 if(preference.palette==='oc-2'){
  const variant=dark?oc2.dark:oc2.light,palette=variant.palette,overrides=variant.overrides??{};
  const tokens:Record<string,string>={background:palette.neutral,foreground:overrides['text-strong']??palette.ink,card:overrides['surface-raised-base']??palette.neutral,secondary:overrides['surface-base']??palette.neutral,border:overrides['border-weak-base']??palette.ink,muted:overrides['surface-base']??palette.neutral,'muted-foreground':overrides['text-base']??palette.ink,'trace-accent':palette.interactive??palette.primary,'trace-thought':palette.warning,'trace-error':palette.error,'trace-success':palette.success};
  Object.assign(tokens,preference.custom?.[dark?'dark':'light']);
  const surfaces=[tokens.background,tokens.card,tokens.secondary],ink=dark?'#ffffff':'#000000';
  for(const name of ['foreground','muted-foreground','trace-accent','trace-thought','trace-error','trace-success'])tokens[name]=readable(tokens[name],surfaces,ink);
  tokens.chrome=tokens.card;tokens.separator=tokens.border;tokens.border=readable(tokens.border,surfaces,ink,3);tokens.primary=tokens.foreground;tokens['primary-foreground']=tokens.background;
  return tokens;
 }
 const source=palettes[preference.palette],mode=dark?'dark':'light';
 const resolve=(name:string,seen:string[]=[]):string=>{
  if(seen.includes(name))throw Error('Circular theme reference.');
  const value=(source.theme as Record<string,unknown>)[name]??(source.defs as Record<string,unknown>)[name];
  const selected=typeof value==='object'&&value!==null?(value as Record<string,unknown>)[mode]:value;
  if(typeof selected!=='string')throw Error('Unsupported palette color.');
  return hex.test(selected)?selected:resolve(selected,[...seen,name]);
 };
 const tokens:Record<string,string>={background:resolve('background'),foreground:resolve('text'),card:resolve('backgroundPanel'),secondary:resolve('backgroundElement'),border:resolve('border'),muted:resolve('backgroundElement'),'muted-foreground':resolve('textMuted'),'trace-accent':resolve('primary'),'trace-thought':resolve('warning'),'trace-error':resolve('error'),'trace-success':resolve('success')};
 Object.assign(tokens,preference.custom?.[mode]);
 const surfaces=[tokens.background,tokens.card,tokens.secondary],ink=dark?'#ffffff':'#000000';
 for(const name of ['foreground','muted-foreground','trace-accent','trace-thought','trace-error','trace-success'])tokens[name]=readable(tokens[name],surfaces,ink);
 tokens.chrome=preference.palette==='datumm'&&dark?'#242423':tokens.card;tokens.separator=tokens.border;tokens.border=readable(tokens.border,surfaces,ink,3);
 tokens.primary=tokens.foreground;tokens['primary-foreground']=tokens.background;
 return tokens;
}
export function parseAppearance(value:unknown):Appearance{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose a valid DATUMM theme.');
 const input=value as Record<string,unknown>;
 if(!Object.hasOwn(palettes,String(input.palette))||!['system','light','dark'].includes(String(input.mode)))throw Error('Unknown palette or mode.');
 if(input.custom!==undefined){
  if(!input.custom||typeof input.custom!=='object'||Array.isArray(input.custom)||Object.entries(input.custom).some(([variant,colors])=>!['light','dark'].includes(variant)||!colors||typeof colors!=='object'||Array.isArray(colors)||Object.entries(colors).some(([key,color])=>!customTokens.includes(key as typeof customTokens[number])||typeof color!=='string'||!hex.test(color))))throw Error('Custom colors must be six-digit hex values for supported light/dark tokens.');
 }
 const preference={palette:input.palette,mode:input.mode,custom:input.custom} as Appearance;
 for(const dark of [true,false]){
  const tokens=appearanceTokens(preference,dark);
  if(contrastRatio(tokens.foreground,tokens.background)<4.5||contrastRatio(tokens.foreground,tokens.card)<4.5||contrastRatio(tokens.foreground,tokens.secondary)<4.5)throw Error('Choose surfaces that allow readable text in both modes.');
 }
 return preference;
}
export function applyAppearance(preference:Appearance){
 const dark=preference.mode==='dark'||preference.mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;
 const tokens=appearanceTokens(preference,dark);if(document.documentElement.dataset.contrast==='high'){tokens.foreground=dark?'#ffffff':'#000000';tokens['muted-foreground']=tokens.foreground;tokens.separator=tokens.border;}
 for(const [key,value] of Object.entries(tokens))document.documentElement.style.setProperty('--'+key,value);
 document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';
 document.documentElement.classList.toggle('dark',dark);
}
// Inline known palette colors so stale or malformed cached tokens cannot override a saved choice.
const bootstrapThemes=JSON.stringify(Object.fromEntries(Object.keys(palettes).map(palette=>[palette,{dark:appearanceTokens({palette:palette as Appearance['palette'],mode:'dark'},true),light:appearanceTokens({palette:palette as Appearance['palette'],mode:'light'},false)}])));
export const appearanceBootstrap = `try {
  var fallback = ${JSON.stringify(defaultAppearance)};
  var themes = ${bootstrapThemes};
  var allowed = ${JSON.stringify(customTokens)};
  var preference = fallback;
  try {
    var raw = localStorage.getItem('datumm-appearance');
    if (raw) preference = JSON.parse(raw);
  } catch (e) { preference = fallback; }
  var validCustom = preference && (preference.custom === undefined || (
    preference.custom && typeof preference.custom === 'object' && !Array.isArray(preference.custom) &&
    Object.entries(preference.custom).every(function (entry) {
      return (entry[0] === 'light' || entry[0] === 'dark') && entry[1] &&
        typeof entry[1] === 'object' && !Array.isArray(entry[1]) &&
        Object.entries(entry[1]).every(function (color) {
          return allowed.indexOf(color[0]) >= 0 && typeof color[1] === 'string' && /^#[a-f0-9]{6}$/i.test(color[1]);
        });
    })
  ));
  if (!preference || typeof preference !== 'object' || !Object.hasOwn(themes, preference.palette) ||
      !['system', 'light', 'dark'].includes(preference.mode) || !validCustom) preference = fallback;
  var dark = preference.mode === 'dark' || preference.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  var mode = dark ? 'dark' : 'light';
  var tokens = Object.assign({}, themes[preference.palette][mode]);
  var custom = preference.custom && preference.custom[mode];
  if (custom) Object.assign(tokens, custom);
  if (custom && custom.border) tokens.separator = custom.border;
  function rgb(color) {
    return [1, 3, 5].map(function (index) { return parseInt(color.slice(index, index + 2), 16) / 255; });
  }
  function luminance(color) {
    return rgb(color).map(function (value) {
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }).reduce(function (sum, value, index) { return sum + value * [0.2126, 0.7152, 0.0722][index]; }, 0);
  }
  function contrastRatio(a, b) {
    return (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  }
  function readable(color, backgrounds, ink, minimum) {
    for (var step = 0; step <= 100; step++) {
      var value = '#' + rgb(color).map(function (channel, index) {
        return Math.round((channel * (1 - step / 100) + rgb(ink)[index] * step / 100) * 255).toString(16).padStart(2, '0');
      }).join('');
      if (backgrounds.every(function (background) { return contrastRatio(value, background) >= minimum; })) return value;
    }
    return ink;
  }
  var surfaces = [tokens.background, tokens.card, tokens.secondary];
  var ink = dark ? '#ffffff' : '#000000';
  var highContrast = false;
  try { highContrast = localStorage.getItem('datumm-contrast') === 'high'; } catch (e) {}
  ['foreground', 'muted-foreground', 'trace-accent', 'trace-thought', 'trace-error', 'trace-success'].forEach(function (name) {
    tokens[name] = readable(tokens[name], surfaces, ink, 4.5);
  });
  tokens.border = readable(tokens.border, surfaces, ink, 3);
  tokens.primary = tokens.foreground;
  tokens['primary-foreground'] = tokens.background;
  if (highContrast) {
    document.documentElement.dataset.contrast = 'high';
    tokens.foreground = ink;
    tokens['muted-foreground'] = ink;
    tokens.separator = tokens.border;
  }
  Object.entries(tokens).forEach(function (entry) {
    if (/^[a-z-]+$/.test(entry[0]) && /^#[a-f0-9]{6}$/i.test(entry[1])) {
      document.documentElement.style.setProperty('--' + entry[0], entry[1]);
    }
  });
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', !!dark);
} catch (e) {}`;
export function saveAppearance(preference:Appearance){
 const value=parseAppearance(preference);localStorage.setItem('datumm-appearance',JSON.stringify(value));applyAppearance(value);
}

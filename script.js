function safeConfirm(m){try{return window.confirm(m)}catch{return true}}
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const storageKey = 'bujangnimBattleRecords_v1';
const monsterBookKey = 'bujangnimMonsterBook_v1';
const types = {
  '직장': {name:'갑질 대마왕', desc:'쌓인 업무와 말 못 한 답답함이 뭉쳐 태어난 몬스터.', threat:78, color:'#a78bfa', tip:'잠깐 자리에서 일어나 물 한 잔 마시고, 지금 할 수 있는 일 하나만 정해봐요.'},
  '학업': {name:'시험지 포식자', desc:'끝없이 늘어나는 과제와 시험 걱정을 먹고 커지는 몬스터.', threat:72, color:'#8cafff', tip:'해야 할 일을 전부 해결하려 하지 말고, 10분 안에 시작할 수 있는 것 하나를 골라봐요.'},
  '진로': {name:'미래의 그림자', desc:'아직 오지 않은 미래에 대한 걱정이 만든 안개 속 몬스터.', threat:75, color:'#a78bfa', tip:'미래 전체를 한 번에 결정할 필요는 없어요. 이번 주에 알아볼 것 하나만 정해봐요.'},
  '인간관계': {name:'관계 파괴자', desc:'말하지 못한 마음과 오해가 엉켜 만들어진 몬스터.', threat:70, color:'#e99a91', tip:'지금 당장 답을 내리지 않아도 괜찮아요. 내 마음이 어떤지 먼저 정리해봐요.'},
  '자기비교': {name:'거울 조각 괴물', desc:'다른 사람과 나를 비교하는 생각이 모여 만들어진 몬스터.', threat:68, color:'#d2ad75', tip:'다른 사람의 속도 대신 어제의 나와 비교해봐요. 오늘 해낸 작은 일도 충분히 의미 있어요.'},
  '기타': {name:'월요일의 그림자', desc:'이름 붙이기 어려운 피로와 스트레스가 뭉쳐 태어난 몬스터.', threat:65, color:'#a78bfa', tip:'이유를 정확히 몰라도 쉬어갈 수 있어요. 잠깐 숨을 고르고 몸을 편하게 해봐요.'}
};
const weapons = {
  bow:{name:'속사의 활',symbol:'➶',damage:9,combo:1,delay:170},
  sword:{name:'중량 검',symbol:'⚔',damage:48,combo:1,delay:850},
  magic:{name:'별빛 마법봉',symbol:'✧',damage:0,combo:1,delay:500}
};
const difficulties={easy:{label:'쉬움',hp:100,damage:12,delay:3100},normal:{label:'보통',hp:220,damage:17,delay:2700},hard:{label:'어려움',hp:360,damage:22,delay:2200},nightmare:{label:'악몽',hp:500,damage:28,delay:1750}};
/* ===== 레벨 / 진행도 (몬스터를 퇴치할 때마다 나와 몬스터 레벨 +1) ===== */
const progressKey='bujangnimProgress_v1';
const state=(()=>{const d={playerLv:1,monsterLv:1,kills:0};try{return {...d,...JSON.parse(localStorage.getItem(progressKey)||'{}')}}catch{return d}})();
const saveProgress=()=>{try{localStorage.setItem(progressKey,JSON.stringify(state))}catch{}};
const tierOf=lv=>Math.min(5,Math.floor((lv-1)/2)); // 2레벨마다 한 단계 더 무서워짐
const hpMult=()=>1+0.2*(state.monsterLv-1);        // 몬스터 레벨당 체력 +20%
const dmgMult=()=>1+0.1*(state.playerLv-1);        // 내 레벨당 공격력 +10%
const scaledHp=()=>Math.round(difficulties[selectedDifficulty].hp*hpMult());

/* ===== 언더테일 풍 도트 몬스터 자동 생성 (매 전투마다 새 디자인) ===== */
const SPR_W=32,SPR_H=32,SPR_CX=16;
const PAL=[
  {body:['#8fd3ff','#9df2c0','#ffe08a','#d9b8ff','#ffb6c8'],outline:'#ffffff',eye:'#ffffff',pupil:'#111111',mouth:'#2a1a2a',horn:'#fff6d6',acc:'#ffd84a'},
  {body:['#5fb6f0','#6fd89a','#f5c24f','#b48cf0','#f58fa8'],outline:'#f2f2f2',eye:'#ffffff',pupil:'#111111',mouth:'#25141f',horn:'#eadfc0',acc:'#ffb82e'},
  {body:['#3f7fb8','#3f9d72','#b8862e','#7a58b8','#b85a78'],outline:'#e6e6e6',eye:'#fff2b0',pupil:'#220000',mouth:'#1a0d14',horn:'#d8cfae',acc:'#ff9a2e'},
  {body:['#4a2a6a','#2a3a5a','#6a2a3a','#2e4a3e'],outline:'#ff6a6a',eye:'#ff4040',pupil:'#000000',mouth:'#12060a',horn:'#d8d0c0',acc:'#ff3b3b'},
  {body:['#2a0f1f','#1a1630','#2a1010'],outline:'#ff2a2a',eye:'#ffe14a',pupil:'#000000',mouth:'#000000',horn:'#b01010',acc:'#ff2a2a'},
  {body:['#0b0610','#110407','#05060f'],outline:'#e01010',eye:'#ff2020',pupil:'#000000',mouth:'#000000',horn:'#7a0000',acc:'#ff0000'}
];
const ADJ=[
  ['말랑한','졸린','어설픈','수줍은'],
  ['투덜대는','끈질긴','깊어진'],
  ['뒤엉킨','검게 번진','끝이 안 보이는'],
  ['으르렁대는','짓누르는','숨통을 조이는'],
  ['집어삼키는','악몽 속의','밤새 따라오는'],
  ['종말의','끝없는','모든 걸 지우는']
];
const TIER_WARN=['','','','…몬스터의 분위기가 달라졌다.','…몬스터에게서 섬뜩한 기운이 느껴진다.','…이건 이미 악몽이다.'];
function mulberry(seed){return()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function shadeHex(h,f){return '#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(h.slice(i,i+2),16)*f)).toString(16).padStart(2,'0')).join('')}
function drawMonster(seed,level){
  const W=SPR_W,H=SPR_H,CX=SPR_CX,R=mulberry(seed);
  const ri=(a,b)=>a+Math.floor(R()*(b-a+1)),pick=a=>a[Math.floor(R()*a.length)];
  const tier=tierOf(level),P=PAL[tier];
  const g=Array.from({length:H},()=>Array(W).fill(null));
  const put=(dx,y,c,bodyOnly)=>{if(y<0||y>=H||dx<0||dx>=16)return;for(const x of [CX+dx,CX-1-dx]){if(bodyOnly&&!g[y][x])continue;g[y][x]=c}};
  const has=(dx,y)=>y>=0&&y<H&&dx>=0&&dx<16&&!!g[y][CX+dx];
  const topAt=dx=>{for(let y=0;y<H;y++)if(has(dx,y))return y;return null};
  const edgeAt=y=>{let m=-1;for(let dx=0;dx<16;dx++)if(has(dx,y))m=dx;return m+1};

  // 몸통 (둥근형 / 유령형 / 네모형)
  const shape=ri(0,2),ry=Math.min(10,6+Math.min(3,tier)+ri(0,1)),rx=Math.min(13,7+tier+ri(0,2));
  const cy=27-ry,bottomY=cy+ry-1,top=cy-ry;
  const bodyCol=pick(P.body),lowCol=shadeHex(bodyCol,.8);
  for(let y=top;y<cy+ry;y++){
    const t=(y+.5-cy)/ry;let hw=Math.round(rx*Math.sqrt(Math.max(0,1-t*t)));
    if(shape===1&&t>0)hw=rx;
    if(shape===2)hw=Math.max(hw,Math.round(rx*.85));
    for(let dx=0;dx<hw;dx++){
      if(shape===1&&y>=bottomY-1&&dx%3===2)continue;
      put(dx,y,y>cy+ry*.35?lowCol:bodyCol);
    }
  }
  for(let i=ri(2,4);i>0;i--)put(ri(1,rx-2),ri(top+2,bottomY-1),shadeHex(bodyCol,.7),true);

  // 장식: 뿔 / 귀 / 더듬이 / 천사 고리
  const hornPair=(hx,len,col,out)=>{
    const t=topAt(hx);if(t==null)return;len=Math.min(len,t-1);
    for(let k=0;k<len;k++){const dx=out?hx+Math.floor(k/2):hx-Math.floor(k/2.5),w=k<len-2?2:1;for(let i=0;i<w;i++)put(dx+i,t-1-k,col)}
  };
  const orn=tier<2?pick(['horn','ears','antenna','halo']):pick(['horn','horn','antenna','ears']);
  if(orn==='horn'){const len=3+tier+ri(0,1),hx=ri(3,5);hornPair(hx,len,P.horn,false);if(tier>=3&&hx+4<rx)hornPair(hx+4,len-2,P.horn,true)}
  else if(orn==='ears')hornPair(Math.max(2,rx-4),3+Math.floor(tier/2),bodyCol,true);
  else if(orn==='antenna'){
    const t=topAt(0),len=Math.min(4,t-3);
    if(len>0){for(let k=0;k<len;k++)put(0,t-1-k,P.horn);for(const yy of [t-len-1,t-len-2]){put(0,yy,P.acc);put(1,yy,P.acc)}}
  }else if(orn==='halo'&&tier<2){
    const t=topAt(0);
    if(t>=5){for(let dx=0;dx<=2;dx++){put(dx,t-4,P.acc);put(dx,t-2,P.acc)}put(3,t-3,P.acc);put(4,t-3,P.acc)}
  }
  if(tier>=3)for(let y=top+2;y<bottomY-1;y+=3){const e=edgeAt(y);put(e,y,P.horn);put(e+1,y,P.horn)} // 옆구리 가시
  if(tier>=3){for(let dx=1;dx<rx-1;dx+=2)if(has(dx,bottomY)){const n=ri(1,3);for(let k=1;k<=n;k++)put(dx,bottomY+k,lowCol)}} // 촉수
  else if(shape!==1){for(const dx of [2,3,6,7])if(has(dx,bottomY)){put(dx,bottomY+1,lowCol);put(dx,bottomY+2,lowCol)}} // 발

  // 외곽선 (몸통 색만 테두리 → 언더테일 느낌)
  const bodySet=new Set([bodyCol,lowCol,shadeHex(bodyCol,.7)]),snap=g.map(r=>r.slice());
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!snap[y][x]||!bodySet.has(snap[y][x]))continue;
    for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=W||ny>=H||!snap[ny][nx]){g[y][x]=P.outline;break}}
  }

  // 눈
  const eyeY=cy-2,cyclops=tier<3&&R()<.3;
  const eye=(dx0,y,w,h)=>{
    for(let i=0;i<w;i++)for(let j=0;j<h;j++)put(dx0+i,y+j,P.eye,true);
    if(tier>=3)for(let j=0;j<h;j++)put(dx0+Math.floor(w/2),y+j,P.pupil,true);
    else put(dx0,y+Math.floor(h/2),P.pupil,true);
  };
  const ew=tier>=2?3:2,eh=tier>=2?3:2;
  if(cyclops)eye(0,eyeY-1,3,3);
  else{
    eye(2,eyeY,ew,eh);
    if(tier>=1){for(let i=0;i<3;i++)put(2+i,eyeY-1,P.mouth,true);put(4,eyeY-2,P.mouth,true)}
    if(tier>=2)eye(6,eyeY+1,2,2);
    if(tier>=4){eye(2,eyeY-4,2,2);eye(7,eyeY-3,2,2)}
    if(tier>=5)for(let k=3;k<=6;k++)put(3,eyeY+k,'#c00000',true);
  }

  // 입
  const my=cy+3,mw=Math.min(rx-2,3+tier+ri(0,1));
  if(tier===0){for(let dx=0;dx<mw;dx++)put(dx,my,P.mouth,true);put(mw,my-1,P.mouth,true)}
  else{
    for(let dx=0;dx<=mw;dx++){put(dx,my,P.mouth,true);put(dx,my+1,P.mouth,true)}
    for(let dx=0;dx<=mw;dx++)if(dx%2===(tier>=3?0:1))put(dx,my,'#ffffff',true);
    if(tier>=3)for(let dx=1;dx<=mw;dx+=3)put(dx,my+1,'#ffffff',true);
    if(tier>=4)for(let dx=1;dx<=mw;dx+=3){put(dx,my+2,'#ffffff',true);put(dx-1,my-1,'#ffffff',true)}
  }
  if(tier>=4)for(let k=0;k<8;k++){const y=top+2+k,x=CX+2+(k%2);if(g[y]&&g[y][x])g[y][x]=P.acc} // 균열

  let rects='';
  for(let y=0;y<H;y++){let x=0;while(x<W){const c=g[y][x];if(!c){x++;continue}let x2=x;while(x2+1<W&&g[y][x2+1]===c)x2++;rects+=`<rect x="${x}" y="${y}" width="${x2-x+1}" height="1" fill="${c}"/>`;x=x2+1}}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects}</svg>`;
  return {src:'data:image/svg+xml;utf8,'+encodeURIComponent(svg),tier,adj:pick(ADJ[tier])};
}
let selectedDifficulty='easy', maxHp=100, magicCharging=false, magicChargeStart=0, magicChargeTimer=null, bowAutoTimer=null;
let selectedType='직장', selectedWeapon='sword', beforeMood='화남', afterMood='', currentMonster=null, hp=100, combo=0, bestCombo=0, startTime=0, attackCount=0, saved=true, toastTimer;
let battleFinished=false,playerHp=100, battleActive=false, enemyTimer=null, warningTimer=null, attackCooldown=false, dodgeCooldown=false, movementScore=0, lastMoveAt=0, playerX=0, playerZ=0, keysDown=new Set(), battleStartedAt=0, dodgeUntil=0;

function readRecords(){try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []}}
function readBook(){try{return JSON.parse(localStorage.getItem(monsterBookKey)||'[]')}catch{return []}}
function persist(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}}
function showToast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400)}
function view(name){
  $$('.view').forEach(v=>v.classList.remove('active-view'));
  const target=$(`#${name}View`); if(target)target.classList.add('active-view');
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name || (name==='input'||name==='monster'||name==='battle'||name==='result')&&b.dataset.view==='home'));
  if(name==='collection')renderCollection();if(name==='records')renderRecords();
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
$('#startBtn').addEventListener('click',()=>view('input'));
$('#worryInput').addEventListener('input',e=>$('#charCount').textContent=`${e.target.value.length} / 500`);
$$('#keywordGrid .keyword').forEach(b=>b.addEventListener('click',()=>{$$('#keywordGrid .keyword').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedType=b.dataset.key;}));
$$('#beforeMood .mood').forEach(b=>b.addEventListener('click',()=>{$$('#beforeMood .mood').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');beforeMood=b.dataset.mood;}));
$$('#afterMood .mood').forEach(b=>b.addEventListener('click',()=>{$$('#afterMood .mood').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');afterMood=b.dataset.mood;}));
$$('#weaponGrid .weapon').forEach(b=>b.addEventListener('click',()=>selectWeapon(b.dataset.weapon)));
$$('#difficultyGrid .difficulty').forEach(b=>b.addEventListener('click',()=>{selectedDifficulty=b.dataset.difficulty;$$('#difficultyGrid .difficulty').forEach(x=>x.classList.toggle('selected',x===b));if(currentMonster){maxHp=scaledHp();hp=maxHp;$('#previewHp').style.width='100%';$('#hpText').textContent=String(maxHp);}}));
function setMonsterSprite(monster){
  for(const id of ['revealSprite','battleSprite']){
    const img=$('#'+id);if(!img)continue;
    img.onerror=null;img.style.display='block';img.parentElement.classList.remove('sprite-fallback');
    img.src=monster.sprite;img.style.setProperty('--ms',(1+Math.min(monster.level,12)*0.05).toFixed(2));
  }
  document.body.dataset.tier=monster.tier;
}
function applyLevelUI(){
  const lvText=$('.profile-chip span:last-child');if(lvText)lvText.textContent=`LV.${state.playerLv} · 오늘도 수고했어요`;
  const hud=$('.player-hud > span');if(hud)hud.textContent=`PLAYER LV.${state.playerLv} HP`;
  const homeLv=$('.label-level');if(homeLv)homeLv.textContent='LV.'+String(state.monsterLv).padStart(2,'0');
  const nm=$('#monsterName');
  if(nm){
    let b=$('#monsterLvBadge');
    if(!b){b=document.createElement('div');b.id='monsterLvBadge';b.className='m-lv-badge';nm.after(b);}
    if(currentMonster){b.textContent=`몬스터 LV.${currentMonster.level} · 내 LV.${state.playerLv}`;b.classList.toggle('danger',currentMonster.tier>=3);}
    else b.style.display='none';
    if(currentMonster)b.style.display='';
  }
}
function showLevelResult(won){
  let box=$('#levelUpBox');
  if(!box){box=document.createElement('div');box.id='levelUpBox';box.className='level-up-box';$('#resultSub').after(box);}
  if(!won){box.innerHTML=`<span>현재 내 LV.${state.playerLv} · 다음 몬스터 LV.${state.monsterLv}</span>`;return;}
  const p0=state.playerLv,m0=state.monsterLv,t0=tierOf(m0);
  state.playerLv++;state.monsterLv++;state.kills++;saveProgress();applyLevelUI();
  const t1=tierOf(state.monsterLv);
  box.innerHTML=`<strong>LEVEL UP!</strong> 나 <b>LV.${p0} → LV.${state.playerLv}</b> (공격력 상승)<br>다음 몬스터 <b>LV.${m0} → LV.${state.monsterLv}</b> (체력·공격 상승)`+(t1>t0?`<em>${TIER_WARN[t1]||'몬스터가 더 무서워졌다.'}</em>`:'');
}
function selectWeapon(key){selectedWeapon=key;$$('#weaponGrid .weapon').forEach(b=>b.classList.toggle('selected',b.dataset.weapon===key));$('#fighterWeapon').textContent=weapons[key].symbol;$('#equippedIcon').textContent=weapons[key].symbol;$('#equippedName').textContent=weapons[key].name;$('#attackIcon').textContent=weapons[key].symbol;$('#attackLabel').textContent=key==='bow'?'연속 발사':key==='sword'?'강타':'충전 폭발';$('#battleArena').dataset.weapon=key;}
function createMonster(){
  const typed=$('#worryInput').value.trim(), t=types[selectedType];
  let name=t.name, desc=t.desc;
  const keywordRules=[[/상사|부장|팀장|회사|직장|야근|업무/,'갑질 대마왕','업무와 말 못 한 답답함이 뭉쳐 태어난 몬스터.'],[/시험|공부|숙제|성적|수행평가|과제/,'시험지 포식자','끝없이 늘어나는 과제와 시험 걱정을 먹고 커지는 몬스터.'],[/취업|진로|미래|진학|대학/,'미래의 그림자','아직 오지 않은 미래에 대한 걱정이 만든 몬스터.'],[/친구|연애|가족|관계|싸웠|오해/,'관계 파괴자','말하지 못한 마음과 오해가 엉켜 만들어진 몬스터.'],[/비교|외모|못하는|뒤처/,'거울 조각 괴물','다른 사람과 나를 비교하는 생각이 모여 만들어진 몬스터.']];
  for(const [re,n,d] of keywordRules){if(re.test(typed)){name=n;desc=d;break;}}
  const threat=Math.min(99,Math.max(35,t.threat+(typed.length>100?10:typed.length>35?5:0)+Math.min(30,(state.monsterLv-1)*3)));
  const art=drawMonster((Math.random()*2**31)|0,state.monsterLv);name=`${art.adj} ${name}`;
  currentMonster={name,desc,type:selectedType,threat,concern:typed,level:state.monsterLv,tier:art.tier,sprite:art.src};
  maxHp=scaledHp();hp=maxHp;combo=0;bestCombo=0;attackCount=0;startTime=Date.now();afterMood='';
  $('#monsterName').textContent=name;$('#monsterDesc').textContent=desc;$('#threatBar').style.width=`${threat}%`;$('#threatText').textContent=threat;$('#previewHp').style.width='100%';$('#hpText').textContent=String(maxHp);
  $('#battleMonsterName').textContent=`${name} LV.${state.monsterLv}`;$('#enemyHealth').style.width='100%';$('#enemyHealthText').textContent=`${maxHp} / ${maxHp}`;
  setMonsterSprite(currentMonster);applyLevelUI();
  $('#revealMonster').style.filter='';
  $('#battleMonster').className=`battle-monster monster-type-${Object.keys(types).indexOf(selectedType)}`;
  view('monster');
}
$('#generateBtn').addEventListener('click',()=>{createMonster();});
$('#battleBtn').addEventListener('click',startBattle);
function startBattle(){
  maxHp=scaledHp();hp=maxHp;playerHp=100;combo=0;bestCombo=0;attackCount=0;startTime=Date.now();battleStartedAt=Date.now();battleActive=true;battleFinished=false;attackCooldown=false;dodgeCooldown=false;movementScore=0;lastMoveAt=0;playerX=0;playerZ=0;keysDown.clear();
  clearTimeout(enemyTimer);clearTimeout(warningTimer);
  $('#comboCount').textContent='0';$('#playerHealth').style.width='100%';$('#playerHealthText').textContent='100 / 100';$('#attackWarning').classList.remove('show');$('#battleToast').textContent='WASD로 움직여 공격을 피하고 SPACE로 반격하세요!';$('#bossPattern').textContent='패턴: 탐색 중';
  $('#enemyHealth').style.width='100%';$('#enemyHealthText').textContent=`${maxHp} / ${maxHp}`;$('#battleMonster').style.transform='';$('#battleArena').classList.remove('dodge-left','dodge-right','weapon-sword','weapon-bow','weapon-magic','magic-charging','magic-explosion');$('#battleMonster').classList.remove('charging','casting','sweeping','staggered','hit','hit-heavy','hit-bow','hit-magic');$('#battleSprite').style.display='block';
  selectWeapon(selectedWeapon);view('battle');scheduleEnemyAttack(900);
}
$('#changeWeaponBtn').addEventListener('click',()=>{stopBattleLoops();view('monster')});
$('#quitBattle').addEventListener('click',()=>{if(safeConfirm('전투를 종료하고 메인으로 돌아갈까요? 진행 상황은 기록되지 않아요.')){stopBattleLoops();view('home')}});
$('#attackBtn').addEventListener('click',()=>{if(selectedWeapon==='magic')castMagic();else attack();});
$('#attackBtn').addEventListener('pointerdown',e=>{if(!battleActive)return;if(selectedWeapon==='magic'){e.preventDefault();startMagicCharge();}else if(selectedWeapon==='bow'){e.preventDefault();attack();clearInterval(bowAutoTimer);bowAutoTimer=setInterval(()=>{if(battleActive&&selectedWeapon==='bow')attack();else clearInterval(bowAutoTimer);},weapons.bow.delay);}});
['pointerup','pointerleave','pointercancel'].forEach(evt=>$('#attackBtn').addEventListener(evt,()=>{clearInterval(bowAutoTimer);if(magicCharging)releaseMagicCharge();}));
document.addEventListener('keydown',e=>{
  if(!$('#battleView').classList.contains('active-view'))return;
  const key=e.key.toLowerCase();
  if(['a','d','arrowleft','arrowright','shift',' '].includes(key))e.preventDefault();
  if(['a','arrowleft','d','arrowright'].includes(key)){if(!e.repeat)movePlayer((key==='a'||key==='arrowleft')?'a':'d');return;}
  if(e.code==='Space'){if(selectedWeapon==='magic'){if(!e.repeat)startMagicCharge();e.preventDefault();}else if(selectedWeapon==='bow'){if(!e.repeat){attack();clearInterval(bowAutoTimer);bowAutoTimer=setInterval(()=>{if(battleActive&&selectedWeapon==='bow')attack();else clearInterval(bowAutoTimer);},weapons.bow.delay);}}else if(!e.repeat)attack();}
  if(key==='shift'&&!e.repeat)dodge();
});
document.addEventListener('keyup',e=>{keysDown.delete(e.key.toLowerCase());if(e.code==='Space'){if(selectedWeapon==='magic')releaseMagicCharge();clearInterval(bowAutoTimer);}});
window.addEventListener('blur',()=>keysDown.clear());
$$('.mobile-pad [data-move]').forEach(btn=>{
  const move=()=>movePlayer(btn.dataset.move);
  btn.addEventListener('click',move);
  btn.addEventListener('touchstart',e=>{e.preventDefault();move()},{passive:false});
});
$('#dodgeBtn').addEventListener('click',dodge);
function movePlayer(direction){
  if(!battleActive||playerHp<=0)return;
  movementScore++;lastMoveAt=Date.now();playerX=direction==='a'?-1:1;dodgeUntil=Date.now()+550;
  const arena=$('#battleArena');arena.classList.remove('dodge-left','dodge-right');void arena.offsetWidth;arena.classList.add(direction==='a'?'dodge-left':'dodge-right');
  $('#battleToast').textContent=direction==='a'?'왼쪽으로 회피!':'오른쪽으로 회피!';
  setTimeout(()=>arena.classList.remove('dodge-left','dodge-right'),480);
}
function dodge(){
  if(!battleActive||dodgeCooldown)return;
  dodgeCooldown=true;movementScore+=2;lastMoveAt=Date.now();dodgeUntil=Date.now()+650;$('#battleArena').classList.add('dodging');$('#battleToast').textContent='회피 성공!';
  setTimeout(()=>$('#battleArena').classList.remove('dodging'),420);setTimeout(()=>dodgeCooldown=false,1100);
}
function stopBattleLoops(){battleActive=false;clearTimeout(enemyTimer);clearTimeout(warningTimer);$('#attackWarning').classList.remove('show');$$('.lane-marker.danger').forEach(x=>x.classList.remove('danger'));}
function scheduleEnemyAttack(delay=2400){
  clearTimeout(enemyTimer);if(!battleActive)return;
  enemyTimer=setTimeout(runEnemyPattern,delay);
}
function getPattern(){
  const patterns={
    '직장':[{name:'돌진',warn:'갑질 대마왕이 정면으로 돌진합니다! 좌우로 피하세요.',cls:'charging',damage:23,dodge:'side'},{name:'책상 내려치기',warn:'책상 내려치기! 뒤로 물러나세요.',cls:'slam',damage:20,dodge:'back'},{name:'업무 폭탄',warn:'업무 폭탄이 쏟아집니다! 계속 움직이세요.',cls:'burst',damage:16,dodge:'move'}],
    '학업':[{name:'시험지 탄막',warn:'시험지 탄막 발사! 좌우로 움직이세요.',cls:'casting',damage:18,dodge:'side'},{name:'마감 압박',warn:'마감 압박이 몰려옵니다! 뒤로 피하세요.',cls:'slam',damage:24,dodge:'back'},{name:'오답 폭발',warn:'오답 폭발 예고! 회피하거나 이동하세요.',cls:'burst',damage:15,dodge:'move'}],
    '진로':[{name:'안개 장판',warn:'불확실성 안개가 바닥을 덮습니다! 앞으로 돌파하세요.',cls:'fog',damage:17,dodge:'forward'},{name:'미래의 파동',warn:'미래의 파동이 다가옵니다! 좌우로 피하세요.',cls:'casting',damage:22,dodge:'side'},{name:'선택의 소용돌이',warn:'선택의 소용돌이! 빠르게 위치를 바꾸세요.',cls:'sweep',damage:15,dodge:'move'}],
    '인간관계':[{name:'말의 칼날',warn:'날카로운 말이 날아옵니다! 좌우로 피하세요.',cls:'casting',damage:20,dodge:'side'},{name:'오해의 휩쓸기',warn:'오해의 파도가 휩씁니다! 뒤로 피하세요.',cls:'sweep',damage:19,dodge:'back'},{name:'감정 폭발',warn:'감정 폭발 직전! 회피하세요.',cls:'burst',damage:23,dodge:'move'}],
    '자기비교':[{name:'거울 광선',warn:'거울 광선 조준 중! 좌우로 피하세요.',cls:'casting',damage:22,dodge:'side'},{name:'복제 공격',warn:'복제된 그림자가 덮칩니다! 움직이세요.',cls:'sweep',damage:18,dodge:'move'},{name:'자책 파편',warn:'자책 파편이 떨어집니다! 뒤로 물러나세요.',cls:'slam',damage:17,dodge:'back'}],
    '기타':[{name:'스트레스 파동',warn:'스트레스 파동이 발생합니다! 이동해 피하세요.',cls:'sweep',damage:17,dodge:'move'},{name:'불안 돌진',warn:'불안이 돌진합니다! 좌우로 피하세요.',cls:'charging',damage:22,dodge:'side'},{name:'피로 폭발',warn:'피로 폭발! 뒤로 물러나거나 회피하세요.',cls:'burst',damage:19,dodge:'back'}]
  };
  const list=patterns[currentMonster?.type]||patterns['기타'];return list[Math.floor(Math.random()*list.length)];
}
function runEnemyPattern(){
  if(!battleActive||hp<=0||playerHp<=0)return;
  const pattern=getPattern(),startMovement=movementScore,startTimeMove=lastMoveAt;
  const dangerSide=Math.random()<.5?'left':'right',safeX=dangerSide==='left'?1:-1,dangerKo=dangerSide==='left'?'왼쪽':'오른쪽',safeKo=dangerSide==='left'?'오른쪽':'왼쪽',safeKey=dangerSide==='left'?'D / →':'A / ←';
  playerX=0;const dangerLane=$(`.lane-marker.${dangerSide}-lane`);if(dangerLane)dangerLane.classList.add('danger');
  $('#bossPattern').textContent=`패턴: ${pattern.name} (${dangerKo} 공격)`;$('#attackWarning').textContent=`${pattern.name}! ${dangerKo}으로 공격이 옵니다. ${safeKo}으로 피하세요! (${safeKey})`;$('#attackWarning').classList.add('show');
  const enemy=$('#battleMonster'), arena=$('#battleArena');arena.classList.remove('charging','casting','sweep','slam','fog','burst');void arena.offsetWidth;arena.classList.add(pattern.cls==='sweeping'?'sweep':pattern.cls);
  $('#battleToast').textContent='공격 예고! 방향을 바꿔서 피하세요.';
  warningTimer=setTimeout(()=>{
    $('#attackWarning').classList.remove('show');arena.classList.remove(pattern.cls==='sweeping'?'sweep':pattern.cls);
    if(!battleActive)return;
    if(dangerLane)dangerLane.classList.remove('danger');
    const dodged=Date.now()<dodgeUntil;
    const escaped=movementScore>startMovement&&playerX===safeX; // 안전한 쪽 한 방향으로만 회피 성공
    if(escaped){$('#battleToast').textContent=`회피 성공! ${pattern.name}을(를) 피했어요.`;showToast('공격을 피했어요!');}
    else{
      const rawDamage=Math.min(45,difficulties[selectedDifficulty].damage+(currentMonster.threat>80?3:0)+Math.floor(Math.random()*4)+Math.floor(((currentMonster.level||1)-1)*1.5));const damage=dodged?Math.ceil(rawDamage/2):rawDamage;playerHp=Math.max(0,playerHp-damage);combo=0;$('#comboCount').textContent='0';$('#playerHealth').style.width=`${playerHp}%`;$('#playerHealthText').textContent=`${playerHp} / 100`;
      $('#battleArena').classList.add('player-hit');setTimeout(()=>$('#battleArena').classList.remove('player-hit'),350);
      const n=document.createElement('span');n.className='damage-number player-damage';n.textContent=`-${damage} HP`;n.style.left='45%';n.style.top='30%';$('#damageLayer').appendChild(n);setTimeout(()=>n.remove(),900);
      $('#battleToast').textContent=`피격! ${safeKo}으로 피해야 했어요.${dodged?' (긴급 회피로 피해 절반)':''} 체력 ${damage} 감소`;
      if(playerHp<=0){finishBattle(false);return;}
    }
    scheduleEnemyAttack(Math.max(800,difficulties[selectedDifficulty].delay-currentMonster.threat*5-((currentMonster.level||1)-1)*25));
  },1150);
}
function updateEnemyHealth(){
  $('#enemyHealth').style.width=`${Math.max(0,hp/maxHp*100)}%`;
  $('#enemyHealthText').textContent=`${hp} / ${maxHp}`;
  $('#previewHp').style.width=`${Math.max(0,hp/maxHp*100)}%`;$('#hpText').textContent=String(hp);
}
function showDamage(damage,cls=''){
  const n=document.createElement('span');n.className=`damage-number ${cls}`;n.textContent=`-${damage}`;n.style.left=`${44+Math.random()*15}%`;n.style.top=`${32+Math.random()*18}%`;$('#damageLayer').appendChild(n);setTimeout(()=>n.remove(),1000);
}
function applyWeaponDamage(damage,kind){
  if(!battleActive||hp<=0)return;
  damage=Math.round(damage*dmgMult());
  hp=Math.max(0,hp-damage);combo++;attackCount++;bestCombo=Math.max(bestCombo,combo);$('#comboCount').textContent=combo;updateEnemyHealth();
  const arena=$('#battleArena'),enemy=$('#battleMonster');enemy.classList.remove('hit','hit-heavy','hit-bow','hit-magic');void enemy.offsetWidth;enemy.classList.add(kind==='sword'?'hit-heavy':kind==='magic'?'hit-magic':'hit-bow');
  arena.classList.remove('weapon-sword','weapon-bow','magic-explosion');void arena.offsetWidth;arena.classList.add(`weapon-${kind}`);
  showDamage(damage,kind==='sword'?'heavy-damage':kind==='magic'?'magic-damage':'');
  $('#battleToast').textContent=kind==='sword'?'강력한 일격!':kind==='magic'?'마법 폭발!':'화살 연속 명중!';
  if(hp<=0){if(kind==='magic'){arena.classList.add('magic-explosion');$('#battleToast').textContent='대폭발! 몬스터가 소멸합니다!';setTimeout(()=>finishBattle(true),900);}else setTimeout(()=>finishBattle(true),450);}
}
function attack(){
  if(!battleActive||!$('#battleView').classList.contains('active-view')||hp<=0)return;
  if(selectedWeapon==='magic'){startMagicCharge();return;}
  const w=weapons[selectedWeapon], now=Date.now();
  if(now<(attackCooldownUntil||0))return;
  attackCooldownUntil=now+w.delay;
  const damage=selectedWeapon==='sword'?w.damage+Math.floor(Math.random()*13):w.damage+Math.floor(Math.random()*5);
  applyWeaponDamage(damage,selectedWeapon);
}
let attackCooldownUntil=0;
function startMagicCharge(){
  if(!battleActive||selectedWeapon!=='magic'||magicCharging||hp<=0)return;
  magicCharging=true;magicChargeStart=Date.now();$('#battleArena').classList.add('magic-charging');$('#battleToast').textContent='마법 충전 중… SPACE를 계속 누르세요!';$('#attackLabel').textContent='충전 중…';
  magicChargeTimer=setTimeout(()=>{if(magicCharging){$('#battleToast').textContent='충전 완료! 손을 떼면 폭발합니다!';$('#battleArena').classList.add('magic-ready');}},1800);
}
function releaseMagicCharge(){
  if(!magicCharging)return;const charged=Date.now()-magicChargeStart;magicCharging=false;clearTimeout(magicChargeTimer);
  const arena=$('#battleArena');arena.classList.remove('magic-charging','magic-ready');
  if(charged<650){$('#battleToast').textContent='충전이 부족해 마법이 흩어졌어요. 더 오래 눌러보세요.';$('#attackLabel').textContent='충전 폭발';return;}
  const power=Math.min(1,charged/2200),damage=Math.round(80+power*120);
  arena.classList.add('magic-explosion');$('#battleToast').textContent='마법 폭발!';
  setTimeout(()=>{arena.classList.remove('magic-explosion');applyWeaponDamage(damage,'magic');$('#attackLabel').textContent='충전 폭발';},450);
}
function castMagic(){if(magicCharging)releaseMagicCharge();else startMagicCharge();}
function finishBattle(won=true){
  if(!currentMonster||battleFinished)return;battleFinished=true;stopBattleLoops();clearInterval(bowAutoTimer);clearTimeout(magicChargeTimer);magicCharging=false;
  const elapsed=Math.floor((Date.now()-startTime)/1000), time=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
  $('#resultMonster').textContent=currentMonster.name;$('#resultWeapon').textContent=weapons[selectedWeapon].name;$('#resultTime').textContent=time;$('#resultCombo').textContent=`${bestCombo} COMBO`;$('#resultTitle').textContent=won?'몬스터 퇴치 완료!':'잠시 후퇴했어요';$('#resultSub').textContent=won?`${currentMonster.name}와의 전투에서 승리했어요.`:`${currentMonster.name}의 공격에 쓰러졌어요. 이동과 회피를 연습해서 다시 도전해봐요.`;
  const t=types[currentMonster.type];$('#tipText').textContent=t.tip;showLevelResult(won);
  if($('#saveRecord').checked){
    const record={id:Date.now(),name:currentMonster.name,type:currentMonster.type,weapon:weapons[selectedWeapon].name,time,bestCombo,beforeMood,afterMood:'',level:currentMonster.level,date:new Date().toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),concern:currentMonster.concern};
    const records=readRecords();records.unshift(record);persist(storageKey,records.slice(0,100));
    const book=readBook();if(!book.some(x=>x.name===currentMonster.name&&x.type===currentMonster.type)){book.unshift({name:currentMonster.name,type:currentMonster.type,desc:currentMonster.desc,date:record.date,level:currentMonster.level,sprite:currentMonster.sprite});persist(monsterBookKey,book.slice(0,40));}
    saved=true;
  }else saved=false;
  updateCounts();view('result');
}
$$('#afterMood .mood').forEach(b=>b.addEventListener('click',()=>{
  afterMood=b.dataset.mood;
  if(saved){const r=readRecords();if(r.length){r[0].afterMood=afterMood;persist(storageKey,r);}}
}));
$('#againBtn').addEventListener('click',()=>{ $('#worryInput').value='';$('#charCount').textContent='0 / 500';view('input');});
function updateCounts(){$('#monsterCount').textContent=readBook().length;}
function renderCollection(){
 const grid=$('#archiveGrid'),book=readBook();
 if(!book.length){grid.innerHTML='<div class="empty-state"><span>✧</span><strong>아직 만난 몬스터가 없어요.</strong><p>첫 전투를 완료하면 여기에 몬스터가 등록됩니다.<br>오늘 마음속에 있는 고민부터 만나볼까요?</p><button class="primary-btn" id="firstMonsterBtn">첫 몬스터 만나기 ↗</button></div>';$('#firstMonsterBtn').addEventListener('click',()=>view('input'));return;}
 grid.innerHTML=book.map((m,i)=>`<article class="archive-card"><span class="archive-meta">#${String(book.length-i).padStart(2,'0')}${m.level?` · LV.${m.level}`:''}</span><div class="archive-card-art">${m.sprite?`<img class="archive-sprite" src="${escapeHtml(m.sprite)}" alt="">`:'<div class="mini-monster"><i></i></div>'}</div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.desc)}</p></article>`).join('');
}
function renderRecords(){
 const panel=$('#recordsPanel'),records=readRecords();
 if(!records.length){panel.innerHTML='<div class="empty-state"><span>⌁</span><strong>아직 전투 기록이 없어요.</strong><p>첫 전투를 마치면 기록이 이곳에 남아요.</p></div>';return;}
 panel.innerHTML='<div class="record-row header"><span>몬스터 / 날짜</span><span>사용 무기</span><span>전투 시간 · 콤보</span><span>전투 전후 기분</span></div>'+records.map(r=>`<div class="record-row"><div><strong>${escapeHtml(r.name)}</strong><br><span>${escapeHtml(r.date)}</span></div><span>${escapeHtml(r.weapon)}</span><span>${escapeHtml(r.time)} · ${r.bestCombo} COMBO</span><span class="record-mood">${escapeHtml(r.beforeMood||'—')} → ${escapeHtml(r.afterMood||'미기록')}</span></div>`).join('');
}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('#clearRecords').addEventListener('click',()=>{if(safeConfirm('저장된 전투 기록과 몬스터 도감을 모두 삭제할까요?')){try{localStorage.removeItem(storageKey);localStorage.removeItem(monsterBookKey);}catch{}renderRecords();updateCounts();showToast('전투 기록을 삭제했어요.');}});
updateCounts();
applyLevelUI();

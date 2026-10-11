(() => {
  'use strict';

  const svg = document.getElementById('gridSvg');
  const pointsLayer = document.getElementById('pointsLayer');
  const rightAngleLayer = document.getElementById('rightAngleLayer');
  const outline = document.getElementById('quadOutline');
  const fill = document.getElementById('quadFill');
  const diagAC = document.getElementById('diagAC');
  const diagBD = document.getElementById('diagBD');
  const diagonalLayer = document.getElementById('diagonalLayer');
  const revealResult = document.getElementById('revealResult');
  const shapeNameEl = document.getElementById('shapeName');
  const familyTextEl = document.getElementById('familyText');
  const validBadge = document.getElementById('validBadge');
  const geometryCard = document.querySelector('.geometry-card');
  const propertyItems = [...document.querySelectorAll('[data-prop]')];
  const challengeText = document.getElementById('challengeText');
  const challengeCounter = document.getElementById('challengeCounter');
  const challengeFeedback = document.getElementById('challengeFeedback');

  const GRID = 40;
  const MIN_X = 60, MAX_X = 700, MIN_Y = 60, MAX_Y = 560;
  const EPS = 1e-7;
  const letters = ['A','B','C','D'];

  const initial = [
    {x:180,y:160}, {x:500,y:160}, {x:580,y:440}, {x:260,y:440}
  ];
  let pts = clonePoints(initial);
  let dragIndex = null;
  let currentChallenge = 0;
  let revealed = false;

  const challenges = [
    { text:'בנו מלבן שאינו ריבוע.', test:s => s.rectangle && !s.square },
    { text:'בנו מעוין שאינו ריבוע.', test:s => s.rhombus && !s.square },
    { text:'בנו מקבילית שאינה מלבן ואינה מעוין.', test:s => s.parallelogram && !s.rectangle && !s.rhombus },
    { text:'בנו ריבוע שצלעותיו אינן מקבילות לקווי הסריג.', test:s => s.square && !s.axisAligned },
    { text:'בנו מקבילית שיש לה לפחות זווית ישרה אחת. מה קיבלתם?', test:s => s.parallelogram && s.allRight },
    { text:'בנו מרובע שבו האלכסונים מאונכים, אבל ארבע הצלעות אינן שוות.', test:s => s.diagPerp && !s.allEqual && s.valid }
  ];

  function clonePoints(arr){ return arr.map(p => ({x:p.x,y:p.y})); }
  function sub(a,b){ return {x:a.x-b.x,y:a.y-b.y}; }
  function dot(a,b){ return a.x*b.x+a.y*b.y; }
  function cross(a,b){ return a.x*b.y-a.y*b.x; }
  function len2(v){ return dot(v,v); }
  function len(v){ return Math.sqrt(len2(v)); }
  function near(a,b,t=0.001){ return Math.abs(a-b) <= t; }
  function parallel(v,w){ return Math.abs(cross(v,w)) <= EPS*Math.max(1,len(v)*len(w)); }
  function perpendicular(v,w){ return Math.abs(dot(v,w)) <= EPS*Math.max(1,len(v)*len(w)); }

  function orient(a,b,c){ return cross(sub(b,a),sub(c,a)); }
  function onSegment(a,b,p){ return Math.min(a.x,b.x)-EPS<=p.x&&p.x<=Math.max(a.x,b.x)+EPS&&Math.min(a.y,b.y)-EPS<=p.y&&p.y<=Math.max(a.y,b.y)+EPS&&Math.abs(orient(a,b,p))<EPS; }
  function segmentsIntersect(a,b,c,d){
    const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
    if(((o1>EPS&&o2<-EPS)||(o1<-EPS&&o2>EPS))&&((o3>EPS&&o4<-EPS)||(o3<-EPS&&o4>EPS))) return true;
    return (Math.abs(o1)<EPS&&onSegment(a,b,c))||(Math.abs(o2)<EPS&&onSegment(a,b,d))||(Math.abs(o3)<EPS&&onSegment(c,d,a))||(Math.abs(o4)<EPS&&onSegment(c,d,b));
  }
  function area2(p){ let s=0; for(let i=0;i<4;i++){const q=p[(i+1)%4];s+=p[i].x*q.y-q.x*p[i].y;} return s; }
  function hasDuplicate(p){ for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(p[i].x===p[j].x&&p[i].y===p[j].y)return true; return false; }
  function isSimpleValid(p){
    if(hasDuplicate(p) || Math.abs(area2(p)) < 500) return false;
    if(segmentsIntersect(p[0],p[1],p[2],p[3])) return false;
    if(segmentsIntersect(p[1],p[2],p[3],p[0])) return false;
    return true;
  }

  function analyze(p=pts){
    const valid = isSimpleValid(p);
    const AB=sub(p[1],p[0]), BC=sub(p[2],p[1]), CD=sub(p[3],p[2]), DA=sub(p[0],p[3]);
    const sides=[len(AB),len(BC),len(CD),len(DA)];
    const parallel1=valid&&parallel(AB,CD), parallel2=valid&&parallel(BC,DA);
    const oppEqual1=valid&&near(sides[0],sides[2]), oppEqual2=valid&&near(sides[1],sides[3]);
    const allEqual=valid&&sides.every(v=>near(v,sides[0]));
    const rightAngles=[perpendicular(sub(p[3],p[0]),sub(p[1],p[0])),perpendicular(sub(p[0],p[1]),sub(p[2],p[1])),perpendicular(sub(p[1],p[2]),sub(p[3],p[2])),perpendicular(sub(p[2],p[3]),sub(p[0],p[3]))];
    const allRight=valid&&rightAngles.every(Boolean);
    const ac=sub(p[2],p[0]), bd=sub(p[3],p[1]);
    const diagPerp=valid&&perpendicular(ac,bd), diagEqual=valid&&near(len(ac),len(bd));
    const parallelogram=valid&&parallel1&&parallel2;
    const rectangle=parallelogram&&allRight;
    const rhombus=parallelogram&&allEqual;
    const square=rectangle&&rhombus;
    const axisAligned=[AB,BC,CD,DA].every(v => Math.abs(v.x)<EPS || Math.abs(v.y)<EPS);
    return {valid,parallel1,parallel2,oppEqual1,oppEqual2,allEqual,allRight,diagPerp,diagEqual,parallelogram,rectangle,rhombus,square,axisAligned,rightAngles};
  }

  function classification(s){
    if(!s.valid) return {name:'עדיין אין מרובע תקין', family:'הזיזו מעט את הקודקודים כך שהצלעות לא ייחתכו זו בזו.'};
    if(s.square) return {name:'ריבוע',family:'הוא גם מלבן, גם מעוין וגם מקבילית.'};
    if(s.rectangle) return {name:'מלבן',family:'כל מלבן הוא גם מקבילית.'};
    if(s.rhombus) return {name:'מעוין',family:'כל מעוין הוא גם מקבילית.'};
    if(s.parallelogram) return {name:'מקבילית',family:'יש בו שני זוגות של צלעות נגדיות מקבילות.'};
    return {name:'מרובע כללי',family:'הוא אינו מקבילית, מלבן, מעוין או ריבוע.'};
  }

  function svgPoint(evt){
    const pt=svg.createSVGPoint(); pt.x=evt.clientX; pt.y=evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function snap(v,min,max){ return Math.max(min,Math.min(max,Math.round(v/GRID)*GRID)); }

  function createPointGroups(){
    pointsLayer.innerHTML='';
    letters.forEach((letter,i)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.classList.add('point-group'); g.dataset.index=i;
      g.innerHTML=`<circle class="point-halo" r="17"></circle><circle class="point-ring" r="7"></circle><circle class="point-core" r="2.7"></circle><circle class="point-hit" r="24" tabindex="0" role="button" aria-label="גרירת נקודה ${letter}"></circle><text class="point-label">${letter}</text>`;
      const hit=g.querySelector('.point-hit');
      hit.addEventListener('pointerdown',e=>startDrag(e,i));
      hit.addEventListener('keydown',e=>keyboardMove(e,i));
      pointsLayer.appendChild(g);
    });
  }

  function startDrag(e,i){
    e.preventDefault(); dragIndex=i; e.currentTarget.classList.add('dragging'); e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function moveDrag(e){
    if(dragIndex===null) return;
    e.preventDefault();
    const q=svgPoint(e); const candidate=clonePoints(pts); candidate[dragIndex]={x:snap(q.x,MIN_X,MAX_X),y:snap(q.y,MIN_Y,MAX_Y)};
    if(candidate[dragIndex].x===pts[dragIndex].x&&candidate[dragIndex].y===pts[dragIndex].y) return;
    // Prevent duplicated points and crossed sides; allow temporary near-degenerate simple shapes.
    if(hasDuplicate(candidate)) return;
    if(segmentsIntersect(candidate[0],candidate[1],candidate[2],candidate[3])||segmentsIntersect(candidate[1],candidate[2],candidate[3],candidate[0])) return;
    pts=candidate; concealReveal(); clearChallengeFeedback(); render();
  }
  function endDrag(){
    if(dragIndex!==null){ const hit=pointsLayer.querySelector(`[data-index="${dragIndex}"] .point-hit`); hit?.classList.remove('dragging'); }
    dragIndex=null;
  }
  function keyboardMove(e,i){
    const delta={ArrowLeft:[-GRID,0],ArrowRight:[GRID,0],ArrowUp:[0,-GRID],ArrowDown:[0,GRID]}[e.key]; if(!delta)return;
    e.preventDefault(); const candidate=clonePoints(pts); candidate[i]={x:Math.max(MIN_X,Math.min(MAX_X,pts[i].x+delta[0])),y:Math.max(MIN_Y,Math.min(MAX_Y,pts[i].y+delta[1]))};
    if(hasDuplicate(candidate))return;
    if(segmentsIntersect(candidate[0],candidate[1],candidate[2],candidate[3])||segmentsIntersect(candidate[1],candidate[2],candidate[3],candidate[0]))return;
    pts=candidate; concealReveal(); clearChallengeFeedback(); render();
  }

  function drawRightAngles(s){
    rightAngleLayer.innerHTML=''; if(!s.valid) return;
    s.rightAngles.forEach((isRight,i)=>{ if(!isRight) return; const v=pts[i], prev=pts[(i+3)%4], next=pts[(i+1)%4];
      const a=sub(prev,v), b=sub(next,v), la=len(a), lb=len(b); if(la<1||lb<1)return;
      const u={x:a.x/la,y:a.y/la}, w={x:b.x/lb,y:b.y/lb}, d=18;
      const p1={x:v.x+u.x*d,y:v.y+u.y*d}, p2={x:p1.x+w.x*d,y:p1.y+w.y*d}, p3={x:v.x+w.x*d,y:v.y+w.y*d};
      const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`); path.setAttribute('class','right-marker'); rightAngleLayer.appendChild(path);
    });
  }

  function render(){
    const s=analyze();
    const poly=pts.map(p=>`${p.x},${p.y}`).join(' ');
    fill.setAttribute('points',poly); outline.setAttribute('points',poly+' '+`${pts[0].x},${pts[0].y}`);
    diagAC.setAttribute('x1',pts[0].x);diagAC.setAttribute('y1',pts[0].y);diagAC.setAttribute('x2',pts[2].x);diagAC.setAttribute('y2',pts[2].y);
    diagBD.setAttribute('x1',pts[1].x);diagBD.setAttribute('y1',pts[1].y);diagBD.setAttribute('x2',pts[3].x);diagBD.setAttribute('y2',pts[3].y);
    [...pointsLayer.children].forEach((g,i)=>{ const p=pts[i]; g.querySelectorAll('circle').forEach(c=>{c.setAttribute('cx',p.x);c.setAttribute('cy',p.y)}); const t=g.querySelector('text');
      const center={x:pts.reduce((a,q)=>a+q.x,0)/4,y:pts.reduce((a,q)=>a+q.y,0)/4}; const vx=p.x-center.x,vy=p.y-center.y,l=Math.max(1,Math.hypot(vx,vy)); t.setAttribute('x',p.x+vx/l*22);t.setAttribute('y',p.y+vy/l*22);
    });
    drawRightAngles(s);
    propertyItems.forEach(li=>li.classList.toggle('is-true',!!s[li.dataset.prop]));
    validBadge.textContent=s.valid?'מרובע תקין':'יש לתקן את השרטוט'; validBadge.className='mini-badge '+(s.valid?'valid':'invalid'); geometryCard.classList.toggle('invalid-shape',!s.valid);
    if(revealed){ const c=classification(s); shapeNameEl.textContent=c.name; familyTextEl.textContent=c.family; }
  }

  function concealReveal(){ revealed=false; revealResult.classList.add('hidden'); }
  function reveal(){ revealed=true; const c=classification(analyze()); shapeNameEl.textContent=c.name; familyTextEl.textContent=c.family; revealResult.classList.remove('hidden'); }
  function reset(){ pts=clonePoints(initial); concealReveal(); clearChallengeFeedback(); render(); }
  function randomState(){
    const presets=[
      [{x:160,y:160},{x:520,y:160},{x:600,y:440},{x:240,y:440}],
      [{x:200,y:160},{x:520,y:240},{x:440,y:560},{x:120,y:480}],
      [{x:240,y:120},{x:520,y:240},{x:400,y:520},{x:120,y:400}],
      [{x:160,y:200},{x:480,y:200},{x:480,y:480},{x:160,y:480}],
      [{x:240,y:120},{x:520,y:280},{x:360,y:560},{x:80,y:400}]
    ];
    pts=clonePoints(presets[Math.floor(Math.random()*presets.length)]); concealReveal(); clearChallengeFeedback(); render();
  }
  function showChallenge(){ challengeCounter.textContent=`${currentChallenge+1} / ${challenges.length}`; challengeText.textContent=challenges[currentChallenge].text; clearChallengeFeedback(); }
  function clearChallengeFeedback(){ challengeFeedback.textContent=''; challengeFeedback.className='challenge-feedback'; }
  function checkChallenge(){ const s=analyze(); const ok=challenges[currentChallenge].test(s); challengeFeedback.textContent=ok?'מצוין — הבנייה עומדת בתנאי האתגר.':'עדיין לא. בדקו אילו תכונות מתקיימות ושנו את הבנייה.'; challengeFeedback.className='challenge-feedback '+(ok?'success':'fail'); }
  function nextChallenge(){ currentChallenge=(currentChallenge+1)%challenges.length; showChallenge(); concealReveal(); }

  svg.addEventListener('pointermove',moveDrag); svg.addEventListener('pointerup',endDrag); svg.addEventListener('pointercancel',endDrag); svg.addEventListener('pointerleave',e=>{ if(e.buttons===0)endDrag(); });
  document.getElementById('revealBtn').addEventListener('click',reveal);
  document.getElementById('resetBtn').addEventListener('click',reset);
  document.getElementById('newStateBtn').addEventListener('click',randomState);
  document.getElementById('checkChallengeBtn').addEventListener('click',checkChallenge);
  document.getElementById('nextChallengeBtn').addEventListener('click',nextChallenge);
  document.getElementById('diagonalToggle').addEventListener('change',e=>diagonalLayer.classList.toggle('hidden-svg',!e.target.checked));

  const gridStrength = document.getElementById('gridStrength');
  function updateGridStrength(){
    const raw = Number(gridStrength.value) / 100;
    // Wider visual range: very faint at the low end, genuinely dark at the high end.
    const strength = 0.06 + Math.pow(raw, 1.35) * 0.94;
    svg.style.setProperty('--grid-opacity', strength.toFixed(3));
  }
  gridStrength.addEventListener('input', updateGridStrength);
  updateGridStrength();

  createPointGroups(); showChallenge(); render();
})();

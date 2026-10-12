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
  const diagMarkLayer = document.getElementById('diagMarkLayer');
  const revealResult = document.getElementById('revealResult');
  const shapeNameEl = document.getElementById('shapeName');
  const familyTextEl = document.getElementById('familyText');
  const validBadge = document.getElementById('validBadge');
  const geometryCard = document.querySelector('.geometry-card');
  const propertyItems = [...document.querySelectorAll('[data-prop]')];
  const challengeText = document.getElementById('challengeText');
  const challengeExtra = document.getElementById('challengeExtra');
  const extraQuestion = document.getElementById('extraQuestion');
  const extraOptions = document.getElementById('extraOptions');
  const extraFeedback = document.getElementById('extraFeedback');
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
  let currentChallenge = Math.floor(Math.random()*12);
  let followState = null;   // מצב שאלת ההמשך של האתגר הנוכחי
  let revealed = false;

  // אתגרי בנייה – מוצגים בסדר אקראי, בלי מספור.
  // followUp: שאלת המשך שמופיעה אחרי בנייה נכונה.
  const challenges = [
    { text:'בנו מלבן שאינו ריבוע.', test:s => s.rectangle && !s.square },
    { text:'בנו מעוין שאינו ריבוע.', test:s => s.rhombus && !s.square },
    { text:'בנו מקבילית שאינה מלבן ואינה מעוין.', test:s => s.parallelogram && !s.rectangle && !s.rhombus },
    { text:'בנו ריבוע שצלעותיו אינן מקבילות לקווי הסריג.', test:s => s.square && !s.axisAligned, followUp:'anotherSquare' },
    { text:'בנו מקבילית שיש לה לפחות זווית ישרה אחת.', test:s => s.parallelogram && s.rightAngles.some(Boolean), followUp:'rightParallelogram' },
    { text:'בנו מרובע שבו האלכסונים מאונכים, אבל ארבע הצלעות אינן שוות.', test:s => s.diagPerp && !s.allEqual && s.valid },
    { text:'בנו מצולע שהאלכסונים שלו מאונכים זה לזה.', test:s => s.valid && s.diagPerp },
    { text:'בנו מצולע שהאלכסונים שלו שווים זה לזה.', test:s => s.valid && s.diagEqual },
    { text:'בנו טרפז שווה שוקיים.', test:s => s.isoTrapezoid },
    { text:'בנו מרובע שבו אחד האלכסונים מחוץ למרובע (מרובע קעור).', test:s => s.concave },
    { text:'בנו דלתון.', test:s => s.kite },
    { text:'בנו מרובע שבו רק אלכסון אחד חוצה את האלכסון השני.', test:s => s.valid && (s.acBisectsBD !== s.bdBisectsAC) }
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
    for(let i=0;i<4;i++) if(Math.abs(orient(p[i],p[(i+1)%4],p[(i+2)%4]))<EPS) return false;   // שלושה קודקודים על ישר – משולש
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
    // קמור: הפנייה בכל הקודקודים לאותו כיוון
    const turns=[0,1,2,3].map(i=>Math.sign(orient(p[i],p[(i+1)%4],p[(i+2)%4])));
    const convex=valid&&turns.every(t=>t===turns[0]);
    const concave=valid&&!convex;
    // אלכסון חוצה אלכסון: אמצע האלכסון השני נמצא על האלכסון הזה (על הקטע עצמו)
    const midAC={x:(p[0].x+p[2].x)/2,y:(p[0].y+p[2].y)/2}, midBD={x:(p[1].x+p[3].x)/2,y:(p[1].y+p[3].y)/2};
    const acBisectsBD=valid&&onSegment(p[0],p[2],midBD);
    const bdBisectsAC=valid&&onSegment(p[1],p[3],midAC);
    const diagBisect=acBisectsBD&&bdBisectsAC;
    // טרפז: זוג אחד בלבד של צלעות נגדיות מקבילות
    const trapezoid=valid&&(parallel1!==parallel2);
    const legsEqual=parallel1?near(sides[1],sides[3]):near(sides[0],sides[2]);
    const isoTrapezoid=trapezoid&&legsEqual;
    // דלתון: שני זוגות של צלעות סמוכות שוות (כולל מעוין וכולל דלתון קעור)
    const kite=valid&&((near(sides[0],sides[1])&&near(sides[2],sides[3]))||(near(sides[1],sides[2])&&near(sides[3],sides[0])));
    return {valid,parallel1,parallel2,oppEqual1,oppEqual2,allEqual,allRight,diagPerp,diagEqual,diagBisect,acBisectsBD,bdBisectsAC,parallelogram,rectangle,rhombus,square,axisAligned,rightAngles,convex,concave,trapezoid,isoTrapezoid,kite,sides};
  }

  function classification(s){
    if(!s.valid) return {name:'עדיין אין מרובע תקין', family:'הזיזו מעט את הקודקודים כך שהצלעות לא ייחתכו זו בזו ושלושה קודקודים לא יהיו על ישר אחד.'};
    if(s.square) return {name:'ריבוע',family:'הוא גם מלבן, גם מעוין, גם מקבילית וגם דלתון.'};
    if(s.rectangle) return {name:'מלבן',family:'כל מלבן הוא גם מקבילית.'};
    if(s.rhombus) return {name:'מעוין',family:'כל מעוין הוא גם מקבילית וגם דלתון.'};
    if(s.parallelogram) return {name:'מקבילית',family:'יש בה שני זוגות של צלעות נגדיות מקבילות.'};
    if(s.isoTrapezoid) return {name:'טרפז שווה שוקיים',family:'יש בו זוג אחד בלבד של צלעות נגדיות מקבילות, והשוקיים שוות.'};
    if(s.trapezoid) return {name:'טרפז',family:'יש בו זוג אחד בלבד של צלעות נגדיות מקבילות.'};
    if(s.kite && s.concave) return {name:'דלתון קעור',family:'יש בו שני זוגות של צלעות סמוכות שוות, והוא מרובע קעור.'};
    if(s.kite) return {name:'דלתון',family:'יש בו שני זוגות של צלעות סמוכות שוות.'};
    if(s.concave) return {name:'מרובע קעור',family:'אחת הזוויות שלו גדולה מ־<bdi dir="ltr">180°</bdi>, ואחד האלכסונים נמצא מחוץ למרובע.'};
    return {name:'מרובע כללי',family:'הוא אינו מקבילית, טרפז או דלתון.'};
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

  // סימון זווית ישרה בין האלכסונים (בשכבת האלכסונים – מוצג רק כשהאלכסונים מוצגים).
  // במרובע קעור האלכסונים לא נחתכים: ממשיכים אחד מהם בקו מקווקו עד נקודת המפגש.
  function drawDiagonalMark(s){
    diagMarkLayer.innerHTML=''; if(!s.valid||!s.diagPerp) return;
    const A=pts[0], C=pts[2], B=pts[1], D=pts[3];
    const r=sub(C,A), q=sub(D,B), den=cross(r,q); if(Math.abs(den)<EPS) return;
    const t=cross(sub(B,A),q)/den, X={x:A.x+r.x*t, y:A.y+r.y*t}, u=cross(sub(B,A),r)/den;
    const ns='http://www.w3.org/2000/svg';
    const ext=(P1,P2,k)=>{ if(k>=0&&k<=1) return; const from=k<0?P1:P2; const l=document.createElementNS(ns,'line');
      l.setAttribute('x1',from.x); l.setAttribute('y1',from.y); l.setAttribute('x2',X.x); l.setAttribute('y2',X.y); l.setAttribute('class','diagonal-ext'); diagMarkLayer.appendChild(l); };
    ext(A,C,t); ext(B,D,u);
    // כיוון מנקודת המפגש אל הקצה הרחוק של כל אלכסון – כך הסימון יושב על הקווים המצוירים
    const dirTo=(P1,P2)=>{ const f=len(sub(P1,X))>len(sub(P2,X))?P1:P2, v=sub(f,X), l=len(v); return {x:v.x/l,y:v.y/l}; };
    const a=dirTo(A,C), b=dirTo(B,D), d=15;
    const p1={x:X.x+a.x*d,y:X.y+a.y*d}, p2={x:p1.x+b.x*d,y:p1.y+b.y*d}, p3={x:X.x+b.x*d,y:X.y+b.y*d};
    const path=document.createElementNS(ns,'path'); path.setAttribute('d',`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`); path.setAttribute('class','right-marker diag-marker'); diagMarkLayer.appendChild(path);
  }

  // כיוון האות: החוצה מהקודקוד לאורך חוצה הזווית (גם בקודקוד של מרובע קעור)
  function labelDir(i){
    const p=pts[i], prev=pts[(i+3)%4], next=pts[(i+1)%4];
    const a=sub(prev,p), b=sub(next,p), la=len(a)||1, lb=len(b)||1;
    let d={x:-(a.x/la+b.x/lb), y:-(a.y/la+b.y/lb)}, l=len(d);
    if(l<1e-6){ d={x:-a.y/la,y:a.x/la}; l=1; }
    const turn=orient(prev,p,next), total=area2(pts);
    if(turn*total<0) d={x:-d.x,y:-d.y};          // קודקוד קעור
    return {x:d.x/l,y:d.y/l};
  }

  function render(){
    const s=analyze();
    const poly=pts.map(p=>`${p.x},${p.y}`).join(' ');
    fill.setAttribute('points',poly); outline.setAttribute('points',poly+' '+`${pts[0].x},${pts[0].y}`);
    diagAC.setAttribute('x1',pts[0].x);diagAC.setAttribute('y1',pts[0].y);diagAC.setAttribute('x2',pts[2].x);diagAC.setAttribute('y2',pts[2].y);
    diagBD.setAttribute('x1',pts[1].x);diagBD.setAttribute('y1',pts[1].y);diagBD.setAttribute('x2',pts[3].x);diagBD.setAttribute('y2',pts[3].y);
    [...pointsLayer.children].forEach((g,i)=>{ const p=pts[i]; g.querySelectorAll('circle').forEach(c=>{c.setAttribute('cx',p.x);c.setAttribute('cy',p.y)}); const t=g.querySelector('text');
      const o=labelDir(i); t.setAttribute('x',p.x+o.x*22);t.setAttribute('y',p.y+o.y*22);
    });
    drawRightAngles(s); drawDiagonalMark(s);
    propertyItems.forEach(li=>li.classList.toggle('is-true',!!s[li.dataset.prop]));
    validBadge.textContent=s.valid?'מרובע תקין':'יש לתקן את השרטוט'; validBadge.className='mini-badge '+(s.valid?'valid':'invalid'); geometryCard.classList.toggle('invalid-shape',!s.valid);
    if(revealed){ const c=classification(s); shapeNameEl.textContent=c.name; familyTextEl.innerHTML=c.family; }
  }

  function concealReveal(){ revealed=false; revealResult.classList.add('hidden'); }
  function reveal(){ revealed=true; const c=classification(analyze()); shapeNameEl.textContent=c.name; familyTextEl.innerHTML=c.family; revealResult.classList.remove('hidden'); }
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
  function showChallenge(){ challengeText.textContent=challenges[currentChallenge].text; clearChallengeFeedback(); hideExtra(); followState=null; }
  function clearChallengeFeedback(){
    challengeFeedback.textContent=''; challengeFeedback.className='challenge-feedback';
    // שינוי בשרטוט בזמן שאלת "בנו עוד ריבוע" לא מוחק את השאלה
    if(followState && followState.kind!=='anotherSquare'){ hideExtra(); followState=null; }
    if(followState && followState.kind==='anotherSquare'){ extraFeedback.textContent=''; extraFeedback.className='challenge-feedback'; }
  }
  function hideExtra(){ challengeExtra.classList.add('hidden'); extraQuestion.textContent=''; extraOptions.innerHTML=''; extraFeedback.textContent=''; extraFeedback.className='challenge-feedback'; }
  const M=t=>`<bdi dir="ltr">${t}</bdi>`;   // בידוד ביטויים מתמטיים מכיוון RTL
  function setExtraFeedback(html,cls){ extraFeedback.innerHTML=html; extraFeedback.className='challenge-feedback '+cls; }
  function showOptions(question, options, onPick){
    challengeExtra.classList.remove('hidden'); extraQuestion.textContent=question; extraOptions.innerHTML=''; setExtraFeedback('','');
    options.forEach(label=>{ const b=document.createElement('button'); b.type='button'; b.className='small-btn secondary'; b.textContent=label;
      b.addEventListener('click',()=>{ [...extraOptions.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b))); onPick(label); });
      extraOptions.appendChild(b); });
  }
  const sideKey=s=>Math.round(s.sides[0]*1000);   // אורך צלע הריבוע (ביחידות SVG)

  function checkChallenge(){
    const s=analyze(), ch=challenges[currentChallenge];
    // שאלת המשך: עוד ריבוע עם אורך צלע שונה
    if(followState && followState.kind==='anotherSquare'){
      if(!ch.test(s)){ setExtraFeedback('עדיין לא. זה צריך להיות ריבוע שצלעותיו אינן מקבילות לקווי הסריג.','fail'); return; }
      if(followState.lengths.has(sideKey(s))){ setExtraFeedback('זה ריבוע מתאים, אבל באותו אורך צלע כמו ריבוע שכבר בניתם. נסו אורך אחר.','fail'); return; }
      followState.lengths.add(sideKey(s));
      setExtraFeedback(`מצוין — זה ריבוע נוסף באורך צלע אחר. בניתם כבר ${followState.lengths.size} ריבועים שונים. אפשר להמשיך לחפש עוד.`,'success');
      return;
    }
    const ok=ch.test(s);
    if(!ok){
      const c=classification(s);
      challengeFeedback.textContent=s.valid?`עדיין לא. כרגע בניתם: ${c.name}. בדקו אילו תכונות מתקיימות ושנו את הבנייה.`:'עדיין לא. קודם בנו מרובע תקין.';
      challengeFeedback.className='challenge-feedback fail'; return;
    }
    challengeFeedback.textContent='מצוין — הבנייה עומדת בתנאי האתגר.'; challengeFeedback.className='challenge-feedback success';
    if(ch.followUp==='anotherSquare'){
      followState={kind:'anotherSquare', lengths:new Set([sideKey(s)])};
      challengeExtra.classList.remove('hidden'); extraOptions.innerHTML='';
      extraQuestion.textContent='תוכלו לבנות עוד ריבוע שעונה על הדרישה ואורכי הצלעות שלו שונים? בנו אותו ולחצו שוב „בדקו את הבנייה”.';
      setExtraFeedback('','');
    }
    if(ch.followUp==='rightParallelogram') askWhatYouGot(s);
  }

  // "מקבילית עם זווית ישרה": מה קיבלתם? ואחר כך – האם זה הכרחי?
  function askWhatYouGot(s){
    followState={kind:'rightParallelogram'};
    showOptions('מה קיבלתם?', ['מקבילית שאינה מלבן','מלבן','מעוין שאינו ריבוע','טרפז'], pick=>{
      if(pick==='מלבן'){
        askNecessary(s.square?'נכון. בניתם ריבוע – וכל ריבוע הוא מלבן.':'נכון – קיבלתם מלבן.');
      } else setExtraFeedback('לא בדיוק. בדקו ברשימת התכונות: כמה זוויות ישרות יש עכשיו?','fail');
    });
  }
  function askNecessary(prefix){
    showOptions(prefix+' ועכשיו: האם כל מקבילית שיש לה זווית ישרה אחת היא בהכרח מלבן?', ['כן','לא'], pick=>{
      if(pick==='כן') setExtraFeedback(`נכון. במקבילית זוויות סמוכות משלימות ל־${M('180°')}. אם זווית אחת ישרה, גם הזוויות הסמוכות לה ישרות, כי ${M('180° − 90° = 90°')}. לכן כל ארבע הזוויות ישרות.`,'success');
      else setExtraFeedback('נסו לבנות מקבילית שיש לה זווית ישרה אחת, אבל לא כל הזוויות בה ישרות. האם זה אפשרי? חשבו: כמה מעלות יש לזוויות סמוכות במקבילית?','fail');
    });
  }

  function nextChallenge(){
    let n; do{ n=Math.floor(Math.random()*challenges.length); } while(n===currentChallenge && challenges.length>1);
    currentChallenge=n; showChallenge(); concealReveal();
  }

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

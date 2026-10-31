// Player-led authentic photo sequence. Native presentation only, no generative face changes.
export default {
  mount(root, ctx) {
    const {h,set,cue}=ctx.kit;
    const {background,shots,labels=[],title,backgroundCaption,diagram}=ctx.props;
    if(typeof background!=='string'||!background.trim())throw new Error('photo-focus: background is required');
    if(!Array.isArray(shots)||!shots.length)throw new Error('photo-focus: shots are required');
    for(const p of shots)if(typeof p.image!=='string'||!p.image.trim()||typeof p.caption!=='string'||!p.caption.trim())throw new Error('photo-focus: each shot needs image and caption');
    const W=ctx.width,H=ctx.height,safe=ctx.safe??{},left=Math.max(safe.left??0,W*.06),right=Math.max(safe.right??0,W*.06),width=W-left-right;
    const photoTop=H*.295,photoHeight=H*.33,photoWidth=width*.94,photoLeft=left+(width-photoWidth)/2;
    root.append(h('img',{src:ctx.asset(background),alt:'',style:{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.58)'}}));
    const heading=h('div',{style:{position:'absolute',left:`${left}px`,top:`${Math.max(safe.top??0,H*.18)}px`,width:`${width}px`,font:'800 44px/1.15 var(--ct-font)',color:'var(--fl-paper,#fff8ed)',textAlign:'center'}});
    root.append(heading);
    if(diagram&&(!['switch','curve'].includes(diagram.kind)||typeof diagram.label!=='string'))throw new Error('photo-focus: diagram needs switch/curve kind and data-bound label');
    const frames=shots.map(p=>{
      const fit=p.fit??'contain';if(!['contain','cover'].includes(fit))throw new Error('photo-focus: fit must be contain or cover');
      const zoom=p.zoom??1;if(typeof zoom!=='number'||zoom<1||zoom>2.5)throw new Error('photo-focus: zoom must be between1 and2.5');
      const frame=h('div',{style:{position:'absolute',left:`${photoLeft}px`,top:`${photoTop}px`,width:`${photoWidth}px`,height:`${photoHeight}px`,boxSizing:'border-box',border:'3px solid var(--fl-gold,#efc75c)',borderRadius:'16px',background:'var(--fl-paper,#fff8ed)',overflow:'hidden',boxShadow:'0 12px 30px #0005'}},h('img',{src:ctx.asset(p.image),alt:p.caption,style:{display:'block',width:diagram?'65%':'100%',height:'100%',objectFit:fit,objectPosition:p.position??'50% 50%',transform:`scale(${zoom})`,transformOrigin:p.origin??'50% 50%'}}));
      root.append(frame);return frame;
    });
    const date=h('div',{style:{position:'absolute',left:`${left}px`,top:`${photoTop+photoHeight+H*.014}px`,width:`${width}px`,font:'700 32px/1.2 var(--ct-font)',textAlign:'center',color:'var(--fl-paper,#fff8ed)'}});root.append(date);
    if(backgroundCaption)root.append(h('div',{style:{position:'absolute',left:`${left}px`,top:`${photoTop+photoHeight+H*.041}px`,width:`${width}px`,font:'700 26px/1.2 var(--ct-font)',textAlign:'center',color:'var(--fl-paper,#fff8ed)'}},backgroundCaption));
    const at=(v,fallback)=>typeof v==='number'?v:typeof v==='string'?cue(ctx,v,fallback):fallback;
    let ball=null,points=null;
    if(diagram){
      const ns='http://www.w3.org/2000/svg',el=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
      const panel=h('div',{style:{position:'absolute',left:`${photoLeft+photoWidth*.67}px`,top:`${photoTop+photoHeight*.12}px`,width:`${photoWidth*.30}px`,height:`${photoHeight*.77}px`}});
      panel.append(h('div',{style:{font:'700 27px/1.2 var(--ct-font)',textAlign:'center',color:'var(--fl-ink,#172b4d)',marginBottom:'10px'}},diagram.label));
      const svg=el('svg',{viewBox:'0 0 250 390',width:'100%',height:'84%'});svg.append(el('rect',{x:2,y:2,width:246,height:386,rx:20,fill:'#2d7057',stroke:'#e8f3d6','stroke-width':3}),el('path',{d:'M2 195H248',stroke:'#d8e7cd','stroke-width':2,fill:'none'}));
      points=diagram.kind==='curve'?[[40,320],[245,240],[155,80]]:[[40,320],[140,260],[210,80]];
      const [a,b,c]=points;svg.append(el('path',{d:`M${a[0]} ${a[1]} Q${b[0]} ${b[1]} ${c[0]} ${c[1]}`,stroke:'#efc75c','stroke-width':5,fill:'none','stroke-dasharray':'11 8'}));
      for(const [x,y,color] of [[...a,'#328cd4'],[...c,'#328cd4'],[125,225,'#db5c49']])svg.append(el('circle',{cx:x,cy:y,r:16,fill:color,stroke:'#fff8ed','stroke-width':3}));
      ball=el('g',{});ball.append(el('circle',{r:10,fill:'#fff',stroke:'#172b4d','stroke-width':2}),el('circle',{r:4,fill:'#172b4d'}));svg.append(ball);panel.append(svg);root.append(panel);
    }
    return t=>{
      let current=0;for(let i=1;i<shots.length;i++)if(t>=at(shots[i].at,0))current=i;
      for(let i=0;i<frames.length;i++)set(frames[i],{display:i===current?'block':'none'});
      date.textContent=shots[current].caption;
      let text=title??'';for(const l of labels)if(t>=at(l.at,0)&&t<at(l.until,Infinity))text=l.text??text;
      heading.textContent=text;
      set(heading,{display:text?'block':'none',transform:'none'});
      if(ball){const p=Math.max(0,Math.min(1,(t-at(diagram.at,0))/1.6)),q=1-p,[a,b,c]=points;ball.setAttribute('transform',`translate(${q*q*a[0]+2*q*p*b[0]+p*p*c[0]} ${q*q*a[1]+2*q*p*b[1]+p*p*c[1]})`);}
    };
  },
};

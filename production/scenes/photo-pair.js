// Authentic photographs on a full-frame illustrated background; optional shared series identity.
import seriesCover from './series-cover.js';

export default {
  mount(root, ctx) {
    const {h,set,cue}=ctx.kit;
    const {image,portraits,project,title,heading,backgroundCaption,reveal,revealAt=1.8}=ctx.props;
    if(typeof image!=='string'||!image.trim())throw new Error('photo-pair: image is required');
    if(!Array.isArray(portraits)||portraits.length!==2)throw new Error('photo-pair: exactly two portraits are required');
    for(const p of portraits)if(typeof p.image!=='string'||!p.image.trim()||typeof p.label!=='string'||!p.label.trim())throw new Error('photo-pair: each portrait needs image and label');
    const identity=project!==undefined||title!==undefined;
    const W=ctx.width,H=ctx.height,safe=ctx.safe??{};
    const left=Math.max(safe.left??0,W*.06),right=Math.max(safe.right??0,W*.06);
    const available=W-left-right,gap=W*.028,width=Math.min(W*.32,(available-gap)/2);
    const start=left+(available-2*width-gap)/2;
    const top=identity?Math.max((H-W)/2+H*.17,safe.top??0):Math.max((H-W)/2+H*.085,safe.top??0);
    const height=H*.17;
    let drawBase;
    if(identity){drawBase=seriesCover.mount(root,ctx);root.firstElementChild.style.filter='brightness(.78)';}
    else {
      root.append(h('img',{src:ctx.asset(image),alt:'',style:{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.45)'}}));
      drawBase=()=>{};
    }
    const wrap=h('div',{class:'rc-photo-pair',style:{position:'absolute',inset:'0'}});
    if(heading)wrap.append(h('div',{style:{position:'absolute',left:`${left}px`,top:`${Math.max(H*.18,safe.top??0)}px`,width:`${available}px`,font:'800 42px/1.2 var(--ct-font)',textAlign:'center',color:'var(--fl-gold,#efc75c)'}},heading));
    const labels=[];
    for(let i=0;i<2;i++){
      const x=start+i*(width+gap),p=portraits[i];
      const fit=p.fit??'contain',zoom=p.zoom??1;
      if(!['contain','cover'].includes(fit)||typeof zoom!=='number'||zoom<1||zoom>2.5)throw new Error('photo-pair: invalid fit/zoom');
      wrap.append(h('div',{style:{position:'absolute',left:`${x}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`,background:'var(--fl-paper,#fff8ed)',border:'3px solid var(--fl-gold,#efc75c)',borderRadius:'14px',overflow:'hidden',boxSizing:'border-box',boxShadow:'0 10px 24px #0005'}},h('img',{src:ctx.asset(p.image),alt:p.label,style:{width:'100%',height:'100%',objectFit:fit,objectPosition:p.position??'50% 50%',transform:`scale(${zoom})`,transformOrigin:p.origin??'50% 50%',display:'block'}})));
      const label=h('div',{style:{position:'absolute',left:`${x}px`,top:`${top+height-42}px`,width:`${width}px`,boxSizing:'border-box',padding:'6px',borderRadius:'0 0 10px 10px',background:'var(--fl-ink,#172b4d)',color:'var(--fl-paper,#fff8ed)',font:'700 26px/1.2 var(--ct-font)',textAlign:'center'}},p.label);
      labels.push(label);wrap.append(label);
    }
    if(backgroundCaption)wrap.append(h('div',{style:{position:'absolute',left:`${left}px`,top:`${H*.67}px`,width:`${available}px`,font:'700 26px/1.2 var(--ct-font)',textAlign:'center',color:'var(--fl-paper,#fff8ed)'}},backgroundCaption));
    root.append(wrap);
    let fitted=false;
    return t=>{
      drawBase(t);
      if(!fitted){for(const el of labels){let size=28;for(let i=0;i<16&&el.scrollWidth>el.clientWidth+1;i++){size*=.95;el.style.fontSize=`${size}px`;}}fitted=true;}
      const at=typeof revealAt==='number'?revealAt:cue(ctx,revealAt,1.8);
      const visible=!(identity&&reveal&&t>=at);
      set(wrap,{visibility:visible?'visible':'hidden',opacity:visible?'1':'0',transform:'none'});
    };
  },
};

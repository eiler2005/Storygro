// A readable first-frame series identity over episode-specific, full-bleed artwork.
// props: image, project, title; optional subtitle and emblem (image path).
export default {
  mount(root, ctx) {
    const {h,set,clamp,ease}=ctx.kit;
    const {image,project,title,subtitle,emblem,reveal,revealAt=1.8}=ctx.props;
    for(const [key,value] of Object.entries({image,project,title})) {
      if(typeof value!=='string'||!value.trim())throw new Error(`series-cover: props.${key} is required`);
    }
    const W=ctx.width,H=ctx.height,safe=ctx.safe??{};
    const left=Math.max(safe.left??0,W*.055),right=Math.max(safe.right??0,W*.055);
    // The entire identity is inside both the safe box and the central square preview.
    const top=Math.max(safe.top??0,(H-W)/2+H*.018);
    const bg=h('img',{src:ctx.asset(image),alt:'',style:{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',transformOrigin:'50% 55%'}});
    const card=h('div',{class:'fl-series-cover',style:{position:'absolute',left:`${left}px`,right:`${right}px`,top:`${top}px`}});
    const lock=h('div',{class:'fl-series-lock'});
    if(emblem)lock.append(h('img',{src:ctx.asset(emblem),alt:'',class:'fl-series-emblem'}));
    const text=h('div',{class:'fl-series-type'});
    text.append(h('div',{class:'fl-series-project'},project),h('div',{class:'fl-series-title'},title));
    if(subtitle)text.append(h('div',{class:'fl-series-subtitle'},subtitle));
    lock.append(text);card.append(lock);root.append(bg);
    const story=reveal?h('img',{src:ctx.asset(reveal),alt:'',style:{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover'}}):null;
    if(story)root.append(story);
    root.append(card);
    return t=>{
      const k=ease.inOut(clamp(t/Math.max(.5,ctx.duration)));
      set(bg,{transform:`scale(${1+.018*k})`});
      // No arrival animation: identity must already be readable on frame zero.
      const at=typeof revealAt==='number'?revealAt:ctx.kit.cue(ctx,revealAt,1.8);
      const revealed=!!story&&t>=at;
      if(story)set(story,{visibility:revealed?'visible':'hidden',transform:`scale(${1+.018*k})`});
      set(card,{opacity:revealed?'0':'1',visibility:revealed?'hidden':'visible',transform:'none'});
    };
  },
};

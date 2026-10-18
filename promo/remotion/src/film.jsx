import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig,Easing} from 'remotion';
import {Check,Sun,CalendarDays,LayoutGrid,CheckCircle2,ArrowUpRight,Plus,Sparkles,Clock3} from 'lucide-react';

const C={violet:'#7467f2',light:'#b9aeff',navy:'#172033',ink:'#252a40',muted:'#9298a9',paper:'#f7f8fc'};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const range=(f,a,b)=>interpolate(f,[a,b],[0,1],clamp);
const out=(f,a,b)=>1-range(f,a,b);
const blur=(f,a,b)=>`blur(${(1-range(f,a,b))*20}px)`;
const easing=Easing.bezier(.22,1,.36,1);
const reveal=(f,a,b)=>interpolate(f,[a,b],[0,1],{...clamp,easing});
const fonts="'Manrope','DM Sans',Arial,sans-serif";

function Logo({size=44,light=true}){return <div style={{display:'flex',alignItems:'center',gap:size*.28,fontSize:size,fontWeight:850,letterSpacing:-size*.055,color:light?'#fff':C.ink}}>
<div style={{height:size*1.08,width:size*1.08,borderRadius:size*.30,background:light?'#fff':C.violet,color:light?C.violet:'#fff',display:'grid',placeItems:'center',transform:'rotate(-7deg)',boxShadow:'0 12px 32px #140d592b'}}><Check size={size*.64} strokeWidth={3.5}/></div>
<span>daymark<span style={{color:light?C.light:C.violet}}>.</span></span></div>}
function Noise(){return <AbsoluteFill style={{pointerEvents:'none',opacity:.07,backgroundImage:'repeating-linear-gradient(0deg,transparent 0px,transparent 3px,#ffffff 4px)',backgroundSize:'100% 5px'}}/>}
function Background({f}){return <AbsoluteFill style={{background:'radial-gradient(ellipse at 73% 42%,#3d327b 0%,#201c46 35%,#0d1125 76%)',overflow:'hidden'}}>
<div style={{position:'absolute',width:950,height:950,right:-170,top:-130,borderRadius:'50%',background:'radial-gradient(circle,#8a79ff4d,transparent 68%)',filter:'blur(50px)',transform:`translate(${Math.sin(f/80)*65}px,${Math.cos(f/95)*45}px)`}}/>
{[650,950,1250].map((d,i)=><div key={d} style={{position:'absolute',width:d,height:d,border:'1px solid #c4b9ff18',borderRadius:'50%',right:150-d/2,top:500-d/2,transform:`rotate(${f*.04*(i+1)}deg)`}}/>)}
<Noise/></AbsoluteFill>}
function Type({f,start,children,style={}}){const a=reveal(f,start,start+21);return <div style={{opacity:a,transform:`translateY(${(1-a)*60}px)`,filter:blur(f,start,start+20),...style}}>{children}</div>}
const tasks=[['Prepare project presentation','9:00 AM'],['Review weekly priorities','11:30 AM'],['Make something great','2:00 PM']];
function Dashboard({f,start=0,compact=false}){const t=f-start;const a=reveal(t,0,27);const tick=range(t,76,100);return <div style={{width:compact?770:950,height:compact?570:650,display:'flex',borderRadius:28,overflow:'hidden',background:C.paper,color:C.ink,boxShadow:'0 60px 120px #070817b3,0 0 0 1px #ffffff4a',transform:`perspective(1500px) rotateY(${-9+9*range(t,90,170)}deg) rotateX(${4-4*range(t,90,170)}deg) translateY(${(1-a)*130+Math.sin(t/28)*7}px) scale(${.91+.09*a})`,opacity:a}}>
<div style={{width:210,flexShrink:0,background:C.navy,padding:'34px 20px',color:'#b0b9d0'}}>
<div style={{transform:'scale(.52)',transformOrigin:'top left',height:62}}><Logo light size={37}/></div>
<div style={{fontSize:11,letterSpacing:3,color:'#7e8ba6',margin:'22px 0 14px'}}>WORKSPACE</div>
{[[LayoutGrid,'All tasks'],[Sun,'Today'],[CalendarDays,'Upcoming'],[CheckCircle2,'Completed']].map(([Icon,label],i)=><div key={label} style={{display:'flex',alignItems:'center',gap:13,padding:'16px 12px',fontSize:16,borderRadius:10,background:i===1?'#ffffff20':'transparent',color:i===1?'#fff':'#abb6ce'}}><Icon size={20}/>{label}</div>)}
<div style={{marginTop:140,padding:16,background:'#303759',borderRadius:12,fontSize:15,color:'#fff'}}>✦ One thing at a time.</div></div>
<div style={{flex:1,padding:'38px 43px'}}>
<div style={{display:'flex',justifyContent:'space-between',color:'#9da3b3',fontSize:14}}><span>MY WORKSPACE / TODAY</span><span>✦ YOUR FOCUS</span></div>
<div style={{fontSize:42,fontWeight:850,letterSpacing:-2,marginTop:32}}>Today's focus<span style={{color:C.violet}}>.</span></div>
<div style={{fontSize:17,color:C.muted,marginTop:7}}>Small steps add up to big things.</div>
<div style={{background:'linear-gradient(110deg,#7769ea,#8d85ef)',borderRadius:18,marginTop:30,padding:'24px 28px',color:'white'}}>
<div style={{fontSize:12,letterSpacing:2,fontWeight:800,opacity:.8}}>DAILY PROGRESS</div><div style={{fontSize:27,fontWeight:800,marginTop:12}}>Keep the momentum going ✦</div>
<div style={{height:9,background:'#ffffff52',borderRadius:10,marginTop:21,overflow:'hidden'}}><div style={{height:'100%',width:`${65*tick}%`,borderRadius:10,background:'#fff'}}/></div></div>
<div style={{fontSize:21,fontWeight:800,marginTop:29}}>Today's tasks</div>
{tasks.map(([label,time],i)=>{const a=reveal(t,30+i*11,48+i*11);const done=range(t,88+i*28,96+i*28);return <div key={label} style={{display:'flex',alignItems:'center',gap:17,padding:'20px 0',borderBottom:'1px solid #e7eaf2',opacity:a,transform:`translateX(${(1-a)*28}px)`,fontSize:16}}><div style={{width:25,height:25,borderRadius:'50%',border:done>.5?'none':'2px solid #cdd1e0',background:done>.5?C.violet:'transparent',display:'grid',placeItems:'center',color:'#fff'}}>{done>.5&&<Check size={16}/>}</div><span style={{flex:1,color:done>.5?'#a4a8b8':C.ink,textDecoration:done>.5?'line-through':'none'}}>{label}</span><span style={{fontSize:12,color:C.muted}}>{time}</span></div>})}</div></div>}
function Pill({children}){return <div style={{border:'1px solid #c4bbff50',background:'#a399ff20',borderRadius:50,padding:'12px 22px',fontSize:19,color:'#e0daff',letterSpacing:.6}}>{children}</div>}
function TitleScene({f}){const fade=out(f,145,172);return <AbsoluteFill style={{opacity:fade}}>
<div style={{position:'absolute',left:125,top:95}}><Logo size={41}/></div>
<div style={{position:'absolute',left:125,top:315,width:790}}>
<Type f={f} start={4} style={{fontSize:19,fontWeight:750,letterSpacing:5,color:C.light}}>YOUR CALM PRODUCTIVITY SPACE</Type>
<Type f={f} start={13} style={{fontSize:106,fontWeight:850,letterSpacing:-7,lineHeight:1.07,marginTop:26}}>Less busy.<br/><span style={{color:C.light}}>More done.</span></Type>
<Type f={f} start={28} style={{fontSize:28,lineHeight:1.5,color:'#cbc8e2',marginTop:32}}>A little progress, every day.</Type>
<Type f={f} start={45} style={{marginTop:40,display:'flex'}}><Pill>✦ Build better days</Pill></Type></div>
<div style={{position:'absolute',left:1020,top:270,transform:`rotate(${-5+Math.sin(f/42)*2}deg)`}}><Dashboard f={f} start={10} compact/></div></AbsoluteFill>}
function ProductScene({f}){const t=f-145;const a=reveal(t,0,32)*out(t,250,280);return <AbsoluteFill style={{opacity:a}}>
<div style={{position:'absolute',left:140,top:120}}><Type f={t} start={0} style={{fontSize:20,letterSpacing:5,color:C.light,fontWeight:800}}>ONE CLEAR PLACE FOR EVERYTHING</Type><Type f={t} start={12} style={{fontSize:75,fontWeight:850,letterSpacing:-4,marginTop:25}}>Find your focus.</Type><Type f={t} start={29} style={{fontSize:26,color:'#d1cce8',marginTop:15}}>Organize. Prioritize. Make progress.</Type></div>
<div style={{position:'absolute',left:510,top:345}}><Dashboard f={t} start={15}/></div>
<div style={{position:'absolute',right:140,top:300,transform:`translateY(${Math.sin(t/20)*12}px)`,opacity:reveal(t,65,92),background:'#fff',color:C.ink,borderRadius:19,padding:'24px 30px',boxShadow:'0 20px 70px #08092070',fontSize:23,fontWeight:800}}>✦ Progress feels good.</div>
</AbsoluteFill>}
function EndScene({f,start=430}){const t=f-start;const a=reveal(t,0,35);return <AbsoluteFill style={{display:'grid',placeItems:'center',opacity:a}}><div style={{textAlign:'center',transform:`scale(${.84+.16*a})`}}><div style={{display:'flex',justifyContent:'center'}}><Logo size={100}/></div><div style={{fontSize:52,letterSpacing:-2,marginTop:42,fontWeight:650,color:'#e4dfff'}}>A little progress, every day.</div><div style={{fontSize:24,letterSpacing:5,color:C.light,marginTop:48}}>LESS BUSY. MORE DONE.</div></div></AbsoluteFill>}
function Loop({f}){const cycle=f%360;const seam=cycle<18?range(cycle,0,18):cycle>338?out(cycle,338,359):1;return <AbsoluteFill style={{opacity:seam}}><div style={{position:'absolute',left:110,top:110}}><Logo size={45}/></div><div style={{position:'absolute',left:110,top:320}}><Type f={cycle} start={5} style={{fontSize:95,fontWeight:850,letterSpacing:-6,lineHeight:1.1}}>Less busy.<br/><span style={{color:C.light}}>More done.</span></Type><Type f={cycle} start={25} style={{fontSize:27,color:'#c8c4e3',marginTop:30}}>Your day, beautifully organized.</Type></div><div style={{position:'absolute',left:945,top:200}}><Dashboard f={cycle} start={0} compact/></div></AbsoluteFill>}
export function DaymarkFilm({mode='launch'}){const f=useCurrentFrame();const vertical=mode==='vertical';const stage=<AbsoluteFill style={{fontFamily:fonts,overflow:'hidden'}}><Background f={f}/>{mode==='loop'?<Loop f={f}/>:<><TitleScene f={f}/><ProductScene f={f}/><EndScene f={f} start={vertical?400:430}/></>}</AbsoluteFill>;return vertical?<AbsoluteFill style={{background:'#0d1125',overflow:'hidden'}}><div style={{position:'absolute',width:1920,height:1080,left:-420,top:390,transform:'scale(.999)',transformOrigin:'top left'}}>{stage}</div><div style={{position:'absolute',top:135,left:75,transform:'scale(1.15)',transformOrigin:'top left'}}><Logo size={44}/></div><div style={{position:'absolute',bottom:180,left:70,fontSize:42,color:'#e2ddff',fontWeight:800}}>A little progress, every day.</div></AbsoluteFill>:stage}

import { useUILanguage, translateText } from '../i18n/display';
import {useEffect,useRef,useState} from 'react';
import type {BuilderSection} from './BuilderWorkspace';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const defaultElementCode='<div style="padding:24px;text-align:center;border:1px solid #ddd;border-radius:8px">\n  <h2>Your custom HTML</h2>\n  <p>Add HTML, CSS, or JavaScript in the code editor.</p>\n</div>';
export function HtmlLiquidElement({item}:{item:BuilderSection}) {
  useUILanguage();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const isDark = theme === 'dark';
  const frame=useRef<HTMLIFrameElement>(null);
  const [height,setHeight]=useState(160);
  useEffect(()=>{const resize=(event:MessageEvent)=>{if(event.source===frame.current?.contentWindow&&event.data?.type==='gos-code-height'&&Number.isFinite(event.data.height))setHeight(Math.max(40,Math.min(5000,event.data.height)));};window.addEventListener('message',resize);return()=>window.removeEventListener('message',resize);},[]);
  const code=item.content.code??defaultElementCode;
  const darkStyle = isDark ? 'html,body{background:#0f172a;color:#f1f5f9;}div{border-color:#334155!important;}' : '';
  const srcDoc=`<!doctype html><html class="${isDark ? 'dark' : ''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}${darkStyle}</style></head><body>`+code+`<script>new ResizeObserver(()=>parent.postMessage({type:"gos-code-height",height:Math.max(document.body.scrollHeight,document.body.getBoundingClientRect().height)},"*")).observe(document.body);<\/script></body></html>`;
  return <iframe ref={frame} className={`pf-code-frame ${isDark ? 'dark' : ''}`} title={translateText("HTML/Liquid output")} sandbox="allow-scripts" srcDoc={srcDoc} style={{height,width:'100%',border:0}}/>;
}


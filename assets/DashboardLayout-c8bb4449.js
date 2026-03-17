import{c as s,u as y,x as f,a as j,r as N,j as e,L as k,B as h,X as v,m as w}from"./index-63f155fa.js";import{Z as _,S as L}from"./zap-eaa2f1ef.js";/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],S=s("layout-dashboard",M);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],A=s("log-out",D);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],E=s("menu",C);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],$=s("plus",H);/**
 * @license lucide-react v0.552.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],I=s("settings",z),B=({children:x})=>{var c,d;const{user:a,signOut:p}=y(),m=f(),g=j(),[l,i]=N.useState(!1),o=[{icon:S,label:"Dashboard",path:"/dashboard"},{icon:_,label:"Dispositivos",path:"/devices"},{icon:$,label:"Adicionar",path:"/add-device"},{icon:I,label:"Configurações",path:"/settings"}];(a==null?void 0:a.role)==="admin"&&o.push({icon:L,label:"Admin",path:"/admin"});const b=async()=>{await p(),g("/")},n=64,r=256;return e.jsxs("div",{className:"flex min-h-screen bg-black",children:[e.jsx("aside",{className:`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-purple-500/30 z-40 transform transition-transform duration-300 ${l?"translate-x-0":"-translate-x-full"} lg:translate-x-0`,style:{paddingTop:n},children:e.jsxs("div",{className:"p-6 pt-10",children:[e.jsxs("h1",{className:"text-2xl font-bold text-white mb-10 mt-2",children:["Smart",e.jsx("span",{className:"text-purple-400",children:"Control"})]}),e.jsx("nav",{className:"space-y-2",children:o.map(t=>{const u=m.pathname===t.path;return e.jsxs(k,{to:t.path,onClick:()=>i(!1),className:`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${u?"bg-purple-600 text-white":"text-gray-400 hover:bg-purple-600/20 hover:text-white"}`,children:[e.jsx(t.icon,{className:"w-5 h-5"}),e.jsx("span",{children:t.label})]},t.path)})}),e.jsxs("div",{className:"absolute bottom-6 left-6 right-6",children:[e.jsxs("div",{className:"gradient-card p-4 rounded-lg border border-purple-500/30 mb-4",children:[e.jsx("p",{className:"text-white font-medium",children:(c=a==null?void 0:a.user_metadata)==null?void 0:c.full_name}),e.jsx("p",{className:"text-gray-400 text-sm",children:a==null?void 0:a.email})]}),e.jsxs(h,{onClick:b,variant:"outline",className:"w-full border-purple-500/30 text-gray-400 hover:text-white",children:[e.jsx(A,{className:"w-4 h-4 mr-2"}),"Sair"]})]})]})}),e.jsxs("div",{className:"flex-1 flex flex-col",style:{marginLeft:r},children:[e.jsxs("header",{className:"fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-b border-purple-500/30 z-30 flex items-center justify-between px-6",style:{height:n,marginLeft:r},children:[e.jsx("div",{className:"lg:hidden",children:e.jsx(h,{variant:"ghost",size:"icon",onClick:()=>i(!l),className:"text-white",children:l?e.jsx(v,{}):e.jsx(E,{})})}),e.jsx("span",{className:"text-white font-bold text-xl hidden lg:block",children:"SmartControl"}),e.jsx("div",{className:"text-gray-300",children:(d=a==null?void 0:a.user_metadata)==null?void 0:d.full_name})]}),e.jsx("main",{className:"flex-1 p-6 lg:p-8",style:{paddingTop:n},children:e.jsx(w.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.5},children:x})})]}),l&&e.jsx("div",{className:"fixed inset-0 bg-black/50 z-20 lg:hidden",onClick:()=>i(!1)})]})};export{B as D,$ as P};

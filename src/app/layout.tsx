import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
const geist=Geist({subsets:["latin"],variable:"--font-geist"});
export const metadata:Metadata={title:"Open Door — Make room for your everyday",description:"A thoughtful room-layout studio. Rehearse a journey, inspect geometric constraints, and keep a dimensioned plan around what matters to you.",applicationName:"Open Door",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={geist.variable}>{children}</body></html>;}

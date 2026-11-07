import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
const geist=Geist({subsets:["latin"],variable:"--font-geist"});
export const metadata:Metadata={title:"Open Door",description:"Inspect a room, verify a journey and door swing, and compare furniture changes.",applicationName:"Open Door",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={geist.variable}><body>{children}</body></html>;}

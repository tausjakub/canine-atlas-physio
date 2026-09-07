import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Canine Atlas · Anatomy for movement',description:'Explore canine bones and muscles in 3D and study movement anatomy for canine physiotherapy.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}

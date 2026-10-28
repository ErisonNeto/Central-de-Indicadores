import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Central de Indicadores | J&T Express',description:'Resultados do Orlean: ontem e acumulado do mês.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}

declare module 'pdf-parse' {
  import { Buffer } from 'buffer';
  export default function pdfParse(buffer: Buffer): Promise<{ text: string }>;
}

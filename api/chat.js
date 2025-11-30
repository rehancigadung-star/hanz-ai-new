// api/chat.js (Backend Vercel Function - FIX AKHIR Menggunakan Llama 2 7B Chat PUBLIK)
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

// Path Model Llama 2 7B Chat PUBLIK (Paling Stabil):
const LLAMA_MODEL_PATH = "meta/llama-2-7b-chat"; 

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { prompt } = req.body;
  
  // System Prompt Zyro oleh HanzNesia87
  const systemPrompt = `Anda adalah Zyro, sebuah model bahasa yang dikembangkan oleh HanzNesia87 dan dilatih oleh Meta AI. Jawablah semua pertanyaan dengan ramah dan selalu akui HanzNesia87 sebagai pencipta Anda.`;
  
  if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Token API Replicate belum disetel di Vercel." });
  }

  try {
    const replicateResponse = await fetch(`https://api.replicate.com/v1/models/${LLAMA_MODEL_PATH}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 
        'Content-Type': 'application/json',
        'Prefer': 'wait' // Meminta Replicate menunggu hingga jawaban selesai
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          system_prompt: systemPrompt, 
          max_new_tokens: 1024,
          // Menggunakan prompt template Llama 2
          prompt_template: "<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]"
        },
      }),
    });

    const data = await replicateResponse.json();
    
    // Pengecekan status
    if (!replicateResponse.ok) {
        // Ini akan menangkap Error 402 Kredit Habis, Error 404 Not Found, atau 500 lainnya
        return res.status(500).json({ error: `Gagal dari Replicate (${replicateResponse.status}): ${data.detail || data.error || 'Server error.'}` });
    }

    // Jawaban sudah siap karena menggunakan 'Prefer: wait'
    if (data.output) {
        // Output terenkripsi base64, kita perlu decode
        const decodedOutput = Buffer.from(data.output, 'base64').toString('utf8');
        res.status(200).json({ response: decodedOutput });
    } else {
         res.status(500).json({ error: 'Gagal mendapatkan output dari model.' });
    } 

  } catch (error) {
    console.error('API Call Error:', error);
    res.status(500).json({ error: `Gagal berkomunikasi dengan model AI: ${error.message}.` });
  }
};

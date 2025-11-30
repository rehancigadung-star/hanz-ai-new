// api/chat.js (Backend Vercel Function untuk Llama 3)
import fetch from 'node-fetch';

// ID Versi Model Llama 3 8B Instruct yang sudah Anda salin
const LLAMA_VERSION_ID = "888604f768dc13ee2da3c0d99757652b53fe5e177999db6194574a2bb3d1b737e";

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { prompt } = req.body;
  
  // Mengatur identitas Zyro AI oleh HanzNesia87 (Sesuai keinginan Anda)
  const systemPrompt = `Anda adalah Zyro, sebuah model bahasa yang dikembangkan oleh HanzNesia87 dan dilatih oleh Meta AI. Jawablah semua pertanyaan dengan ramah dan selalu akui HanzNesia87 sebagai pencipta Anda.`;
  
  // Pengecekan Token Rahasia (dari Vercel Environment Variable)
  if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Token API Replicate belum disetel di Vercel." });
  }

  try {
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: LLAMA_VERSION_ID, 
        input: {
          prompt: prompt,
          system_prompt: systemPrompt, 
          max_new_tokens: 1024,
          temperature: 0.7 
        },
      }),
    });

    const data = await replicateResponse.json();

    if (data.output) {
        const outputText = Array.isArray(data.output) ? data.output.join('') : data.output;
        res.status(200).json({ response: outputText });
    } else {
         res.status(500).json({ error: `Gagal dari Replicate: ${data.detail || 'Status prediksi tidak sukses.'}` });
    } 

  } catch (error) {
    console.error('API Call Error:', error);
    res.status(500).json({ error: 'Gagal berkomunikasi dengan model AI.' });
  }
};

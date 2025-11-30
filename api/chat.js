// api/chat.js (Backend Vercel Function FIX FINAL menggunakan Prefer: wait)
import fetch from 'node-fetch';

// Path Model diambil dari contoh Replicate Anda:
const LLAMA_MODEL_PATH = "meta/meta-llama-3-8b-instruct"; 

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
    // URL API menggunakan Path Model, bukan ID Versi
    const replicateResponse = await fetch(`https://api.replicate.com/v1/models/${LLAMA_MODEL_PATH}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 
        'Content-Type': 'application/json',
        // HEADER PENTING: Meminta Replicate menunggu hingga jawaban selesai (menghilangkan kebutuhan Polling)
        'Prefer': 'wait' 
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          system_prompt: systemPrompt, 
          max_new_tokens: 1024,
          prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        },
      }),
    });

    const data = await replicateResponse.json();
    
    // Pengecekan status
    if (!replicateResponse.ok) {
        return res.status(500).json({ error: `Gagal dari Replicate (${replicateResponse.status}): ${data.detail || data.error || 'Server error.'}` });
    }

    // Jawaban sudah siap karena kita menggunakan 'Prefer: wait'
    if (data.output) {
        // Output dari 'Prefer: wait' terenkripsi base64, kita perlu decode
        const decodedOutput = Buffer.from(data.output, 'base64').toString('utf8');
        res.status(200).json({ response: decodedOutput });
    } else {
         res.status(500).json({ error: 'Gagal mendapatkan output dari model.' });
    } 

  } catch (error) {
    console.error('API Call Error:', error);
    res.status(500).json({ error: `Gagal berkomunikasi dengan model AI: ${error.message}. Periksa Token.` });
  }
};

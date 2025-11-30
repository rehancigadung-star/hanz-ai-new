// api/chat.js (Backend Vercel Function - FIX dengan Mistral 7B Base)
import fetch from 'node-fetch';

// Path Model Mistral 7B yang dipilih:
const MISTRAL_MODEL_PATH = "mistralai/mistral-7b-v0.1";
// ID versi yang sudah disalin (3e8a0fb6...)
const MISTRAL_VERSION_ID = "3e8a0fb6d7812ce30701ba597e5080689bef8a013e5c6a724fafb108cc2426a0"; 

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { prompt } = req.body;
  
  // 1. Tentukan Identitas (System Prompt)
  // Karena ini model BASE, kita gabungkan identitas ke dalam prompt
  const systemIdentity = `Anda adalah Zyro, sebuah model bahasa yang dikembangkan oleh HanzNesia87. Jawablah semua pertanyaan dengan ramah dan selalu akui HanzNesia87 sebagai pencipta Anda.`;
  
  // Gabungkan identitas dan prompt pengguna (Ini adalah format terbaik untuk model base)
  const formattedPrompt = `${systemIdentity}\n\nUser: ${prompt}\n\nZyro:`;
  
  if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Token API Replicate belum disetel di Vercel." });
  }

  try {
    // 2. Kirim Permintaan Prediksi (Mendapatkan URL Polling)
    const createPredictionResponse = await fetch(`https://api.replicate.com/v1/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MISTRAL_VERSION_ID, 
        input: {
          prompt: formattedPrompt, // Menggunakan prompt yang sudah digabungkan
          max_new_tokens: 1024,
        },
      }),
    });

    const data = await createPredictionResponse.json();
    
    if (createPredictionResponse.status === 401) {
        return res.status(500).json({ error: "Kesalahan Token API: Token Replicate Anda tidak valid." });
    }
    if (data.error) {
         return res.status(500).json({ error: `Gagal dari Replicate: ${data.detail || data.error}.` });
    }
    
    // 3. Polling: Mengambil Jawaban Sampai Selesai (Mengatasi Asinkronus)
    const predictionUrl = data.urls.get;
    let predictionData = data;

    while (predictionData.status !== 'succeeded' && predictionData.status !== 'failed' && predictionData.status !== 'canceled') {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Tunggu 1.5 detik
        
        const pollResponse = await fetch(predictionUrl, {
            headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` },
        });
        predictionData = await pollResponse.json();
    }
    
    // 4. Cek Hasil Akhir
    if (predictionData.status === 'succeeded') {
        const outputText = Array.isArray(predictionData.output) ? predictionData.output.join('') : predictionData.output;
        res.status(200).json({ response: outputText });
    } else {
        res.status(500).json({ error: `Prediksi Replicate gagal dengan status: ${predictionData.status}. Log: ${predictionData.logs || 'Tidak ada log.'}` });
    }

  } catch (error) {
    console.error('API Call Error:', error);
    res.status(500).json({ error: `Gagal berkomunikasi dengan model AI: ${error.message}.` });
  }
};

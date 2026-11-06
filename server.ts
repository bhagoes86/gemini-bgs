import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// API health and status check
app.get('/api/health', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: 'gemini-3.8-live',
    timestamp: new Date().toISOString(),
  });
});

// Standard text chat fallback / quick prompt endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || 'You are a helpful, conversational AI voice assistant. Keep answers natural, concise, and friendly.',
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

// WebSocket Server for Gemini Live API
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/live' || url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live WS] Client connected to live session');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'GEMINI_API_KEY is not configured. Please ensure your API key is set in Settings > Secrets.',
    }));
    clientWs.close();
    return;
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      apiVersion: 'v1alpha',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let liveSession: any = null;
  let isClosing = false;

  const initLiveSession = async (voiceName: string = 'Zephyr', systemInstruction?: string) => {
    try {
      if (liveSession) {
        try {
          await liveSession.close();
        } catch (_) {}
      }

      const defaultInstruction = 'You are a warm, articulate, real-time conversational AI. You speak naturally, concisely, and empathetically. You can fluently understand and speak Bahasa Indonesia as well as English. Keep responses conversational and easy to listen to without reading out complex formatting or markdown tables.';

      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || 'Zephyr',
              },
            },
          },
          systemInstruction: systemInstruction || defaultInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const content = message.serverContent;

            // Send transcribed user audio
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({
                type: 'user_transcript',
                text: content.inputTranscription.text,
              }));
            }

            // Send transcribed AI response
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({
                type: 'ai_transcript',
                text: content.outputTranscription.text,
              }));
            }

            // Stream audio chunks (24kHz PCM)
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({
                  type: 'audio',
                  audio: part.inlineData.data,
                }));
              }
            }

            // Handle user interruption
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({
                type: 'interrupted',
              }));
            }

            // Turn complete indicator
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({
                type: 'turn_complete',
              }));
            }
          },
          onerror: (err: any) => {
            console.error('[Live WS] Session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'error',
                message: err?.message || 'Gemini Live encountered an error',
              }));
            }
          },
          onclose: () => {
            console.log('[Live WS] Session closed');
            if (clientWs.readyState === WebSocket.OPEN && !isClosing) {
              clientWs.send(JSON.stringify({
                type: 'session_closed',
              }));
            }
          },
        },
      });

      clientWs.send(JSON.stringify({
        type: 'session_ready',
        voice: voiceName,
      }));
    } catch (err: any) {
      let friendlyMessage = err?.message || 'Gagal memulai sesi Gemini Live';
      if (friendlyMessage.includes('API key not valid') || friendlyMessage.includes('API_KEY_INVALID') || friendlyMessage.includes('1007')) {
        friendlyMessage = 'API Key Gemini tidak valid atau belum diatur. Silakan periksa atau masukkan API key aktif di menu Settings > Secrets.';
      } else if (friendlyMessage.includes('404')) {
        friendlyMessage = 'Model atau endpoint Live API tidak ditemukan (404). Pastikan model gemini-3.8-live didukung oleh API key Anda.';
      } else if (friendlyMessage.includes('403') || friendlyMessage.includes('PERMISSION_DENIED')) {
        friendlyMessage = 'Akses ditolak (403). Pastikan API key memiliki izin untuk menggunakan Live API.';
      } else if (friendlyMessage.includes('429') || friendlyMessage.includes('RESOURCE_EXHAUSTED')) {
        friendlyMessage = 'Batas kuota Gemini tercapai (429). Harap tunggu beberapa saat atau gunakan API key dengan kuota aktif.';
      }

      console.error('[Live WS] Failed to connect to Gemini Live API:', friendlyMessage, err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: friendlyMessage,
        }));
      }
    }
  };

  let initialized = false;

  clientWs.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'config') {
        initialized = true;
        await initLiveSession(data.voice || 'Zephyr', data.systemInstruction);
        return;
      }

      if (!initialized) {
        initialized = true;
        await initLiveSession('Zephyr');
      }

      if (!liveSession) return;

      if (data.type === 'audio' && data.audio) {
        // Stream 16kHz PCM audio chunk to Gemini
        liveSession.sendRealtimeInput({
          audio: {
            data: data.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (data.type === 'text' && data.text) {
        // Text prompt fallback over live session
        liveSession.sendRealtimeInput({
          text: data.text,
        });
      }
    } catch (err) {
      console.error('[Live WS] Error handling client message:', err);
    }
  });

  clientWs.on('close', async () => {
    isClosing = true;
    console.log('[Live WS] Client disconnected');
    if (liveSession) {
      try {
        await liveSession.close();
      } catch (_) {}
    }
  });
});

// Vite Middleware for development or static files for production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();

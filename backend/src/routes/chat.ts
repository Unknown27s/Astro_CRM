import { Router, Request, Response } from 'express';
import { generateChatResponse } from './aihelper';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Valid messages array is required' });
        }

        const reply = await generateChatResponse(messages);

        res.json({ reply });
    } catch (error: any) {
        console.error('[Chat API Error]', error);
        res.status(500).json({
            error: error.message || 'Failed to generate chat response'
        });
    }
});

export default router;

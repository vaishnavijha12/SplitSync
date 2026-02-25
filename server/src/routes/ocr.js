const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

// Multer setup for OCR bill uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `ocr-${Date.now()}${ext}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);

/**
 * POST /api/ocr/scan
 * 
 * Receipt OCR pipeline (mock implementation).
 * In production: replace the mock with Tesseract.js, AWS Textract, or Google Vision API.
 * 
 * Returns a pre-filled expense structure for the frontend to display and confirm.
 */
router.post('/scan', upload.single('bill'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Bill image required' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        // ── MOCK OCR RESULT ──────────────────────────────────────
        // Replace this section with actual OCR integration:
        // Option A: const text = await tesseract.recognize(req.file.path);
        // Option B: const result = await googleVision.textDetection(req.file.path);
        // Option C: AWS Textract AnalyzeExpense API
        const mockOcrResult = await simulateMockOCR(req.file.originalname);
        // ────────────────────────────────────────────────────────

        res.json({
            image_url: imageUrl,
            raw_text: mockOcrResult.raw_text,
            // Pre-filled expense structure ready for the form
            suggested_expense: {
                title: mockOcrResult.merchant || 'Bill',
                amount: mockOcrResult.total || 0,
                date: mockOcrResult.date || new Date().toISOString().split('T')[0],
                items: mockOcrResult.items || [],
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── Mock OCR Simulator ───────────────────────────────────────
// Generates realistic-looking mock data; replace with real OCR
async function simulateMockOCR(filename) {
    // Simulate a 500ms processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const merchants = ['Pizza Hut', 'Swiggy', 'Zomato', 'McDonald\'s', 'Cafe Coffee Day'];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const total = (Math.random() * 2000 + 100).toFixed(2);
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items = Array.from({ length: itemCount }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: 1,
        price: (parseFloat(total) / itemCount).toFixed(2),
    }));

    return {
        merchant,
        total: parseFloat(total),
        date: new Date().toISOString().split('T')[0],
        raw_text: `${merchant}\nTotal: ₹${total}\n${items.map(i => i.name).join('\n')}`,
        items,
    };
}

module.exports = router;

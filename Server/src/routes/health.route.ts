import { Router } from 'express';
const router: Router = Router();

router.get('/', (_req, res) => {
  try {
    res.json({
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  } catch {

    res.status(200).json({ ok: false });
  }
});

export default router;

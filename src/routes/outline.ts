import { Router } from 'express';
import { generateOutline, getOutlineHistory } from '../controllers/outlineController.js';

const router = Router();

/**
 * @swagger
 * /outline:
 *   post:
 *     summary: Generate structured onboarding outline
 *     tags: [Outline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - teamId
 *             properties:
 *               role:
 *                 type: string
 *                 description: User role (e.g., software-intern, data-analyst)
 *               teamId:
 *                 type: integer
 *                 description: Team ID
 *               level:
 *                 type: string
 *                 default: intern
 *                 description: Experience level
 *               locale:
 *                 type: string
 *                 default: en-US
 *                 description: Locale for the outline
 *               sections:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: [dos, donts, policies, timeline, acknowledgements]
 *                 description: Sections to include in the outline
 *     responses:
 *       200:
 *         description: Outline generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 outline:
 *                   type: object
 *                   properties:
 *                     dos:
 *                       type: array
 *                       items:
 *                         type: string
 *                     donts:
 *                       type: array
 *                       items:
 *                         type: string
 *                     policies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           must_acknowledge:
 *                             type: boolean
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           week:
 *                             type: integer
 *                           items:
 *                             type: array
 *                             items:
 *                               type: string
 *                     acknowledgements:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           docId:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                 citations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Citation'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Failed to generate outline
 */
router.post('/', generateOutline);

/**
 * @swagger
 * /outline/history:
 *   get:
 *     summary: Get outline history for a role and team
 *     tags: [Outline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *         description: User role
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Outline history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 outlines:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       role:
 *                         type: string
 *                       teamId:
 *                         type: integer
 *                       requestPayload:
 *                         type: object
 *                       outline:
 *                         type: object
 *                       citations:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/Citation'
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Role and teamId are required
 *       500:
 *         description: Failed to get outline history
 */
router.get('/history', getOutlineHistory);

export default router;

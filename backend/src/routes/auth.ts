import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  hashPassword,
  requireUser,
  signToken,
  verifyPassword,
} from "../lib/auth.js";
import { UnauthorizedError } from "../lib/errors.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
    });
  }),
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const auth = await requireUser(req);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        projectMembers: { include: { project: true } },
      },
    });
    res.json({ user });
  }),
);

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      })
      .parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
      },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
    });
  }),
);

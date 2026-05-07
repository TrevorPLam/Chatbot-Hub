import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, sum, count, sql } from "drizzle-orm";
import { db, conversations, messages, folders } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ensureCompatibleFormat, voiceChatStream } from "@workspace/integrations-openai-ai-server/audio";
import {
  CreateOpenaiConversationBody,
  UpdateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  SendOpenaiVoiceMessageParams,
  SendOpenaiVoiceMessageBody,
  CreateOpenaiFolderBody,
  UpdateOpenaiFolderParams,
  UpdateOpenaiFolderBody,
  DeleteOpenaiFolderParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Folders ───────────────────────────────────────────────────────────────

router.get("/openai/folders", async (req, res): Promise<void> => {
  const all = await db.select().from(folders).orderBy(folders.name);
  res.json(all);
});

router.post("/openai/folders", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [folder] = await db.insert(folders).values({ name: parsed.data.name }).returning();
  res.status(201).json(folder);
});

router.patch("/openai/folders/:id", async (req, res): Promise<void> => {
  const params = UpdateOpenaiFolderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateOpenaiFolderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [updated] = await db
    .update(folders)
    .set({ name: body.data.name })
    .where(eq(folders.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.json(updated);
});

router.delete("/openai/folders/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiFolderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(folders)
    .where(eq(folders.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.sendStatus(204);
});

// ─── Token Usage ────────────────────────────────────────────────────────────

router.get("/openai/token-usage", async (req, res): Promise<void> => {
  const totalResult = await db
    .select({
      totalTokens: sum(messages.tokensUsed),
      totalMessages: count(messages.id),
    })
    .from(messages);

  const byConversation = await db
    .select({
      conversationId: conversations.id,
      title: conversations.title,
      tokens: sum(messages.tokensUsed),
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .groupBy(conversations.id, conversations.title)
    .orderBy(desc(sum(messages.tokensUsed)));

  res.json({
    totalTokens: Number(totalResult[0]?.totalTokens ?? 0),
    totalMessages: Number(totalResult[0]?.totalMessages ?? 0),
    byConversation: byConversation.map((c) => ({
      conversationId: c.conversationId,
      title: c.title,
      tokens: Number(c.tokens ?? 0),
    })),
  });
});

// ─── Conversations ──────────────────────────────────────────────────────────

router.get("/openai/conversations", async (req, res): Promise<void> => {
  const convos = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(convos.map((c) => ({
    ...c,
    tags: c.tags ?? [],
    totalTokensUsed: c.totalTokensUsed ?? 0,
    systemPrompt: c.systemPrompt ?? null,
    model: c.model ?? "gpt-5.4",
  })));
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [convo] = await db
    .insert(conversations)
    .values({
      title: parsed.data.title,
      folderId: parsed.data.folderId ?? null,
      tags: [],
      totalTokensUsed: 0,
      model: "gpt-5.4",
    })
    .returning();

  res.status(201).json({
    ...convo,
    tags: convo.tags ?? [],
    totalTokensUsed: convo.totalTokensUsed ?? 0,
    systemPrompt: convo.systemPrompt ?? null,
    model: convo.model ?? "gpt-5.4",
  });
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json({
    ...convo,
    tags: convo.tags ?? [],
    totalTokensUsed: convo.totalTokensUsed ?? 0,
    systemPrompt: convo.systemPrompt ?? null,
    model: convo.model ?? "gpt-5.4",
    messages: msgs,
  });
});

router.patch("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateOpenaiConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if ("folderId" in body.data) updateData.folderId = body.data.folderId;
  if (body.data.tags !== undefined) updateData.tags = body.data.tags;
  if ("systemPrompt" in body.data) updateData.systemPrompt = body.data.systemPrompt;
  if (body.data.model !== undefined) updateData.model = body.data.model;

  const [updated] = await db
    .update(conversations)
    .set(updateData)
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json({
    ...updated,
    tags: updated.tags ?? [],
    totalTokensUsed: updated.totalTokensUsed ?? 0,
    systemPrompt: updated.systemPrompt ?? null,
    model: updated.model ?? "gpt-5.4",
  });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [convo] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

// ─── Messages ───────────────────────────────────────────────────────────────

router.get(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = ListOpenaiMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(messages.createdAt);

    res.json(msgs);
  },
);

// ─── Text (+ optional image) message ────────────────────────────────────────

router.post(
  "/openai/conversations/:id/messages",
  async (req: Request, res: Response): Promise<void> => {
    const params = SendOpenaiMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = SendOpenaiMessageBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const conversationId = params.data.id;
    const userContent = body.data.content;
    const imageBase64 = body.data.imageBase64;
    const imageMimeType = body.data.imageMimeType ?? "image/jpeg";

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const imageDataUrl = imageBase64
      ? `data:${imageMimeType};base64,${imageBase64}`
      : null;

    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: userContent,
      imageUrl: imageDataUrl,
    });

    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const chatMessages: Parameters<typeof openai.chat.completions.create>[0]["messages"] = [];

    if (convo.systemPrompt) {
      chatMessages.push({ role: "system", content: convo.systemPrompt });
    }

    for (const m of existingMessages) {
      if (m.imageUrl && m.role === "user") {
        chatMessages.push({
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "image_url", image_url: { url: m.imageUrl } },
          ],
        });
      } else {
        chatMessages.push({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";
    let totalTokens = 0;
    const model = convo.model ?? "gpt-5.4";

    const stream = await openai.chat.completions.create({
      model,
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens ?? 0;
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      tokensUsed: totalTokens || null,
    });

    if (totalTokens > 0) {
      await db
        .update(conversations)
        .set({ totalTokensUsed: sql`${conversations.totalTokensUsed} + ${totalTokens}` })
        .where(eq(conversations.id, conversationId));
    }

    if (convo.title === "New Conversation") {
      const truncated = userContent.slice(0, 60).trim();
      const autoTitle = truncated.length < userContent.length ? truncated + "…" : truncated;
      await db
        .update(conversations)
        .set({ title: autoTitle })
        .where(eq(conversations.id, conversationId));
    }

    res.write(`data: ${JSON.stringify({ done: true, tokensUsed: totalTokens })}\n\n`);
    res.end();
  },
);

// ─── Regenerate last assistant message ──────────────────────────────────────

router.post(
  "/openai/conversations/:id/regenerate",
  async (req: Request, res: Response): Promise<void> => {
    const params = GetOpenaiConversationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const conversationId = params.data.id;

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const lastAssistant = [...allMessages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) {
      res.status(400).json({ error: "No assistant message to regenerate" });
      return;
    }

    if (lastAssistant.tokensUsed && lastAssistant.tokensUsed > 0) {
      await db
        .update(conversations)
        .set({
          totalTokensUsed: sql`GREATEST(0, ${conversations.totalTokensUsed} - ${lastAssistant.tokensUsed})`,
        })
        .where(eq(conversations.id, conversationId));
    }

    await db.delete(messages).where(eq(messages.id, lastAssistant.id));

    const remainingMessages = allMessages.filter((m) => m.id !== lastAssistant.id);

    const chatMessages: Parameters<typeof openai.chat.completions.create>[0]["messages"] = [];

    if (convo.systemPrompt) {
      chatMessages.push({ role: "system", content: convo.systemPrompt });
    }

    for (const m of remainingMessages) {
      if (m.imageUrl && m.role === "user") {
        chatMessages.push({
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "image_url", image_url: { url: m.imageUrl } },
          ],
        });
      } else {
        chatMessages.push({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";
    let totalTokens = 0;
    const model = convo.model ?? "gpt-5.4";

    const stream = await openai.chat.completions.create({
      model,
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens ?? 0;
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      tokensUsed: totalTokens || null,
    });

    if (totalTokens > 0) {
      await db
        .update(conversations)
        .set({ totalTokensUsed: sql`${conversations.totalTokensUsed} + ${totalTokens}` })
        .where(eq(conversations.id, conversationId));
    }

    res.write(`data: ${JSON.stringify({ done: true, tokensUsed: totalTokens })}\n\n`);
    res.end();
  },
);

// ─── Voice message ───────────────────────────────────────────────────────────

router.post(
  "/openai/conversations/:id/voice-messages",
  async (req: Request, res: Response): Promise<void> => {
    const params = SendOpenaiVoiceMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = SendOpenaiVoiceMessageBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const conversationId = params.data.id;

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const audioBuffer = Buffer.from(body.data.audioBase64, "base64");
    const { buffer: compatBuffer, format } = await ensureCompatibleFormat(audioBuffer);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await voiceChatStream(compatBuffer, "alloy", format);

    let userTranscript = "";
    let assistantTranscript = "";

    for await (const event of stream) {
      if (event.type === "user_transcript") userTranscript += event.data;
      if (event.type === "transcript") assistantTranscript += event.data;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    if (userTranscript || assistantTranscript) {
      await db.insert(messages).values([
        ...(userTranscript ? [{ conversationId, role: "user", content: userTranscript }] : []),
        ...(assistantTranscript ? [{ conversationId, role: "assistant", content: assistantTranscript }] : []),
      ]);
    }

    if (convo.title === "New Conversation" && userTranscript) {
      const truncated = userTranscript.slice(0, 60).trim();
      const autoTitle = truncated.length < userTranscript.length ? truncated + "…" : truncated;
      await db
        .update(conversations)
        .set({ title: autoTitle })
        .where(eq(conversations.id, conversationId));
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  },
);

export default router;

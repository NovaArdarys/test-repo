import redis from "@/constants/redis";

export async function httpPublishHandler(req: Request) {
  try {
    const body = await req.json();
    const { channel, payload } = body;
    if (!channel || !payload) return new Response('invalid', { status: 400 });

    await redis.publish(channel, JSON.stringify(payload));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('publish handler error', e);
    return new Response('server error', { status: 500 });
  }
}

export const EXCHANGES = {
  USER: "user.exchange",
  TRACK: "track.exchange",
  AUTH: "auth.exchange",
  LOG: "log.exchange",
  NOTIFICATION: "notification.exchange",
};


//  const auth = req.headers.authorization;
//   if (!auth) return res.status(401).json({ error: "Missing Authorization" });

//   try {
//     const token = auth.replace("Bearer ", "");
//     const payload = await verifyJWT(token);
//     (req as any).user = payload;
//     next();
//   } catch (e: any) {
//     return res.status(401).json({ error: "Invalid token", detail: e.message });
//   }